import { Router, Request, Response } from 'express';
import { verifyJWT, asyncHandler } from '../middleware';
import { mercadoPagoService } from '../services/payment/mercadopago.service';
import { creditService } from '../services/payment/credit.service';

const router = Router();

router.use(verifyJWT);

/** Prefixo da external_reference que amarra um pagamento à empresa que o criou. */
const refDaEmpresa = (company_id: string) => `company_${company_id}_`;

/**
 * POST /billing/checkout
 * Gera uma cobrança PIX para a empresa adicionar crédito.
 *
 * PIX e não cartão: a empresa paga escaneando o QR, e nenhum dado de cartão
 * passa pelos nossos servidores — o que nos mantém fora do escopo de PCI.
 */
router.post(
  '/checkout',
  asyncHandler(async (req: Request, res: Response) => {
    const { amount } = req.body;
    const company_id = req.user!.companyId!;
    const valor = Number(amount);

    if (!Number.isFinite(valor) || valor <= 0) {
      res.status(400).json({ error: 'Valor inválido' });
      return;
    }

    const cobranca = await mercadoPagoService.criarCobrancaPix({
      amount: valor,
      description: `FastLead — crédito de campanha`,
      external_reference: `${refDaEmpresa(company_id)}${Date.now()}`,
      payer_email: req.user!.email,
    });

    console.log(`[BILLING] PIX gerado: ${company_id} — R$ ${valor} (mp=${cobranca.id})`);

    res.json({
      payment_id: cobranca.id,
      status: cobranca.status,
      amount: valor,
      qr_code: cobranca.qr_code,
      qr_code_base64: cobranca.qr_code_base64,
      expira_em: cobranca.expira_em,
    });
  }),
);

/** GET /billing/balance — saldo atual da empresa. */
router.get(
  '/balance',
  asyncHandler(async (req: Request, res: Response) => {
    const balance = await creditService.getBalance(req.user!.companyId!);
    res.json({ balance });
  }),
);

/**
 * POST /billing/verify
 * Confere no Mercado Pago se a cobrança foi paga e credita a empresa.
 *
 * O payment_id vem do cliente, então confirmamos na API do Mercado Pago que
 * aquele pagamento foi criado por ESTA empresa, comparando a external_reference.
 * Sem isso, bastaria mandar o id de um pagamento alheio para se creditar.
 *
 * O valor creditado é o que o Mercado Pago informa, nunca o que o cliente diz.
 */
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { payment_id } = req.body;
    const company_id = req.user!.companyId!;

    if (!payment_id) {
      res.status(400).json({ error: 'payment_id obrigatório' });
      return;
    }

    const pagamento = await mercadoPagoService.verifyPayment(String(payment_id));

    if (!pagamento.external_reference?.startsWith(refDaEmpresa(company_id))) {
      console.warn(
        `[BILLING] Empresa ${company_id} tentou verificar pagamento alheio ${payment_id}`,
      );
      res.status(403).json({ error: 'Pagamento não pertence a esta empresa' });
      return;
    }

    if (pagamento.status !== 'approved') {
      res.status(202).json({
        status: pagamento.status,
        message: 'Pagamento ainda não confirmado',
      });
      return;
    }

    // addCredit é idempotente por mercadopago_id: chamar de novo não credita duas vezes.
    await creditService.addCredit(company_id, pagamento.amount, String(payment_id));
    const balance = await creditService.getBalance(company_id);

    res.json({ status: 'approved', amount: pagamento.amount, balance });
  }),
);

/** GET /billing/history — extrato da empresa. */
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const transactions = await creditService.getHistory(req.user!.companyId!, limit, offset);
    res.json({ transactions });
  }),
);

/**
 * GET /billing/summary — saldo, teto de retirada e quanto já foi gasto.
 *
 * Uma chamada só porque o painel mostra os três juntos. `spentOnLeads` vem do
 * extrato, não de multiplicação no navegador.
 */
router.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const company_id = req.user!.companyId!;
    const [balance, refundable, spentOnLeads] = await Promise.all([
      creditService.getBalance(company_id),
      creditService.refundableAmount(company_id),
      creditService.getSpentOnLeads(company_id),
    ]);
    res.json({ balance, refundable, spentOnLeads });
  }),
);

/**
 * GET /billing/refundable — quanto dá para retirar.
 *
 * Menor que o saldo sempre que parte dele não veio de pagamento (ajuste manual)
 * ou já foi estornada. A tela usa isto como teto para não oferecer o que o
 * Mercado Pago não tem como devolver.
 */
router.get(
  '/refundable',
  asyncHandler(async (req: Request, res: Response) => {
    const refundable = await creditService.refundableAmount(req.user!.companyId!);
    res.json({ refundable });
  }),
);

/**
 * POST /billing/refund
 * Devolve saldo não usado, estornando os depósitos no Mercado Pago.
 *
 * Não recebe destino: o dinheiro volta para quem pagou, pela origem. Aceitar um
 * destino aqui seria abrir um caminho para tirar dinheiro da conta para
 * qualquer lugar.
 */
router.post(
  '/refund',
  asyncHandler(async (req: Request, res: Response) => {
    const valor = Number(req.body?.amount);

    if (!Number.isFinite(valor) || valor <= 0) {
      res.status(400).json({ error: 'Valor inválido' });
      return;
    }

    try {
      const r = await creditService.refundToCompany(req.user!.companyId!, valor);

      if (r.estornado === 0) {
        res.status(502).json({
          error: 'O Mercado Pago recusou o estorno',
          message: 'Seu saldo não foi alterado. Tente de novo mais tarde.',
        });
        return;
      }

      res.json(r);
    } catch (e) {
      const msg = (e as Error).message;
      const doUsuario =
        msg.includes('Saldo insuficiente') ||
        msg.includes('Nenhum depósito disponível') ||
        msg.includes('Disponível para retirada');
      res.status(doUsuario ? 400 : 502).json({ error: msg });
    }
  }),
);

export default router;
