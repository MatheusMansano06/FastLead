import { Router, Request, Response } from 'express';
import { UserType } from '../types';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { creditService } from '../services/payment/credit.service';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(verifyJWT);

/** Resolve o perfil de motorista do usuário autenticado. */
async function perfilDoUsuario(user_id: string) {
  return prisma.motoristProfile.findUnique({
    where: { user_id },
    select: { id: true },
  });
}

/**
 * GET /driver/wallet
 * Saldo do motorista: pendente (a receber), pago e total.
 */
router.get(
  '/wallet',
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const perfil = await perfilDoUsuario(req.user!.id);
    if (!perfil) {
      res.status(404).json({ error: 'Perfil de motorista não encontrado' });
      return;
    }

    const saldo = await creditService.getDriverBalance(perfil.id);
    res.json(saldo);
  }),
);

/**
 * GET /driver/wallet/earnings
 * Extrato de ganhos do motorista.
 */
router.get(
  '/wallet/earnings',
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const perfil = await perfilDoUsuario(req.user!.id);
    if (!perfil) {
      res.status(404).json({ error: 'Perfil de motorista não encontrado' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const earnings = await creditService.getDriverEarnings(perfil.id, limit, offset);
    res.json({ earnings });
  }),
);

/**
 * POST /admin/payouts/mark-paid
 * Marca ganhos como repassados após o PIX feito à mão no painel do Mercado Pago.
 *
 * Restrito a ADMIN: é o registro de que o dinheiro saiu de verdade.
 */
router.post(
  '/admin/payouts/mark-paid',
  authorize(UserType.ADMIN),
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
      req.user!.id,
    );

    res.json(resultado);
  }),
);

export default router;
