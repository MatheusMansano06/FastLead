import { Router, Request, Response } from 'express';
import { verifyJWT, asyncHandler } from '../middleware';
import { PaymentService } from '../services/paymentService';
import logger from '../config/logger';

const router = Router();

/**
 * GET /payments/motorista/:motoristaId/earnings
 * Get motorista earnings summary
 */
router.get(
  '/motorista/:motoristaId/earnings',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Earnings requested for motorista ${req.params.motoristaId}`);

    const motoristaId = Array.isArray(req.params.motoristaId)
      ? req.params.motoristaId[0]
      : req.params.motoristaId;

    const earnings = await PaymentService.calculateMotoristaEarnings(motoristaId);

    res.status(200).json({
      message: 'Earnings retrieved',
      data: earnings,
    });
  })
);

export default router;
