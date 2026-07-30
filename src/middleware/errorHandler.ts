import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../config/logger';
import { ErrorResponse } from '../types';
import config from '../config/config';

export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const message = error.message || 'Internal server error';

  logger.error(`Error: ${message}`, error);

  const errorResponse: ErrorResponse = {
    error: error.name || 'Error',
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (config.env === 'development') {
    (errorResponse as any).stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
