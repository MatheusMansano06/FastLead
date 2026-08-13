import { Router, Request, Response } from 'express';
import { UserType } from '../types';
import { verifyJWT, authorize, asyncHandler } from '../middleware';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(verifyJWT);

/** Mostra só os últimos dígitos — o número inteiro nunca volta numa resposta. */
const mascarar = (valor: string | null, visiveis = 4) =>
  !valor ? null : `${'•'.repeat(Math.max(0, valor.length - visiveis))}${valor.slice(-visiveis)}`;

/**
 * POST /driver/bank
 * Cadastra ou atualiza a conta bancária do motorista.
 *
 * Serve ao repasse por PIX manual: o Mercado Pago não transfere para conta de
 * terceiros por API, então o pagamento é feito à mão e estes dados são o
 * destino. Ver credit.service (markEarningsPaid).
 */
router.post(
  '/bank',
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const perfil = await prisma.motoristProfile.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true, company_id: true },
    });

    if (!perfil) {
      res.status(404).json({ error: 'Perfil de motorista não encontrado' });
      return;
    }

    const { cpf, bank_code, agency, account, account_type, holder_name } = req.body;

    const cpfLimpo = String(cpf ?? '').replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
      return;
    }

    const faltando = { bank_code, agency, account, holder_name };
    for (const [campo, valor] of Object.entries(faltando)) {
      if (!valor || !String(valor).trim()) {
        res.status(400).json({ error: `Campo obrigatório: ${campo}` });
        return;
      }
    }

    if (account_type !== 'CHECKING' && account_type !== 'SAVINGS') {
      res.status(400).json({ error: 'account_type deve ser CHECKING ou SAVINGS' });
      return;
    }

    const dados = {
      cpf: cpfLimpo,
      bank_code: String(bank_code).trim(),
      agency: String(agency).trim(),
      account: String(account).trim(),
      account_type,
      holder_name: String(holder_name).trim(),
    };

    // Alterar dados bancários derruba a verificação: a conta nova precisa ser
    // conferida de novo antes de receber repasse.
    const conta = await prisma.driverBankAccount.upsert({
      where: { motorista_id: perfil.id },
      create: { ...dados, motorista_id: perfil.id, company_id: perfil.company_id },
      update: { ...dados, status: 'PENDING_VERIFICATION', verified_at: null },
      select: { id: true, status: true, bank_code: true, updated_at: true },
    });

    console.log(`[BANK] Conta do motorista ${perfil.id} salva (${conta.status})`);
    res.json(conta);
  })
);

/**
 * GET /driver/bank
 * Devolve a conta cadastrada, com CPF e número mascarados.
 */
router.get(
  '/bank',
  authorize(UserType.DRIVER),
  asyncHandler(async (req: Request, res: Response) => {
    const perfil = await prisma.motoristProfile.findUnique({
      where: { user_id: req.user!.id },
      select: { id: true },
    });

    if (!perfil) {
      res.status(404).json({ error: 'Perfil de motorista não encontrado' });
      return;
    }

    const conta = await prisma.driverBankAccount.findUnique({
      where: { motorista_id: perfil.id },
    });

    if (!conta) {
      res.status(404).json({ error: 'Nenhuma conta cadastrada' });
      return;
    }

    res.json({
      id: conta.id,
      status: conta.status,
      bank_code: conta.bank_code,
      agency: conta.agency,
      account: mascarar(conta.account),
      account_type: conta.account_type,
      holder_name: conta.holder_name,
      cpf: mascarar(conta.cpf, 3),
      verified_at: conta.verified_at,
    });
  })
);

export default router;
