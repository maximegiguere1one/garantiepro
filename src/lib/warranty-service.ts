import { supabase } from './supabase';
import { supabaseCache } from './supabase-cache';

export interface WarrantyListItem {
  id: string;
  contract_number: string;
  status: string;
  total_price: number;
  base_price: number;
  add_ons: any;
  selected_options: any;
  options_price: number;
  taxes: number;
  margin: number;
  deductible: number;
  duration_months: number;
  created_at: string;
  start_date: string;
  end_date: string;
  contract_pdf_url: string | null;
  customer_invoice_pdf_url: string | null;
  merchant_invoice_pdf_url: string | null;
  signature_proof_url: string | null;
  signed_at: string | null;
  signature_ip: string | null;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_province: string;
  customer_postal_code: string;
  trailer_vin: string;
  trailer_make: string;
  trailer_model: string;
  trailer_year: number;
  trailer_length: number;
  trailer_gvwr: number;
  trailer_color: string;
  trailer_purchase_price: number;
  plan_name: string;
  plan_duration_months: number;
  plan_price: number;
  total_count: number;
}

export interface WarrantyListResponse {
  data: WarrantyListItem[];
  totalCount: number;
  fromCache: boolean;
  executionTime: number;
}

interface WarrantyCacheConfig {
  enabled: boolean;
  ttl: number;
  warmOnLoad: boolean;
}

const DEFAULT_CACHE_CONFIG: WarrantyCacheConfig = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes instead of 30 seconds
  warmOnLoad: true,
};

class WarrantyService {
  private cacheConfig: WarrantyCacheConfig = DEFAULT_CACHE_CONFIG;
  private performanceLog: Array<{ query: string; time: number; timestamp: Date }> = [];

  private getCacheKey(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string
  ): string {
    return `warranties:${page}:${pageSize}:${statusFilter}:${searchQuery}`;
  }

  private logPerformance(queryName: string, executionTime: number, rowCount?: number): void {
    this.performanceLog.push({
      query: queryName,
      time: executionTime,
      timestamp: new Date(),
    });

    if (this.performanceLog.length > 50) {
      this.performanceLog.shift();
    }

    // Only log slow queries in production
    if (executionTime > 2000) {
      console.warn(`[WarrantyService] Slow query: ${queryName} - ${executionTime}ms`);
    }
  }

  async getWarrantiesOptimized(
    page: number = 1,
    pageSize: number = 10, // Reduced from 25 to 10 for faster initial load
    statusFilter: string = 'all',
    searchQuery: string = ''
  ): Promise<WarrantyListResponse> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(page, pageSize, statusFilter, searchQuery);

    // Level 1: Try cache first (fastest)
    if (this.cacheConfig.enabled) {
      const cached = supabaseCache['cache'].get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        const executionTime = performance.now() - startTime;
        return {
          data: cached.data.data,
          totalCount: cached.data.totalCount,
          fromCache: true,
          executionTime,
        };
      }
    }

    // Level 2: Try optimized RPC function
    try {
      const result = await this.tryOptimizedRPC(page, pageSize, statusFilter, searchQuery, startTime);
      if (result) return result;
    } catch (error: any) {
      // Silent fail, try next method
    }

    // Level 3: Try simple RPC function
    try {
      const result = await this.trySimpleRPC(page, pageSize, statusFilter, searchQuery, startTime);
      if (result) return result;
    } catch (error: any) {
      // Silent fail, try fallback
    }

    // Level 4: Direct query fallback (always works)
    try {
      const result = await this.getWarrantiesFallback(page, pageSize, statusFilter, searchQuery, startTime);
      return result;
    } catch (fallbackError: any) {
      const executionTime = performance.now() - startTime;

      // Return empty result rather than throwing
      return {
        data: [],
        totalCount: 0,
        fromCache: false,
        executionTime,
      };
    }
  }

  private async tryOptimizedRPC(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    startTime: number
  ): Promise<WarrantyListResponse | null> {
    const rpcStartTime = performance.now();

    const offset = (page - 1) * pageSize;
    const { data, error } = await supabase.rpc('get_warranties_optimized', {
      p_limit: pageSize,
      p_offset: offset,
      p_status: statusFilter === 'all' ? null : statusFilter,
      p_search: searchQuery || null,
    });

    const rpcTime = performance.now() - rpcStartTime;

    if (error) {
      console.error('[WarrantyService] get_warranties_optimized error:', error);
      return null;
    }

    if (!data) {
      console.warn('[WarrantyService] get_warranties_optimized returned null');
      return null;
    }

    // Map warranty_id to id for compatibility
    const warranties = (data as any[]).map(w => ({
      ...w,
      id: w.warranty_id || w.id
    })) as WarrantyListItem[];
    const totalCount = warranties.length > 0 ? Number(warranties[0].total_count) || 0 : 0;
    const executionTime = performance.now() - startTime;

    this.logPerformance('get_warranties_optimized', executionTime, warranties.length);

    const response: WarrantyListResponse = {
      data: warranties,
      totalCount,
      fromCache: false,
      executionTime,
    };

    // Cache successful result aggressively
    if (this.cacheConfig.enabled) {
      supabaseCache['cache'].set(this.getCacheKey(page, pageSize, statusFilter, searchQuery), {
        data: { data: warranties, totalCount },
        timestamp: Date.now(),
        expiresAt: Date.now() + this.cacheConfig.ttl,
      });

      // Also cache with shorter keys for common queries
      if (statusFilter === 'all' && searchQuery === '') {
        supabaseCache['cache'].set(`warranties:page:${page}`, {
          data: { data: warranties, totalCount },
          timestamp: Date.now(),
          expiresAt: Date.now() + this.cacheConfig.ttl,
        });
      }
    }

    return response;
  }

  private async trySimpleRPC(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    startTime: number
  ): Promise<WarrantyListResponse | null> {
    const rpcStartTime = performance.now();

    const offset = (page - 1) * pageSize;
    const { data, error } = await supabase.rpc('get_warranties_simple', {
      p_limit: pageSize,
      p_offset: offset,
    });

    const rpcTime = performance.now() - rpcStartTime;

    if (error) {
      console.error('[WarrantyService] get_warranties_simple error:', error);
      return null;
    }

    if (!data) {
      console.warn('[WarrantyService] get_warranties_simple returned null');
      return null;
    }

    // Map warranty_id to id for compatibility
    const warranties = (data as any[]).map(w => ({
      ...w,
      id: w.warranty_id || w.id
    })) as WarrantyListItem[];
    const totalCount = warranties.length > 0 ? Number(warranties[0].total_count) || 0 : 0;
    const executionTime = performance.now() - startTime;

    this.logPerformance('get_warranties_simple', executionTime, warranties.length);

    return {
      data: warranties,
      totalCount,
      fromCache: false,
      executionTime,
    };
  }

  private async getWarrantiesFallback(
    page: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string,
    startTime: number
  ): Promise<WarrantyListResponse> {
    console.log('[WarrantyService] 🔄 Using fallback direct query method');
    const fallbackStart = performance.now();

    let query = supabase
      .from('warranties')
      .select(`
        id,
        contract_number,
        status,
        total_price,
        base_price,
        add_ons,
        selected_options,
        options_price,
        taxes,
        margin,
        deductible,
        duration_months,
        created_at,
        start_date,
        end_date,
        contract_pdf_url,
        customer_invoice_pdf_url,
        merchant_invoice_pdf_url,
        signature_proof_url,
        signed_at,
        signature_ip,
        customers!inner(
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          province,
          postal_code
        ),
        trailers!inner(
          vin,
          make,
          model,
          year,
          length,
          gvwr,
          color,
          purchase_price
        ),
        warranty_plans!inner(
          name_en,
          duration_months,
          price
        )
      `);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery) {
      query = query.ilike('contract_number', `%${searchQuery}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const warranties = (data || []).map((w: any) => ({
      id: w.id,
      contract_number: w.contract_number,
      status: w.status,
      total_price: w.total_price || 0,
      base_price: w.base_price || 0,
      add_ons: w.add_ons || null,
      selected_options: w.selected_options || null,
      options_price: w.options_price || 0,
      taxes: w.taxes || 0,
      margin: w.margin || 0,
      deductible: w.deductible || 0,
      duration_months: w.duration_months || 0,
      created_at: w.created_at,
      start_date: w.start_date || '',
      end_date: w.end_date || '',
      contract_pdf_url: w.contract_pdf_url || null,
      customer_invoice_pdf_url: w.customer_invoice_pdf_url || null,
      merchant_invoice_pdf_url: w.merchant_invoice_pdf_url || null,
      signature_proof_url: w.signature_proof_url || null,
      signed_at: w.signed_at || null,
      signature_ip: w.signature_ip || null,
      customer_first_name: w.customers?.first_name || '',
      customer_last_name: w.customers?.last_name || '',
      customer_email: w.customers?.email || '',
      customer_phone: w.customers?.phone || '',
      customer_address: w.customers?.address || '',
      customer_city: w.customers?.city || '',
      customer_province: w.customers?.province || '',
      customer_postal_code: w.customers?.postal_code || '',
      trailer_vin: w.trailers?.vin || '',
      trailer_make: w.trailers?.make || '',
      trailer_model: w.trailers?.model || '',
      trailer_year: w.trailers?.year || 0,
      trailer_length: w.trailers?.length || 0,
      trailer_gvwr: w.trailers?.gvwr || 0,
      trailer_color: w.trailers?.color || '',
      trailer_purchase_price: w.trailers?.purchase_price || 0,
      plan_name: w.warranty_plans?.name_en || '',
      plan_duration_months: w.warranty_plans?.duration_months || 0,
      plan_price: w.warranty_plans?.price || 0,
      total_count: 0,
    })) as WarrantyListItem[];

    const executionTime = performance.now() - startTime;

    this.logPerformance('get_warranties_fallback', executionTime, warranties.length);

    const estimatedTotal = warranties.length < pageSize ? from + warranties.length : from + pageSize + 1;

    return {
      data: warranties,
      totalCount: estimatedTotal,
      fromCache: false,
      executionTime,
    };
  }

  async getWarrantiesCursor(
    cursor: string | null = null,
    pageSize: number = 25,
    statusFilter: string = 'all',
    searchQuery: string = ''
  ): Promise<{
    data: any[];
    hasMore: boolean;
    nextCursor: string | null;
    executionTime: number;
  }> {
    const startTime = performance.now();

    try {
      const { data, error } = await supabase.rpc('get_warranties_cursor', {
        p_cursor: cursor,
        p_page_size: pageSize,
        p_status_filter: statusFilter,
        p_search_query: searchQuery,
      });

      if (error) throw error;

      const warranties = (data || []) as any[];
      const hasMore = warranties.length > 0 && warranties[0].has_more === true;
      const nextCursor = warranties.length > 0 ? warranties[warranties.length - 1].created_at : null;

      const executionTime = performance.now() - startTime;
      this.logPerformance('get_warranties_cursor', executionTime, warranties.length);

      return {
        data: warranties,
        hasMore,
        nextCursor,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      this.logPerformance('get_warranties_cursor:error', executionTime);
      throw error;
    }
  }

  async warmCache(organizationId: string): Promise<void> {
    // Cache warmup disabled for performance
    return;
  }

  async prefetchNextPage(
    currentPage: number,
    pageSize: number,
    statusFilter: string,
    searchQuery: string
  ): Promise<void> {
    const nextPage = currentPage + 1;

    // Prefetch immediately in the background
    setTimeout(() => {
      this.getWarrantiesOptimized(nextPage, pageSize, statusFilter, searchQuery).catch(() => {});
    }, 50); // Reduced delay from 100ms to 50ms

    // Also prefetch the previous page for smooth back navigation
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setTimeout(() => {
        this.getWarrantiesOptimized(prevPage, pageSize, statusFilter, searchQuery).catch(() => {});
      }, 100);
    }
  }

  invalidateCache(): void {
    supabaseCache.invalidate('warranties');
  }

  getPerformanceStats(): {
    avgTime: number;
    maxTime: number;
    minTime: number;
    totalQueries: number;
  } {
    if (this.performanceLog.length === 0) {
      return { avgTime: 0, maxTime: 0, minTime: 0, totalQueries: 0 };
    }

    const times = this.performanceLog.map(log => log.time);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      avgTime: sum / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      totalQueries: this.performanceLog.length,
    };
  }

  configureCaching(config: Partial<WarrantyCacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
  }

  async refreshMaterializedView(): Promise<void> {
    try {
      const { error } = await supabase.rpc('refresh_warranty_view_auto');
      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      // Silent fail
    }
  }
}

export const warrantyService = new WarrantyService();
