import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationHookResult extends PaginationState {
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setTotalItems: (totalItems: number) => void;
  getOffset: () => number;
  getLimit: () => number;
}

export function usePagination(
  initialItemsPerPage: number = 25,
  syncWithUrl: boolean = true
): PaginationHookResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageFromUrl = syncWithUrl ? parseInt(searchParams.get('page') || '1', 10) : 1;
  const itemsPerPageFromUrl = syncWithUrl
    ? parseInt(searchParams.get('per_page') || String(initialItemsPerPage), 10)
    : initialItemsPerPage;

  const [currentPage, setCurrentPageState] = useState(pageFromUrl);
  const [itemsPerPage, setItemsPerPageState] = useState(itemsPerPageFromUrl);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const setCurrentPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPageState(validPage);

    if (syncWithUrl) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('page', String(validPage));
        return newParams;
      });
    }
  };

  const setItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPageState(newItemsPerPage);
    setCurrentPageState(1);

    if (syncWithUrl) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('per_page', String(newItemsPerPage));
        newParams.set('page', '1');
        return newParams;
      });
    }
  };

  const getOffset = () => {
    return (currentPage - 1) * itemsPerPage;
  };

  const getLimit = () => {
    return itemsPerPage;
  };

  useEffect(() => {
    if (syncWithUrl) {
      const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
      const perPageFromUrl = parseInt(
        searchParams.get('per_page') || String(initialItemsPerPage),
        10
      );

      if (pageFromUrl !== currentPage) {
        setCurrentPageState(pageFromUrl);
      }

      if (perPageFromUrl !== itemsPerPage) {
        setItemsPerPageState(perPageFromUrl);
      }
    }
  }, [searchParams, syncWithUrl]);

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    setCurrentPage,
    setItemsPerPage,
    setTotalItems,
    getOffset,
    getLimit,
  };
}

export async function fetchPaginatedData<T>(
  tableName: string,
  page: number,
  itemsPerPage: number,
  filters: Record<string, any> = {},
  orderBy: { column: string; ascending: boolean } = { column: 'created_at', ascending: false },
  select: string = '*'
): Promise<{ data: T[]; totalCount: number }> {
  const { supabase } = await import('./supabase');

  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  let query = supabase.from(tableName).select(select, { count: 'exact' });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'string' && value.includes('%')) {
        query = query.ilike(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  });

  query = query.order(orderBy.column, { ascending: orderBy.ascending });
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching paginated data:', error);
    throw error;
  }

  return {
    data: (data || []) as T[],
    totalCount: count || 0,
  };
}

export function saveScrollPosition(key: string): void {
  sessionStorage.setItem(`scroll_${key}`, String(window.scrollY));
}

export function restoreScrollPosition(key: string): void {
  const savedPosition = sessionStorage.getItem(`scroll_${key}`);
  if (savedPosition) {
    setTimeout(() => {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }, 100);
  }
}

export function clearScrollPosition(key: string): void {
  sessionStorage.removeItem(`scroll_${key}`);
}
