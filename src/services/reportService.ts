import prisma from '../lib/prisma';
import { NotFoundError } from '../utils/errors';

/**
 * Relatórios de entrega.
 *
 * Regra que vale para tudo aqui: nenhum número é estimado, projetado ou
 * arredondado para cima. Cada campo sai de contagem sobre eventos gravados, e
 * o que não dá para contar não aparece — mídia externa vive de um anunciante
 * confiar num número que ele não tem como conferir sozinho, e um valor
 * inventado destrói isso de uma vez.
 *
 * Jornada reprovada pelo antifraude fica de fora de tudo que é apresentado
 * como entrega. Um anúncio que rodou num tablet parado dentro de casa não foi
 * visto por passageiro nenhum, e cobrar por isso seria vender fumaça. O
 * relatório diz quanto foi descartado em vez de esconder.
 */

/** Quilômetro rodado com o anúncio em rotação, não exclusividade. */
export interface CampaignReport {
  campaign: { id: string; title: string; startDate: Date; endDate: Date };
  period: { from: Date; to: Date };

  /** Impressão → scan → pessoa distinta → lead → convertido. */
  funnel: {
    impressions: number;
    scans: number;
    uniqueScans: number;
    leads: number;
    converted: number;
    /** Percentuais entre etapas, já calculados para a tela não ter que dividir. */
    scanRate: number | null;
    leadRate: number | null;
    conversionRate: number | null;
  };

  /** O que só existe porque o tablet reporta posição. */
  circulation: {
    /** Horas de tela efetivamente ocupadas por este anúncio. */
    screenHours: number;
    /** Quantos carros diferentes o exibiram. */
    vehicles: number;
    /** Jornadas em que apareceu. */
    journeys: number;
    /**
     * Quilômetros percorridos pelos veículos enquanto este anúncio estava na
     * rotação. Não é exclusivo: no mesmo trajeto a tela alterna entre os
     * anunciantes daquele carro. `screenShare` diz que fatia da tela foi
     * deste anúncio nessas mesmas jornadas.
     */
    kilometers: number;
    screenShare: number | null;
    /** Onde os carros estão cadastrados, com quantas jornadas em cada praça. */
    cities: Array<{ city: string; state: string; journeys: number }>;
  };

  /** Quando o anúncio apareceu — 0 a 23, hora local do servidor. */
  byHour: Array<{ hour: number; impressions: number }>;

  /** O que foi descartado por suspeita antifraude e não entrou nos números. */
  excluded: {
    journeys: number;
    impressions: number;
    reason: string;
  };
}

export class ReportService {
  /**
   * Relatório de entrega de uma campanha.
   *
   * O anunciante só enxerga campanha da própria empresa: `company_id` entra em
   * toda consulta, não só na primeira.
   */
  static async campaignReport(
    companyId: string,
    campaignId: string,
    range?: { from?: Date; to?: Date }
  ): Promise<CampaignReport> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, company_id: companyId, deleted_at: null },
      select: { id: true, title: true, start_date: true, end_date: true },
    });
    if (!campaign) throw new NotFoundError('Campanha não encontrada');

    const from = range?.from ?? campaign.start_date;
    const to = range?.to ?? new Date();

    // Jornadas em que esta campanha apareceu, separadas em limpas e reprovadas.
    // A separação vem antes de qualquer contagem: tudo abaixo conta só as
    // limpas, e as reprovadas viram a nota de rodapé.
    const sessoes = await prisma.tabletSession.findMany({
      where: {
        company_id: companyId,
        impression_events: { some: { campaign_id: campaignId } },
        started_at: { gte: from, lte: to },
      },
      select: {
        id: true,
        is_suspect: true,
        distance_meters: true,
        device_id: true,
        motorista: { select: { city: true, state: true } },
      },
    });

    const limpas = sessoes.filter((s) => !s.is_suspect);
    const reprovadas = sessoes.filter((s) => s.is_suspect);
    const idsLimpos = limpas.map((s) => s.id);
    const idsReprovados = reprovadas.map((s) => s.id);

    const janela = { gte: from, lte: to };
    const escopo = { campaign_id: campaignId, company_id: companyId };

    const [
      impressoes,
      duracao,
      scans,
      unicos,
      leads,
      convertidos,
      impressoesDaJornada,
      impressoesReprovadas,
    ] = await prisma.$transaction([
      prisma.impressionEvent.count({
        where: { ...escopo, session_id: { in: idsLimpos }, shown_at: janela },
      }),
      prisma.impressionEvent.aggregate({
        where: { ...escopo, session_id: { in: idsLimpos }, shown_at: janela },
        _sum: { duration_ms: true },
      }),
      prisma.scanEvent.count({
        where: { ...escopo, session_id: { in: idsLimpos }, scanned_at: janela },
      }),
      prisma.scanEvent.count({
        where: {
          ...escopo,
          session_id: { in: idsLimpos },
          is_unique: true,
          scanned_at: janela,
        },
      }),
      // Lead reprovado nasce INVALID e não conta como entrega em lugar nenhum.
      prisma.lead.count({
        where: {
          company_id: companyId,
          campaign_id: campaignId,
          status: { not: 'INVALID' },
          scan_event: { session_id: { in: idsLimpos } },
        },
      }),
      prisma.lead.count({
        where: {
          company_id: companyId,
          campaign_id: campaignId,
          status: 'CONVERTED',
          scan_event: { session_id: { in: idsLimpos } },
        },
      }),
      // Total de impressões dessas jornadas, de todos os anunciantes: é o
      // denominador da fatia de tela.
      prisma.impressionEvent.count({
        where: { session_id: { in: idsLimpos }, shown_at: janela },
      }),
      prisma.impressionEvent.count({
        where: { ...escopo, session_id: { in: idsReprovados } },
      }),
    ]);

    // Praças, pela cidade de cadastro do motorista. É o dado que existe:
    // transformar coordenada em bairro exigiria serviço externo de
    // geocodificação, e chutar bairro a partir de latitude seria pior do que
    // não oferecer o recorte.
    const porCidade = new Map<string, { city: string; state: string; journeys: number }>();
    for (const s of limpas) {
      const city = s.motorista?.city;
      const state = s.motorista?.state;
      if (!city || !state) continue;
      const chave = `${city}/${state}`;
      const atual = porCidade.get(chave);
      if (atual) atual.journeys += 1;
      else porCidade.set(chave, { city, state, journeys: 1 });
    }

    const veiculos = new Set(limpas.map((s) => s.device_id).filter(Boolean)).size;
    const metros = limpas.reduce((soma, s) => soma + s.distance_meters, 0);

    const pct = (parte: number, todo: number) =>
      todo > 0 ? Math.round((parte / todo) * 1000) / 10 : null;

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
      },
      period: { from, to },
      funnel: {
        impressions: impressoes,
        scans,
        uniqueScans: unicos,
        leads,
        converted: convertidos,
        scanRate: pct(scans, impressoes),
        leadRate: pct(leads, scans),
        conversionRate: pct(convertidos, leads),
      },
      circulation: {
        screenHours: Math.round(((duracao._sum.duration_ms ?? 0) / 3_600_000) * 10) / 10,
        vehicles: veiculos,
        journeys: limpas.length,
        kilometers: Math.round(metros / 100) / 10,
        screenShare: pct(impressoes, impressoesDaJornada),
        cities: [...porCidade.values()].sort((a, b) => b.journeys - a.journeys),
      },
      byHour: await this.impressionsByHour(companyId, campaignId, from, to),
      excluded: {
        journeys: reprovadas.length,
        impressions: impressoesReprovadas,
        reason:
          'Jornadas reprovadas pela verificação antifraude (sem deslocamento comprovado ou localização simulada). Não entram na entrega nem são cobradas.',
      },
    };
  }

  /**
   * Distribuição por hora do dia.
   *
   * SQL cru porque agrupar por hora extraída de um timestamp não existe no
   * Prisma sem trazer todas as linhas para a memória — e são as impressões de
   * uma campanha inteira.
   *
   * O filtro de jornada limpa é um JOIN, e não a lista de ids das jornadas
   * passada como parâmetro: mandar milhares de ids para reencontrar linhas que
   * o banco já sabe ligar por chave estrangeira é trabalho jogado fora, e o
   * tamanho do parâmetro cresce junto com a campanha.
   */
  private static async impressionsByHour(
    companyId: string,
    campaignId: string,
    from: Date,
    to: Date
  ): Promise<Array<{ hour: number; impressions: number }>> {
    const linhas = await prisma.$queryRaw<Array<{ hour: number; total: bigint }>>`
      SELECT EXTRACT(HOUR FROM i."shown_at")::int AS hour, COUNT(*)::bigint AS total
      FROM "ImpressionEvent" i
      JOIN "TabletSession" s ON s."id" = i."session_id" AND s."is_suspect" = false
      WHERE i."company_id" = ${companyId}
        AND i."campaign_id" = ${campaignId}
        AND i."shown_at" BETWEEN ${from} AND ${to}
      GROUP BY 1
      ORDER BY 1
    `;

    return linhas.map((l) => ({ hour: l.hour, impressions: Number(l.total) }));
  }

  /**
   * Resumo de trabalho do motorista.
   *
   * Responde o que ele pergunta no fim do mês: quanto tempo rodei, quanto
   * andei, quanto rendeu. Horas saem da diferença entre abrir e encerrar a
   * jornada — não de estimativa por número de anúncios exibidos.
   */
  static async driverWorkSummary(userId: string, from: Date, to: Date) {
    const profile = await prisma.motoristProfile.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundError('Perfil de motorista não encontrado');

    const jornadas = await prisma.tabletSession.findMany({
      where: {
        motorista_id: profile.id,
        started_at: { gte: from, lte: to },
        ended_at: { not: null },
      },
      select: {
        started_at: true,
        ended_at: true,
        distance_meters: true,
        is_suspect: true,
        impressions_count: true,
        scans_count: true,
        leads_count: true,
      },
    });

    const limpas = jornadas.filter((j) => !j.is_suspect);
    const minutos = limpas.reduce(
      (soma, j) => soma + (j.ended_at!.getTime() - j.started_at.getTime()) / 60_000,
      0
    );
    const metros = limpas.reduce((soma, j) => soma + j.distance_meters, 0);

    // Ganhos vêm da carteira, nunca de recalcular pela taxa de hoje: a taxa
    // fica gravada em cada lançamento justamente para que mudá-la no futuro
    // não reescreva o que já foi ganho.
    const ganhos = await prisma.driverEarning.aggregate({
      where: {
        motorista_id: profile.id,
        created_at: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      period: { from, to },
      journeys: limpas.length,
      hoursWorked: Math.round((minutos / 60) * 10) / 10,
      kilometers: Math.round(metros / 100) / 10,
      totals: {
        impressions: limpas.reduce((s, j) => s + j.impressions_count, 0),
        scans: limpas.reduce((s, j) => s + j.scans_count, 0),
        leads: limpas.reduce((s, j) => s + j.leads_count, 0),
      },
      earnings: {
        total: ganhos._sum.amount ?? 0,
        entries: ganhos._count._all,
      },
      /** Jornadas reprovadas: aparecem para ele saber que existiram e por quê. */
      rejectedJourneys: jornadas.length - limpas.length,
    };
  }
}
