import express, { Request, Response } from 'express';
import cors from 'cors';
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

// Remove old routes that aren't needed
// import leadsRoutes from './routes/leads';
// import analyticsRoutes from './routes/analytics';
// import paymentRoutes from './routes/payment';

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
