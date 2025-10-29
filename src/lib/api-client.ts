import { supabase } from './supabase';
import {
  NetworkError,
  TimeoutError,
  RateLimitError,
  parseSupabaseError,
  parseNetworkError,
  createErrorContext,
  BaseAppError,
} from './error-types';
import { logError } from './error-logger';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableErrors: string[];
  exponentialBackoff: boolean;
}

export interface RequestConfig {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  skipErrorLogging?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_ERROR'],
  exponentialBackoff: true,
};

const DEFAULT_TIMEOUT = 30000;

class ApiClient {
  private defaultRetryConfig: RetryConfig;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.defaultRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRetryDelay(attempt: number, baseDelay: number, exponential: boolean): number {
    if (exponential) {
      return baseDelay * Math.pow(2, attempt - 1);
    }
    return baseDelay;
  }

  private shouldRetry(error: BaseAppError, retryableErrors: string[]): boolean {
    return retryableErrors.includes(error.code);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: RequestConfig
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config?.retryConfig };
    const timeout = config?.timeout || DEFAULT_TIMEOUT;
    let lastError: BaseAppError | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new TimeoutError('Request timeout', undefined, createErrorContext()));
          }, timeout);
        });

        const operationPromise = operation();

        if (config?.signal) {
          config.signal.addEventListener('abort', () => {
            throw new Error('Request aborted');
          });
        }

        const result = await Promise.race([operationPromise, timeoutPromise]);
        return result;
      } catch (error: any) {
        let appError: BaseAppError;

        if (error instanceof BaseAppError) {
          appError = error;
        } else if (error.message?.includes('fetch') || error.name === 'TypeError') {
          appError = parseNetworkError(error);
        } else {
          appError = parseSupabaseError(error);
        }

        lastError = appError;

        const isLastAttempt = attempt > retryConfig.maxRetries;
        const shouldRetryError = this.shouldRetry(appError, retryConfig.retryableErrors);

        if (!shouldRetryError || isLastAttempt) {
          if (!config?.skipErrorLogging) {
            logError(appError, createErrorContext({ attempt, maxRetries: retryConfig.maxRetries }));
          }
          throw appError;
        }

        const delayMs = this.getRetryDelay(attempt, retryConfig.retryDelay, retryConfig.exponentialBackoff);
        console.warn(`Request failed (attempt ${attempt}/${retryConfig.maxRetries}), retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
      }
    }

    throw lastError!;
  }

  async query<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    config?: RequestConfig
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const { data, error } = await queryFn();

      if (error) {
        throw parseSupabaseError(error);
      }

      if (!data) {
        throw new Error('No data returned from query');
      }

      return data;
    }, config);
  }

  async mutate<T>(
    mutateFn: () => Promise<{ data: T | null; error: any }>,
    config?: RequestConfig
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const { data, error } = await mutateFn();

      if (error) {
        throw parseSupabaseError(error);
      }

      return data as T;
    }, config);
  }

  async invokeFunction<T>(
    functionName: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        throw parseNetworkError(error);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as T;
    }, config);
  }

  deduplicateRequest<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    const promise = operation().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  async batchRequests<T>(
    operations: Array<() => Promise<T>>,
    config?: { concurrency?: number }
  ): Promise<Array<T | BaseAppError>> {
    const concurrency = config?.concurrency || 5;
    const results: Array<T | BaseAppError> = [];
    const executing: Promise<void>[] = [];

    for (const operation of operations) {
      const promise = (async () => {
        try {
          const result = await operation();
          results.push(result);
        } catch (error) {
          if (error instanceof BaseAppError) {
            results.push(error);
          } else {
            results.push(parseSupabaseError(error));
          }
        }
      })();

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }
}

export const apiClient = new ApiClient();

export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  config?: RequestConfig
): Promise<T> {
  return apiClient.query(queryFn, config);
}

export async function safeMutate<T>(
  mutateFn: () => Promise<{ data: T | null; error: any }>,
  config?: RequestConfig
): Promise<T> {
  return apiClient.mutate(mutateFn, config);
}

export async function safeInvokeFunction<T>(
  functionName: string,
  body?: any,
  config?: RequestConfig
): Promise<T> {
  return apiClient.invokeFunction(functionName, body, config);
}

export function deduplicateRequest<T>(key: string, operation: () => Promise<T>): Promise<T> {
  return apiClient.deduplicateRequest(key, operation);
}

export async function batchRequests<T>(
  operations: Array<() => Promise<T>>,
  config?: { concurrency?: number }
): Promise<Array<T | BaseAppError>> {
  return apiClient.batchRequests(operations, config);
}
