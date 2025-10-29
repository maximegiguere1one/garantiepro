import { supabase } from './supabase';

export interface SearchOptions {
  table: string;
  searchColumns: string[];
  query: string;
  filters?: Record<string, any>;
  select?: string;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
}

export interface SearchResult<T> {
  data: T[];
  count: number;
}

export async function fullTextSearch<T>(
  options: SearchOptions
): Promise<SearchResult<T>> {
  const {
    table,
    searchColumns,
    query,
    filters = {},
    select = '*',
    orderBy = { column: 'created_at', ascending: false },
    limit,
  } = options;

  if (!query || query.trim() === '') {
    let baseQuery = supabase.from(table).select(select, { count: 'exact' });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        baseQuery = baseQuery.eq(key, value);
      }
    });

    baseQuery = baseQuery.order(orderBy.column, { ascending: orderBy.ascending });

    if (limit) {
      baseQuery = baseQuery.limit(limit);
    }

    const { data, error, count } = await baseQuery;

    if (error) throw error;

    return { data: (data || []) as T[], count: count || 0 };
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  let queryBuilder = supabase.from(table).select(select, { count: 'exact' });

  if (searchColumns.length > 0) {
    const orConditions = searchColumns
      .map((column) => `${column}.ilike.${searchTerm}`)
      .join(',');
    queryBuilder = queryBuilder.or(orConditions);
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryBuilder = queryBuilder.eq(key, value);
    }
  });

  queryBuilder = queryBuilder.order(orderBy.column, { ascending: orderBy.ascending });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('Search error:', error);
    throw error;
  }

  return { data: (data || []) as T[], count: count || 0 };
}

export function highlightSearchTerm(text: string, searchQuery: string): string {
  if (!searchQuery || searchQuery.trim() === '') {
    return text;
  }

  const regex = new RegExp(`(${searchQuery})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-1">$1</mark>');
}

export function calculateSearchScore(
  item: Record<string, any>,
  searchColumns: string[],
  query: string
): number {
  if (!query) return 0;

  const lowerQuery = query.toLowerCase();
  let score = 0;

  searchColumns.forEach((column, index) => {
    const value = String(item[column] || '').toLowerCase();
    const weight = searchColumns.length - index;

    if (value === lowerQuery) {
      score += 100 * weight;
    } else if (value.startsWith(lowerQuery)) {
      score += 50 * weight;
    } else if (value.includes(lowerQuery)) {
      score += 25 * weight;
    }

    const words = lowerQuery.split(' ');
    words.forEach((word) => {
      if (word.length > 2 && value.includes(word)) {
        score += 10 * weight;
      }
    });
  });

  return score;
}

export function sortByRelevance<T extends Record<string, any>>(
  items: T[],
  searchColumns: string[],
  query: string
): T[] {
  if (!query) return items;

  return [...items].sort((a, b) => {
    const scoreA = calculateSearchScore(a, searchColumns, query);
    const scoreB = calculateSearchScore(b, searchColumns, query);
    return scoreB - scoreA;
  });
}

export async function searchWarranties(query: string, filters: Record<string, any> = {}) {
  return fullTextSearch({
    table: 'warranties',
    searchColumns: ['contract_number'],
    query,
    filters,
    select: `
      *,
      customers(first_name, last_name, email, phone),
      trailers(vin, make, model, year),
      warranty_plans(name)
    `,
    orderBy: { column: 'created_at', ascending: false },
  });
}

export async function searchCustomers(query: string, filters: Record<string, any> = {}) {
  return fullTextSearch({
    table: 'customers',
    searchColumns: ['first_name', 'last_name', 'email', 'phone'],
    query,
    filters,
    orderBy: { column: 'created_at', ascending: false },
  });
}

export async function searchClaims(query: string, filters: Record<string, any> = {}) {
  return fullTextSearch({
    table: 'claims',
    searchColumns: ['claim_number', 'incident_description'],
    query,
    filters,
    select: `
      *,
      customers(first_name, last_name),
      warranties(contract_number)
    `,
    orderBy: { column: 'created_at', ascending: false },
  });
}

export async function globalSearch(query: string, limit: number = 10) {
  const [warrantiesResult, customersResult, claimsResult] = await Promise.all([
    searchWarranties(query, {}).catch(() => ({ data: [], count: 0 })),
    searchCustomers(query, {}).catch(() => ({ data: [], count: 0 })),
    searchClaims(query, {}).catch(() => ({ data: [], count: 0 })),
  ]);

  return {
    warranties: warrantiesResult.data.slice(0, limit),
    customers: customersResult.data.slice(0, limit),
    claims: claimsResult.data.slice(0, limit),
    totalResults:
      warrantiesResult.count + customersResult.count + claimsResult.count,
  };
}

export function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === queryLower.length;
}

export function fuzzySearch<T extends Record<string, any>>(
  items: T[],
  searchColumns: string[],
  query: string
): T[] {
  if (!query) return items;

  return items.filter((item) => {
    return searchColumns.some((column) => {
      const value = String(item[column] || '');
      return fuzzyMatch(value, query);
    });
  });
}
