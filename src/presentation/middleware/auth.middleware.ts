import { IAuthService } from '@application/ports/external/IAuthService';
import { UnauthorizedError } from '@domain/errors/DomainError';
import { NextFunction, Request, Response } from 'express';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

export function createAuthMiddleware(authService: IAuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        const error = new UnauthorizedError('Authentication required');
        (error as any).code = 'AUTHENTICATION_REQUIRED';
        throw error;
      }

      const token = authService.extractTokenFromHeader(authHeader);

      if (!token) {
        const error = new UnauthorizedError('Invalid token format');
        (error as any).code = 'INVALID_TOKEN_FORMAT';
        throw error;
      }

      const payload = await authService.verifyAccessToken(token);

      // Attach user info to request
      req.user = {
        userId: payload.userId,
        username: payload.username,
        iat: payload.iat,
        exp: payload.exp,
      };

      next();
    } catch (error) {
      // Handle JWT verification errors
      if (error instanceof UnauthorizedError) {
        // Map specific JWT errors to expected codes
        if (
          error.message.includes('expired') ||
          error.message.includes('Invalid access token') ||
          error.message.includes('verification failed')
        ) {
          const mappedError = new UnauthorizedError('Invalid or expired token');
          (mappedError as any).code = 'INVALID_TOKEN';
          next(mappedError);
          return;
        }
      }
      next(error);
    }
  };
}

export function createOptionalAuthMiddleware(authService: IAuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        // No auth header is fine for optional auth
        return next();
      }

      const token = authService.extractTokenFromHeader(authHeader);

      if (!token) {
        // Invalid format but optional, continue without user
        return next();
      }

      try {
        const payload = await authService.verifyAccessToken(token);

        // Attach user info to request
        req.user = {
          userId: payload.userId,
          username: payload.username,
          iat: payload.iat,
          exp: payload.exp,
        };
      } catch (authError) {
        // Token verification failed but auth is optional, continue without user
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
