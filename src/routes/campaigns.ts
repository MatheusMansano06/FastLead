import { Router, Request, Response } from 'express';
import { verifyJWT, asyncHandler } from '../middleware';
import { CampaignService } from '../services/campaignService';
import logger from '../config/logger';

const router = Router();

/**
 * GET /campaigns/:campaignId
 * Get campaign details
 */
router.get(
  '/:campaignId',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign details requested: ${req.params.campaignId}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const campaign = await CampaignService.getCampaignById(
      campaignId,
      req.user!.companyId!
    );

    res.status(200).json({
      message: 'Campaign details retrieved',
      data: campaign,
    });
  })
);

/**
 * GET /campaigns/:campaignId/image
 * Get campaign image
 */
router.get(
  '/:campaignId/image',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign image requested: ${req.params.campaignId}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const imageUrl = await CampaignService.getCampaignImage(
      campaignId,
      req.user!.companyId!
    );

    // Redirect to image URL
    res.redirect(imageUrl);
  })
);

/**
 * GET /campaigns/:campaignId/qr
 * Get campaign QR code
 */
router.get(
  '/:campaignId/qr',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign QR code requested: ${req.params.campaignId}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const qrUrl = await CampaignService.getCampaignQRCode(
      campaignId,
      req.user!.companyId!
    );

    res.status(200).json({
      message: 'QR code retrieved',
      data: { qrCode: qrUrl },
    });
  })
);

/**
 * DELETE /campaigns/:campaignId
 * Delete campaign (soft delete)
 */
router.delete(
  '/:campaignId',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign deletion requested: ${req.params.campaignId}`);

    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;

    const result = await CampaignService.deleteCampaign(
      campaignId,
      req.user!.companyId!
    );

    res.status(200).json({
      message: 'Campaign deleted successfully',
      data: result,
    });
  })
);

export default router;
