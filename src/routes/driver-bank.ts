import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/driver/bank
 * Registra/atualiza conta bancária do motorista
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const motorista_id = (req as any).user.motorista_id;
    const company_id = (req as any).user.company_id;

    if (!motorista_id) {
      return res.status(403).json({ error: 'Apenas motoristas podem registrar conta' });
    }

    const { cpf, bank_code, agency, account, account_type, holder_name } = req.body;

    // Validações
    if (!cpf || !bank_code || !agency || !account || !account_type || !holder_name) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Validar CPF (simples: 11 dígitos)
    if (!/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    // Criar ou atualizar DriverBankAccount
    await prisma.driverBankAccount.upsert({
      where: { motorista_id },
      create: {
        motorista_id,
        company_id,
        cpf,
        bank_code,
        agency,
        account,
        account_type,
        holder_name,
      },
      update: {
        cpf,
        bank_code,
        agency,
        account,
        account_type,
        holder_name,
      },
    });

    console.log(`[DRIVER BANK] Conta registrada: ${motorista_id}`);
    res.json({ status: 'success', message: 'Conta bancária registrada' });
  } catch (error: any) {
    console.error('[DRIVER BANK] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/bank
 * Retorna dados da conta (sem CPF/conta visíveis)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const motorista_id = (req as any).user.motorista_id;

    if (!motorista_id) {
      return res.status(403).json({ error: 'Apenas motoristas podem acessar' });
    }

    const account = await prisma.driverBankAccount.findUnique({
      where: { motorista_id },
      select: {
        id: true,
        bank_code: true,
        agency: true,
        account: true,
        account_type: true,
        holder_name: true,
        status: true,
        verified_at: true,
        // Nunca retornar CPF inteiro
      },
    });

    res.json({ account });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
