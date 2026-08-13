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
  })
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
  })
);

export default router;
