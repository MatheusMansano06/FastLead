import { Router, Request, Response } from 'express';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { UserType } from '../types';
import { AdminService, MasterFilters } from '../services/adminService';
import { Region, RideApp, RideCategory } from '@prisma/client';
import { creditService } from '../services/payment/credit.service';
import { prisma } from '../lib/prisma';

const router = Router();

/** Todas as rotas MASTER exigem um usuário ADMIN. */
router.use(verifyJWT, authorize(UserType.ADMIN));

function parseFilters(req: Request): MasterFilters {
  const q = req.query;
  const filters: MasterFilters = {};
  if (q.region) filters.region = String(q.region) as Region;
  if (q.state) filters.state = String(q.state);
  if (q.city) filters.city = String(q.city);
  if (q.rideApp) filters.rideApp = String(q.rideApp) as RideApp;
  if (q.rideCategory) filters.rideCategory = String(q.rideCategory) as RideCategory;
  if (q.from) filters.from = new Date(String(q.from));
  if (q.to) filters.to = new Date(String(q.to));
  return filters;
}

const pageOf = (req: Request) => ({
  page: Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1),
  limit: Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50)),
});

/** GET /admin/overview — números do topo + funil impressão→scan→lead */
router.get(
  '/overview',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await AdminService.overview(parseFilters(req)) });
  })
);

/** GET /admin/timeseries?days=14 */
router.get(
  '/timeseries',
  asyncHandler(async (req: Request, res: Response) => {
    const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || '14'), 10) || 14));
    res.json({ data: await AdminService.timeseries(days, parseFilters(req)) });
  })
);

/** GET /admin/drivers — motoristas de todas as empresas, com filtros */
router.get(
  '/drivers',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = pageOf(req);
    res.json({ data: await AdminService.drivers(parseFilters(req), page, limit) });
  })
);

/** GET /admin/companies — empresas anunciantes e o que geraram */
router.get(
  '/companies',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = pageOf(req);
    res.json({ data: await AdminService.companies(page, limit) });
  })
);

/** GET /admin/campaigns — campanhas de todas as empresas */
router.get(
  '/campaigns',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = pageOf(req);
    res.json({ data: await AdminService.campaigns(page, limit) });
  })
);

/**
 * POST /admin/campaigns/:campaignId/distribute — distribuição automática.
 * Coloca a campanha nos tablets dos motoristas que batem com a segmentação,
 * até fechar as vagas. Só entra quem tem tablet pareado.
 */
router.post(
  '/campaigns/:campaignId/distribute',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await AdminService.autoAssign(req.user!.id, String(req.params.campaignId));
    res.json({ data: result });
  })
);

/**
 * POST /admin/assignments — curadoria híbrida.
 * FORCE coloca a campanha no tablet do motorista; BLOCK tira só dele;
 * CLEAR devolve a decisão ao marketplace.
 */
router.post(
  '/assignments',
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId, motoristaId, action } = req.body || {};
    if (!campaignId || !motoristaId || !['FORCE', 'BLOCK', 'CLEAR'].includes(action)) {
      res
        .status(400)
        .json({ error: 'campaignId, motoristaId e action (FORCE|BLOCK|CLEAR) são obrigatórios' });
      return;
    }
    const result = await AdminService.setAssignment(req.user!.id, campaignId, motoristaId, action);
    res.json({ data: result });
  })
);

/**
 * GET /admin/payouts/pending
 * Ganhos ainda não repassados, agrupados por motorista.
 *
 * O mark-paid recebe uma lista de ids de ganho, e não havia nenhuma forma de
 * descobrir esses ids — o endpoint de repasse era inutilizável na prática.
 * Vem com a conta bancária junto porque é dela que sai o PIX.
 */
router.get(
  '/payouts/pending',
  asyncHandler(async (_req: Request, res: Response) => {
    const pendentes = await prisma.driverEarning.findMany({
      where: { status: 'PENDING' },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        amount: true,
        created_at: true,
        lead_id: true,
        motorista: {
          select: {
            id: true,
            user: { select: { name: true } },
            bank_account: {
              select: {
                status: true,
                bank_code: true,
                agency: true,
                account: true,
                holder_name: true,
                cpf: true,
              },
            },
          },
        },
      },
    });

    // Agrupa por motorista: o repasse é um PIX por pessoa, não por lead.
    const porMotorista = new Map<string, any>();
    for (const g of pendentes) {
      const id = g.motorista.id;
      if (!porMotorista.has(id)) {
        porMotorista.set(id, {
          motoristaId: id,
          nome: g.motorista.user?.name ?? null,
          conta: g.motorista.bank_account ?? null,
          total: 0,
          earningIds: [] as string[],
          maisAntigo: g.created_at,
        });
      }
      const m = porMotorista.get(id);
      m.total += Number(g.amount);
      m.earningIds.push(g.id);
    }

    const motoristas = [...porMotorista.values()].sort((a, b) => b.total - a.total);

    res.json({
      message: 'Repasses pendentes',
      data: {
        motoristas,
        totalAPagar: motoristas.reduce((s, m) => s + m.total, 0),
      },
    });
  })
);

/**
 * POST /admin/payouts/mark-paid
 * Marca ganhos do motorista como repassados, depois do PIX feito à mão no
 * painel do Mercado Pago.
 *
 * O Mercado Pago não transfere para conta bancária de terceiros por API, então
 * o dinheiro sai à mão e este endpoint é o registro de que saiu. `payout_ref`
 * guarda o comprovante para auditoria.
 */
router.post(
  '/payouts/mark-paid',
  asyncHandler(async (req: Request, res: Response) => {
    const { earning_ids, payout_ref } = req.body;

    if (!Array.isArray(earning_ids) || earning_ids.length === 0) {
      res.status(400).json({ error: 'earning_ids obrigatório (lista não vazia)' });
      return;
    }
    if (!payout_ref || typeof payout_ref !== 'string') {
      res.status(400).json({ error: 'payout_ref obrigatório (comprovante do PIX)' });
      return;
    }

    const resultado = await creditService.markEarningsPaid(
      earning_ids.map(String),
      payout_ref,
      req.user!.id
    );

    res.json(resultado);
  })
);

export default router;
