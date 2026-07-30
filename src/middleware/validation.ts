import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse({
        ...req.body,
        ...req.params,
        ...req.query,
      });

      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(error.message);
      }
      throw new ValidationError('Validation failed');
    }
  };
};
