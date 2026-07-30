import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  /**
   * Base para onde os QR codes apontam. Precisa ser a URL do BACKEND, porque é
   * aqui que mora a rota /r/:campaignId que registra o scan e redireciona.
   * Apontar para o frontend faz o QR cair na landing sem contar nada.
   */
  qrBaseUrl: (process.env.QR_BASE_URL || process.env.API_URL || 'http://localhost:3000').replace(
    /\/+$/,
    ''
  ),

  /**
   * URL do FRONTEND — usada para mandar o passageiro à landing de captura
   * (/lp/:campaignId) quando a campanha não tem destino próprio.
   */
  appBaseUrl: (
    process.env.APP_BASE_URL ||
    (process.env.CORS_ORIGIN || '').split(',')[0] ||
    'http://localhost:5173'
  ).replace(/\/+$/, ''),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fastlead_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export default config;
