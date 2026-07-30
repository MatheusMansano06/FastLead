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
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else {
    message = error.message || 'Internal server error';
  }

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
