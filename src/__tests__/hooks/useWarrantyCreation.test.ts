import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWarrantyCreation } from '../../hooks/useWarrantyCreation';

describe('useWarrantyCreation Hook', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useWarrantyCreation());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
