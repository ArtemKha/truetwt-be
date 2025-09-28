import { UserService } from '@application/services/UserService';
import { logger } from '@shared/utils/logger';
import { Request, Response } from 'express';
import { LoginRequest, RefreshTokenRequest, RegisterRequest } from '../schemas/auth.schemas';

export class AuthController {
  constructor(private userService: UserService) {}

  async register(req: Request, res: Response) {
    const userData: RegisterRequest = req.body;

    const result = await this.userService.register(userData);

    logger.info('User registration successful', { userId: result.user.id });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  }

  async login(req: Request, res: Response) {
    const { username, password }: LoginRequest = req.body;

    const result = await this.userService.login(username, password);

    logger.info('User login successful', { userId: result.user.id });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  }

  async refreshToken(req: Request, res: Response) {
    const { refreshToken }: RefreshTokenRequest = req.body;

    const result = await this.userService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  }

  async logout(req: Request, res: Response) {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the tokens from storage. However, we can log the event.

    logger.info('User logout', { userId: req.user?.userId });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  }

  async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const userProfile = await this.userService.getUserProfile(req.user.userId);

    res.json({
      success: true,
      data: { user: userProfile },
    });
  }
}
