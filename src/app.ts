import cors from 'cors';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import 'express-async-errors';

// Middleware
import { errorHandler, notFoundHandler } from '@presentation/middleware/error.middleware';
// Routes
import { createRoutes, RoutesDependencies } from '@presentation/routes';
import { Container } from '@shared/container/Container';
import { config } from '@shared/utils/env';
import { logger } from '@shared/utils/logger';

export async function createApp(): Promise<Application> {
  const app = express();

  // Initialize container
  const container = Container.getInstance();
  await container.initialize();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // Swagger documentation
  if (config.NODE_ENV !== 'production') {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'TrueTweet API',
          version: '1.0.0',
          description: 'A mini-blogging platform API similar to Twitter',
          contact: {
            name: 'TrueTweet Team',
            email: 'support@truetweet.com',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}/api`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      apis: ['./src/presentation/routes/*.ts'],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    logger.info(`Swagger documentation available at http://localhost:${config.PORT}/api-docs`);
  }

  // API routes
  const routesDependencies: RoutesDependencies = {
    authController: container.get('authController'),
    userController: container.get('userController'),
    postController: container.get('postController'),
    timelineController: container.get('timelineController'),
    commentController: container.get('commentController'),
    authService: container.get('authService'),
  };

  app.use('/api', createRoutes(routesDependencies));

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      await container.cleanup();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return app;
}
