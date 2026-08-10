export const MERCADOPAGO_CONFIG = {
  // Será buscado do .env
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  notificationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/webhooks/mercadopago`,
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
}
