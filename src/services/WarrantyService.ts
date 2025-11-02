/**
 * Warranty Service
 *
 * Centralized service for managing warranty data operations.
 * Uses Strategy pattern for query execution and includes caching.
 *
 * Refactored from warranty-service.ts to follow SOLID principles.
 */

import { supabase } from '../lib/supabase';
import { supabaseCache } from '../lib/supabase-cache';
import { createLogger } from '../lib/logger';
import { APP_CONFIG } from '../config/app-config';
import { createDefaultStrategyExecutor, StrategyExecutor } from './WarrantyQueryStrategy';

const logger = createLogger('[WarrantyService]');

// Types
export interface WarrantyListItem {
  id: string;
  contract_number: string;
  organization_id: string;
  customer_id: string;
  status: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  base_price: number;
  options_price: number;
  taxes: number;
  total_price: number;
  margin: number;
  deductible: number;
  province: string;
  sale_duration_seconds: number | null;
  created_at: string;
  contract_pdf_url: string | null;
  customer_invoice_pdf_url: string | null;
  merchant_invoice_pdf_url: string | null;
  signature_proof_url: string | null;
  signed_at: string | null;
  signature_ip: string | null;
  legal_validation_passed: boolean | null;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  customer_province: string;
  trailer_vin: string;
  trailer_make: string;
  trailer_model: string;
  trailer_year: number;
  trailer_purchase_price: number;
  plan_name_en: string;
  plan_name_fr: string;
  total_count?: number;
}

export interface WarrantyListResponse {
  data: WarrantyListItem[];
  totalCount: number;
  fromCache: boolean;
  executionTime: number;
}

interface PerformanceLog {
  query: string;
  time: number;
  timestamp: Date;
}

/**
 * Cache Manager
 * Handles all caching operations for warranties
 */
class CacheManager {
  private enabled: boolean;
  private ttl: number;

  constructor(enabled: boolean = true, ttl: number = APP_CONFIG.performance.cacheTTL) {
    this.enabled = enabled;
    this.ttl = ttl;
  }

  getCacheKey(page: number, pageSize: number, statusFilter: string, searchQuery: string): string {
    return `warranties:${page}:${pageSize}:${statusFilter}:${searchQuery}`;
  }

  get(key: string): WarrantyListResponse | null {
    if (!this.enabled) return null;

    const cached = supabaseCache['cache'].get(key);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug('Cache hit', { key });
      return {
        data: cached.data.data,
        totalCount: cached.data.totalCount,
        fromCache: true,
        executionTime: 0,
      };
    }

    logger.debug('Cache miss', { key });
    return null;
  }

  set(key: string, response: WarrantyListResponse): void {
    if (!this.enabled) return;

    supabaseCache['cache'].set(key, {
      data: { data: response.data, totalCount: response.totalCount },
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    });

    logger.debug('Cache set', { key, itemCount: response.data.length });
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      supabaseCache.invalidate(pattern);
      logger.info('Cache invalidated', { pattern });
    } else {
      supabaseCache.invalidate('warranties');
      logger.info('All warranty cache invalidated');
    }
  }
}

/**
 * Performance Tracker
 * Tracks query performance for monitoring
 */
class PerformanceTracker {
  private logs: PerformanceLog[] = [];
  private maxLogs: number = 50;

  log(queryName: string, executionTime: number): void {
    this.logs.push({
      query: queryName,
      time: executionTime,
      timestamp: new Date(),
    });

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log slow queries
    if (executionTime > APP_CONFIG.performance.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        query: queryName,
        executionTime: executionTime.toFixed(2),
      });
    }
  }

  getStats(): {
    avgTime: number;
    maxTime: number;
    minTime: number;
    totalQueries: number;
  } {
    if (this.logs.length === 0) {
      return { avgTime: 0, maxTime: 0, minTime: 0, totalQueries: 0 };
    }

    const times = this.logs.map((log) => log.time);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      avgTime: sum / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      totalQueries: this.logs.length,
    };
  }
}

/**
 * Warranty Service
 * Main service for warranty operations
 */
export class WarrantyService {
  private cacheManager: CacheManager;
  private performanceTracker: PerformanceTracker;
  private strategyExecutor: StrategyExecutor;

  constructor(
    cacheManager?: CacheManager,
    performanceTracker?: PerformanceTracker,
    strategyExecutor?: StrategyExecutor
  ) {
    this.cacheManager = cacheManager || new CacheManager();
    this.performanceTracker = performanceTracker || new PerformanceTracker();
    this.strategyExecutor = strategyExecutor || createDefaultStrategyExecutor();

    logger.info('WarrantyService initialized');
  }

  /**
   * Get warranties with optimized caching and fallback strategies
   */
  async getWarrantiesOptimized(
    page: number = 1,
    pageSize: number = APP_CONFIG.performance.defaultPageSize,
    statusFilter: string = 'all',
    searchQuery: string = '',
    organizationId?: string
  ): Promise<WarrantyListResponse> {
    const startTime = performance.now();
    const cacheKey = this.cacheManager.getCacheKey(page, pageSize, statusFilter, searchQuery);

    // Try cache first
    const cachedResult = this.cacheManager.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    logger.debug('Calling get_warranties_optimized with:', {
      page,
      pageSize,
      statusFilter,
      searchQuery,
      organizationId,
    });

    // Execute strategy chain
    const result = await this.strategyExecutor.execute(page, pageSize, statusFilter, searchQuery, organizationId);

    const totalTime = performance.now() - startTime;
    this.performanceTracker.log('getWarrantiesOptimized', totalTime);

    // Cache successful result
    if (result.data.length > 0) {
      this.cacheManager.set(cacheKey, result);
    }

    return {
      ...result,
      executionTime: totalTime,
    };
  }

  /**
   * Prefetch next page for smooth pagination
   */
  async prefetchNextPage(
    currentPage: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string
  ): Promise<void> {
    const nextPage = currentPage + 1;

    // Prefetch in background
    setTimeout(() => {
      this.getWarrantiesOptimized(nextPage, pageSize, statusFilter, searchQuery).catch((error) => {
        logger.debug('Prefetch failed', { error: error.message });
      });
    }, 50);

    // Also prefetch previous page for smooth back navigation
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setTimeout(() => {
        this.getWarrantiesOptimized(prevPage, pageSize, statusFilter, searchQuery).catch(
          (error) => {
            logger.debug('Prefetch previous page failed', { error: error.message });
          }
        );
      }, 100);
    }
  }

  /**
   * Invalidate warranty cache
   */
  invalidateCache(): void {
    this.cacheManager.invalidate();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    avgTime: number;
    maxTime: number;
    minTime: number;
    totalQueries: number;
  } {
    return this.performanceTracker.getStats();
  }

  /**
   * Refresh materialized view (if available)
   */
  async refreshMaterializedView(): Promise<void> {
    try {
      const { error } = await supabase.rpc('refresh_warranty_view_auto');
      if (error) throw error;
      this.invalidateCache();
      logger.info('Materialized view refreshed');
    } catch (error) {
      logger.debug('Materialized view refresh failed', {
        error: (error as Error).message,
      });
      // Silent fail - this is an optional optimization
    }
  }

  /**
   * Configure caching behavior
   */
  configureCaching(enabled: boolean, ttl?: number): void {
    if (ttl) {
      this.cacheManager = new CacheManager(enabled, ttl);
    }
    logger.info('Cache configuration updated', { enabled, ttl });
  }
}

// Export singleton instance
export const warrantyService = new WarrantyService();

// Export class for testing
export { CacheManager, PerformanceTracker };
