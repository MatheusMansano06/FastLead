import prisma from '../lib/prisma';
import logger from '../config/logger';
import { TabletService } from './tabletService';

/**
 * Telemetria do tablet e veredito antifraude da jornada.
 *
 * O problema que isto resolve: nada impede o motorista de deixar o tablet
 * ligado em casa girando anúncios e pedir para alguém escanear os QR. O carro
 * nunca sai do lugar e os leads pingam mesmo assim.
 *
 * A defesa mora no servidor de propósito. O app é fonte de dados, nunca
 * autoridade — quem tem o aparelho na mão pode recompilar o APK e mandar o que
 * quiser. Por isso o veredito é calculado aqui, com o que dá para conferir, e
 * é aqui que ele bloqueia a comissão.
 */

/** Pontos com erro maior que isto não servem para acusar ninguém: a variação
 *  pode ser só o próprio GPS chutando. Dentro de casa é comum passar disso. */
const MAX_ACCURACY_M = 100;

/**
 * Abaixo disto não é deslocamento, é ruído do sensor.
 *
 * Este número é o que faz a detecção funcionar. Um tablet parado na mesa
 * "anda" de 5 a 15 metros a cada leitura, e sem descartar isso ele acumularia
 * centenas de metros por hora — passando por motorista rodando.
 */
const MIN_DISPLACEMENT_M = 20;

/** Janela móvel avaliada. Meia hora é longa o bastante para um congestionamento
 *  caber inteiro dentro dela sem virar acusação. */
const RECENT_WINDOW_MIN = 30;

/**
 * Metros mínimos na janela. Preso no viaduto o carro ainda anda de 200 a 400m
 * em meia hora; tablet em cima da cama anda zero. O limiar mira essa diferença,
 * e não "está parado agora" — que reprovaria o motorista honesto no trânsito.
 */
const MIN_RECENT_DISTANCE_M = 300;

/** Jornada recém-aberta não é julgada: ainda não deu tempo de andar nada. */
const GRACE_MINUTES = 30;

/** Marco periódico da trilha, mesmo sem nada acontecer. */
const HEARTBEAT_MINUTES = 5;

/** Ping com relógio muito fora do nosso é descartado. */
const MAX_CLOCK_SKEW_MIN = 15;

export type SuspectReason = 'MOCK_LOCATION' | 'NO_MOVEMENT';

export interface PingInput {
  recordedAt: string | Date;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  speedMps?: number;
  isMoving?: boolean;
  motionGforce?: number;
  orientation?: string;
  isMocked?: boolean;
}

interface Position {
  latitude: number;
  longitude: number;
}

/** Estado vivo da jornada — espelha TelemetryService.SESSION_FIELDS. */
interface SessionState {
  id: string;
  started_at: Date;
  motorista_id: string;
  device_id: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_ping_at: Date | null;
  last_moving_at: Date | null;
  distance_meters: number;
  recent_distance_meters: number;
  mock_location_seen: boolean;
  is_suspect: boolean;
  suspect_reason: string | null;
  suspect_since: Date | null;
}

export class TelemetryService {
  /** Campos da jornada que a ingestão precisa ler para continuar a conta. */
  private static readonly SESSION_FIELDS = {
    id: true,
    started_at: true,
    motorista_id: true,
    device_id: true,
    last_latitude: true,
    last_longitude: true,
    last_ping_at: true,
    last_moving_at: true,
    distance_meters: true,
    recent_distance_meters: true,
    mock_location_seen: true,
    is_suspect: true,
    suspect_reason: true,
    suspect_since: true,
  } as const;

  /** Resolve tablet e jornada aberta a partir do token que o aparelho guarda. */
  private static async openSession(deviceToken: string) {
    const device = await TabletService.deviceFromToken(deviceToken);
    const aberta = await TabletService.currentSession(device);
    if (!aberta) throw new Error('Tablet pareado sem jornada aberta');

    const session = await prisma.tabletSession.findUniqueOrThrow({
      where: { id: aberta.id },
      select: this.SESSION_FIELDS,
    });
    return session;
  }

  /** Entrada do endpoint: o tablet manda o lote acumulado desde o último envio. */
  static async recordForDevice(deviceToken: string, pings: PingInput[]) {
    const session = await this.openSession(deviceToken);
    return this.ingest(session, pings);
  }

  /** Entrada do endpoint: o tablet pergunta como está a jornada dele. */
  static async statusForDevice(deviceToken: string) {
    return this.verdict(await this.openSession(deviceToken));
  }

  /**
   * Distância entre dois pontos na superfície da Terra, em metros.
   * Haversine — erro desprezível nas distâncias de uma corrida urbana.
   */
  static distanceMeters(a: Position, b: Position): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** Coordenada plausível — descarta lixo e o (0,0) no golfo da Guiné. */
  private static validCoords(p: PingInput): boolean {
    return (
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      Math.abs(p.latitude) <= 90 &&
      Math.abs(p.longitude) <= 180 &&
      !(p.latitude === 0 && p.longitude === 0)
    );
  }

  /**
   * Recebe o lote de pings do tablet e devolve o veredito atualizado.
   *
   * O estado da jornada é reescrito no lugar (UPDATE) e só vira linha nova o
   * que é notável: mudou de parado para andando, passaram 5 minutos desde o
   * último marco, ou veio GPS falso. Gravar todo ping custaria ~5 mil linhas
   * por turno por tablet e não responderia nenhuma pergunta a mais.
   */
  static async ingest(session: SessionState, pings: PingInput[]) {
    const agora = new Date();
    const limiteFuturo = new Date(agora.getTime() + MAX_CLOCK_SKEW_MIN * 60_000);

    // O relógio do tablet é palpite do aparelho: dá para atrasar de propósito.
    // Ordenamos por ele para calcular deslocamento na ordem certa, mas
    // descartamos o que veio absurdo.
    const validos = pings
      .filter(this.validCoords)
      .map((p) => ({ ...p, recordedAt: new Date(p.recordedAt) }))
      .filter((p) => !isNaN(p.recordedAt.getTime()) && p.recordedAt <= limiteFuturo)
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

    if (!validos.length) return this.verdict(session);

    let anterior: Position | null =
      session.last_latitude !== null && session.last_longitude !== null
        ? { latitude: session.last_latitude, longitude: session.last_longitude }
        : null;

    let distanciaAcumulada = session.distance_meters;
    let ultimoMovimento = session.last_moving_at;
    let mockVisto = session.mock_location_seen;

    // Último marco gravado, para saber quando o heartbeat vence.
    const ultimoMarco = await prisma.telemetryPing.findFirst({
      where: { session_id: session.id },
      orderBy: { recorded_at: 'desc' },
      select: { recorded_at: true, is_moving: true },
    });
    let marcoEm = ultimoMarco?.recorded_at ?? null;
    let marcoMovendo = ultimoMarco?.is_moving ?? null;

    const paraGravar: Array<{
      session_id: string;
      device_id: string | null;
      motorista_id: string;
      recorded_at: Date;
      latitude: number;
      longitude: number;
      accuracy_m: number | null;
      speed_mps: number | null;
      is_moving: boolean;
      motion_gforce: number | null;
      orientation: string | null;
      is_mocked: boolean;
      reason: string;
    }> = [];

    for (const p of validos) {
      const preciso = p.accuracyM === undefined || p.accuracyM <= MAX_ACCURACY_M;

      // Ponto impreciso não entra na conta de distância: o erro do sensor
      // viraria deslocamento fantasma e favoreceria justamente quem está
      // parado dentro de casa, onde o GPS é pior.
      let avancou = 0;
      if (preciso && anterior) {
        const d = this.distanceMeters(anterior, p);
        if (d >= MIN_DISPLACEMENT_M) avancou = d;
      }

      if (avancou > 0) {
        distanciaAcumulada += avancou;
        ultimoMovimento = p.recordedAt;
      }
      if (preciso) anterior = { latitude: p.latitude, longitude: p.longitude };

      if (p.isMocked) mockVisto = true;

      // Deslocamento no mapa é a prova; o acelerômetro é só corroboração —
      // ele vem do app, que é justamente a parte que dá para adulterar.
      const movendo = avancou > 0 || p.isMoving === true;

      const virouMarco =
        p.isMocked === true ||
        marcoEm === null ||
        marcoMovendo === null ||
        movendo !== marcoMovendo ||
        p.recordedAt.getTime() - marcoEm.getTime() >= HEARTBEAT_MINUTES * 60_000;

      if (virouMarco) {
        paraGravar.push({
          session_id: session.id,
          device_id: session.device_id,
          motorista_id: session.motorista_id,
          recorded_at: p.recordedAt,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy_m: p.accuracyM ?? null,
          speed_mps: p.speedMps ?? null,
          is_moving: movendo,
          motion_gforce: p.motionGforce ?? null,
          orientation: p.orientation?.slice(0, 12) ?? null,
          is_mocked: p.isMocked === true,
          reason: p.isMocked
            ? 'MOCK'
            : marcoMovendo !== null && movendo !== marcoMovendo
              ? 'TRANSITION'
              : 'HEARTBEAT',
        });
        marcoEm = p.recordedAt;
        marcoMovendo = movendo;
      }
    }

    if (paraGravar.length) {
      await prisma.telemetryPing.createMany({ data: paraGravar });
    }

    const ultimo = validos[validos.length - 1];
    const recente = await this.recentDistance(session.id);
    const veredito = this.evaluate({
      startedAt: session.started_at,
      mockSeen: mockVisto,
      recentMeters: recente,
      agora,
    });

    const atualizada = await prisma.tabletSession.update({
      where: { id: session.id },
      data: {
        last_ping_at: agora,
        last_latitude: ultimo.latitude,
        last_longitude: ultimo.longitude,
        last_moving_at: ultimoMovimento,
        distance_meters: distanciaAcumulada,
        recent_distance_meters: recente,
        mock_location_seen: mockVisto,
        is_suspect: veredito.suspect,
        suspect_reason: veredito.reason,
        // A marca de quando começou a suspeita não é reescrita a cada ping,
        // senão nunca daria para saber desde quando a jornada está reprovada.
        suspect_since: veredito.suspect ? (session.suspect_since ?? agora) : null,
      },
      select: {
        id: true,
        is_suspect: true,
        suspect_reason: true,
        suspect_since: true,
        distance_meters: true,
        recent_distance_meters: true,
        mock_location_seen: true,
        last_moving_at: true,
      },
    });

    if (veredito.suspect && !session.is_suspect) {
      logger.warn(
        `Jornada ${session.id} sob suspeita (${veredito.reason}) — ` +
          `motorista=${session.motorista_id} recente=${Math.round(recente)}m`
      );
    }

    return this.verdict(atualizada);
  }

  /**
   * Metros percorridos na janela recente, somando os marcos gravados.
   *
   * Some segmento a segmento em vez de medir ponta a ponta: quem dá a volta no
   * quarteirão e retorna andou de verdade, mesmo terminando onde começou.
   */
  static async recentDistance(sessionId: string): Promise<number> {
    const desde = new Date(Date.now() - RECENT_WINDOW_MIN * 60_000);
    const marcos = await prisma.telemetryPing.findMany({
      where: {
        session_id: sessionId,
        recorded_at: { gte: desde },
        OR: [{ accuracy_m: null }, { accuracy_m: { lte: MAX_ACCURACY_M } }],
      },
      orderBy: { recorded_at: 'asc' },
      select: { latitude: true, longitude: true },
    });

    let total = 0;
    for (let i = 1; i < marcos.length; i++) {
      const d = this.distanceMeters(marcos[i - 1], marcos[i]);
      if (d >= MIN_DISPLACEMENT_M) total += d;
    }
    return total;
  }

  /**
   * O veredito. Duas regras, nesta ordem — GPS falso é intenção, não engano,
   * e por isso vence qualquer outra leitura.
   */
  static evaluate(input: {
    startedAt: Date;
    mockSeen: boolean;
    recentMeters: number;
    agora: Date;
  }): { suspect: boolean; reason: SuspectReason | null } {
    if (input.mockSeen) return { suspect: true, reason: 'MOCK_LOCATION' };

    const minutosDeJornada = (input.agora.getTime() - input.startedAt.getTime()) / 60_000;
    if (minutosDeJornada < GRACE_MINUTES) return { suspect: false, reason: null };

    if (input.recentMeters < MIN_RECENT_DISTANCE_M) {
      return { suspect: true, reason: 'NO_MOVEMENT' };
    }
    return { suspect: false, reason: null };
  }

  /**
   * O que o tablet vê. O motorista é avisado de propósito: deixar de pagar
   * alguém sem dizer por quê é pior do que um fraudador descobrir o limiar
   * — que ele descobriria testando de qualquer jeito.
   */
  private static verdict(s: {
    is_suspect: boolean;
    suspect_reason: string | null;
    suspect_since?: Date | null;
    distance_meters?: number;
    recent_distance_meters?: number;
    mock_location_seen?: boolean;
    last_moving_at?: Date | null;
  }) {
    return {
      suspect: s.is_suspect,
      reason: s.suspect_reason,
      since: s.suspect_since ?? null,
      message: s.is_suspect ? this.explain(s.suspect_reason) : null,
      distanceMeters: Math.round(s.distance_meters ?? 0),
      recentDistanceMeters: Math.round(s.recent_distance_meters ?? 0),
      lastMovingAt: s.last_moving_at ?? null,
    };
  }

  private static explain(reason: string | null): string {
    switch (reason) {
      case 'MOCK_LOCATION':
        return 'Localização simulada detectada. Desative apps de GPS falso e as opções de desenvolvedor para voltar a registrar leads.';
      case 'NO_MOVEMENT':
        return 'Sem deslocamento na última meia hora. Os leads desta jornada não serão contabilizados enquanto o veículo estiver parado.';
      default:
        return 'Jornada sob revisão. Os leads não estão sendo contabilizados.';
    }
  }

  /**
   * A jornada estava valendo no instante do scan?
   *
   * Chamado na captura do lead. Jornada ausente não reprova nada: scan sem
   * tablet identificado (QR impresso, print da tela) continua valendo, porque
   * ali não há promessa de deslocamento para quebrar.
   */
  static async sessionIsSuspect(sessionId: string | null): Promise<{
    suspect: boolean;
    reason: string | null;
  }> {
    if (!sessionId) return { suspect: false, reason: null };
    const s = await prisma.tabletSession.findUnique({
      where: { id: sessionId },
      select: { is_suspect: true, suspect_reason: true },
    });
    return { suspect: s?.is_suspect === true, reason: s?.suspect_reason ?? null };
  }
}
