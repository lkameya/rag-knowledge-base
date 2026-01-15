import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle known application errors
  if (err instanceof AppError) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel]('Application error', {
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      isOperational: err.isOperational,
    });

    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Handle Zod validation errors (from validator middleware)
  if (err.name === 'ZodError') {
    logger.warn('Validation error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      error: {
        message: 'Validation error',
        statusCode: 400,
        details: (err as any).errors || err.message,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error('Unexpected error', {
    error: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    },
  });
}
