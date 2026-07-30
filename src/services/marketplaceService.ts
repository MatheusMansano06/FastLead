import prisma from '../lib/prisma';
import { RideApp, RideCategory } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError, isPrismaKnownError } from '../utils/errors';
import logger from '../config/logger';

// Marketplace = matching CROSS-TENANT entre anunciantes e motoristas.
// Cada cadastro cria sua própria company, então aqui NÃO filtramos por company_id:
// as oportunidades (campanhas ACTIVE) são visíveis a todos os motoristas.

export class MarketplaceService {
  private static async driverProfile(userId: string) {
    const profile = await prisma.motoristProfile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) throw new NotFoundError('Perfil de motorista não encontrado');
    return profile;
  }

  /**
   * A campanha só aparece para quem ela mira.
   *
   * Cada dimensão de segmentação é independente e "array vazio = sem restrição".
   * Um motorista sem UF preenchida NÃO entra numa campanha que exige UF —
   * caso contrário a empresa pagaria por alcance fora do público que escolheu.
   */
  private static matchesTargeting(
    campaign: {
      target_states: string[];
      target_cities: string[];
      target_ride_apps: RideApp[];
      target_categories: RideCategory[];
    },
    driver: {
      state: string | null;
      city: string | null;
      ride_apps: RideApp[];
      ride_categories: RideCategory[];
    }
  ): boolean {
    if (campaign.target_states.length) {
      if (!driver.state || !campaign.target_states.includes(driver.state)) return false;
    }
    if (campaign.target_cities.length) {
      const city = driver.city?.trim().toLowerCase();
      if (!city || !campaign.target_cities.some((c) => c.trim().toLowerCase() === city))
        return false;
    }
    if (campaign.target_ride_apps.length) {
      if (!driver.ride_apps.some((a) => campaign.target_ride_apps.includes(a))) return false;
    }
    if (campaign.target_categories.length) {
      if (!driver.ride_categories.some((c) => campaign.target_categories.includes(c))) return false;
    }
    return true;
  }

  /** Campanhas abertas (empresas buscando parceiros) que o motorista ainda não aceitou. */
  static async listOpportunities(userId: string) {
    const profile = await this.driverProfile(userId);

    const accepted = await prisma.campaignMotorista.findMany({
      where: { motorista_id: profile.id },
      select: { campaign_id: true },
    });
    const acceptedIds = accepted.map((a) => a.campaign_id);

    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
        id: { notIn: acceptedIds.length ? acceptedIds : ['__none__'] },
      },
      include: {
        anunciante: { select: { company_name: true, industry: true } },
        _count: { select: { motoristas: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const elegiveis = campaigns.filter((c) => this.matchesTargeting(c, profile));

    return elegiveis.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      imageUrl: c.image_url,
      company: c.anunciante?.company_name,
      industry: c.anunciante?.industry,
      pricePerLead: c.price_per_lead?.toString() ?? '0',
      targetVehicles: c.target_vehicles,
      acceptedCount: c._count.motoristas,
      remaining: Math.max(c.target_vehicles - c._count.motoristas, 0),
      startDate: c.start_date,
      endDate: c.end_date,
      createdAt: c.created_at,
    }));
  }

  /** Motorista aceita rodar uma campanha (cria o vínculo CampaignMotorista). */
  static async acceptOpportunity(userId: string, campaignId: string) {
    const profile = await this.driverProfile(userId);

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.deleted_at) throw new NotFoundError('Campanha não encontrada');
    if (campaign.status !== 'ACTIVE')
      throw new ValidationError('Esta campanha não está aberta para novos parceiros');

    const acceptedCount = await prisma.campaignMotorista.count({
      where: { campaign_id: campaignId },
    });
    if (acceptedCount >= campaign.target_vehicles)
      throw new ValidationError('Esta campanha já preencheu todas as vagas');

    // Revalida no aceite: a listagem pode estar velha na tela, ou o motorista
    // pode ter mudado de cidade depois de ver a oportunidade.
    if (!this.matchesTargeting(campaign, profile))
      throw new ValidationError('Seu perfil não atende à segmentação desta campanha');

    // Sem tablet pareado não existe onde exibir o anúncio. Aceitar sem tablet
    // criaria uma vaga ocupada que nunca gera impressão — a empresa pagaria por
    // um carro que não mostra nada. O tablet é a condição do negócio.
    const tablets = await prisma.tabletDevice.count({
      where: { motorista_id: profile.id, status: 'ACTIVE' },
    });
    if (tablets === 0)
      throw new ValidationError(
        'Você precisa parear o tablet do carro antes de aceitar campanhas. Vá em Perfil e tablet para gerar o código.'
      );

    try {
      const link = await prisma.campaignMotorista.create({
        data: {
          company_id: campaign.company_id, // pertence ao anunciante
          campaign_id: campaignId,
          motorista_id: profile.id,
          status: 'ACTIVE',
          acceptance_date: new Date(),
        },
      });
      logger.info(`Motorista ${profile.id} aceitou campanha ${campaignId}`);
      return { id: link.id, campaignId, acceptedAt: link.acceptance_date };
    } catch (e: unknown) {
      if (isPrismaKnownError(e) && e.code === 'P2002')
        throw new ConflictError('Você já aceitou esta campanha');
      throw e;
    }
  }

  /**
   * Motorista tira um anúncio do tablet dele.
   *
   * Vale inclusive para campanha que o MASTER empurrou: é o carro e a tela do
   * motorista, e obrigá-lo a exibir marca que ele não quer (concorrente do
   * patrocinador dele, tema que o desagrada) queimaria a parceria.
   *
   * A linha não é apagada — vira DRIVER_REMOVED. Apagar faria a distribuição
   * automática devolver o anúncio na próxima rodada.
   */
  static async removeCampaign(userId: string, campaignId: string) {
    const profile = await this.driverProfile(userId);

    const vinculo = await prisma.campaignMotorista.findUnique({
      where: { campaign_id_motorista_id: { campaign_id: campaignId, motorista_id: profile.id } },
      select: { id: true, source: true },
    });
    if (!vinculo) throw new NotFoundError('Você não está nesta campanha');
    if (vinculo.source === 'DRIVER_REMOVED') return { removed: true, alreadyRemoved: true };

    await prisma.campaignMotorista.update({
      where: { id: vinculo.id },
      data: { source: 'DRIVER_REMOVED', status: 'CANCELLED', priority: 0 },
    });

    logger.info(`Motorista ${profile.id} removeu a campanha ${campaignId}`);
    return { removed: true, alreadyRemoved: false };
  }

  /** Perfis de motoristas disponíveis (com nota) — para o anunciante escolher. */
  static async listMotoristas(opts: { city?: string; limit?: number } = {}) {
    const motoristas = await prisma.motoristProfile.findMany({
      where: {
        deleted_at: null,
        ...(opts.city ? { city: { contains: opts.city, mode: 'insensitive' } } : {}),
      },
      include: {
        user: { select: { name: true } },
        _count: { select: { campaigns: true } },
      },
      orderBy: [{ rating: 'desc' }, { created_at: 'desc' }],
      take: Math.min(opts.limit ?? 50, 100),
    });

    return motoristas.map((m) => ({
      id: m.id,
      name: m.user?.name,
      city: m.city,
      vehicle: m.vehicle_info,
      rideApp: m.ride_app,
      plate: m.license_plate,
      rating: Number(m.rating).toFixed(1),
      ratingsCount: m.ratings_count,
      status: m.status,
      campaignsCount: m._count.campaigns,
    }));
  }
}
