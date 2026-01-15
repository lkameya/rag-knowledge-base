import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../utils/errors';

/**
 * Validate request body using Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters using Zod schema
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `Query validation error: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      next(error);
    }
  };
}
