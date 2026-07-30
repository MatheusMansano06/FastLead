import { Router, Request, Response } from 'express';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { UserType } from '../types';
import { AdminService, MasterFilters } from '../services/adminService';
import { Region, RideApp, RideCategory } from '@prisma/client';

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

export default router;
