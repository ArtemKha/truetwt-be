import express, { Application, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { JWTAuthService } from '../../../src/infrastructure/auth/JWTAuthService';
import { createAuthMiddleware } from '../../../src/presentation/middleware/auth.middleware';
import { errorHandler } from '../../../src/presentation/middleware/error.middleware';
import { testUsers } from '../../helpers/test-data';

describe('Auth Middleware Integration Tests', () => {
  let app: Application;
  let authService: JWTAuthService;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    authService = new JWTAuthService('supersecretjwtkeythatisatleast32characterslong', '1h', '7d');
    const authMiddleware = createAuthMiddleware(authService);

    // Test routes
    app.get('/public', (req: Request, res: Response) => {
      res.json({ success: true, message: 'Public endpoint' });
    });

    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'Protected endpoint',
        user: req.user,
      });
    });

    app.get('/user-info', authMiddleware, (req: Request, res: Response) => {
      res.json({
        success: true,
        userId: req.user?.userId,
        username: req.user?.username,
      });
    });

    // Add error handling middleware
    app.use(errorHandler);
  });

  describe('Public endpoints', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app).get('/public').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Public endpoint',
      });
    });
  });

  describe('Protected endpoints', () => {
    it('should allow access with valid JWT token', async () => {
      // Create a valid token
      const userData = {
        userId: 123,
        username: testUsers.validUser1.username,
      };

      const token = await authService.generateAccessToken(userData);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Protected endpoint',
        user: {
          userId: userData.userId,
          username: userData.username,
        },
      });
    });

    it('should reject requests without authorization header', async () => {
      const response = await request(app).get('/protected').expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format',
        },
      });
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    });

    it('should reject requests with expired JWT token', async () => {
      // Create an expired token (manually set expiration to past)
      const userData = {
        userId: 123,
        username: testUsers.validUser1.username,
      };

      // Create token with very short expiration
      const expiredToken = await authService.generateAccessToken(userData, '1ms');

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    });

    it('should reject requests with empty bearer token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format',
        },
      });
    });

    it('should handle case-insensitive Bearer keyword', async () => {
      const userData = {
        userId: 123,
        username: testUsers.validUser1.username,
      };

      const token = await authService.generateAccessToken(userData);

      // Test with lowercase 'bearer'
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should populate req.user with decoded token data', async () => {
      const userData = {
        userId: 456,
        username: 'test_user_456',
      };

      const token = await authService.generateAccessToken(userData);

      const response = await request(app)
        .get('/user-info')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        userId: userData.userId,
        username: userData.username,
      });
    });
  });

  describe('Token validation edge cases', () => {
    it('should handle tokens with extra whitespace', async () => {
      const userData = {
        userId: 123,
        username: testUsers.validUser1.username,
      };

      const token = await authService.generateAccessToken(userData);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `  Bearer   ${token}  `)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject tokens with invalid signature', async () => {
      const userData = {
        userId: 123,
        username: testUsers.validUser1.username,
      };

      const validToken = await authService.generateAccessToken(userData);

      // Tamper with the token by changing the last character
      const tamperedToken = validToken.slice(0, -1) + 'X';

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    });

    it('should handle multiple authorization headers gracefully', async () => {
      const userData = {
        userId: 123,
        username: testUsers.validUser1.username,
      };

      const token = await authService.generateAccessToken(userData);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .set('Authorization', 'Bearer invalid-token') // This will override the first one
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle JWT service errors gracefully', async () => {
      // Create a middleware with a mock auth service that throws
      const mockAuthService = {
        verifyAccessToken: () => {
          throw new Error('JWT service error');
        },
        extractTokenFromHeader: authService.extractTokenFromHeader.bind(authService),
        generateAccessToken: authService.generateAccessToken.bind(authService),
        generateTokens: authService.generateTokens.bind(authService),
        verifyRefreshToken: authService.verifyRefreshToken.bind(authService),
        hashPassword: authService.hashPassword.bind(authService),
        verifyPassword: authService.verifyPassword.bind(authService),
      };

      const errorApp = express();
      errorApp.use(express.json());
      const errorMiddleware = createAuthMiddleware(mockAuthService as any);

      errorApp.get('/error-test', errorMiddleware, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Add error handling middleware
      errorApp.use(errorHandler);

      const response = await request(errorApp)
        .get('/error-test')
        .set('Authorization', 'Bearer some-token')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
        },
      });
    });
  });
});
