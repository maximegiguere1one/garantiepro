/**
 * Requêtes Supabase sécurisées
 * Évite les erreurs 400 causées par des paramètres invalides
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sanitize search query - évite undefined/null qui causent 400
 */
export function sanitizeSearchQuery(search: unknown): string {
  if (typeof search === 'string') {
    return search.trim();
  }
  return '';
}

/**
 * Sanitize sort order
 */
export function sanitizeSortOrder(order: unknown): 'asc' | 'desc' {
  if (order === 'desc') return 'desc';
  return 'asc';
}

/**
 * Build safe ilike pattern (évite SQL injection et 400)
 */
export function buildIlikePattern(search: string): string {
  const clean = sanitizeSearchQuery(search);
  if (!clean) return '%'; // Match all si vide
  
  // Escape special characters
  const escaped = clean.replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

/**
 * Safe query builder pour recherche avec pagination
 */
export interface SafeQueryOptions {
  search?: string;
  searchColumns?: string[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  filters?: Record<string, any>;
}

/**
 * Construire une requête sécurisée avec tous les checks
 */
export function buildSafeQuery<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  options: SafeQueryOptions = {}
) {
  // Start query
  let query = supabase.from(table).select(select, { count: 'exact' });

  // Apply search si présent
  if (options.search && options.searchColumns && options.searchColumns.length > 0) {
    const searchPattern = buildIlikePattern(options.search);
    const searchColumn = options.searchColumns[0]; // Premier colonne pour le moment
    query = query.ilike(searchColumn, searchPattern);
  }

  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });
  }

  // Apply order
  if (options.orderBy) {
    const column = String(options.orderBy).trim();
    const direction = sanitizeSortOrder(options.orderDirection);
    if (column) {
      query = query.order(column, { ascending: direction === 'asc' });
    }
  }

  // Apply pagination
  if (typeof options.page === 'number' && typeof options.pageSize === 'number') {
    const from = options.page * options.pageSize;
    const to = from + options.pageSize - 1;
    query = query.range(from, to);
  }

  return query;
}

/**
 * Example: Safe brands query
 */
export async function getSafeBrands(
  supabase: SupabaseClient,
  search?: string
) {
  const pattern = buildIlikePattern(search || '');
  
  const { data, error } = await supabase
    .from('trailer_brands')
    .select('id, name, logo_url')
    .ilike('name', pattern)
    .order('name', { ascending: true });

  if (error) {
    console.error('[getSafeBrands] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Safe upsert avec validation
 */
export async function safeUpsert<T extends Record<string, any>>(
  supabase: SupabaseClient,
  table: string,
  data: T,
  conflictColumn: string
) {
  // Sanitize data - remove undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  console.log(`[safeUpsert:${table}] Starting upsert with:`, {
    table,
    conflictColumn,
    dataKeys: Object.keys(cleanData),
    conflictValue: cleanData[conflictColumn],
  });

  const { data: result, error } = await supabase
    .from(table)
    .upsert(cleanData, {
      onConflict: conflictColumn,
      ignoreDuplicates: false,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error(`[safeUpsert:${table}] Error:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      cleanData,
    });
    throw error;
  }

  console.log(`[safeUpsert:${table}] Success:`, result);
  return result;
}

/**
 * Safe select with single result
 */
export async function safeMaybeSingle<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: Record<string, any>
): Promise<T | null> {
  let query = supabase.from(table).select(select);

  // Apply all filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error(`[safeMaybeSingle:${table}] Error:`, error);
    throw error;
  }

  return (data as T) || null;
}

/**
 * Validator pour nombres (évite NaN qui cause 400)
 */
export function validateNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Validator pour boolean
 */
export function validateBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1' || value === 1) {
    return true;
  }
  if (value === 'false' || value === '0' || value === 0) {
    return false;
  }
  return defaultValue;
}

/**
 * Validator pour string
 */
export function validateString(value: unknown, defaultValue: string = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value !== null && value !== undefined) {
    return String(value).trim();
  }
  return defaultValue;
}
