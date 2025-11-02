/**
 * Warranty Query Strategy
 *
 * Implements the Strategy pattern for warranty data fetching.
 * Each strategy represents a different way to fetch warranties:
 * - OptimizedRPC: Uses optimized stored procedure
 * - SimpleRPC: Uses simple stored procedure
 * - DirectQuery: Direct database query fallback
 *
 * This pattern makes it easy to:
 * - Test each strategy independently
 * - Add new query strategies without modifying existing code
 * - Switch between strategies based on runtime conditions
 * - Handle failures gracefully with explicit fallback chain
 */

import { supabase } from '../lib/supabase';
import { createLogger } from '../lib/logger';
import type { WarrantyListItem, WarrantyListResponse } from './WarrantyService';

const logger = createLogger('[WarrantyQueryStrategy]');

/**
 * Base interface for all warranty query strategies
 */
export interface IWarrantyQueryStrategy {
  name: string;
  execute(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    organizationId?: string
  ): Promise<WarrantyListResponse>;
}

/**
 * Optimized RPC Strategy
 * Uses the optimized stored procedure with materialized views
 */
export class OptimizedRPCStrategy implements IWarrantyQueryStrategy {
  readonly name = 'OptimizedRPC';

  async execute(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    organizationId?: string
  ): Promise<WarrantyListResponse> {
    const startTime = performance.now();
    logger.debug(`${this.name}: Executing query`, { page, pageSize, statusFilter, organizationId });

    const { data, error } = await supabase.rpc('get_warranties_optimized', {
      p_page: page,
      p_page_size: pageSize,
      p_status_filter: statusFilter,
      p_search_query: searchQuery,
      p_organization_id: organizationId || null,
    });

    const executionTime = performance.now() - startTime;

    if (error) {
      logger.warn(`${this.name}: Query failed`, { error: error.message, executionTime });
      throw error;
    }

    if (!data) {
      logger.warn(`${this.name}: Returned null data`);
      throw new Error('No data returned');
    }

    const warranties = data as WarrantyListItem[];
    const totalCount = warranties.length > 0 ? Number(warranties[0].total_count) || 0 : 0;

    logger.info(`${this.name}: Query successful`, {
      executionTime: executionTime.toFixed(2),
      rowCount: warranties.length,
      totalCount,
    });

    return {
      data: warranties,
      totalCount,
      fromCache: false,
      executionTime,
    };
  }
}

/**
 * Simple RPC Strategy
 * Uses a simpler stored procedure with fewer joins
 */
export class SimpleRPCStrategy implements IWarrantyQueryStrategy {
  readonly name = 'SimpleRPC';

  async execute(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    organizationId?: string
  ): Promise<WarrantyListResponse> {
    const startTime = performance.now();
    logger.debug(`${this.name}: Executing query`, { page, pageSize, organizationId });

    const { data, error } = await supabase.rpc('get_warranties_simple', {
      p_page: page,
      p_page_size: pageSize,
      p_status_filter: statusFilter,
      p_search_query: searchQuery,
      p_organization_id: organizationId || null,
    });

    const executionTime = performance.now() - startTime;

    if (error) {
      logger.warn(`${this.name}: Query failed`, { error: error.message, executionTime });
      throw error;
    }

    if (!data) {
      logger.warn(`${this.name}: Returned null data`);
      throw new Error('No data returned');
    }

    const warranties = data as WarrantyListItem[];
    const totalCount = warranties.length > 0 ? Number(warranties[0].total_count) || 0 : 0;

    logger.info(`${this.name}: Query successful`, {
      executionTime: executionTime.toFixed(2),
      rowCount: warranties.length,
    });

    return {
      data: warranties,
      totalCount,
      fromCache: false,
      executionTime,
    };
  }
}

/**
 * Direct Query Strategy
 * Fallback strategy using direct database queries
 */
export class DirectQueryStrategy implements IWarrantyQueryStrategy {
  readonly name = 'DirectQuery';

  async execute(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    organizationId?: string
  ): Promise<WarrantyListResponse> {
    const startTime = performance.now();
    logger.info(`${this.name}: Using fallback direct query`, { organizationId });

    let query = supabase.from('warranties').select(
      `
        id,
        contract_number,
        organization_id,
        status,
        total_price,
        created_at,
        contract_pdf_url,
        customer_invoice_pdf_url,
        merchant_invoice_pdf_url,
        signature_proof_url,
        signed_at,
        signature_ip,
        customers!inner(first_name, last_name),
        trailers!inner(vin, make, model),
        warranty_plans!inner(name_en)
      `
    );

    // Filter by organization if specified
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery) {
      query = query.ilike('contract_number', `%${searchQuery}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query.order('created_at', { ascending: false }).range(from, to);

    const executionTime = performance.now() - startTime;

    if (error) {
      logger.error(`${this.name}: Query failed`, error, { executionTime });
      throw error;
    }

    const warranties = (data || []).map((w: any) => ({
      id: w.id,
      contract_number: w.contract_number,
      organization_id: '',
      customer_id: '',
      status: w.status,
      start_date: '',
      end_date: '',
      duration_months: 0,
      base_price: 0,
      options_price: 0,
      taxes: 0,
      total_price: w.total_price || 0,
      margin: 0,
      deductible: 0,
      province: '',
      sale_duration_seconds: 0,
      created_at: w.created_at,
      contract_pdf_url: w.contract_pdf_url || null,
      customer_invoice_pdf_url: w.customer_invoice_pdf_url || null,
      merchant_invoice_pdf_url: w.merchant_invoice_pdf_url || null,
      signature_proof_url: w.signature_proof_url || null,
      signed_at: w.signed_at || null,
      signature_ip: w.signature_ip || null,
      legal_validation_passed: false,
      customer_first_name: w.customers?.first_name || '',
      customer_last_name: w.customers?.last_name || '',
      customer_email: '',
      customer_phone: '',
      customer_city: '',
      customer_province: '',
      trailer_vin: w.trailers?.vin || '',
      trailer_make: w.trailers?.make || '',
      trailer_model: w.trailers?.model || '',
      trailer_year: 0,
      trailer_purchase_price: 0,
      plan_name_en: w.warranty_plans?.name_en || '',
      plan_name_fr: '',
    })) as WarrantyListItem[];

    logger.info(`${this.name}: Query successful`, {
      executionTime: executionTime.toFixed(2),
      rowCount: warranties.length,
    });

    // Estimate total count
    const estimatedTotal =
      warranties.length < pageSize ? from + warranties.length : from + pageSize + 1;

    return {
      data: warranties,
      totalCount: estimatedTotal,
      fromCache: false,
      executionTime,
    };
  }
}

/**
 * Strategy Executor
 * Executes strategies in order until one succeeds
 */
export class StrategyExecutor {
  private strategies: IWarrantyQueryStrategy[];

  constructor(strategies: IWarrantyQueryStrategy[]) {
    this.strategies = strategies;
  }

  async execute(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    organizationId?: string
  ): Promise<WarrantyListResponse> {
    const errors: Array<{ strategy: string; error: Error }> = [];

    for (const strategy of this.strategies) {
      try {
        const result = await strategy.execute(page, pageSize, statusFilter, searchQuery, organizationId);
        return result;
      } catch (error) {
        errors.push({ strategy: strategy.name, error: error as Error });
        logger.debug(`Strategy ${strategy.name} failed, trying next strategy`);
        continue;
      }
    }

    // All strategies failed
    logger.error('All warranty query strategies failed', undefined, { errors });

    // Return empty result rather than throwing
    return {
      data: [],
      totalCount: 0,
      fromCache: false,
      executionTime: 0,
    };
  }
}

/**
 * Create default strategy executor with all strategies
 */
export function createDefaultStrategyExecutor(): StrategyExecutor {
  return new StrategyExecutor([
    new OptimizedRPCStrategy(),
    new SimpleRPCStrategy(),
    new DirectQueryStrategy(),
  ]);
}
