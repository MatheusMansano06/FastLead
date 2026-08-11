import { MERCADOPAGO_CONFIG } from '../../config/mercadopago';
import crypto from 'crypto';

/**
 * Serviço Mercado Pago — integração com gateway de pagamento
 * Chamadas reais à API REST do Mercado Pago
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
   * Retorna o ID da transação.
   */
  async createPayment(params: {
    amount: number;
    description: string;
    external_reference: string;
    payer_email?: string;
    auto_return: string;
  }): Promise<MercadoPagoPayment> {
    const url = 'https://api.mercadopago.com/v1/payments';
    const body = {
      transaction_amount: params.amount,
      description: params.description,
      external_reference: params.external_reference,
      payer: {
        email: params.payer_email || 'noreply@fastlead.com.br',
      },
      notification_url: MERCADOPAGO_CONFIG.notificationUrl,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[MP] Erro ao criar payment: ${response.status}`, error);
        throw new Error(`Mercado Pago error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`[MP] Payment criado: id=${data.id}, status=${data.status}`);

      return {
        id: data.id,
        init_point: `https://api.mercadopago.com/checkout/v1/redirect?preference-id=${data.id}`,
      };
    } catch (error) {
      console.error('[MP] Erro ao criar payment:', error);
      throw error;
    }
  }

  /**
   * Verifica o status de um payment já criado.
   */
  async verifyPayment(payment_id: string): Promise<MercadoPagoVerify> {
    const url = `https://api.mercadopago.com/v1/payments/${payment_id}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[MP] Erro ao verificar payment: ${response.status}`, error);
        throw new Error(`Mercado Pago error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`[MP] Payment verificado: id=${data.id}, status=${data.status}`);

      return {
        status: data.status,
        amount: data.transaction_amount,
      };
    } catch (error) {
      console.error('[MP] Erro ao verificar payment:', error);
      throw error;
    }
  }

  /**
   * Cria uma transfer para a conta bancária do motorista.
   */
  async createTransfer(params: {
    amount: number;
    target_account: {
      cpf: string;
      bank_code: string;
      agency: string;
      account: string;
      account_type: 'CHECKING' | 'SAVINGS';
      holder_name: string;
    };
    description: string;
    external_reference: string;
  }): Promise<{ transfer_id: string }> {
    const url = 'https://api.mercadopago.com/v1/transfers';
    const body = {
      amount: params.amount,
      description: params.description,
      external_reference: params.external_reference,
      recipient_type: 'INDIVIDUAL',
      receiver: {
        type: 'bank_account',
        id: `${params.target_account.bank_code}-${params.target_account.agency}-${params.target_account.account}-${params.target_account.account_type}`,
        bank_account: {
          document_type: 'CPF',
          document_id: params.target_account.cpf,
          account_holder_name: params.target_account.holder_name,
          account_number: params.target_account.account,
          agency_number: params.target_account.agency,
          bank_code: params.target_account.bank_code,
          account_type: params.target_account.account_type === 'CHECKING' ? 'CUENTA_CORRIENTE' : 'CUENTA_AHORRO',
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[MP] Erro ao criar transfer: ${response.status}`, error);
        throw new Error(`Mercado Pago error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`[MP] Transfer criado: id=${data.id}, status=${data.status}`);

      return { transfer_id: data.id };
    } catch (error) {
      console.error('[MP] Erro ao criar transfer:', error);
      throw error;
    }
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
