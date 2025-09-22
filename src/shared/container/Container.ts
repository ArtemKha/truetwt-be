import { CommentService } from '@application/services/CommentService';
import { PostService } from '@application/services/PostService';
import { TimelineCacheService } from '@application/services/TimelineCacheService';
// Application services
import { UserService } from '@application/services/UserService';
// External services
import { JWTAuthService } from '@infrastructure/auth/JWTAuthService';
import { InMemoryCacheService } from '@infrastructure/cache/InMemoryCacheService';
import { RedisCacheService } from '@infrastructure/cache/RedisCacheService';
// Database
import { DatabaseConnection } from '@infrastructure/database/connection';
import { SQLiteCommentRepository } from '@infrastructure/repositories/SQLiteCommentRepository';
import { SQLiteMentionRepository } from '@infrastructure/repositories/SQLiteMentionRepository';
import { SQLitePostRepository } from '@infrastructure/repositories/SQLitePostRepository';
// Repositories
import { SQLiteUserRepository } from '@infrastructure/repositories/SQLiteUserRepository';
// Controllers
import { AuthController } from '@presentation/controllers/AuthController';
import { CommentController } from '@presentation/controllers/CommentController';
import { PostController } from '@presentation/controllers/PostController';
import { TimelineController } from '@presentation/controllers/TimelineController';
import { UserController } from '@presentation/controllers/UserController';
import { config } from '@shared/utils/env';
import { logger } from '@shared/utils/logger';

export class Container {
  private static instance: Container;
  private dependencies: Map<string, any> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing dependency container...');

    try {
      // Initialize database
      await this.initializeDatabase();

      // Initialize external services
      await this.initializeExternalServices();

      // Initialize repositories
      this.initializeRepositories();

      // Initialize application services
      this.initializeApplicationServices();

      // Initialize controllers
      this.initializeControllers();

      this.initialized = true;
      logger.info('Dependency container initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize dependency container', { error });
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    const databaseConnection = DatabaseConnection.getInstance(
      config.DATABASE_URL,
      config.DATABASE_MEMORY
    );

    this.dependencies.set('database', databaseConnection.getDatabase());
    logger.info('Database initialized');
  }

  private async initializeExternalServices(): Promise<void> {
    // Auth service
    const authService = new JWTAuthService(
      config.JWT_SECRET,
      config.JWT_EXPIRES_IN,
      config.JWT_REFRESH_EXPIRES_IN
    );
    this.dependencies.set('authService', authService);

    // Cache service
    let cacheService;

    try {
      // Try to initialize Redis cache
      cacheService = new RedisCacheService(
        config.REDIS_URL,
        config.REDIS_PASSWORD,
        config.REDIS_DB
      );
      await cacheService.connect();
      logger.info('Redis cache service initialized');
    } catch (error) {
      logger.warn('Failed to connect to Redis, falling back to in-memory cache', { error });
      cacheService = new InMemoryCacheService(config.TIMELINE_CACHE_SIZE);
    }

    this.dependencies.set('cacheService', cacheService);
  }

  private initializeRepositories(): void {
    const database = this.dependencies.get('database');

    const userRepository = new SQLiteUserRepository(database);
    const postRepository = new SQLitePostRepository(database);
    const commentRepository = new SQLiteCommentRepository(database);
    const mentionRepository = new SQLiteMentionRepository(database);

    this.dependencies.set('userRepository', userRepository);
    this.dependencies.set('postRepository', postRepository);
    this.dependencies.set('commentRepository', commentRepository);
    this.dependencies.set('mentionRepository', mentionRepository);

    logger.info('Repositories initialized');
  }

  private initializeApplicationServices(): void {
    const userRepository = this.dependencies.get('userRepository');
    const postRepository = this.dependencies.get('postRepository');
    const commentRepository = this.dependencies.get('commentRepository');
    const mentionRepository = this.dependencies.get('mentionRepository');
    const authService = this.dependencies.get('authService');
    const cacheService = this.dependencies.get('cacheService');

    const userService = new UserService(userRepository, authService);
    const postService = new PostService(
      postRepository,
      userRepository,
      mentionRepository,
      cacheService
    );
    const commentService = new CommentService(commentRepository, postRepository, userRepository);
    const timelineCacheService = new TimelineCacheService(cacheService, postRepository);

    this.dependencies.set('userService', userService);
    this.dependencies.set('postService', postService);
    this.dependencies.set('commentService', commentService);
    this.dependencies.set('timelineCacheService', timelineCacheService);

    logger.info('Application services initialized');
  }

  private initializeControllers(): void {
    const userService = this.dependencies.get('userService');
    const postService = this.dependencies.get('postService');
    const commentService = this.dependencies.get('commentService');
    const timelineCacheService = this.dependencies.get('timelineCacheService');

    const authController = new AuthController(userService);
    const userController = new UserController(userService);
    const postController = new PostController(postService);
    const timelineController = new TimelineController(postService, timelineCacheService);
    const commentController = new CommentController(commentService);

    this.dependencies.set('authController', authController);
    this.dependencies.set('userController', userController);
    this.dependencies.set('postController', postController);
    this.dependencies.set('timelineController', timelineController);
    this.dependencies.set('commentController', commentController);

    logger.info('Controllers initialized');
  }

  get<T>(key: string): T {
    if (!this.initialized) {
      throw new Error('Container not initialized. Call initialize() first.');
    }

    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(`Dependency '${key}' not found in container`);
    }

    return dependency;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up dependencies...');

    try {
      // Close cache connection
      const cacheService = this.dependencies.get('cacheService');
      if (cacheService && typeof cacheService.disconnect === 'function') {
        await cacheService.disconnect();
      }

      // Close database connection
      const databaseConnection = DatabaseConnection.getInstance();
      await databaseConnection.close();

      this.dependencies.clear();
      this.initialized = false;

      logger.info('Dependencies cleaned up successfully');
    } catch (error) {
      logger.error('Error during cleanup', { error });
      throw error;
    }
  }
}
