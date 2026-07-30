import { randomUUID } from 'crypto';
import prisma from '../lib/prisma';
import { QrPosition, Region, RideApp, RideCategory } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { ufsForRegions } from '../utils/segmentation';
import { QRService } from './qrService';
import logger from '../config/logger';

export class AnuncianteService {
  /**
   * Get anunciante profile and company info
   */
  static async getProfile(userId: string, companyId: string) {
    const anunciante = await prisma.anuncianteProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!anunciante) {
      throw new NotFoundError('Anunciante profile not found');
    }

    return {
      id: anunciante.id,
      userId: anunciante.user_id,
      companyName: anunciante.company_name,
      email: anunciante.user.email,
      phone: anunciante.user.phone,
      documentNumber: anunciante.document_number,
      industry: anunciante.industry,
      totalBudget: anunciante.total_budget.toString(),
      totalSpent: anunciante.total_spent.toString(),
      contactPerson: anunciante.contact_person,
    };
  }

  /**
   * Create a new campaign
   */
  static async createCampaign(
    userId: string,
    companyId: string,
    data: {
      title: string;
      description?: string;
      imageUrl?: string;
      numVehicles: number;
      durationDays: number;
      pricePerLead: number;
      publish?: boolean;
      destinationUrl?: string;
      ctaText?: string;
      // Montagem do anúncio na tela do tablet
      showQr?: boolean;
      qrPosition?: QrPosition;
      showText?: boolean;
      // Segmentação — vazio significa "qualquer motorista"
      targetRegions?: Region[];
      targetStates?: string[];
      targetCities?: string[];
      targetRideApps?: RideApp[];
      targetCategories?: RideCategory[];
    }
  ) {
    const anunciante = await prisma.anuncianteProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!anunciante) {
      throw new NotFoundError('Anunciante profile not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + data.durationDays);

    // Calculate total investment
    const totalInvestment = data.numVehicles * data.durationDays * data.pricePerLead;

    // Estados alvo = os informados + os que as regiões escolhidas contêm.
    // Guardar já expandido evita ter que resolver região em toda consulta.
    const statesFromRegions = ufsForRegions(data.targetRegions || []);
    const targetStates = Array.from(
      new Set([...(data.targetStates || []).map((s) => s.toUpperCase()), ...statesFromRegions])
    );

    // O QR precisa apontar para /r/:campaignId, e o id só existe depois do
    // insert. Criamos com um marcador único e trocamos pela URL real logo em
    // seguida — a coluna é UNIQUE, então o marcador não pode colidir.
    const placeholder = `pending_${randomUUID()}`;

    const created = await prisma.campaign.create({
      data: {
        company_id: companyId,
        anunciante_id: anunciante.id,
        created_by_id: userId,
        title: data.title,
        description: data.description || undefined,
        image_url: data.imageUrl,
        qr_code_data: placeholder,
        destination_url: data.destinationUrl || null,
        cta_text: data.ctaText || null,
        show_qr: data.showQr ?? true,
        qr_position: data.qrPosition ?? 'BOTTOM_RIGHT',
        // Sem banner não há texto embutido para competir — o texto tem que
        // aparecer, senão o tablet exibiria um slide vazio.
        show_text: data.imageUrl ? (data.showText ?? true) : true,
        // Publica direto (ACTIVE) para aparecer aos motoristas no marketplace.
        status: data.publish === false ? 'DRAFT' : 'ACTIVE',
        start_date: startDate,
        end_date: endDate,
        target_vehicles: data.numVehicles,
        price_per_lead: data.pricePerLead,
        total_investment: totalInvestment,
        target_regions: data.targetRegions || [],
        target_states: targetStates,
        target_cities: (data.targetCities || []).filter(Boolean),
        target_ride_apps: data.targetRideApps || [],
        target_categories: data.targetCategories || [],
      },
    });

    const { qrCodeData, qrCodeImageUrl } = await QRService.generateQRCode(created.id);
    const campaign = await prisma.campaign.update({
      where: { id: created.id },
      data: { qr_code_data: qrCodeData, qr_code_image_url: qrCodeImageUrl },
    });

    logger.info(`Campaign created: ${campaign.id} by ${userId}`);

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.image_url,
      qrCodeData: campaign.qr_code_data,
      qrCodeImage: campaign.qr_code_image_url,
      status: campaign.status,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      targetVehicles: campaign.target_vehicles,
      pricePerLead: campaign.price_per_lead?.toString(),
      totalInvestment: campaign.total_investment.toString(),
    };
  }

  /**
   * Get all campaigns for anunciante
   */
  static async getCampaigns(userId: string, companyId: string, status?: string) {
    const anunciante = await prisma.anuncianteProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!anunciante) {
      throw new NotFoundError('Anunciante profile not found');
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        anunciante_id: anunciante.id,
        company_id: companyId,
        ...(status && { status: status as any }),
      },
      include: {
        _count: {
          select: {
            leads: true,
            motoristas: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Calculate ROI for each campaign
    const campaignsWithMetrics = campaigns.map((campaign: any) => {
      const roi =
        campaign.total_investment.toNumber() > 0
          ? ((campaign.conversions / Math.max(campaign.total_leads, 1)) * 100).toFixed(2)
          : '0';

      return {
        id: campaign.id,
        title: campaign.title,
        imageUrl: campaign.image_url,
        status: campaign.status,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        targetVehicles: campaign.target_vehicles,
        totalLeads: campaign.total_leads,
        conversions: campaign.conversions,
        uniqueScans: campaign.unique_scans,
        roi: roi,
        pricePerLead: campaign.price_per_lead?.toString(),
        totalInvestment: campaign.total_investment.toString(),
        motoristasCount: campaign._count.motoristas,
      };
    });

    return campaignsWithMetrics;
  }

  /**
   * Update campaign
   */
  static async updateCampaign(
    _userId: string,
    companyId: string,
    campaignId: string,
    data: {
      title?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
      pricePerLead?: number;
    }
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        title: data.title,
        status: data.status,
        price_per_lead: data.pricePerLead || undefined,
      },
    });

    logger.info(`Campaign updated: ${campaignId}`);

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      pricePerLead: updated.price_per_lead?.toString(),
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Empresa deleta a campanha que criou. Apaga a linha e seus vínculos.
   */
  static async deleteCampaign(_userId: string, companyId: string, campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campanha não encontrada nesta empresa');
    }

    // Apaga tudo: vínculos com motorista, impressões, scans, leads, e a campanha.
    // Cascatas já estão configuradas no schema.
    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    logger.info(`Campaign deleted by advertiser: ${campaignId}`);

    return { deletedCampaignId: campaignId };
  }

  /**
   * Get leads for a campaign
   */
  static async getCampaignLeads(
    _userId: string,
    companyId: string,
    campaignId: string,
    status?: string,
    limit = 20,
    offset = 0
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: {
          campaign_id: campaignId,
          company_id: companyId,
          ...(status && { status: status as any }),
        },
        include: {
          motorista: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({
        where: {
          campaign_id: campaignId,
          company_id: companyId,
          ...(status && { status: status as any }),
        },
      }),
    ]);

    return {
      leads: leads.map((lead: any) => ({
        id: lead.id,
        status: lead.status,
        motoristName: lead.motorista?.user?.name,
        leadUser: lead.user.name,
        leadEmail: lead.user.email,
        leadPhone: lead.user.email,
        device: lead.user_device,
        ipAddress: lead.ip_address,
        location:
          lead.latitude && lead.longitude ? { lat: lead.latitude, lng: lead.longitude } : null,
        scannedAt: lead.qr_scan_time,
        convertedAt: lead.converted_at,
        conversionValue: lead.conversion_value?.toString(),
        createdAt: lead.created_at,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Get campaign details with analytics
   */
  static async getCampaignDetails(_userId: string, companyId: string, campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        motoristas: {
          select: {
            acceptance_date: true,
            motorista: {
              select: {
                id: true,
                city: true,
                vehicle_info: true,
                ride_app: true,
                rating: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            scans_count: true,
            leads_generated: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    const conversionRate =
      campaign.total_leads > 0
        ? ((campaign.conversions / campaign.total_leads) * 100).toFixed(2)
        : '0';

    const roi =
      campaign.total_investment.toNumber() > 0
        ? (
            (campaign.conversions / Math.max(campaign.total_investment.toNumber(), 1)) *
            100
          ).toFixed(2)
        : '0';

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.image_url,
      qrCodeImage: campaign.qr_code_image_url,
      status: campaign.status,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      targetVehicles: campaign.target_vehicles,
      totalLeads: campaign.total_leads,
      uniqueScans: campaign.unique_scans,
      conversions: campaign.conversions,
      conversionRate: conversionRate,
      roi: roi,
      pricePerLead: campaign.price_per_lead?.toString(),
      totalInvestment: campaign.total_investment.toString(),
      motoristas: campaign.motoristas.map((m: any) => ({
        id: m.motorista.id,
        name: m.motorista.user.name,
        city: m.motorista.city,
        vehicle: m.motorista.vehicle_info,
        rideApp: m.motorista.ride_app,
        rating: Number(m.motorista.rating).toFixed(1),
        acceptedAt: m.acceptance_date,
        scans: m.scans_count,
        leads: m.leads_generated,
      })),
    };
  }
}
