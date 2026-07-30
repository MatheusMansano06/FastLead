import { Router, Request, Response } from 'express';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { AnuncianteService } from '../services/anuncianteService';
import { MarketplaceService } from '../services/marketplaceService';
import { UserType } from '../types';
import logger from '../config/logger';

const router = Router();

/**
 * GET /advertiser/motoristas
 * Lista perfis de motoristas disponíveis (com nota) para o anunciante escolher.
 */
router.get(
  '/motoristas',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const motoristas = await MarketplaceService.listMotoristas({ city });
    res.status(200).json({ message: 'Motoristas', data: motoristas });
  })
);

// Helper to safely get query strings
const getQueryString = (value: any): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
};

/**
 * GET /advertiser/me
 * Get anunciante profile
 */
router.get(
  '/me',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Advertiser profile requested by ${req.user?.id}`);

    const profile = await AnuncianteService.getProfile(req.user!.id, req.user!.companyId!);

    res.status(200).json({
      message: 'Advertiser profile retrieved',
      data: profile,
    });
  })
);

/**
 * GET /advertiser/campaigns
 * Get anunciante campaigns
 */
router.get(
  '/campaigns',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaigns requested by advertiser ${req.user?.id}`);

    const status = getQueryString(req.query.status);
    const campaigns = await AnuncianteService.getCampaigns(
      req.user!.id,
      req.user!.companyId!,
      status
    );

    res.status(200).json({
      message: 'Campaigns retrieved',
      data: campaigns,
    });
  })
);

/**
 * POST /advertiser/campaigns
 * Create new campaign
 */
router.post(
  '/campaigns',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign creation requested by advertiser ${req.user?.id}`);

    const {
      title,
      description,
      imageUrl,
      numVehicles,
      durationDays,
      pricePerLead,
      publish,
      destinationUrl,
      ctaText,
      showQr,
      qrPosition,
      showText,
      targetRegions,
      targetStates,
      targetCities,
      targetRideApps,
      targetCategories,
    } = req.body;

    if (!title || !numVehicles || !durationDays || pricePerLead === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter(Boolean).map(String) : [];

    const campaign = await AnuncianteService.createCampaign(req.user!.id, req.user!.companyId!, {
      title,
      description,
      imageUrl,
      numVehicles: Number(numVehicles),
      durationDays: Number(durationDays),
      pricePerLead: Number(pricePerLead),
      publish,
      destinationUrl,
      ctaText,
      showQr: showQr !== false,
      qrPosition,
      showText: showText !== false,
      targetRegions: asArray(targetRegions) as any,
      targetStates: asArray(targetStates),
      targetCities: asArray(targetCities),
      targetRideApps: asArray(targetRideApps) as any,
      targetCategories: asArray(targetCategories) as any,
    });

    res.status(201).json({
      message: 'Campaign created successfully',
      data: campaign,
    });
  })
);

/**
 * GET /advertiser/campaigns/:campaignId
 * Get campaign details
 */
router.get(
  '/campaigns/:campaignId',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign details requested by ${req.user?.id}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const campaign = await AnuncianteService.getCampaignDetails(
      req.user!.id,
      req.user!.companyId!,
      campaignId
    );

    res.status(200).json({
      message: 'Campaign details retrieved',
      data: campaign,
    });
  })
);

/**
 * DELETE /advertiser/campaigns/:campaignId
 * Empresa deleta a campanha que criou
 */
router.delete(
  '/campaigns/:campaignId',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    const campaignId = String(req.params.campaignId);
    const result = await AnuncianteService.deleteCampaign(
      req.user!.id,
      req.user!.companyId!,
      campaignId
    );
    res.status(200).json({ message: 'Campanha deletada', data: result });
  })
);

/**
 * PATCH /advertiser/campaigns/:campaignId
 * Update campaign
 */
router.patch(
  '/campaigns/:campaignId',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign update requested by ${req.user?.id}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const { title, status, pricePerLead } = req.body;

    const updated = await AnuncianteService.updateCampaign(
      req.user!.id,
      req.user!.companyId!,
      campaignId,
      {
        title,
        status,
        pricePerLead,
      }
    );

    res.status(200).json({
      message: 'Campaign updated successfully',
      data: updated,
    });
  })
);

/**
 * GET /advertiser/campaigns/:campaignId/leads
 * Get campaign leads
 */
router.get(
  '/campaigns/:campaignId/leads',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign leads requested by ${req.user?.id}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const status = getQueryString(req.query.status);
    const limitStr = getQueryString(req.query.limit) || '20';
    const offsetStr = getQueryString(req.query.offset) || '0';

    const limit = Math.min(parseInt(limitStr, 10) || 20, 100);
    const offset = parseInt(offsetStr, 10) || 0;

    const leads = await AnuncianteService.getCampaignLeads(
      req.user!.id,
      req.user!.companyId!,
      campaignId,
      status,
      limit,
      offset
    );

    res.status(200).json({
      message: 'Campaign leads retrieved',
      data: leads,
    });
  })
);

export default router;
