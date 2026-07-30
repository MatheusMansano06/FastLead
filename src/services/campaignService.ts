import prisma from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import logger from '../config/logger';

export class CampaignService {
  /**
   * Get campaign details by ID
   */
  static async getCampaignById(campaignId: string, companyId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        anunciante: {
          select: {
            id: true,
            company_name: true,
          },
        },
        motoristas: {
          select: {
            id: true,
            scans_count: true,
            leads_generated: true,
          },
        },
        leads: {
          select: {
            id: true,
            status: true,
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
      pricePerLead: campaign.price_per_lead?.toString(),
      totalInvestment: campaign.total_investment.toString(),
      advertiserName: campaign.anunciante.company_name,
      motoristasCount: campaign.motoristas.length,
    };
  }

  /**
   * Get campaign image
   */
  static async getCampaignImage(campaignId: string, companyId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        image_url: true,
        company_id: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    if (!campaign.image_url) {
      throw new NotFoundError('Campaign image not found');
    }

    return campaign.image_url;
  }

  /**
   * Get campaign QR code image
   */
  static async getCampaignQRCode(campaignId: string, companyId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        qr_code_image_url: true,
        company_id: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    if (!campaign.qr_code_image_url) {
      throw new NotFoundError('QR code not found');
    }

    return campaign.qr_code_image_url;
  }

  /**
   * Soft delete campaign
   */
  static async deleteCampaign(campaignId: string, companyId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    const deleted = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        deleted_at: new Date(),
        status: 'CANCELLED',
      },
    });

    logger.info(`Campaign deleted: ${campaignId}`);

    return {
      id: deleted.id,
      status: deleted.status,
      deletedAt: deleted.deleted_at,
    };
  }

  /**
   * Activate a campaign (DRAFT -> ACTIVE)
   */
  static async activateCampaign(campaignId: string, companyId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      throw new Error('Campaign cannot be activated from current status');
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
      },
    });

    logger.info(`Campaign activated: ${campaignId}`);

    return {
      id: updated.id,
      status: updated.status,
      activatedAt: updated.updated_at,
    };
  }

  /**
   * Pause a campaign
   */
  static async pauseCampaign(campaignId: string, companyId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.company_id !== companyId) {
      throw new NotFoundError('Campaign not found in this company');
    }

    if (campaign.status !== 'ACTIVE') {
      throw new Error('Only active campaigns can be paused');
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'PAUSED',
      },
    });

    logger.info(`Campaign paused: ${campaignId}`);

    return {
      id: updated.id,
      status: updated.status,
      pausedAt: updated.updated_at,
    };
  }

  /**
   * Get campaigns by status (for admin/monitoring)
   */
  static async getCampaignsByStatus(
    companyId: string,
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  ) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        company_id: companyId,
        status,
      },
      select: {
        id: true,
        title: true,
        status: true,
        start_date: true,
        end_date: true,
        total_leads: true,
        unique_scans: true,
        conversions: true,
        anunciante: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return campaigns;
  }

  /**
   * Process QR scan - increment scans and create leads
   */
  static async processQRScan(
    qrCodeData: string,
    companyId: string,
    leadData: {
      motoristId: string;
      userId: string;
      userDevice?: string;
      ipAddress?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    // Find campaign by QR code
    const campaign = await prisma.campaign.findFirst({
      where: {
        qr_code_data: qrCodeData,
        company_id: companyId,
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check if motorista is enrolled in campaign
    const campaignMotorista = await prisma.campaignMotorista.findUnique({
      where: {
        campaign_id_motorista_id: {
          campaign_id: campaign.id,
          motorista_id: leadData.motoristId,
        },
      },
    });

    if (!campaignMotorista) {
      throw new NotFoundError('Motorista not enrolled in this campaign');
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        company_id: companyId,
        campaign_id: campaign.id,
        motorista_id: leadData.motoristId,
        user_id: leadData.userId,
        status: 'PENDING',
        qr_scan_time: new Date(),
        user_device: leadData.userDevice,
        ip_address: leadData.ipAddress,
        latitude: leadData.latitude,
        longitude: leadData.longitude,
      },
    });

    // Increment scans and leads count
    await Promise.all([
      prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          unique_scans: { increment: 1 },
          total_leads: { increment: 1 },
        },
      }),
      prisma.campaignMotorista.update({
        where: {
          campaign_id_motorista_id: {
            campaign_id: campaign.id,
            motorista_id: leadData.motoristId,
          },
        },
        data: {
          scans_count: { increment: 1 },
          leads_generated: { increment: 1 },
        },
      }),
    ]);

    logger.info(`QR scan processed: campaign=${campaign.id}, lead=${lead.id}`);

    return {
      id: lead.id,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      status: lead.status,
    };
  }
}
