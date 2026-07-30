import prisma from '../lib/prisma';
import { RideApp, RideCategory } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { regionForUF, CATEGORY_TO_APP } from '../utils/segmentation';
import logger from '../config/logger';

export class MotoristaService {
  /**
   * Get motorista profile and data
   */
  static async getProfile(userId: string, companyId: string) {
    const motorista = await prisma.motoristProfile.findFirst({
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
            avatar_url: true,
          },
        },
      },
    });

    if (!motorista) {
      throw new NotFoundError('Motorista profile not found');
    }

    return {
      id: motorista.id,
      userId: motorista.user_id,
      name: motorista.user.name,
      email: motorista.user.email,
      avatarUrl: motorista.user.avatar_url,
      phone: motorista.phone || motorista.user.phone,
      bio: motorista.bio,
      vehicleInfo: motorista.vehicle_info,
      licensePlate: motorista.license_plate,
      city: motorista.city,
      state: motorista.state,
      region: motorista.region,
      rideApps: motorista.ride_apps,
      rideCategories: motorista.ride_categories,
      totalEarnings: motorista.total_earnings.toString(),
      status: motorista.status,
      lastOnline: motorista.last_online_at,
    };
  }

  /**
   * Get motorista earnings summary
   */
  static async getEarnings(userId: string, companyId: string) {
    const motorista = await prisma.motoristProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!motorista) {
      throw new NotFoundError('Motorista profile not found');
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get earnings from payments
    const [, monthEarnings, weekEarnings, todayEarnings] = await Promise.all([
      // Total earnings (from motorista_profile)
      prisma.motoristProfile.findUnique({
        where: { id: motorista.id },
        select: { total_earnings: true },
      }),

      // Month earnings
      prisma.payment.aggregate({
        where: {
          motorista_id: motorista.id,
          company_id: companyId,
          period_start: { gte: monthStart },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // Week earnings
      prisma.payment.aggregate({
        where: {
          motorista_id: motorista.id,
          company_id: companyId,
          period_start: { gte: weekStart },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // Today earnings
      prisma.payment.aggregate({
        where: {
          motorista_id: motorista.id,
          company_id: companyId,
          period_start: { gte: todayStart },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
    ]);

    // Get earnings by campaign
    const campaignEarnings = await prisma.payment.groupBy({
      by: ['campaign_id'],
      where: {
        motorista_id: motorista.id,
        company_id: companyId,
        status: 'COMPLETED',
      },
      _sum: { amount: true, leads_count: true },
    });

    const campaignDetails = await Promise.all(
      campaignEarnings
        .filter((ce) => ce.campaign_id !== null)
        .map(async (ce) => {
          const campaign = await prisma.campaign.findUnique({
            where: { id: ce.campaign_id! },
            select: {
              id: true,
              title: true,
              image_url: true,
            },
          });
          return {
            campaignId: ce.campaign_id,
            campaignTitle: campaign?.title,
            campaignImage: campaign?.image_url,
            earnings: ce._sum.amount?.toString() || '0',
            leads: ce._sum.leads_count || 0,
          };
        })
    );

    return {
      totalEarnings: motorista.total_earnings.toString(),
      currentMonth: monthEarnings._sum.amount?.toString() || '0',
      last7Days: weekEarnings._sum.amount?.toString() || '0',
      today: todayEarnings._sum.amount?.toString() || '0',
      byCampaign: campaignDetails,
    };
  }

  /**
   * Get motorista active campaigns
   */
  static async getCampaigns(userId: string, companyId: string) {
    const motorista = await prisma.motoristProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!motorista) {
      throw new NotFoundError('Motorista profile not found');
    }

    // Cross-tenant: o vínculo aceito guarda o company_id do ANUNCIANTE,
    // então filtramos só pelo motorista (não pela company dele).
    const campaigns = await prisma.campaignMotorista.findMany({
      where: {
        motorista_id: motorista.id,
        status: 'ACTIVE',
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            image_url: true,
            price_per_lead: true,
            qr_code_image_url: true,
            status: true,
            start_date: true,
            end_date: true,
            anunciante: { select: { company_name: true } },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Get leads count for each campaign
    const campaignData = await Promise.all(
      campaigns.map(async (cm) => {
        const leadsCount = await prisma.lead.count({
          where: {
            campaign_id: cm.campaign_id,
            motorista_id: motorista.id,
            status: 'CONVERTED',
          },
        });

        return {
          id: cm.campaign.id,
          title: cm.campaign.title,
          company: cm.campaign.anunciante?.company_name,
          image: cm.campaign.image_url,
          pricePerLead: cm.campaign.price_per_lead?.toString(),
          qrCode: cm.campaign.qr_code_image_url,
          status: cm.campaign.status,
          startDate: cm.campaign.start_date,
          endDate: cm.campaign.end_date,
          scans: cm.scans_count,
          leads: leadsCount,
          earnings: (
            leadsCount * parseFloat(cm.campaign.price_per_lead?.toString() || '0')
          ).toString(),
        };
      })
    );

    return campaignData;
  }

  /**
   * Update motorista profile
   */
  static async updateProfile(
    userId: string,
    companyId: string,
    data: {
      name?: string;
      phone?: string;
      vehicleInfo?: string;
      licensePlate?: string;
      status?: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
      bio?: string;
      city?: string;
      state?: string;
      rideApps?: RideApp[];
      rideCategories?: RideCategory[];
      avatarUrl?: string;
    }
  ) {
    const motorista = await prisma.motoristProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!motorista) {
      throw new NotFoundError('Motorista profile not found');
    }

    const state = data.state ? data.state.trim().toUpperCase() : undefined;
    if (state && !regionForUF(state)) {
      throw new ValidationError(`UF inválida: ${state}`);
    }

    // Só aceita modalidade que pertence a um app que o motorista declarou —
    // sem isso a empresa filtraria por "UberX" e cairia num motorista que
    // marcou apenas 99.
    if (data.rideCategories?.length) {
      const apps = data.rideApps ?? motorista.ride_apps;
      const invalid = data.rideCategories.filter((c) => !apps.includes(CATEGORY_TO_APP[c]));
      if (invalid.length) {
        throw new ValidationError(
          `Modalidade não corresponde aos apps selecionados: ${invalid.join(', ')}`
        );
      }
    }

    const updated = await prisma.motoristProfile.update({
      where: { id: motorista.id },
      data: {
        phone: data.phone,
        vehicle_info: data.vehicleInfo,
        license_plate: data.licensePlate ? data.licensePlate.toUpperCase() : undefined,
        status: data.status,
        bio: data.bio,
        city: data.city,
        state,
        // Região nunca é informada pelo cliente: sempre derivada da UF.
        region: state ? regionForUF(state) : undefined,
        ride_apps: data.rideApps ? { set: data.rideApps } : undefined,
        ride_categories: data.rideCategories ? { set: data.rideCategories } : undefined,
        user:
          data.name || data.avatarUrl
            ? { update: { name: data.name, avatar_url: data.avatarUrl } }
            : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar_url: true,
          },
        },
      },
    });

    logger.info(`Motorista profile updated: ${userId}`);

    return {
      id: updated.id,
      name: updated.user.name,
      email: updated.user.email,
      avatarUrl: updated.user.avatar_url,
      phone: updated.phone,
      bio: updated.bio,
      vehicleInfo: updated.vehicle_info,
      licensePlate: updated.license_plate,
      city: updated.city,
      state: updated.state,
      region: updated.region,
      rideApps: updated.ride_apps,
      rideCategories: updated.ride_categories,
      status: updated.status,
      lastUpdated: updated.updated_at,
    };
  }

  /**
   * Update motorista status (online/offline)
   */
  static async updateStatus(
    userId: string,
    companyId: string,
    status: 'ATIVO' | 'INATIVO' | 'SUSPENSO'
  ) {
    const motorista = await prisma.motoristProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!motorista) {
      throw new NotFoundError('Motorista profile not found');
    }

    const updated = await prisma.motoristProfile.update({
      where: { id: motorista.id },
      data: {
        status,
        last_online_at: new Date(),
      },
    });

    logger.info(`Motorista status updated to ${status}: ${userId}`);

    return {
      id: updated.id,
      status: updated.status,
      lastOnline: updated.last_online_at,
    };
  }

  /**
   * Get motorista payment history
   */
  static async getPayments(userId: string, companyId: string, limit = 10, offset = 0) {
    const motorista = await prisma.motoristProfile.findFirst({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    if (!motorista) {
      throw new NotFoundError('Motorista profile not found');
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: {
          motorista_id: motorista.id,
          company_id: companyId,
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({
        where: {
          motorista_id: motorista.id,
          company_id: companyId,
        },
      }),
    ]);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        status: p.status,
        type: p.payment_type,
        campaignId: p.campaign_id,
        campaignTitle: p.campaign?.title,
        leadsCount: p.leads_count,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        paidAt: p.paid_at,
        createdAt: p.created_at,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }
}
