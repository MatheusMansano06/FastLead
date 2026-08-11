import { MERCADOPAGO_CONFIG } from '../../config/mercadopago';
import crypto from 'crypto';

/**
 * Serviço Mercado Pago — chamadas reais à API REST.
 *
 * ESCOPO: só entrada de dinheiro. O Mercado Pago **não tem API para transferir
 * a conta bancária de terceiros** — `/v1/transfers` não existe (404) e o
 * `/v1/advanced_payments` (Split) exige habilitação de marketplace que esta
 * conta não possui (403). O repasse ao motorista é feito por PIX manual e
 * registrado em `DriverEarning`; ver credit.service.
 */

const API = 'https://api.mercadopago.com';

export interface CobrancaPix {
  id: string;
  status: string;
  qr_code: string | null; // Copia e cola
  qr_code_base64: string | null; // Imagem do QR
  expira_em: string | null;
}

export interface MercadoPagoVerify {
  status:
    | 'pending'
    | 'approved'
    | 'authorized'
    | 'in_process'
    | 'in_mediation'
    | 'rejected'
    | 'cancelled'
    | 'refunded'
    | 'charged_back';
  amount: number;
  external_reference: string | null;
}

/** Resposta de erro do Mercado Pago, para não tratar `unknown` no catch. */
interface ErroMP {
  message?: string;
  error?: string;
  cause?: { description?: string }[];
}

export class MercadoPagoService {
  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
    };
  }

  /**
   * Cria uma cobrança PIX para a empresa adicionar crédito.
   *
   * `X-Idempotency-Key` evita cobrança duplicada se a requisição for repetida
   * por retry de rede — o Mercado Pago devolve a mesma cobrança em vez de criar
   * outra.
   */
  async criarCobrancaPix(params: {
    amount: number;
    description: string;
    external_reference: string;
    payer_email?: string;
  }): Promise<CobrancaPix> {
    const corpoPix = JSON.stringify({
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: 'pix',
      external_reference: params.external_reference,
      notification_url: MERCADOPAGO_CONFIG.notificationUrl || undefined,
      payer: { email: params.payer_email || 'sem-email@fastlead.com.br' },
    });

    let resposta!: Response;
    let corpo!: Record<string, unknown> & ErroMP;

    // O Mercado Pago devolve 500 "internal_error" de forma intermitente —
    // medido em ~1 a cada 4 chamadas. Sem repetir, essa proporção das recargas
    // morria na cara de quem estava tentando pagar.
    //
    // Repetir é seguro porque o X-Idempotency-Key é o mesmo: se a cobrança
    // chegou a ser criada, o Mercado Pago devolve aquela mesma em vez de abrir
    // outra. Só 5xx é repetido; 4xx é erro nosso e repetir não conserta.
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      resposta = await fetch(`${API}/v1/payments`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'X-Idempotency-Key': params.external_reference,
        },
        body: corpoPix,
      });

      corpo = (await resposta.json()) as Record<string, unknown> & ErroMP;

      if (resposta.ok || resposta.status < 500) break;

      const ultima = tentativa === 3;
      console.warn(
        `[MP] PIX falhou com ${resposta.status} (tentativa ${tentativa}/3)${ultima ? '' : ' — repetindo'}`,
      );
      if (!ultima) await new Promise((r) => setTimeout(r, 400 * tentativa));
    }

    if (!resposta.ok) {
      const detalhe = corpo.cause?.[0]?.description || corpo.message || resposta.statusText;
      console.error(`[MP] Falha ao criar PIX (${resposta.status}): ${detalhe}`);
      throw new Error(`Mercado Pago: ${detalhe}`);
    }

    const poi = corpo.point_of_interaction as
      | { transaction_data?: { qr_code?: string; qr_code_base64?: string } }
      | undefined;
    const dados = poi?.transaction_data;

    console.log(`[MP] PIX criado: id=${corpo.id} status=${corpo.status}`);

    return {
      id: String(corpo.id),
      status: String(corpo.status),
      qr_code: dados?.qr_code ?? null,
      qr_code_base64: dados?.qr_code_base64 ?? null,
      expira_em: (corpo.date_of_expiration as string | undefined) ?? null,
    };
  }

  /**
   * Estorna um pagamento, total ou parcialmente.
   *
   * Este é o único caminho pelo qual dinheiro sai da conta por API: o valor
   * volta para quem pagou, na mesma forma em que entrou. Não serve para pagar
   * o motorista — para terceiros o Mercado Pago não tem API (ver o cabeçalho
   * deste arquivo).
   *
   * A chave de idempotência é responsabilidade de quem chama: repetir com a
   * mesma chave devolve o mesmo estorno em vez de estornar de novo.
   */
  async estornarPagamento(
    payment_id: string,
    amount: number,
    idempotency_key: string,
  ): Promise<{ id: string; amount: number; status: string }> {
    const resposta = await fetch(`${API}/v1/payments/${payment_id}/refunds`, {
      method: 'POST',
      headers: { ...this.headers, 'X-Idempotency-Key': idempotency_key },
      body: JSON.stringify({ amount }),
    });

    const corpo = (await resposta.json()) as Record<string, unknown> & ErroMP;

    if (!resposta.ok) {
      const detalhe = corpo.cause?.[0]?.description || corpo.message || resposta.statusText;
      console.error(`[MP] Falha ao estornar ${payment_id} (${resposta.status}): ${detalhe}`);
      throw new Error(`Mercado Pago: ${detalhe}`);
    }

    console.log(`[MP] Estorno criado: pagamento=${payment_id} valor=${amount} id=${corpo.id}`);

    return {
      id: String(corpo.id),
      amount: Number(corpo.amount ?? amount),
      status: String(corpo.status ?? 'approved'),
    };
  }

  /**
   * Consulta o estado de um pagamento.
   *
   * Devolve também a `external_reference` para que quem chama confirme a quem
   * o pagamento pertence — é o que impede uma empresa creditar-se com o
   * pagamento de outra.
   */
  async verifyPayment(payment_id: string): Promise<MercadoPagoVerify> {
    const resposta = await fetch(`${API}/v1/payments/${payment_id}`, {
      headers: this.headers,
    });

    const corpo = (await resposta.json()) as Record<string, unknown> & ErroMP;

    if (!resposta.ok) {
      const detalhe = corpo.message || resposta.statusText;
      console.error(`[MP] Falha ao consultar pagamento ${payment_id} (${resposta.status})`);
      throw new Error(`Mercado Pago: ${detalhe}`);
    }

    return {
      status: corpo.status as MercadoPagoVerify['status'],
      amount: Number(corpo.transaction_amount ?? 0),
      external_reference: (corpo.external_reference as string | null) ?? null,
    };
  }

  /**
   * Valida a assinatura do webhook do Mercado Pago.
   *
   * O HMAC é calculado sobre um manifesto de campos do cabeçalho — NÃO sobre o
   * corpo da requisição:
   *
   *     id:<data.id>;request-id:<x-request-id>;ts:<ts>;
   *
   * A versão anterior assinava `ts.body`, o que rejeitaria todo webhook
   * legítimo, e devolvia `true` quando o segredo não estava configurado —
   * qualquer um poderia forjar uma notificação e creditar a própria empresa.
   * Aqui, sem segredo configurado, a validação FALHA.
   */
  verifyWebhookSignature(params: {
    signature: string | undefined;
    requestId: string | undefined;
    dataId: string | undefined;
  }): boolean {
    const { signature, requestId, dataId } = params;
    const segredo = MERCADOPAGO_CONFIG.webhookSecret;

    if (!segredo) {
      console.error('[MP] MERCADOPAGO_WEBHOOK_SECRET ausente — recusando webhook');
      return false;
    }
    if (!signature || !dataId) {
      console.error('[MP] Webhook sem x-signature ou data.id');
      return false;
    }

    let ts: string | undefined;
    let v1: string | undefined;
    for (const parte of signature.split(',')) {
      const [chave, valor] = parte.split('=').map((s) => s?.trim());
      if (chave === 'ts') ts = valor;
      if (chave === 'v1') v1 = valor;
    }

    if (!ts || !v1) {
      console.error('[MP] x-signature malformado');
      return false;
    }

    // O Mercado Pago normaliza o id para minúsculas no manifesto.
    const manifesto = `id:${dataId.toLowerCase()};request-id:${requestId ?? ''};ts:${ts};`;
    const esperado = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');

    const a = Buffer.from(esperado, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    // Comparação em tempo constante: evita vazar o HMAC por análise de tempo.
    const confere = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!confere) console.error('[MP] Assinatura de webhook inválida');
    return confere;
  }

  /**
   * Verifica se a API está disponível.
   * Útil para health checks.
   */
  /** Confere se o token de acesso é aceito pelo Mercado Pago. */
  async ping(): Promise<boolean> {
    try {
      const r = await fetch(`${API}/v1/payment_methods`, { headers: this.headers });
      return r.ok;
    } catch {
      return false;
    }
  }
}

export const mercadoPagoService = new MercadoPagoService();
