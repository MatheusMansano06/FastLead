import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware';
import { mercadoPagoService } from '../services/payment/mercadopago.service';
import { creditService } from '../services/payment/credit.service';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /webhooks/mercadopago
 *
 * Recebe as notificações de pagamento do Mercado Pago.
 *
 * Sem autenticação por JWT — quem chama é o Mercado Pago, não um usuário. A
 * porta é protegida pela assinatura HMAC do cabeçalho `x-signature`.
 *
 * Responde 200 depressa: o Mercado Pago espera confirmação em até 22s e
 * reenvia a notificação se demorar. Erros de processamento são registrados,
 * mas não viram 500 — devolver erro faria o Mercado Pago repetir para sempre
 * um evento que nunca vai passar.
 */
router.post(
  '/mercadopago',
  asyncHandler(async (req: Request, res: Response) => {
    const dataId = (req.body?.data?.id ?? req.query['data.id']) as string | undefined;

    const valido = mercadoPagoService.verifyWebhookSignature({
      signature: req.headers['x-signature'] as string | undefined,
      requestId: req.headers['x-request-id'] as string | undefined,
      dataId,
    });

    if (!valido) {
      res.status(401).json({ error: 'Assinatura inválida' });
      return;
    }

    // Confirma o recebimento antes de processar: o processamento pode demorar
    // mais que a janela do Mercado Pago, e reenvio gera trabalho duplicado.
    res.status(200).json({ received: true });

    const acao = req.body?.action ?? req.body?.type;
    if (!dataId || !String(acao ?? '').startsWith('payment')) {
      console.log(`[WEBHOOK] Evento ignorado: ${acao}`);
      return;
    }

    try {
      const pagamento = await mercadoPagoService.verifyPayment(dataId);

      if (pagamento.status !== 'approved') {
        console.log(`[WEBHOOK] Pagamento ${dataId} em ${pagamento.status}, sem ação`);
        return;
      }

      // A external_reference carrega a empresa: "company_<id>_<timestamp>"
      const ref = pagamento.external_reference ?? '';
      const casou = ref.match(/^company_(.+)_\d+$/);
      if (!casou) {
        console.error(`[WEBHOOK] external_reference sem empresa: "${ref}"`);
        return;
      }

      const company_id = casou[1];
      const empresa = await prisma.company.findUnique({
        where: { id: company_id },
        select: { id: true },
      });

      if (!empresa) {
        console.error(`[WEBHOOK] Empresa ${company_id} não existe (pagamento ${dataId})`);
        return;
      }

      // Idempotente por mercadopago_id: se o /verify do cliente já creditou,
      // esta chamada não credita de novo.
      await creditService.addCredit(company_id, pagamento.amount, dataId);
      console.log(`[WEBHOOK] Crédito confirmado: ${company_id} +R$ ${pagamento.amount}`);
    } catch (erro) {
      console.error(`[WEBHOOK] Falha ao processar pagamento ${dataId}:`, erro);
    }
  }),
);

export default router;
