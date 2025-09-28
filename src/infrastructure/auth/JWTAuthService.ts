import { IAuthService, TokenPair, TokenPayload } from '@application/ports/external/IAuthService';
import { UnauthorizedError } from '@domain/errors/DomainError';
import { logger } from '@shared/utils/logger';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';

export class JWTAuthService implements IAuthService {
  constructor(
    private readonly jwtSecret: string,
    private readonly accessTokenExpiry: string = '24h',
    private readonly refreshTokenExpiry: string = '7d'
  ) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Failed to hash password', { error });
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Failed to verify password', { error });
      return false;
    }
  }

  async generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    try {
      const accessToken = await this.generateAccessToken(payload);

      const refreshTokenOptions: SignOptions = {
        // todo: convert to number; or add validation
        expiresIn: this.refreshTokenExpiry as StringValue,
        issuer: 'truetweet',
        subject: 'refresh',
      };

      const refreshToken = jwt.sign(payload as object, this.jwtSecret, refreshTokenOptions);

      logger.debug('JWT tokens generated', { userId: payload.userId, username: payload.username });

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Failed to generate JWT tokens', { error, userId: payload.userId });
      throw new Error('Token generation failed');
    }
  }

  async generateAccessToken(
    payload: Omit<TokenPayload, 'iat' | 'exp'>,
    customExpiry?: string
  ): Promise<string> {
    try {
      const accessTokenOptions: SignOptions = {
        expiresIn: (customExpiry || this.accessTokenExpiry) as StringValue,
        issuer: 'truetweet',
        subject: 'access',
      };

      return jwt.sign(payload as object, this.jwtSecret, accessTokenOptions);
    } catch (error) {
      logger.error('Failed to generate access token', { error, userId: payload.userId });
      throw new Error('Access token generation failed');
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'truetweet',
        subject: 'access',
      }) as TokenPayload;

      return decoded;
    } catch (error: any) {
      logger.debug('Access token verification failed', { error: error.message });

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid access token');
      }
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedError('Access token not active yet');
      }

      throw new UnauthorizedError('Token verification failed');
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'truetweet',
        subject: 'refresh',
      }) as TokenPayload;

      return decoded;
    } catch (error: any) {
      logger.debug('Refresh token verification failed', { error: error.message });

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedError('Refresh token not active yet');
      }

      throw new UnauthorizedError('Refresh token verification failed');
    }
  }

  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    // Trim whitespace and split
    const trimmed = authHeader.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length !== 2) {
      return null;
    }

    // Check if first part is 'Bearer' (case-insensitive)
    if (parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    const token = parts[1].trim();
    return token || null;
  }
}
