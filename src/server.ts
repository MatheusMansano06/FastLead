import app from './app';
import config from './config/config';
import logger from './config/logger';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════════════╗
║                   FastLead Backend API                  ║
║═══════════════════════════════════════════════════════════║
║                                                           ║
║  Server is running on: ${config.apiUrl}
║  Environment: ${config.env}
║  Node Version: ${process.version}
║                                                           ║
║  Ready to accept connections!                            ║
╚══════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
