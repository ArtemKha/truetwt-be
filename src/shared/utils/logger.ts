import { ValidationError } from '@domain/errors/DomainError';
import winston from 'winston';
import { ErrorFormatter } from './errorFormatter';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat =
  process.env.LOG_FORMAT || (process.env.NODE_ENV === 'development' ? 'pretty' : 'json');

const developmentFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, error, stack, method, url, ip, userId, details, ...meta } =
      info;
    const time =
      typeof timestamp === 'string'
        ? new Date(timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString();

    // Handle validation errors specially
    if (
      typeof error === 'string' &&
      error === 'Request validation failed' &&
      details &&
      typeof details === 'object' &&
      'issues' in details
    ) {
      const validationError = { message: error, details };
      return ErrorFormatter.formatValidationError(validationError as ValidationError, {
        method: typeof method === 'string' ? method : undefined,
        url: typeof url === 'string' ? url : undefined,
        ip: typeof ip === 'string' ? ip : undefined,
        userId: typeof userId === 'string' ? userId : undefined,
      });
    }

    // Handle generic errors with stack traces
    if (typeof stack === 'string' && level === 'error') {
      const errorMessage =
        typeof error === 'string' ? error : typeof message === 'string' ? message : 'Unknown error';
      const errorObj = new Error(errorMessage);
      errorObj.stack = stack;
      return ErrorFormatter.formatGenericError(errorObj, {
        method: typeof method === 'string' ? method : undefined,
        url: typeof url === 'string' ? url : undefined,
        ip: typeof ip === 'string' ? ip : undefined,
        userId: typeof userId === 'string' ? userId : undefined,
      });
    }

    // Handle request logging
    if (typeof method === 'string' && typeof url === 'string') {
      const statusCode = typeof meta.statusCode === 'number' ? meta.statusCode : undefined;
      const requestInfo = ErrorFormatter.formatRequestInfo(method, url, statusCode);

      if (level === 'error') {
        const messageStr = typeof message === 'string' ? message : 'Error occurred';
        return `${requestInfo}\n${ErrorFormatter.formatWarning(messageStr)}`;
      } else if (level === 'warn') {
        const messageStr = typeof message === 'string' ? message : 'Warning occurred';
        return `${requestInfo}\n${ErrorFormatter.formatWarning(messageStr)}`;
      } else {
        return `${requestInfo}`;
      }
    }

    // Default formatting
    const levelFormatted =
      level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? 'ℹ️' : '🔍';
    return `${levelFormatted} ${time} ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  logFormat === 'json'
    ? winston.format.json()
    : logFormat === 'pretty'
      ? developmentFormat
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        )
);

export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'truetweet-backend' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Create logs directory if it doesn't exist
import { mkdirSync } from 'node:fs';

try {
  mkdirSync('logs', { recursive: true });
} catch (_error) {
  // Directory already exists
}
