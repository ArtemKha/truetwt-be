import { UserService } from '@application/services/UserService';
import { ForbiddenError } from '@domain/errors/DomainError';
import { logger } from '@shared/utils/logger';
import { Request, Response } from 'express';
import { GetUsersQuery, UpdateUserRequest, UserParams } from '../schemas/user.schemas';

export class UserController {
  constructor(private userService: UserService) {}

  async getUsers(req: Request, res: Response) {
    const { page, limit }: GetUsersQuery = req.query as any;

    const result = await this.userService.getAllUsers(page, limit);

    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: result.pagination,
      },
    });
  }

  async getUserById(req: Request, res: Response) {
    const { id }: UserParams = req.params as any;

    const user = await this.userService.getUserProfile(id);

    res.json({
      success: true,
      data: { user },
    });
  }

  async updateUser(req: Request, res: Response) {
    const { id }: UserParams = req.params as any;
    const updateData: UpdateUserRequest = req.body;

    // Check if user is updating their own profile
    if (!req.user || req.user.userId !== id) {
      throw new ForbiddenError('You can only update your own profile');
    }

    const updatedUser = await this.userService.updateUserProfile(id, updateData);

    logger.info('User profile updated', {
      userId: id,
      updatedFields: Object.keys(updateData),
    });

    res.json({
      success: true,
      data: { user: updatedUser },
    });
  }

  async getUserStats(req: Request, res: Response) {
    const { id }: UserParams = req.params as any;

    // Check if user is requesting their own stats or if this is public info
    if (!req.user || req.user.userId !== id) {
      throw new ForbiddenError('You can only view your own detailed stats');
    }

    const stats = await this.userService.getUserStats(id);

    res.json({
      success: true,
      data: { stats },
    });
  }

  async searchUsers(req: Request, res: Response) {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
    }

    // For now, we'll search by exact username match
    // In a real app, you might want fuzzy search or partial matching
    const user = await this.userService.findUserByUsername(q);

    res.json({
      success: true,
      data: {
        users: user ? [user] : [],
        pagination: {
          total: user ? 1 : 0,
          page: Number(page),
          limit: Number(limit),
          hasNext: false,
          hasPrev: false,
        },
      },
    });
  }
}
