import { Router, Request, Response } from 'express';
import { mercadoPagoService } from '../services/payment/mercadopago.service';

const router = Router();

/**
 * Middleware: validar assinatura do webhook
 */
const validateWebhook = (req: Request, res: Response, next: Function) => {
  const signature = req.headers['x-signature'] as string;
  const body = JSON.stringify(req.body);

  if (!mercadoPagoService.verifyWebhookSignature(body, signature)) {
    console.error('[WEBHOOK] Assinatura inválida');
    return res.status(403).json({ error: 'Assinatura inválida' });
  }

  next();
};

/**
 * POST /webhooks/mercadopago
 * Processa webhooks do Mercado Pago
 *
 * Cenários:
 * 1. payment.created — novo pagamento iniciado
 * 2. payment.updated → status = approved — crédito foi confirmado
 */
router.post('/', validateWebhook, async (req: Request, res: Response) => {
  try {
    const { action, data } = req.body;

    console.log(`[WEBHOOK] Recebido: action=${action}, payment_id=${data?.id}`);

    if (action === 'payment.created' || action === 'payment.updated') {
      const payment_id = data?.id;

      if (!payment_id) {
        console.log('[WEBHOOK] Sem payment ID, ignorando');
        return res.json({ status: 'ok' });
      }

      // Aqui você integraria com o banco para atualizar o status do pagamento
      // Por enquanto, apenas logamos que recebemos
      console.log(`[WEBHOOK] Payment ${payment_id} — ${action}`);
    }

    res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[WEBHOOK] Erro:', error);
    // Sempre retorna 200 para Mercado Pago não fazer retry infinito
    res.json({ status: 'ok', error_noted: true });
  }
});

export default router;
