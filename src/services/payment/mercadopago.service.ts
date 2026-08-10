import { MERCADOPAGO_CONFIG } from '../../config/mercadopago';
import crypto from 'crypto';

/**
 * Serviço Mercado Pago — integração com gateway de pagamento
 *
 * ESTADO ATUAL: Mocks estruturados
 * - createPayment, verifyPayment, createTransfer: retornam dados simulados
 * - verifyWebhookSignature: estruturado, pronto para token real
 * - À noite: troque os mocks por chamadas reais à API do Mercado Pago
 *
 * Instalação da API real: npm install mercadopago
 */

export interface MercadoPagoPayment {
  id: string;
  init_point: string;
}

export interface MercadoPagoVerify {
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  amount: number;
}

export class MercadoPagoService {
  /**
   * Cria um payment no Mercado Pago para o checkout de crédito.
   * Retorna a URL de checkout (init_point).
   *
   * MOCK: retorna dados simulados. À noite, integre com:
   * https://www.mercadopago.com.br/developers/pt/reference/preference/_checkout_preference/post
   */
  async createPayment(params: {
    amount: number; // Em reais
    description: string;
    external_reference: string; // company_id + timestamp
    payer_email?: string;
    auto_return: string; // 'approved' or 'all'
  }): Promise<MercadoPagoPayment> {
    const mockId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockCheckoutUrl = `https://www.mercadopago.com/checkout/v1/redirect?preference-id=${mockId}`;

    console.log(
      `[MP MOCK] createPayment: R$ ${params.amount} | ${params.description} | ref=${params.external_reference}`,
    );

    return {
      id: mockId,
      init_point: mockCheckoutUrl,
    };
  }

  /**
   * Verifica o status de um payment já criado.
   *
   * MOCK: simula status "approved". À noite, chamar GET /v1/payments/{id}
   */
  async verifyPayment(payment_id: string): Promise<MercadoPagoVerify> {
    console.log(`[MP MOCK] verifyPayment: id=${payment_id}`);

    // Mock: sempre retorna approved por enquanto
    return {
      status: 'approved',
      amount: 100, // Mock valor fixo — em produção vem da API
    };
  }

  /**
   * Cria uma transfer para a conta bancária do motorista.
   *
   * MOCK: retorna ID fake. À noite:
   * https://www.mercadopago.com.br/developers/pt/reference/transfers/_transfers/post
   */
  async createTransfer(params: {
    amount: number; // Em reais
    target_account: {
      cpf: string;
      bank_code: string;
      agency: string;
      account: string;
      account_type: 'CHECKING' | 'SAVINGS';
      holder_name: string;
    };
    description: string;
    external_reference: string; // lead_id
  }): Promise<{ transfer_id: string }> {
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(
      `[MP MOCK] createTransfer: R$ ${params.amount} | ${params.target_account.holder_name} | ref=${params.external_reference}`,
    );

    return { transfer_id: transferId };
  }

  /**
   * Verifica assinatura do webhook do Mercado Pago.
   * A assinatura vem no header X-Signature.
   *
   * Formato esperado: "ts=<timestamp>,v1=<hmac>"
   * HMAC = HMAC-SHA256(ts.body, webhookSecret)
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!MERCADOPAGO_CONFIG.webhookSecret) {
      console.warn('[MP] MERCADOPAGO_WEBHOOK_SECRET não configurado, pulando verificação de assinatura');
      return true; // Em dev, pula. Em prod com variável vazia, vai falhar acima.
    }

    try {
      // Formato da assinatura: "ts=<timestamp>,v1=<hmac>"
      const parts = signature.split(',');
      const tsParam = parts[0]?.split('=');
      const v1Param = parts[1]?.split('=');

      if (!tsParam || !v1Param || tsParam[0] !== 'ts' || v1Param[0] !== 'v1') {
        console.error('[MP] Webhook signature format inválido');
        return false;
      }

      const ts = tsParam[1];
      const v1 = v1Param[1];

      if (!ts || !v1) {
        console.error('[MP] Webhook signature incompleta');
        return false;
      }

      // Calcular HMAC
      const data = `${ts}.${body}`;
      const hmac = crypto
        .createHmac('sha256', MERCADOPAGO_CONFIG.webhookSecret)
        .update(data)
        .digest('hex');

      const isValid = hmac === v1;
      if (!isValid) {
        console.error('[MP] Webhook signature inválida (HMAC mismatch)');
      }
      return isValid;
    } catch (error) {
      console.error('[MP] Erro ao verificar webhook signature:', error);
      return false;
    }
  }

  /**
   * Verifica se a API está disponível.
   * Útil para health checks.
   */
  async ping(): Promise<boolean> {
    console.log('[MP MOCK] ping');
    return true;
  }
}

export const mercadoPagoService = new MercadoPagoService();
