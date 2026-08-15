import { Router, Request, Response } from 'express';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { MotoristaService } from '../services/motoristaService';
import { MarketplaceService } from '../services/marketplaceService';
import { TabletService } from '../services/tabletService';
import { ReviewService } from '../services/reviewService';
import { ReportService } from '../services/reportService';
import { UserType } from '../types';
import logger from '../config/logger';

const router = Router();

/**
 * GET /driver/opportunities
 * Campanhas abertas (empresas buscando parceiros) que o motorista pode aceitar.
 */
router.get(
  '/opportunities',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const opportunities = await MarketplaceService.listOpportunities(req.user!.id);
    res.status(200).json({ message: 'Oportunidades', data: opportunities });
  })
);

/**
 * POST /driver/opportunities/:campaignId/accept
 * Motorista escolhe rodar a campanha.
 */
router.post(
  '/opportunities/:campaignId/accept',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const campaignId = Array.isArray(req.params.campaignId)
      ? req.params.campaignId[0]
      : req.params.campaignId;
    const result = await MarketplaceService.acceptOpportunity(req.user!.id, campaignId);
    res.status(201).json({ message: 'Campanha aceita', data: result });
  })
);

/**
 * DELETE /driver/campaigns/:campaignId
 * Motorista tira o anúncio do tablet dele. Vale até para campanha empurrada
 * pelo MASTER — a tela é dele.
 */
router.delete(
  '/campaigns/:campaignId',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await MarketplaceService.removeCampaign(
      req.user!.id,
      String(req.params.campaignId)
    );
    res.status(200).json({ message: 'Anúncio removido do seu tablet', data: result });
  })
);

/**
 * GET /driver/me
 * Get motorista profile and data
 */
router.get(
  '/me',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Driver profile requested by ${req.user?.id}`);

    const profile = await MotoristaService.getProfile(req.user!.id, req.user!.companyId!);

    res.status(200).json({
      message: 'Driver profile retrieved',
      data: profile,
    });
  })
);

/**
 * GET /driver/earnings
 * Get motorista earnings summary
 */
router.get(
  '/earnings',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Earnings requested by driver ${req.user?.id}`);

    const earnings = await MotoristaService.getEarnings(req.user!.id, req.user!.companyId!);

    res.status(200).json({
      message: 'Earnings retrieved',
      data: earnings,
    });
  })
);

/**
 * GET /driver/campaigns
 * Get motorista active campaigns
 */
router.get(
  '/campaigns',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaigns requested by driver ${req.user?.id}`);

    const campaigns = await MotoristaService.getCampaigns(req.user!.id, req.user!.companyId!);

    res.status(200).json({
      message: 'Campaigns retrieved',
      data: campaigns,
    });
  })
);

/**
 * GET /driver/payments
 * Get motorista payment history
 */
router.get(
  '/payments',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Payments requested by driver ${req.user?.id}`);

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const payments = await MotoristaService.getPayments(
      req.user!.id,
      req.user!.companyId!,
      limit,
      offset
    );

    res.status(200).json({
      message: 'Payment history retrieved',
      data: payments,
    });
  })
);

/**
 * PATCH /driver/profile
 * Update motorista profile
 */
router.patch(
  '/profile',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Driver profile update requested by ${req.user?.id}`);

    const {
      name,
      phone,
      vehicleInfo,
      licensePlate,
      status,
      bio,
      city,
      state,
      rideApps,
      rideCategories,
      avatarUrl,
    } = req.body;

    const updated = await MotoristaService.updateProfile(req.user!.id, req.user!.companyId!, {
      name,
      phone,
      vehicleInfo,
      licensePlate,
      status: status?.toUpperCase(),
      bio,
      city,
      state,
      rideApps,
      rideCategories,
      avatarUrl,
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      data: updated,
    });
  })
);

/**
 * POST /driver/devices/pair-code
 * Gera o código de 6 dígitos que o motorista digita no tablet do carro.
 */
router.post(
  '/devices/pair-code',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await TabletService.createPairingCode(req.user!.id, req.body?.label);
    res.status(201).json({ message: 'Código gerado', data: result });
  })
);

/** GET /driver/sessions — histórico de jornadas encerradas */
router.get(
  '/sessions',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(90, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));
    res.status(200).json({ data: await TabletService.sessionHistory(req.user!.id, limit) });
  })
);

/**
 * GET /driver/work-summary — quanto rodei, quanto andei, quanto rendeu.
 *
 * Horas saem da diferença entre abrir e encerrar a jornada, e quilômetros da
 * telemetria — nada é estimado por número de anúncios exibidos.
 *
 * `from`/`to` em ISO; sem eles, os últimos 30 dias.
 */
router.get(
  '/work-summary',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const lerData = (v: unknown): Date | undefined => {
      if (typeof v !== 'string') return undefined;
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    };
    const to = lerData(req.query.to) ?? new Date();
    const from = lerData(req.query.from) ?? new Date(to.getTime() - 30 * 24 * 3600_000);

    res.status(200).json({
      data: await ReportService.driverWorkSummary(req.user!.id, from, to),
    });
  })
);

/** GET /driver/devices — tablets vinculados a este motorista */
router.get(
  '/devices',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await TabletService.listForDriver(req.user!.id) });
  })
);

/** DELETE /driver/devices/:deviceId — desvincular tablet (venda do carro, roubo) */
router.delete(
  '/devices/:deviceId',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    res
      .status(200)
      .json({ data: await TabletService.unpair(req.user!.id, String(req.params.deviceId)) });
  })
);

/**
 * PATCH /driver/status
 * Update motorista status (online/offline)
 */
router.patch(
  '/status',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Driver status update requested by ${req.user?.id}`);

    const { status } = req.body;

    if (!['ATIVO', 'INATIVO', 'SUSPENSO'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const updated = await MotoristaService.updateStatus(req.user!.id, req.user!.companyId!, status);

    res.status(200).json({
      message: 'Status updated successfully',
      data: updated,
    });
  })
);

/** GET /driver/campaigns/:campaignId/reviews — avaliações da campanha */
router.get(
  '/campaigns/:campaignId/reviews',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const reviews = await ReviewService.getReviews(String(req.params.campaignId));
    const stats = await ReviewService.getCampaignStats(String(req.params.campaignId));
    const myReview = await ReviewService.getMotoristaReview(
      String(req.params.campaignId),
      req.user!.id
    );

    res.status(200).json({
      data: {
        reviews,
        stats,
        myReview: myReview ? { rating: myReview.rating, comment: myReview.comment } : null,
      },
    });
  })
);

/** POST /driver/campaigns/:campaignId/reviews — criar/atualizar avaliação */
router.post(
  '/campaigns/:campaignId/reviews',
  verifyJWT,
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const { rating, comment } = req.body;

    if (!rating || !['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].includes(rating)) {
      res.status(400).json({ error: 'Rating inválido' });
      return;
    }

    const review = await ReviewService.createOrUpdateReview(
      String(req.params.campaignId),
      req.user!.id,
      rating,
      comment
    );

    res.status(201).json({
      message: 'Avaliação registrada',
      data: review,
    });
  })
);

export default router;
