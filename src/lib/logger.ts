/**
 * Centralized Logging Service
 *
 * This module provides a consistent logging interface throughout the application.
 * In production, logs are minimized to prevent data exposure.
 *
 * Usage:
 *   import { createLogger } from './lib/logger';
 *   const logger = createLogger('[MyComponent]');
 *   logger.info('Operation completed', { data });
 *   logger.error('Operation failed', error);
 */

import { APP_CONFIG } from '../config/app-config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private prefix: string;
  private minLevel: LogLevel;

  constructor(prefix: string = '', minLevel: LogLevel = APP_CONFIG.logging.level) {
    this.prefix = prefix;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.minLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `${this.prefix} ` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${prefix}${message}`;
  }

  private sanitizeContext(context: any): any {
    if (!context) return context;

    // Create a copy to avoid mutating original
    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    if (!APP_CONFIG.logging.enabled && !APP_CONFIG.logging.enableConsoleInProduction) return;

    const formattedMessage = this.formatMessage('debug', message, context);
    console.debug(formattedMessage, context ? this.sanitizeContext(context) : '');
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    if (!APP_CONFIG.logging.enabled && !APP_CONFIG.logging.enableConsoleInProduction) return;

    const formattedMessage = this.formatMessage('info', message, context);
    console.info(formattedMessage, context ? this.sanitizeContext(context) : '');
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage, context ? this.sanitizeContext(context) : '');
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const formattedMessage = this.formatMessage('error', message, context);

    // Always log errors, even in production
    if (error instanceof Error) {
      console.error(formattedMessage, {
        message: error.message,
        stack: error.stack,
        ...(context ? this.sanitizeContext(context) : {}),
      });
    } else {
      console.error(formattedMessage, error, context ? this.sanitizeContext(context) : '');
    }
  }

  // Performance logging
  time(label: string): void {
    if (APP_CONFIG.logging.enabled) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (APP_CONFIG.logging.enabled) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }

  // Group logging for complex operations
  group(label: string): void {
    if (APP_CONFIG.logging.enabled) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (APP_CONFIG.logging.enabled) {
      console.groupEnd();
    }
  }
}

// Factory function to create logger instances
export function createLogger(prefix: string = ''): Logger {
  return new Logger(prefix);
}

// Default logger instance
export const logger = createLogger('[App]');

// Utility to wrap async operations with logging
export async function logAsync<T>(
  operation: () => Promise<T>,
  operationName: string,
  logger: Logger
): Promise<T> {
  const startTime = performance.now();
  logger.debug(`Starting: ${operationName}`);

  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    logger.debug(`Completed: ${operationName}`, { durationMs: duration.toFixed(2) });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`Failed: ${operationName}`, error as Error, { durationMs: duration.toFixed(2) });
    throw error;
  }
}

// Utility to log function execution
export function logExecution<T extends (...args: any[]) => any>(
  fn: T,
  fnName: string,
  logger: Logger
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    logger.debug(`Executing: ${fnName}`, { argsCount: args.length });
    try {
      const result = fn(...args);
      logger.debug(`Executed: ${fnName}`);
      return result;
    } catch (error) {
      logger.error(`Execution failed: ${fnName}`, error as Error);
      throw error;
    }
  }) as T;
}
