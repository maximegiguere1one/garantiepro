import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../../hooks/usePagination';

describe('usePagination Hook', () => {
  const testItems = Array.from({ length: 50 }, (_, i) => ({ id: i, value: `Item ${i}` }));

  it('should initialize with first page', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.paginatedItems[0].id).toBe(0);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems[0].id).toBe(10);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    act(() => {
      result.current.goToPage(3);
    });

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('should not go beyond last page', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    act(() => {
      result.current.goToPage(5);
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(5);
  });

  it('should not go below first page', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should jump to specific page', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    act(() => {
      result.current.goToPage(4);
    });

    expect(result.current.currentPage).toBe(4);
    expect(result.current.paginatedItems[0].id).toBe(30);
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() => usePagination([], 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toHaveLength(0);
  });

  it('should calculate hasNext and hasPrevious correctly', () => {
    const { result } = renderHook(() => usePagination(testItems, 10));

    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(true);
  });
});
