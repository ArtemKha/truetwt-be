import { config } from '@shared/utils/env';
import { logger } from '@shared/utils/logger';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting TrueTweet backend server...', {
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      host: config.HOST,
    });

    const app = await createApp();

    const server = app.listen(config.PORT, config.HOST, () => {
      logger.info(`🚀 TrueTweet server is running on http://${config.HOST}:${config.PORT}`, {
        environment: config.NODE_ENV,
        port: config.PORT,
        host: config.HOST,
      });

      if (config.NODE_ENV !== 'production') {
        logger.info(`📚 API Documentation: http://localhost:${config.PORT}/api-docs`);
        logger.info(`🔍 Health Check: http://localhost:${config.PORT}/api/health`);
      }
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.PORT} is already in use`, { error });
      } else {
        logger.error('Server error', { error });
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close((error) => {
        if (error) {
          logger.error('Error during server shutdown', { error });
          process.exit(1);
        }

        logger.info('Server closed successfully');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the application
bootstrap().catch((error) => {
  logger.error('Bootstrap failed', { error });
  process.exit(1);
});
