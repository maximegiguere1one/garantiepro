import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../../hooks/usePagination';

describe('usePagination Hook', () => {
  it('should initialize with first page', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.offset).toBe(0);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.offset).toBe(10);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    act(() => {
      result.current.goToPage(3);
    });

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.page).toBe(2);
  });

  it('should not go beyond last page', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    act(() => {
      result.current.goToPage(5);
      result.current.nextPage();
    });

    expect(result.current.page).toBe(5);
  });

  it('should not go below first page', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('should jump to specific page', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    act(() => {
      result.current.goToPage(4);
    });

    expect(result.current.page).toBe(4);
    expect(result.current.offset).toBe(30);
  });

  it('should handle zero total items', () => {
    const { result } = renderHook(() => usePagination(10, 0));

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it('should calculate hasNextPage and hasPrevPage correctly', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(true);
  });

  it('should update page size and reset to page 1', () => {
    const { result } = renderHook(() => usePagination(10, 50));

    act(() => {
      result.current.goToPage(3);
      result.current.setPageSize(20);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(3);
  });
});
