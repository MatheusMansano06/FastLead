import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

const ROTINA_TABLET = /^\/tablet\/(playlist|impressions|telemetry|status)$/;

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;

    // Health check e polling do tablet são ruído: o tablet bate a cada poucos
    // minutos por carro e enterra as requisições que interessam.
    const rota = req.originalUrl.split('?')[0];
    const ruido = rota === '/health' || ROTINA_TABLET.test(rota);

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else if (ruido) {
      logger.debug(message);
    } else {
      logger.info(message);
    }
  });

  next();
};
