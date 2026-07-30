import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { AuthPayload, UserType } from '../types';
import logger from '../config/logger';

declare global {
  // Namespace é a forma que o Express expõe para estender o tipo Request;
  // não há equivalente em módulos ES aqui.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      throw new AuthenticationError('Invalid or expired token');
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      logger.error(`Authentication error: ${error}`);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
};

export const authorize = (...allowedRoles: UserType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.type)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};
