import { Router, Request, Response } from 'express';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { AnuncianteService } from '../services/anuncianteService';
import { MarketplaceService } from '../services/marketplaceService';
import { UserType } from '../types';
import logger from '../config/logger';
import { prisma } from '../lib/prisma';
import { creditService } from '../services/payment/credit.service';

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
const getQueryString = (value: unknown): string | undefined => {
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

/**
 * GET /advertiser/leads
 * Todos os leads da empresa, de todas as campanhas.
 *
 * Converter lead é tarefa diária e atravessa campanhas — o anunciante liga para
 * quem escaneou, e marca a venda quando fecha. Só existia a listagem por
 * campanha, que obriga a entrar em uma de cada vez. O frontend já chamava esta
 * rota e recebia 404.
 */
router.get(
  '/leads',
  verifyJWT,
  authorize(UserType.ADVERTISER, UserType.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
    const offset = parseInt(String(req.query.offset)) || 0;
    const status = getQueryString(req.query.status);

    const where = {
      company_id: req.user!.companyId!,
      deleted_at: null,
      ...(status ? { status: status as never } : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { qr_scan_time: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          qr_scan_time: true,
          contact_name: true,
          contact_email: true,
          contact_phone: true,
          conversion_value: true,
          converted_at: true,
          campaign: { select: { id: true, title: true } },
          motorista: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.status(200).json({
      message: 'Leads',
      data: {
        leads: leads.map((l) => ({
          id: l.id,
          status: l.status,
          scanTime: l.qr_scan_time,
          contactName: l.contact_name,
          contactEmail: l.contact_email,
          contactPhone: l.contact_phone,
          conversionValue: l.conversion_value ? Number(l.conversion_value) : null,
          convertedAt: l.converted_at,
          campaignId: l.campaign?.id ?? null,
          campaignTitle: l.campaign?.title ?? null,
          motoristaName: l.motorista?.user?.name ?? null,
        })),
        total,
      },
    });
  })
);

/**
 * PATCH /advertiser/leads/:leadId/convert
 * O anunciante confirma que o lead virou negócio.
 *
 * É o gatilho do dinheiro: debita a comissão do saldo da empresa e credita o
 * motorista, atomicamente. Antes daqui não existia nenhuma rota que convertesse
 * um lead, então `debitLeadConversion` nunca era chamada e nada se movia.
 *
 * O `conversion_value` é o valor do negócio fechado; a comissão do motorista
 * sai dele. Sem valor, não há o que repartir.
 */
router.patch(
  '/leads/:leadId/convert',
  verifyJWT,
  authorize(UserType.ADVERTISER, UserType.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const leadId = String(req.params.leadId);
    const valor = Number(req.body?.conversion_value);

    if (!Number.isFinite(valor) || valor <= 0) {
      res.status(400).json({ error: 'conversion_value obrigatório e maior que zero' });
      return;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, company_id: true, status: true },
    });

    if (!lead || lead.company_id !== req.user!.companyId) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    // Converter duas vezes pagaria o motorista duas vezes pelo mesmo lead.
    if (lead.status === 'CONVERTED') {
      res.status(409).json({ error: 'Lead já convertido' });
      return;
    }

    const debitou = await creditService.debitLeadConversion(lead.company_id, lead.id, valor);

    if (!debitou) {
      res.status(402).json({
        error: 'Saldo insuficiente',
        message: 'Adicione crédito antes de converter o lead',
      });
      return;
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONVERTED',
        conversion_value: valor,
        converted_at: new Date(),
      },
    });

    logger.info(`Lead ${lead.id} convertido por ${req.user?.id} (R$ ${valor})`);

    const [saldoEmpresa, saldoMotorista] = await Promise.all([
      creditService.getBalance(lead.company_id),
      prisma.lead
        .findUniqueOrThrow({ where: { id: lead.id }, select: { motorista_id: true } })
        .then((l) => creditService.getDriverBalance(l.motorista_id)),
    ]);

    res.json({
      lead_id: lead.id,
      conversion_value: valor,
      saldo_empresa: saldoEmpresa,
      motorista: saldoMotorista,
    });
  })
);

export default router;
