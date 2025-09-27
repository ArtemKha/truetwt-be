import { ValidationError } from '@domain/errors/DomainError';
import chalk from 'chalk';

interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

interface ErrorContext {
  method?: string;
  url?: string;
  ip?: string;
  userId?: string;
}

export const ErrorFormatter = {
  formatValidationError(error: ValidationError, context: ErrorContext = {}): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(
      chalk.red.bold(
        '╔══════════════════════════════════════════════════════════════════════════════╗'
      )
    );
    lines.push(
      chalk.red.bold('║') +
        chalk.white.bold(
          '                            VALIDATION ERROR                                 '
        ) +
        chalk.red.bold('║')
    );
    lines.push(
      chalk.red.bold(
        '╚══════════════════════════════════════════════════════════════════════════════╝'
      )
    );
    lines.push('');

    // Request info
    if (context.method && context.url) {
      lines.push(chalk.cyan.bold('Request: ') + chalk.white(`${context.method} ${context.url}`));
    }
    if (context.ip) {
      lines.push(chalk.cyan.bold('IP: ') + chalk.white(context.ip));
    }
    if (context.userId) {
      lines.push(chalk.cyan.bold('User ID: ') + chalk.white(context.userId));
    }
    lines.push('');

    // Error message
    lines.push(chalk.red.bold('Message: ') + chalk.white(error.message));
    lines.push('');

    // Validation issues
    const details = error.details as { issues?: ValidationIssue[] } | undefined;
    if (details?.issues && Array.isArray(details.issues)) {
      lines.push(chalk.yellow.bold('Validation Issues:'));
      lines.push(
        chalk.gray(
          '┌─────────────────────────────────────────────────────────────────────────────┐'
        )
      );

      details.issues.forEach((issue: ValidationIssue, index: number) => {
        const isLast = index === details.issues!.length - 1;
        const prefix = isLast ? '└─' : '├─';

        lines.push(
          chalk.gray('│ ') +
            chalk.yellow(prefix) +
            chalk.white.bold(` Field: ${issue.path || 'root'}`)
        );
        lines.push(chalk.gray('│   ') + chalk.red(`✗ ${issue.message}`));
        lines.push(chalk.gray('│   ') + chalk.dim(`Code: ${issue.code}`));

        if (!isLast) {
          lines.push(chalk.gray('│'));
        }
      });

      lines.push(
        chalk.gray(
          '└─────────────────────────────────────────────────────────────────────────────┘'
        )
      );
    }

    lines.push('');
    return lines.join('\n');
  },

  formatGenericError(error: Error, context: ErrorContext = {}): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(
      chalk.red.bold(
        '╔══════════════════════════════════════════════════════════════════════════════╗'
      )
    );
    lines.push(
      chalk.red.bold('║') +
        chalk.white.bold(
          '                              ERROR                                          '
        ) +
        chalk.red.bold('║')
    );
    lines.push(
      chalk.red.bold(
        '╚══════════════════════════════════════════════════════════════════════════════╝'
      )
    );
    lines.push('');

    // Request info
    if (context.method && context.url) {
      lines.push(chalk.cyan.bold('Request: ') + chalk.white(`${context.method} ${context.url}`));
    }
    if (context.ip) {
      lines.push(chalk.cyan.bold('IP: ') + chalk.white(context.ip));
    }
    if (context.userId) {
      lines.push(chalk.cyan.bold('User ID: ') + chalk.white(context.userId));
    }
    lines.push('');

    // Error details
    lines.push(chalk.red.bold('Type: ') + chalk.white(error.name));
    lines.push(chalk.red.bold('Message: ') + chalk.white(error.message));
    lines.push('');

    // Stack trace (formatted)
    if (error.stack && process.env.NODE_ENV !== 'production') {
      lines.push(chalk.yellow.bold('Stack Trace:'));
      lines.push(
        chalk.gray(
          '┌─────────────────────────────────────────────────────────────────────────────┐'
        )
      );

      const stackLines = error.stack.split('\n').slice(1); // Remove first line (error message)
      stackLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Highlight file paths
          const formattedLine = trimmedLine.replace(
            /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
            (match, func, file, lineNum, col) => {
              const shortFile = file.split('/').slice(-2).join('/');
              return `at ${chalk.cyan(func)} (${chalk.blue(shortFile)}:${chalk.yellow(lineNum)}:${chalk.yellow(col)})`;
            }
          );

          lines.push(chalk.gray('│ ') + formattedLine);
        }
      });

      lines.push(
        chalk.gray(
          '└─────────────────────────────────────────────────────────────────────────────┘'
        )
      );
    }

    lines.push('');
    return lines.join('\n');
  },

  formatRequestInfo(method: string, url: string, status?: number): string {
    const statusColor = status
      ? status >= 400
        ? chalk.red
        : status >= 300
          ? chalk.yellow
          : chalk.green
      : chalk.white;
    const statusText = status ? statusColor(`[${status}]`) : '';

    return chalk.dim('→ ') + chalk.cyan.bold(method) + ' ' + chalk.white(url) + ' ' + statusText;
  },

  formatSuccess(message: string): string {
    return chalk.green('✓ ') + chalk.white(message);
  },

  formatWarning(message: string): string {
    return chalk.yellow('⚠ ') + chalk.white(message);
  },

  formatInfo(message: string): string {
    return chalk.blue('ℹ ') + chalk.white(message);
  },
};
