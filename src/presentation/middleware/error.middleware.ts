import { DomainError } from '@domain/errors/DomainError';
import { logger } from '@shared/utils/logger';
import { NextFunction, Request, Response } from 'express';

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  // Log the error with enhanced formatting
  const logData: Record<string, unknown> = {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
  };

  // Add validation error details if available
  if (error instanceof DomainError && error.details) {
    logData.details = error.details;
  }

  logger.error('Request error', logData);

  // Handle known domain errors
  if (error instanceof DomainError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Handle validation errors (though they should be DomainErrors now)
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: (error as unknown as Record<string, unknown>).details,
      },
    });
  }

  // Handle unexpected errors
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
}

// Request logging middleware with enhanced formatting
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = (chunk?: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void) => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId,
    });

    return originalEnd(
      chunk as Parameters<typeof originalEnd>[0],
      encoding as Parameters<typeof originalEnd>[1],
      cb
    );
  };

  next();
}

// Async error wrapper to catch async errors in route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
