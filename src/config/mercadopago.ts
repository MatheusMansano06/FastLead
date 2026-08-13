/**
 * O Mercado Pago valida a notification_url na criação da cobrança e devolve
 * 400 ("notificaction_url attribute must be url valid") se ela não for uma URL
 * pública em https. O padrão anterior era `http://localhost:3000/...`, então
 * sem APP_URL configurada TODA cobrança PIX falhava — a recarga inteira ficava
 * de pé só até o primeiro clique.
 *
 * Agora a URL só é enviada quando é utilizável. Sem ela o webhook não chega,
 * mas o /billing/verify continua confirmando o pagamento por consulta, então a
 * recarga funciona de qualquer forma.
 */
function urlDeNotificacao(): string | undefined {
  const base = process.env.APP_URL;
  if (!base) return undefined;

  try {
    const u = new URL(base);
    // localhost não é alcançável pelo Mercado Pago, e http é recusado.
    if (u.protocol !== 'https:') return undefined;
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return undefined;
    return `${u.origin}/webhooks/mercadopago`;
  } catch {
    console.warn(`⚠️  APP_URL inválida (${base}) — webhook do Mercado Pago desativado`);
    return undefined;
  }
}

export const MERCADOPAGO_CONFIG = {
  // Será buscado do .env
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  notificationUrl: urlDeNotificacao(),
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
};

// Em produção, estas variáveis são obrigatórias
if (process.env.NODE_ENV === 'production') {
  if (!MERCADOPAGO_CONFIG.accessToken) {
    console.warn('⚠️  MERCADOPAGO_ACCESS_TOKEN não configurado (será necessário à noite)');
  }
  if (!MERCADOPAGO_CONFIG.webhookSecret) {
    console.warn('⚠️  MERCADOPAGO_WEBHOOK_SECRET não configurado (será necessário à noite)');
  }
  if (!MERCADOPAGO_CONFIG.notificationUrl) {
    console.warn(
      '⚠️  APP_URL ausente ou não-https — o webhook do Mercado Pago não será chamado; ' +
        'a confirmação de pagamento fica dependendo de /billing/verify'
    );
  }
}
