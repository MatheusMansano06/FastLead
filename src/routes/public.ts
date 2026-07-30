import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import config from '../config/config';
import { asyncHandler } from '../middleware';
import { TrackingService } from '../services/trackingService';
import { segmentationCatalog } from '../utils/segmentation';
import logger from '../config/logger';

const router = Router();

/** IP real do passageiro atrás do proxy do Railway. */
function clientIp(req: Request): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip;
}

/**
 * GET /r/:campaignId?m=<motorista>&d=<device>
 *
 * Rota que TODO QR code aponta. Registra o scan e manda o passageiro adiante.
 * Precisa ser rápida e nunca quebrar: se o tracking falhar, o passageiro
 * ainda tem que chegar no destino — perder um número é melhor que perder a pessoa.
 */
router.get(
  '/r/:campaignId',
  asyncHandler(async (req: Request, res: Response) => {
    const campaignId = String(req.params.campaignId);
    const motoristaId = req.query.m ? String(req.query.m) : undefined;
    const deviceId = req.query.d ? String(req.query.d) : undefined;

    try {
      const { redirectTo } = await TrackingService.recordScan({
        campaignId,
        motoristaId,
        deviceId,
        ip: clientIp(req),
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
      });
      res.redirect(302, redirectTo);
    } catch (err) {
      logger.error(`Falha ao registrar scan da campanha ${campaignId}: ${err}`);
      res.redirect(302, config.appBaseUrl || '/');
    }
  })
);

/**
 * POST /r/:scanEventId/lead — passageiro deixou contato na landing.
 * É o que fecha o funil: scan (divulgação) vira lead (interação).
 */
router.post(
  '/r/:scanEventId/lead',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone } = req.body || {};
    if (!email && !phone) {
      res.status(400).json({ error: 'Informe ao menos e-mail ou telefone' });
      return;
    }
    const result = await TrackingService.captureLead({
      scanEventId: String(req.params.scanEventId),
      name,
      email,
      phone,
    });
    res.json({ data: result });
  })
);

/**
 * GET /meta/campaign/:id — dados públicos da campanha para a landing de captura.
 * Fica sob /meta e não sob /r para não colidir com o redirect /r/:campaignId.
 */
router.get(
  '/meta/campaign/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await prisma.campaign.findFirst({
      where: { id: String(req.params.id), deleted_at: null },
      select: {
        id: true,
        title: true,
        description: true,
        image_url: true,
        cta_text: true,
        anunciante: { select: { company_name: true, trade_name: true } },
      },
    });
    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada' });
      return;
    }
    res.json({
      data: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        imageUrl: campaign.image_url,
        ctaText: campaign.cta_text,
        advertiser: campaign.anunciante.trade_name || campaign.anunciante.company_name,
      },
    });
  })
);

/**
 * GET /meta/segmentation — catálogo de regiões, UFs, apps e modalidades.
 * Fonte única para os filtros do frontend não divergirem do enum do banco.
 */
router.get(
  '/meta/segmentation',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: segmentationCatalog() });
  })
);

export default router;
