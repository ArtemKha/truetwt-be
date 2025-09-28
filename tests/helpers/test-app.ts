import express, { Application } from 'express';
import { DatabaseConnection } from '../../src/infrastructure/database/connection';
import { errorHandler, notFoundHandler } from '../../src/presentation/middleware/error.middleware';
import { createRoutes } from '../../src/presentation/routes';
import { Container } from '../../src/shared/container/Container';

export class TestApp {
  private app: Application;
  private container: Container;
  private dbConnection: DatabaseConnection;

  constructor() {
    this.app = express();
    this.setupDatabase();
    this.setupMiddleware();
  }

  private setupDatabase(): void {
    // Reset the singleton instance for each test
    (DatabaseConnection as any).instance = null;

    // Set environment variables for in-memory database
    process.env.DATABASE_URL = ':memory:';
    process.env.DATABASE_MEMORY = 'true';

    // Use in-memory database for tests
    this.dbConnection = DatabaseConnection.getInstance(':memory:', true);
  }

  public async initialize(): Promise<void> {
    // Reset the container singleton for each test
    (Container as any).instance = null;

    // Initialize container with test configuration
    this.container = Container.getInstance();
    await this.container.initialize();

    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    const routes = createRoutes({
      authController: this.container.get('authController'),
      userController: this.container.get('userController'),
      postController: this.container.get('postController'),
      timelineController: this.container.get('timelineController'),
      commentController: this.container.get('commentController'),
      authService: this.container.get('authService'),
    });

    this.app.use('/api', routes);

    // Add error handling middleware
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public getApp(): Application {
    return this.app;
  }

  public getContainer(): Container {
    return this.container;
  }

  public async cleanup(): Promise<void> {
    if (this.container) {
      await this.container.cleanup();
    }
  }

  public async resetDatabase(): Promise<void> {
    const db = this.container.get('database');
    db.exec(`
      DELETE FROM mentions;
      DELETE FROM comments;
      DELETE FROM posts;
      DELETE FROM users;
    `);
  }
}
