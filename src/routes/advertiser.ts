import { Router, Request, Response } from 'express';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { AnuncianteService } from '../services/anuncianteService';
import { MarketplaceService } from '../services/marketplaceService';
import { UserType } from '../types';
import logger from '../config/logger';
import { prisma } from '../lib/prisma';
import { creditService } from '../services/payment/credit.service';
import { ReportService } from '../services/reportService';

const router = Router();

/**
 * Lê `from`/`to` da query em ISO.
 *
 * Data inválida é ignorada em vez de virar erro 400: um filtro digitado errado
 * não deve impedir a empresa de ver o relatório — ela recebe o período inteiro
 * e percebe pelo cabeçalho de `period`.
 */
function periodoDaQuery(req: Request): { from?: Date; to?: Date } {
  const ler = (v: unknown): Date | undefined => {
    if (typeof v !== 'string') return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  };
  return { from: ler(req.query.from), to: ler(req.query.to) };
}

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
 * POST /advertiser/campaigns/simulate
 *
 * Quanto custaria, sem criar nada. É o simulador dentro do painel: a empresa
 * mexe em carros, minutos por dia e datas, e vê o preço mudar antes de se
 * comprometer.
 *
 * Usa a mesma função que cobra de verdade. Um simulador com fórmula própria
 * acabaria divergindo do preço cobrado, e a empresa descobriria na fatura.
 */
router.post(
  '/campaigns/simulate',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    const { numVehicles, dailyMinutes, durationDays, startDate, endDate, targetCities } =
      req.body || {};

    const veiculos = Number(numVehicles);
    const minutos = Number(dailyMinutes);
    if (!Number.isFinite(veiculos) || veiculos < 1) {
      res.status(400).json({ error: 'Informe quantos veículos a campanha quer ocupar' });
      return;
    }
    if (!Number.isFinite(minutos) || minutos < 1) {
      res.status(400).json({ error: 'Informe quantos minutos de tela por dia' });
      return;
    }

    const data = AnuncianteService.simulate({
      numVehicles: veiculos,
      dailyMinutes: minutos,
      durationDays: durationDays ? Number(durationDays) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      targetCities: Array.isArray(targetCities) ? targetCities.map(String) : [],
    });

    res.json({ message: 'Simulação do plano', data });
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
      dailyMinutes,
      startDate,
      endDate,
    } = req.body;

    // `durationDays` deixa de ser obrigatório quando vem período do calendário:
    // as datas já dizem quantos dias são.
    const temPeriodo = Boolean(startDate && endDate);
    if (!title || !numVehicles || (!durationDays && !temPeriodo) || pricePerLead === undefined) {
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
      durationDays: Number(durationDays) || 30,
      pricePerLead: Number(pricePerLead),
      dailyMinutes: dailyMinutes === undefined ? undefined : Number(dailyMinutes),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
 * GET /advertiser/campaigns/:campaignId/report
 *
 * Relatório de entrega: o que a empresa recebeu pelo que pagou. Funil de
 * impressão a lead convertido, circulação física (horas de tela, veículos,
 * quilômetros, praças) e distribuição por hora do dia.
 *
 * Jornadas reprovadas pelo antifraude ficam de fora dos números e aparecem
 * separadas em `excluded` — anúncio que rodou em tablet parado não foi visto
 * por passageiro nenhum, e apresentar isso como entrega seria vender fumaça.
 *
 * `from` e `to` opcionais (ISO). Sem eles, vale da data de início da campanha
 * até agora.
 */
router.get(
  '/campaigns/:campaignId/report',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  asyncHandler(async (req: Request, res: Response) => {
    const campaignId = String(req.params.campaignId);
    const range = periodoDaQuery(req);

    const relatorio = await ReportService.campaignReport(req.user!.companyId!, campaignId, range);
    res.json({ message: 'Relatório da campanha', data: relatorio });
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
 * NÃO move dinheiro. O motorista é pago por TEMPO DE TELA (ver
 * `creditService.creditScreenTime`, chamado no sync de impressões), e o pacote
 * já foi cobrado da empresa. Debitar de novo aqui pagaria o motorista duas
 * vezes pela mesma exibição.
 *
 * O que esta rota faz é fechar o funil ISL: marca o lead como convertido e
 * registra o valor do negócio, que alimenta a taxa de conversão dos painéis.
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

    // Lead reprovado pelo antifraude não fecha o funil: a jornada que o gerou
    // estava sob suspeita (tablet sem deslocamento, GPS falso).
    if (lead.status === 'INVALID') {
      res.status(409).json({
        error: 'Lead não elegível',
        message:
          'Este lead veio de uma jornada sob suspeita antifraude e não pode ser convertido. Fale com o suporte se acredita que houve engano.',
        code: 'LEAD_INVALID',
      });
      return;
    }

    // Os dois juntos: o contador da campanha vivia dentro da função de débito
    // que saiu daqui, e sem ele a taxa de conversão dos painéis fica em 0%.
    const atualizado = await prisma.$transaction(async (tx) => {
      const l = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'CONVERTED',
          conversion_value: valor,
          converted_at: new Date(),
        },
        select: { motorista_id: true, campaign_id: true },
      });

      await tx.campaign.update({
        where: { id: l.campaign_id },
        data: { conversions: { increment: 1 } },
      });

      return l;
    });

    logger.info(`Lead ${lead.id} convertido por ${req.user?.id} (R$ ${valor})`);

    const [saldoEmpresa, saldoMotorista] = await Promise.all([
      creditService.getBalance(lead.company_id),
      creditService.getDriverBalance(atualizado.motorista_id),
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
