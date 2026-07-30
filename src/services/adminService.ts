import prisma from '../lib/prisma';
import { Prisma, Region, RideApp, RideCategory } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { RIDE_APP_LABELS, RIDE_CATEGORY_LABELS, REGION_LABELS } from '../utils/segmentation';

export interface MasterFilters {
  region?: Region;
  state?: string;
  city?: string;
  rideApp?: RideApp;
  rideCategory?: RideCategory;
  from?: Date;
  to?: Date;
}

/**
 * Visão MASTER: agrega TODAS as empresas e motoristas, sem recorte por tenant.
 *
 * Todo número aqui sai de contagem no banco. Se ainda não houve evento, o valor
 * é zero de verdade — nada é estimado nem preenchido para a tela parecer cheia.
 */
export class AdminService {
  private static driverWhere(f: MasterFilters): Prisma.MotoristProfileWhereInput {
    const where: Prisma.MotoristProfileWhereInput = { deleted_at: null };
    if (f.region) where.region = f.region;
    if (f.state) where.state = f.state.toUpperCase();
    if (f.city) where.city = { contains: f.city, mode: 'insensitive' };
    if (f.rideApp) where.ride_apps = { has: f.rideApp };
    if (f.rideCategory) where.ride_categories = { has: f.rideCategory };
    return where;
  }

  private static dateWhere(f: MasterFilters) {
    if (!f.from && !f.to) return undefined;
    return { gte: f.from, lte: f.to };
  }

  /** Números do topo do painel + funil de divulgação. */
  static async overview(f: MasterFilters = {}) {
    const driverWhere = this.driverWhere(f);
    const period = this.dateWhere(f);

    // Quando há filtro de motorista, o funil precisa considerar só os eventos
    // desses motoristas — senão o número do topo não bate com a lista de baixo.
    const hasDriverFilter = Object.keys(driverWhere).length > 1;
    const driverIds = hasDriverFilter
      ? (await prisma.motoristProfile.findMany({ where: driverWhere, select: { id: true } })).map(
          (d) => d.id
        )
      : null;

    const eventScope = driverIds ? { motorista_id: { in: driverIds } } : {};

    // $transaction e NÃO Promise.all: o pooler do Supabase em session mode
    // permite 15 conexões, e Promise.all abriria uma por query — 12 de uma vez
    // estouram o limite assim que duas pessoas abrem o painel junto.
    // Em transação tudo roda numa conexão só.
    const [
      companies,
      advertisers,
      driversTotal,
      driversActive,
      devicesPaired,
      campaignsTotal,
      campaignsActive,
      impressions,
      scansTotal,
      scansUnique,
      leads,
      leadsConverted,
    ] = await prisma.$transaction([
      prisma.company.count({ where: { deleted_at: null } }),
      prisma.anuncianteProfile.count({ where: { deleted_at: null } }),
      prisma.motoristProfile.count({ where: driverWhere }),
      prisma.motoristProfile.count({ where: { ...driverWhere, status: 'ATIVO' } }),
      prisma.tabletDevice.count({
        where: { status: 'ACTIVE', ...(driverIds ? { motorista_id: { in: driverIds } } : {}) },
      }),
      prisma.campaign.count({ where: { deleted_at: null } }),
      prisma.campaign.count({ where: { deleted_at: null, status: 'ACTIVE' } }),
      prisma.impressionEvent.count({
        where: { ...eventScope, ...(period ? { shown_at: period } : {}) },
      }),
      prisma.scanEvent.count({ where: { ...eventScope, ...(period ? { scanned_at: period } : {}) } }),
      prisma.scanEvent.count({
        where: { ...eventScope, is_unique: true, ...(period ? { scanned_at: period } : {}) },
      }),
      prisma.lead.count({
        where: { deleted_at: null, ...eventScope, ...(period ? { created_at: period } : {}) },
      }),
      prisma.lead.count({
        where: {
          deleted_at: null,
          status: 'CONVERTED',
          ...eventScope,
          ...(period ? { created_at: period } : {}),
        },
      }),
    ]);

    const pct = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

    return {
      totals: {
        companies,
        advertisers,
        driversTotal,
        driversActive,
        devicesPaired,
        campaignsTotal,
        campaignsActive,
      },
      funnel: {
        impressions,
        scans: scansTotal,
        uniqueScans: scansUnique,
        leads,
        conversions: leadsConverted,
      },
      rates: {
        /** Quantas exibições viraram leitura de QR. */
        scanRate: pct(scansUnique, impressions),
        /** Quantas leituras viraram contato. */
        leadRate: pct(leads, scansUnique),
        conversionRate: pct(leadsConverted, leads),
      },
      appliedFilters: f,
    };
  }

  /** Série diária para o gráfico do painel. Respeita os mesmos filtros do overview. */
  static async timeseries(days = 14, f: MasterFilters = {}) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const driverWhere = this.driverWhere(f);
    const hasDriverFilter = Object.keys(driverWhere).length > 1;
    const driverIds = hasDriverFilter
      ? (await prisma.motoristProfile.findMany({ where: driverWhere, select: { id: true } })).map(
          (d) => d.id
        )
      : null;
    const scope = driverIds ? { motorista_id: { in: driverIds } } : {};

    const [scans, impressions, leads] = await prisma.$transaction([
      prisma.scanEvent.findMany({
        where: { ...scope, scanned_at: { gte: since } },
        select: { scanned_at: true, is_unique: true },
      }),
      prisma.impressionEvent.findMany({
        where: { ...scope, shown_at: { gte: since } },
        select: { shown_at: true },
      }),
      prisma.lead.findMany({
        where: { ...scope, created_at: { gte: since }, deleted_at: null },
        select: { created_at: true },
      }),
    ]);

    const buckets = new Map<
      string,
      { date: string; impressions: number; scans: number; uniqueScans: number; leads: number }
    >();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, impressions: 0, scans: 0, uniqueScans: 0, leads: 0 });
    }

    const bump = (when: Date, field: 'impressions' | 'scans' | 'leads', unique = false) => {
      const key = when.toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (!b) return;
      b[field] += 1;
      if (field === 'scans' && unique) b.uniqueScans += 1;
    };

    impressions.forEach((i) => bump(i.shown_at, 'impressions'));
    scans.forEach((s) => bump(s.scanned_at, 'scans', s.is_unique));
    leads.forEach((l) => bump(l.created_at, 'leads'));

    return Array.from(buckets.values());
  }

  /** Lista de motoristas com o desempenho real de cada um. */
  static async drivers(f: MasterFilters = {}, page = 1, limit = 50) {
    const where = this.driverWhere(f);
    const [total, rows] = await prisma.$transaction([
      prisma.motoristProfile.count({ where }),
      prisma.motoristProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          city: true,
          state: true,
          region: true,
          ride_apps: true,
          ride_categories: true,
          status: true,
          rating: true,
          total_earnings: true,
          created_at: true,
          user: { select: { name: true, email: true, avatar_url: true } },
          _count: {
            select: {
              scan_events: true,
              impression_events: true,
              leads: true,
              campaigns: true,
              devices: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      drivers: rows.map((d) => ({
        id: d.id,
        name: d.user.name,
        email: d.user.email,
        avatarUrl: d.user.avatar_url,
        city: d.city,
        state: d.state,
        region: d.region,
        regionLabel: d.region ? REGION_LABELS[d.region] : null,
        rideApps: d.ride_apps.map((a) => ({ value: a, label: RIDE_APP_LABELS[a] })),
        rideCategories: d.ride_categories.map((c) => ({
          value: c,
          label: RIDE_CATEGORY_LABELS[c],
        })),
        status: d.status,
        rating: Number(d.rating),
        totalEarnings: Number(d.total_earnings),
        createdAt: d.created_at,
        metrics: {
          impressions: d._count.impression_events,
          scans: d._count.scan_events,
          leads: d._count.leads,
          campaigns: d._count.campaigns,
          devices: d._count.devices,
        },
      })),
    };
  }

  /** Todas as empresas anunciantes e o que cada uma gerou. */
  static async companies(page = 1, limit = 50) {
    const [total, rows] = await prisma.$transaction([
      prisma.anuncianteProfile.count({ where: { deleted_at: null } }),
      prisma.anuncianteProfile.findMany({
        where: { deleted_at: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          company_name: true,
          trade_name: true,
          document_number: true,
          industry: true,
          total_budget: true,
          total_spent: true,
          created_at: true,
          company_id: true,
          user: { select: { name: true, email: true } },
          _count: { select: { campaigns: true } },
        },
      }),
    ]);

    // Eventos são por tenant (company_id), então agregamos uma vez e cruzamos.
    const companyIds = rows.map((r) => r.company_id);
    const [scanAgg, leadAgg, imprAgg] = await prisma.$transaction([
      prisma.scanEvent.groupBy({
        by: ['company_id'],
        where: { company_id: { in: companyIds } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ['company_id'],
        where: { company_id: { in: companyIds }, deleted_at: null },
        _count: { _all: true },
      }),
      prisma.impressionEvent.groupBy({
        by: ['company_id'],
        where: { company_id: { in: companyIds } },
        _count: { _all: true },
      }),
    ]);

    const idx = (agg: Array<{ company_id: string; _count: { _all: number } }>) =>
      new Map(agg.map((a) => [a.company_id, a._count._all]));
    const scans = idx(scanAgg);
    const leads = idx(leadAgg);
    const imprs = idx(imprAgg);

    return {
      total,
      page,
      limit,
      companies: rows.map((c) => ({
        id: c.id,
        companyName: c.company_name,
        tradeName: c.trade_name,
        documentNumber: c.document_number,
        industry: c.industry,
        contactName: c.user.name,
        contactEmail: c.user.email,
        totalBudget: Number(c.total_budget),
        totalSpent: Number(c.total_spent),
        createdAt: c.created_at,
        metrics: {
          campaigns: c._count.campaigns,
          impressions: imprs.get(c.company_id) || 0,
          scans: scans.get(c.company_id) || 0,
          leads: leads.get(c.company_id) || 0,
        },
      })),
    };
  }

  /** Campanhas de todas as empresas, com desempenho. */
  static async campaigns(page = 1, limit = 50) {
    const [total, rows] = await prisma.$transaction([
      prisma.campaign.count({ where: { deleted_at: null } }),
      prisma.campaign.findMany({
        where: { deleted_at: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          start_date: true,
          end_date: true,
          target_vehicles: true,
          target_regions: true,
          target_states: true,
          target_cities: true,
          target_ride_apps: true,
          target_categories: true,
          total_investment: true,
          created_at: true,
          anunciante: { select: { company_name: true, trade_name: true } },
          _count: { select: { motoristas: true, scan_events: true, leads: true, impression_events: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      campaigns: rows.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        advertiser: c.anunciante.trade_name || c.anunciante.company_name,
        startDate: c.start_date,
        endDate: c.end_date,
        targetVehicles: c.target_vehicles,
        assignedDrivers: c._count.motoristas,
        targeting: {
          regions: c.target_regions,
          states: c.target_states,
          cities: c.target_cities,
          rideApps: c.target_ride_apps,
          categories: c.target_categories,
        },
        totalInvestment: Number(c.total_investment),
        createdAt: c.created_at,
        metrics: {
          impressions: c._count.impression_events,
          scans: c._count.scan_events,
          leads: c._count.leads,
        },
      })),
    };
  }

  /**
   * MASTER distribui uma campanha automaticamente.
   *
   * Pega os motoristas que (a) batem com a segmentação da campanha e
   * (b) têm tablet pareado, e coloca a campanha no tablet deles até fechar
   * `target_vehicles`. Preferência para quem tem menos campanha rodando, para
   * o anúncio não concentrar tudo em dois carros.
   *
   * É o caminho do "não espero o motorista aceitar" — o vínculo nasce
   * MASTER_FORCED e já entra na playlist.
   */
  static async autoAssign(adminUserId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, deleted_at: null },
      select: {
        id: true,
        company_id: true,
        target_vehicles: true,
        target_states: true,
        target_cities: true,
        target_ride_apps: true,
        target_categories: true,
      },
    });
    if (!campaign) throw new NotFoundError('Campanha não encontrada');

    const jaVinculados = await prisma.campaignMotorista.findMany({
      where: { campaign_id: campaignId },
      select: { motorista_id: true, source: true },
    });
    // Vaga só conta como ocupada se o anúncio realmente vai rodar. Bloqueio do
    // MASTER e recusa do motorista liberam a vaga para outro carro.
    const ocupadas = jaVinculados.filter(
      (v) => v.source !== 'MASTER_BLOCKED' && v.source !== 'DRIVER_REMOVED'
    ).length;
    const vagas = campaign.target_vehicles - ocupadas;
    if (vagas <= 0) return { assigned: 0, reason: 'Campanha já preencheu todas as vagas' };

    const excluir = jaVinculados.map((v) => v.motorista_id);

    // Só motorista com tablet ATIVO entra: sem tela não há impressão.
    const candidatos = await prisma.motoristProfile.findMany({
      where: {
        deleted_at: null,
        id: { notIn: excluir.length ? excluir : ['__none__'] },
        devices: { some: { status: 'ACTIVE' } },
        ...(campaign.target_states.length ? { state: { in: campaign.target_states } } : {}),
        ...(campaign.target_ride_apps.length
          ? { ride_apps: { hasSome: campaign.target_ride_apps } }
          : {}),
        ...(campaign.target_categories.length
          ? { ride_categories: { hasSome: campaign.target_categories } }
          : {}),
      },
      select: { id: true, city: true, _count: { select: { campaigns: true } } },
    });

    // Cidade fica fora do SQL porque a comparação precisa ser case-insensitive
    // contra uma lista — mais simples resolver aqui do que montar OR gigante.
    const cidades = campaign.target_cities.map((c) => c.trim().toLowerCase());
    const elegiveis = cidades.length
      ? candidatos.filter((m) => m.city && cidades.includes(m.city.trim().toLowerCase()))
      : candidatos;

    const escolhidos = elegiveis
      .sort((a, b) => a._count.campaigns - b._count.campaigns)
      .slice(0, vagas);

    if (!escolhidos.length)
      return { assigned: 0, reason: 'Nenhum motorista com tablet pareado atende à segmentação' };

    await prisma.campaignMotorista.createMany({
      data: escolhidos.map((m) => ({
        company_id: campaign.company_id,
        campaign_id: campaignId,
        motorista_id: m.id,
        source: 'MASTER_FORCED' as const,
        assigned_by_id: adminUserId,
        assigned_at: new Date(),
        acceptance_date: new Date(),
        priority: 10,
      })),
      skipDuplicates: true,
    });

    return { assigned: escolhidos.length, candidates: elegiveis.length, vagasRestantes: vagas - escolhidos.length };
  }

  /** MASTER força uma campanha no tablet de um motorista, ou bloqueia. */
  static async setAssignment(
    adminUserId: string,
    campaignId: string,
    motoristaId: string,
    action: 'FORCE' | 'BLOCK' | 'CLEAR'
  ) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, deleted_at: null },
      select: { id: true, company_id: true },
    });
    if (!campaign) throw new Error('Campanha não encontrada');

    if (action === 'CLEAR') {
      await prisma.campaignMotorista.deleteMany({
        where: { campaign_id: campaignId, motorista_id: motoristaId },
      });
      return { cleared: true };
    }

    const source = action === 'FORCE' ? 'MASTER_FORCED' : 'MASTER_BLOCKED';

    const row = await prisma.campaignMotorista.upsert({
      where: { campaign_id_motorista_id: { campaign_id: campaignId, motorista_id: motoristaId } },
      create: {
        company_id: campaign.company_id,
        campaign_id: campaignId,
        motorista_id: motoristaId,
        source,
        assigned_by_id: adminUserId,
        assigned_at: new Date(),
        acceptance_date: action === 'FORCE' ? new Date() : null,
        priority: action === 'FORCE' ? 10 : 0,
      },
      update: {
        source,
        assigned_by_id: adminUserId,
        assigned_at: new Date(),
        priority: action === 'FORCE' ? 10 : 0,
      },
      select: { id: true, source: true },
    });

    return row;
  }
}
