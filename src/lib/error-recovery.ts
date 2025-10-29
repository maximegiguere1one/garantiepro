import { BaseAppError, ErrorCode } from './error-types';
import { logError } from './error-logger';

export enum RecoveryStrategy {
  Retry = 'retry',
  Fallback = 'fallback',
  PartialRecovery = 'partial_recovery',
  UserGuidedRecovery = 'user_guided_recovery',
  AutomaticRollback = 'automatic_rollback',
  CircuitBreaker = 'circuit_breaker',
}

export interface RecoveryOptions {
  strategy: RecoveryStrategy;
  maxAttempts?: number;
  fallbackFn?: () => Promise<any>;
  rollbackFn?: () => Promise<void>;
  onRecoverySuccess?: (result: any) => void;
  onRecoveryFailure?: (error: Error) => void;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

enum CircuitState {
  Closed = 'closed',
  Open = 'open',
  HalfOpen = 'half_open',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.Closed;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(private config: CircuitBreakerConfig, private name: string) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.Open) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HalfOpen;
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker "${this.name}" is OPEN. Next attempt at ${new Date(this.nextAttemptTime!).toISOString()}`
        );
      }
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Circuit breaker timeout')), this.config.timeout);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HalfOpen) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.Closed;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.Open;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== undefined && Date.now() >= this.nextAttemptTime;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset(): void {
    this.state = CircuitState.Closed;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }
}

export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private recoveryHistory: Array<{
    timestamp: string;
    error: string;
    strategy: RecoveryStrategy;
    success: boolean;
  }> = [];

  private constructor() {}

  static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      };
      this.circuitBreakers.set(name, new CircuitBreaker(config || defaultConfig, name));
    }
    return this.circuitBreakers.get(name)!;
  }

  async attemptRecovery<T>(
    operation: () => Promise<T>,
    error: BaseAppError,
    options: RecoveryOptions
  ): Promise<T> {
    const startTime = Date.now();

    try {
      let result: T;

      switch (options.strategy) {
        case RecoveryStrategy.Retry:
          result = await this.retryRecovery(operation, options);
          break;

        case RecoveryStrategy.Fallback:
          result = await this.fallbackRecovery(operation, options);
          break;

        case RecoveryStrategy.CircuitBreaker:
          result = await this.circuitBreakerRecovery(operation, error);
          break;

        case RecoveryStrategy.AutomaticRollback:
          result = await this.rollbackRecovery(operation, options);
          break;

        default:
          throw new Error(`Recovery strategy ${options.strategy} not implemented`);
      }

      this.recordRecovery(error.message, options.strategy, true);
      options.onRecoverySuccess?.(result);
      return result;
    } catch (recoveryError: any) {
      this.recordRecovery(error.message, options.strategy, false);
      options.onRecoveryFailure?.(recoveryError);
      logError(recoveryError, { originalError: error.message, recoveryStrategy: options.strategy });
      throw recoveryError;
    } finally {
      const duration = Date.now() - startTime;
      console.log(`Recovery attempt took ${duration}ms`);
    }
  }

  private async retryRecovery<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions
  ): Promise<T> {
    const maxAttempts = options.maxAttempts || 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Retry recovery failed');
  }

  private async fallbackRecovery<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (options.fallbackFn) {
        return await options.fallbackFn();
      }
      throw error;
    }
  }

  private async circuitBreakerRecovery<T>(
    operation: () => Promise<T>,
    error: BaseAppError
  ): Promise<T> {
    const serviceName = this.extractServiceName(error);
    const circuitBreaker = this.getCircuitBreaker(serviceName);
    return await circuitBreaker.execute(operation);
  }

  private async rollbackRecovery<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (options.rollbackFn) {
        await options.rollbackFn();
      }
      throw error;
    }
  }

  private extractServiceName(error: BaseAppError): string {
    if (error.code === ErrorCode.INTEGRATION_ERROR) {
      return error.context?.additionalData?.integrationName || 'unknown_service';
    }
    return error.code;
  }

  private recordRecovery(
    errorMessage: string,
    strategy: RecoveryStrategy,
    success: boolean
  ): void {
    this.recoveryHistory.push({
      timestamp: new Date().toISOString(),
      error: errorMessage,
      strategy,
      success,
    });

    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory.shift();
    }
  }

  getRecoveryHistory() {
    return [...this.recoveryHistory];
  }

  getRecoveryStats() {
    const total = this.recoveryHistory.length;
    const successful = this.recoveryHistory.filter(r => r.success).length;
    const failed = total - successful;

    const byStrategy: Record<RecoveryStrategy, { total: number; successful: number }> = {} as any;
    Object.values(RecoveryStrategy).forEach(strategy => {
      byStrategy[strategy] = { total: 0, successful: 0 };
    });

    this.recoveryHistory.forEach(record => {
      byStrategy[record.strategy].total++;
      if (record.success) {
        byStrategy[record.strategy].successful++;
      }
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byStrategy,
    };
  }

  getAllCircuitBreakerStates() {
    const states: Record<string, any> = {};
    this.circuitBreakers.forEach((cb, name) => {
      states[name] = cb.getStats();
    });
    return states;
  }

  resetCircuitBreaker(name: string): boolean {
    const cb = this.circuitBreakers.get(name);
    if (cb) {
      cb.reset();
      return true;
    }
    return false;
  }

  resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
  }
}

export const errorRecoveryManager = ErrorRecoveryManager.getInstance();

export async function withRecovery<T>(
  operation: () => Promise<T>,
  options: RecoveryOptions
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (error instanceof BaseAppError) {
      return await errorRecoveryManager.attemptRecovery(operation, error, options);
    }
    throw error;
  }
}

export function getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
  return errorRecoveryManager.getCircuitBreaker(name, config);
}
