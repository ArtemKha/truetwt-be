import { IAuthService } from '@application/ports/external/IAuthService';
import { IUserRepository } from '@application/ports/repositories/IUserRepository';
import { CreateUserData, UpdateUserData, UserProfile } from '@domain/entities/User';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@domain/errors/DomainError';
import { ContentValidation } from '@domain/value-objects/ContentValidation';
import { Pagination, PaginationResult } from '@domain/value-objects/Pagination';
import { logger } from '@shared/utils/logger';

export class UserService {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async register(
    userData: CreateUserData
  ): Promise<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }> {
    // Validate input
    ContentValidation.validateUsername(userData.username);
    ContentValidation.validateEmail(userData.email);
    ContentValidation.validatePassword(userData.password);

    // Check if user already exists
    const existingUser = await this.userRepository.exists(userData.username, userData.email);
    if (existingUser) {
      throw new ConflictError('Username or email already exists');
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
    });

    // Generate tokens
    const tokens = await this.authService.generateTokens({
      userId: user.id,
      username: user.username,
    });

    logger.info('User registered successfully', {
      userId: user.id,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  async login(
    username: string,
    password: string
  ): Promise<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }> {
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Find user by username
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new BadRequestError('Invalid credentials: user not found');
    }

    // Verify password
    const isPasswordValid = await this.authService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestError('Invalid credentials: password is incorrect');
    }

    // Generate tokens
    const tokens = await this.authService.generateTokens({
      userId: user.id,
      username: user.username,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Verify refresh token
    const payload = await this.authService.verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = await this.authService.generateAccessToken({
      userId: payload.userId,
      username: payload.username,
    });

    logger.debug('Access token refreshed', { userId: payload.userId });

    return { accessToken };
  }

  async getUserProfile(userId: number): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUserProfile(userId: number, updateData: UpdateUserData): Promise<UserProfile> {
    // Validate input
    if (updateData.username !== undefined) {
      ContentValidation.validateUsername(updateData.username);
    }
    if (updateData.email !== undefined) {
      ContentValidation.validateEmail(updateData.email);
    }

    if (!updateData.username && !updateData.email) {
      throw new ValidationError('At least one field must be provided for update');
    }

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Update user
    const updatedUser = await this.userRepository.update(userId, updateData);

    // TODO: CACHE STALENESS FIX - Username changes don't invalidate timeline cache
    // When username changes, timeline cache still shows old username for all user's posts.
    // Need to either:
    // 1. Refresh entire timeline cache (simple but expensive)
    // 2. Update specific user posts in cache (complex but efficient)
    // 3. Implement cache versioning/tagging for user data
    if (updateData.username && updateData.username !== existingUser.username) {
      // Cache invalidation needed here
    }

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(updateData),
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async getAllUsers(
    page = 1,
    limit = 20
  ): Promise<{ users: UserProfile[]; pagination: PaginationResult }> {
    const pagination = new Pagination(page, limit);
    return await this.userRepository.findAll(pagination);
  }

  async findUserByUsername(username: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserStats(_userId: number): Promise<{ totalPosts: number; totalComments: number }> {
    // Note: This would require additional methods in repositories or a dedicated stats service
    // For now, returning default values - implement when post/comment counts are needed
    return {
      totalPosts: 0,
      totalComments: 0,
    };
  }
}
