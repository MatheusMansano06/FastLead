import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import config from './config/config';
import { requestLogger, errorHandler } from './middleware';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import driverRoutes from './routes/driver';
import advertiserRoutes from './routes/advertiser';
import adminRoutes from './routes/admin';
import campaignsRoutes from './routes/campaigns';
import paymentsRoutes from './routes/payments';
import tabletRoutes from './routes/tablet';
import publicRoutes from './routes/public';
import billingRoutes from './routes/billing';
import driverBankRoutes from './routes/driver-bank';
import driverWalletRoutes from './routes/driver-wallet';
import webhookMercadopagoRoutes from './routes/webhook-mercadopago';

// Remove old routes that aren't needed
// import leadsRoutes from './routes/leads';
// import analyticsRoutes from './routes/analytics';
// import paymentRoutes from './routes/payment';

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Gzip nas respostas: a playlist do tablet leva banner e QR em base64 e vai por 4G.
app.use(compression());

// Body parser middleware. O banner chega como data-URL já redimensionada no
// navegador (lado maior 1280px, JPEG), então 2mb sobra; 10mb só abria a porta
// para quem quisesse encher a memória do servidor.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));

// CORS middleware
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // X-Device-Token é como o tablet do carro se autentica (ele não usa JWT).
    // Sem liberar aqui, o preflight barra e a playlist nunca carrega no navegador.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Token'],
  })
);

// Request logging middleware
app.use(requestLogger);

// Health check route (public)
app.use('/health', healthRoutes);

// Rotas públicas sem auth: redirect de QR (/r/:id), captura de lead e catálogo
// de segmentação. Precisam vir antes das rotas autenticadas.
app.use('/', publicRoutes);

// API Routes
app.use('/auth', authRoutes);
app.use('/tablet', tabletRoutes);
app.use('/driver', driverRoutes);
app.use('/advertiser', advertiserRoutes);
app.use('/admin', adminRoutes);
app.use('/campaigns', campaignsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/billing', billingRoutes);
app.use('/driver', driverBankRoutes);
app.use('/driver', driverWalletRoutes);

// Webhook do Mercado Pago: sem JWT, autenticado por assinatura HMAC. Fica
// fora de qualquer router que aplique verifyJWT — montar um router com
// verifyJWT na raiz barrava esta rota antes da checagem de assinatura.
app.use('/webhooks', webhookMercadopagoRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
