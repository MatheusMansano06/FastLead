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

  // O log sempre recebe o erro real, com tudo.
  logger.error(`Error: ${error.message || 'Internal server error'}`, error);

  // O CLIENTE não. Um AppError é lançado por nós de propósito e a mensagem é
  // escrita para ser lida por quem está na tela ("senha inválida"). Qualquer
  // outro erro é interno e a mensagem dele descreve a nossa infraestrutura:
  // uma falha de conexão do Prisma chegava na tela de login expondo o host e o
  // ref do banco. Em desenvolvimento continua tudo visível, senão não dá para
  // depurar.
  const exporDetalhe = isAppError || config.env === 'development';

  const errorResponse: ErrorResponse = {
    error: exporDetalhe ? error.name || 'Error' : 'InternalServerError',
    message: exporDetalhe
      ? error.message || 'Internal server error'
      : 'Não foi possível completar a operação. Tente novamente em instantes.',
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (config.env === 'development') {
    errorResponse.stack = error.stack;
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
