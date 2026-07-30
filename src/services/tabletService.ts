import crypto from 'crypto';
import prisma from '../lib/prisma';
import logger from '../config/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { QRService } from './qrService';

const PAIRING_TTL_MINUTES = 15;

export class TabletService {
  /** Código curto o bastante para digitar num tablet sem teclado físico. */
  private static newPairingCode(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private static async driverProfile(userId: string) {
    const profile = await prisma.motoristProfile.findUnique({
      where: { user_id: userId },
      select: { id: true, company_id: true },
    });
    if (!profile) throw new NotFoundError('Perfil de motorista não encontrado');
    return profile;
  }

  /**
   * Motorista gera um código no celular e digita no tablet.
   * Evita deixar e-mail e senha salvos num aparelho que fica no carro.
   */
  static async createPairingCode(userId: string, label?: string) {
    const profile = await this.driverProfile(userId);

    // Um código vivo por vez por motorista, para não acumular pendências.
    await prisma.tabletDevice.deleteMany({
      where: { motorista_id: profile.id, status: 'PENDING_PAIRING' },
    });

    // Colisão de código é improvável mas possível; tenta algumas vezes.
    for (let attempt = 0; attempt < 5; attempt++) {
      const pairing_code = this.newPairingCode();
      const existing = await prisma.tabletDevice.findUnique({
        where: { pairing_code },
        select: { id: true },
      });
      if (existing) continue;

      const device = await prisma.tabletDevice.create({
        data: {
          company_id: profile.company_id,
          motorista_id: profile.id,
          pairing_code,
          pairing_expires_at: new Date(Date.now() + PAIRING_TTL_MINUTES * 60_000),
          status: 'PENDING_PAIRING',
          label: label?.slice(0, 120) || null,
        },
        select: { id: true, pairing_code: true, pairing_expires_at: true },
      });

      return {
        deviceId: device.id,
        code: device.pairing_code,
        expiresAt: device.pairing_expires_at,
        expiresInMinutes: PAIRING_TTL_MINUTES,
      };
    }

    throw new ValidationError('Não foi possível gerar um código. Tente de novo.');
  }

  /** Tablet envia o código; recebe um token permanente. */
  static async pair(code: string, userAgent?: string) {
    const device = await prisma.tabletDevice.findUnique({
      where: { pairing_code: code.trim() },
      include: {
        motorista: {
          select: {
            id: true,
            city: true,
            state: true,
            user: { select: { name: true, avatar_url: true } },
          },
        },
      },
    });

    if (!device || device.status !== 'PENDING_PAIRING') {
      throw new ValidationError('Código inválido ou já utilizado');
    }
    if (device.pairing_expires_at && device.pairing_expires_at < new Date()) {
      throw new ValidationError('Código expirado. Gere um novo no aplicativo.');
    }

    const device_token = crypto.randomBytes(32).toString('hex');

    await prisma.tabletDevice.update({
      where: { id: device.id },
      data: {
        device_token,
        status: 'ACTIVE',
        paired_at: new Date(),
        last_seen_at: new Date(),
        user_agent: userAgent?.slice(0, 500) || null,
        // Código queimado: um tablet pareado não tem código pendente.
        pairing_code: null,
        pairing_expires_at: null,
      },
    });

    // Motorista com tablet ligado é motorista que pode exibir anúncio. É esse o
    // significado de ATIVO no painel MASTER — não "fez cadastro".
    if (device.motorista_id) {
      await prisma.motoristProfile.update({
        where: { id: device.motorista_id },
        data: { status: 'ATIVO', last_online_at: new Date() },
      });
    }

    logger.info(`Tablet pareado device=${device.id} motorista=${device.motorista_id}`);

    return {
      deviceToken: device_token,
      deviceId: device.id,
      motorista: device.motorista
        ? {
            id: device.motorista.id,
            name: device.motorista.user.name,
            avatarUrl: device.motorista.user.avatar_url,
            city: device.motorista.city,
            state: device.motorista.state,
          }
        : null,
    };
  }

  /**
   * Jornada aberta do tablet, criando uma se não houver.
   *
   * Uma jornada por tablet por vez. Ela nasce no pareamento e vive até o
   * motorista encerrar na tela — pode durar 20 minutos ou um turno inteiro,
   * e pode haver várias no mesmo dia.
   */
  static async currentSession(device: {
    id: string;
    company_id: string;
    motorista_id: string | null;
  }) {
    if (!device.motorista_id) return null;

    const aberta = await prisma.tabletSession.findFirst({
      where: { device_id: device.id, ended_at: null },
      orderBy: { started_at: 'desc' },
      select: { id: true, started_at: true },
    });
    if (aberta) return aberta;

    return prisma.tabletSession.create({
      data: {
        company_id: device.company_id,
        motorista_id: device.motorista_id,
        device_id: device.id,
      },
      select: { id: true, started_at: true },
    });
  }

  /**
   * Encerra a jornada e devolve o resumo do que aconteceu nela.
   *
   * Os números saem de contagem nos eventos daquela jornada — nada é estimado.
   * O snapshot fica gravado para a lista carregar rápido depois.
   */
  static async endSession(deviceToken: string) {
    const device = await this.deviceFromToken(deviceToken);

    const sessao = await prisma.tabletSession.findFirst({
      where: { device_id: device.id, ended_at: null },
      orderBy: { started_at: 'desc' },
    });
    if (!sessao) throw new ValidationError('Nenhuma jornada aberta neste tablet');

    const [impressions, scans, uniqueScans, leads, porCampanha] = await prisma.$transaction([
      prisma.impressionEvent.count({ where: { session_id: sessao.id } }),
      prisma.scanEvent.count({ where: { session_id: sessao.id } }),
      prisma.scanEvent.count({ where: { session_id: sessao.id, is_unique: true } }),
      prisma.lead.count({ where: { scan_event: { session_id: sessao.id } } }),
      prisma.impressionEvent.groupBy({
        by: ['campaign_id'],
        where: { session_id: sessao.id },
        _count: { _all: true },
      }),
    ]);

    const campanhas = porCampanha.length
      ? await prisma.campaign.findMany({
          where: { id: { in: porCampanha.map((c) => c.campaign_id) } },
          select: {
            id: true,
            title: true,
            anunciante: { select: { company_name: true, trade_name: true } },
          },
        })
      : [];

    // Scans e leads por campanha, para o motorista ver qual anúncio rendeu.
    const [scansPorCampanha, leadsPorCampanha] = await prisma.$transaction([
      prisma.scanEvent.groupBy({
        by: ['campaign_id'],
        where: { session_id: sessao.id },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ['campaign_id'],
        where: { scan_event: { session_id: sessao.id } },
        _count: { _all: true },
      }),
    ]);
    const idxScans = new Map(scansPorCampanha.map((s) => [s.campaign_id, s._count._all]));
    const idxLeads = new Map(leadsPorCampanha.map((l) => [l.campaign_id, l._count._all]));
    const idxImpr = new Map(porCampanha.map((i) => [i.campaign_id, i._count._all]));

    const encerrada = await prisma.tabletSession.update({
      where: { id: sessao.id },
      data: {
        ended_at: new Date(),
        impressions_count: impressions,
        scans_count: scans,
        unique_scans_count: uniqueScans,
        leads_count: leads,
      },
    });

    // O tablet volta a pedir código: a jornada acabou e o aparelho fica solto.
    await prisma.tabletDevice.delete({ where: { id: device.id } });

    const restantes = await prisma.tabletDevice.count({
      where: { motorista_id: device.motorista_id!, status: 'ACTIVE' },
    });
    if (restantes === 0) {
      await prisma.motoristProfile.update({
        where: { id: device.motorista_id! },
        data: { status: 'INATIVO' },
      });
    }

    logger.info(`Jornada ${sessao.id} encerrada — ${leads} lead(s)`);

    return {
      sessionId: encerrada.id,
      startedAt: encerrada.started_at,
      endedAt: encerrada.ended_at,
      durationMinutes: Math.max(
        1,
        Math.round((encerrada.ended_at!.getTime() - encerrada.started_at.getTime()) / 60000)
      ),
      totals: { impressions, scans, uniqueScans, leads },
      campaigns: campanhas.map((c) => ({
        id: c.id,
        title: c.title,
        advertiser: c.anunciante.trade_name || c.anunciante.company_name,
        impressions: idxImpr.get(c.id) || 0,
        scans: idxScans.get(c.id) || 0,
        leads: idxLeads.get(c.id) || 0,
      })),
    };
  }

  /**
   * Histórico de jornadas do motorista, agrupado por dia.
   * O "Dia X" que ele vê é a ordem da jornada dentro daquela data.
   */
  static async sessionHistory(userId: string, limit = 30) {
    const profile = await this.driverProfile(userId);

    const sessoes = await prisma.tabletSession.findMany({
      where: { motorista_id: profile.id, ended_at: { not: null } },
      orderBy: { started_at: 'desc' },
      take: limit,
      select: {
        id: true,
        started_at: true,
        ended_at: true,
        impressions_count: true,
        scans_count: true,
        unique_scans_count: true,
        leads_count: true,
        impression_events: {
          select: { campaign: { select: { id: true, title: true } } },
          distinct: ['campaign_id'],
        },
      },
    });

    // Numeração por dia: a 1ª jornada do dia é a 1, a seguinte a 2…
    // Como vêm em ordem decrescente, contamos de trás para frente.
    const porDia = new Map<string, number>();
    const comOrdem = [...sessoes].reverse().map((s) => {
      const dia = s.started_at.toISOString().slice(0, 10);
      const n = (porDia.get(dia) || 0) + 1;
      porDia.set(dia, n);
      return { ...s, ordemNoDia: n };
    });

    return comOrdem.reverse().map((s) => ({
      id: s.id,
      date: s.started_at.toISOString().slice(0, 10),
      ordemNoDia: s.ordemNoDia,
      totalNoDia: porDia.get(s.started_at.toISOString().slice(0, 10)) || 1,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMinutes: s.ended_at
        ? Math.max(1, Math.round((s.ended_at.getTime() - s.started_at.getTime()) / 60000))
        : null,
      impressions: s.impressions_count,
      scans: s.scans_count,
      uniqueScans: s.unique_scans_count,
      leads: s.leads_count,
      campaigns: s.impression_events.map((e) => e.campaign.title),
    }));
  }

  /** Resolve o tablet a partir do token que ele guarda localmente. */
  static async deviceFromToken(token: string) {
    const device = await prisma.tabletDevice.findUnique({
      where: { device_token: token },
      include: {
        motorista: {
          select: {
            id: true,
            city: true,
            state: true,
            user: { select: { name: true, avatar_url: true } },
          },
        },
      },
    });
    if (!device || device.status !== 'ACTIVE' || !device.motorista_id) {
      throw new ValidationError('Tablet não pareado');
    }
    return device;
  }

  /**
   * Playlist do tablet: o que roda na tela daquele carro.
   *
   * Curadoria híbrida — o motorista aceita campanhas no marketplace, mas o
   * MASTER pode forçar uma campanha por cima (MASTER_FORCED) ou tirar uma do ar
   * só para aquele motorista (MASTER_BLOCKED). Bloqueio sempre vence.
   */
  static async playlist(deviceToken: string) {
    const device = await this.deviceFromToken(deviceToken);
    const motoristaId = device.motorista_id!;
    const today = new Date();

    const assignments = await prisma.campaignMotorista.findMany({
      where: {
        motorista_id: motoristaId,
        // Fora da playlist: bloqueado pelo MASTER ou recusado pelo motorista.
        source: { notIn: ['MASTER_BLOCKED', 'DRIVER_REMOVED'] },
        campaign: {
          status: 'ACTIVE',
          deleted_at: null,
          start_date: { lte: today },
          end_date: { gte: today },
        },
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            image_url: true,
            cta_text: true,
            destination_url: true,
            show_qr: true,
            qr_position: true,
            show_text: true,
            anunciante: { select: { company_name: true, trade_name: true } },
          },
        },
      },
    });

    await prisma.tabletDevice.update({
      where: { id: device.id },
      data: { last_seen_at: new Date() },
    });

    // Garante jornada aberta: se o tablet reabriu depois de um encerramento,
    // uma nova começa aqui.
    const sessao = await this.currentSession(device);

    const items = await Promise.all(
      assignments.map(async (a) => {
        const c = a.campaign;

        // Campanha sem QR (só marca) não gasta CPU gerando imagem nem carrega
        // ~4KB de base64 por item no payload do tablet.
        const qr = c.show_qr
          ? // QR por (campanha + motorista + tablet): é o que permite provar
            // de qual carro veio cada lead.
            await QRService.generateQRCode(c.id, motoristaId, device.id)
          : null;

        return {
          campaignId: c.id,
          title: c.title,
          description: c.description,
          imageUrl: c.image_url,
          // Sem texto padrão: se a empresa não escreveu chamada, nada aparece.
          // Muitos banners já trazem o "aponte a câmera" na própria arte, e
          // repetir por conta poluía a tela.
          ctaText: c.cta_text || null,
          advertiser: c.anunciante.trade_name || c.anunciante.company_name,
          // Como montar na tela
          showQr: c.show_qr,
          qrPosition: c.qr_position,
          showText: c.show_text,
          qrImage: qr?.qrCodeImageUrl ?? null,
          qrUrl: qr?.qrCodeData ?? null,
          forced: a.source === 'MASTER_FORCED',
        };
      })
    );

    return {
      device: { id: device.id, label: device.label },
      sessionId: sessao?.id ?? null,
      sessionStartedAt: sessao?.started_at ?? null,
      motorista: device.motorista
        ? {
            id: device.motorista.id,
            name: device.motorista.user.name,
            avatarUrl: device.motorista.user.avatar_url,
            city: device.motorista.city,
            state: device.motorista.state,
          }
        : null,
      items,
      /**
       * Segundos por anúncio antes de girar para o próximo.
       * 8s: tempo de o passageiro notar a tela e sacar o celular, sem queimar
       * a corrida inteira num anunciante só quando há vários na playlist.
       */
      rotationSeconds: Number(process.env.TABLET_ROTATION_SECONDS || 8),
    };
  }

  /** Tablets do motorista (para ele ver/desvincular no app). */
  static async listForDriver(userId: string) {
    const profile = await this.driverProfile(userId);
    const devices = await prisma.tabletDevice.findMany({
      where: { motorista_id: profile.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        label: true,
        status: true,
        last_seen_at: true,
        paired_at: true,
        created_at: true,
      },
    });
    return devices;
  }

  static async unpair(userId: string, deviceId: string) {
    const profile = await this.driverProfile(userId);
    const device = await prisma.tabletDevice.findFirst({
      where: { id: deviceId, motorista_id: profile.id },
      select: { id: true },
    });
    if (!device) throw new NotFoundError('Tablet não encontrado');

    await prisma.tabletDevice.delete({ where: { id: device.id } });

    // Sem nenhum tablet sobrando ele deixa de conseguir exibir anúncio, então
    // sai de ATIVO — senão o MASTER contaria como ativo alguém sem tela.
    const restantes = await prisma.tabletDevice.count({
      where: { motorista_id: profile.id, status: 'ACTIVE' },
    });
    if (restantes === 0) {
      await prisma.motoristProfile.update({
        where: { id: profile.id },
        data: { status: 'INATIVO' },
      });
    }

    return { unpaired: true, remainingDevices: restantes };
  }
}
