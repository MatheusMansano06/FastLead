import { Router, Request, Response } from 'express';
import { mercadoPagoService } from '../services/payment/mercadopago.service';
import { creditService } from '../services/payment/credit.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Middleware: exigir autenticação
router.use(authMiddleware);

/**
 * POST /api/billing/checkout
 * Inicia checkout para adicionar crédito
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const company_id = (req as any).user.company_id;
    const user_email = (req as any).user.email;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Criar pagamento no Mercado Pago
    const payment = await mercadoPagoService.createPayment({
      amount,
      description: `FastLead Crédito — ${new Date().toLocaleDateString('pt-BR')}`,
      external_reference: `company_${company_id}_${Date.now()}`,
      payer_email: user_email,
      auto_return: 'approved',
    });

    console.log(`[BILLING] Checkout iniciado: ${company_id} — R$ ${amount}`);
    res.json({ checkout_url: payment.init_point });
  } catch (error: any) {
    console.error('[BILLING] Erro ao criar checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/balance
 * Retorna saldo atual
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const company_id = (req as any).user.company_id;
    const balance = await creditService.getBalance(company_id);
    res.json({ balance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/verify
 * Verifica se um pagamento foi aprovado (chamado após retorno do Mercado Pago)
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { payment_id } = req.body;
    const company_id = (req as any).user.company_id;

    if (!payment_id) {
      return res.status(400).json({ error: 'payment_id obrigatório' });
    }

    // Verificar status no Mercado Pago
    const payment = await mercadoPagoService.verifyPayment(payment_id);

    if (payment.status === 'approved') {
      // Adicionar crédito
      await creditService.addCredit(company_id, payment.amount, payment_id);

      console.log(`[BILLING] Crédito adicionado: ${company_id} — R$ ${payment.amount}`);

      res.json({
        status: 'approved',
        amount: payment.amount,
        message: 'Crédito adicionado com sucesso',
      });
    } else {
      res.status(400).json({
        status: payment.status,
        message: `Pagamento não foi aprovado. Status: ${payment.status}`,
      });
    }
  } catch (error: any) {
    console.error('[BILLING] Erro ao verificar pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/history?limit=50&offset=0
 * Retorna histórico de transações
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const company_id = (req as any).user.company_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await creditService.getHistory(company_id, limit, offset);

    res.json({ transactions: history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
