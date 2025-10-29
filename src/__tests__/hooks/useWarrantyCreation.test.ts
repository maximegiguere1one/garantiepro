import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWarrantyCreation } from '../../hooks/useWarrantyCreation';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../../lib/document-utils', () => ({
  generateAndStoreDocuments: vi.fn()
}));

describe('useWarrantyCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useWarrantyCreation());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.warrantyId).toBe(null);
    expect(result.current.validationErrors).toBe(null);
  });

  it('should validate valid input', () => {
    const { result } = renderHook(() => useWarrantyCreation());

    const validInput = {
      customer: {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.com',
        phone: '(514) 555-1234',
        address: '123 Rue Principale',
        city: 'Montreal',
        province: 'QC',
        postalCode: 'H1A 1A1',
        languagePreference: 'fr',
        consentMarketing: true
      },
      trailer: {
        vin: '1HGBH41JXMN109186',
        make: 'Remorque Pro',
        model: 'Cargo',
        year: 2023,
        trailerType: 'Utilitaire',
        category: 'fermee',
        purchaseDate: '2024-01-15T10:00:00.000Z',
        purchasePrice: 15000,
        isPromotional: false
      },
      planId: '123e4567-e89b-12d3-a456-426614174000',
      selectedOptions: [],
      pricing: {
        subtotal: 1000,
        gst: 50,
        pst: 0,
        hst: 0,
        qst: 99.75,
        total: 1149.75
      }
    };

    const validated = result.current.validateInput(validInput);
    expect(validated).not.toBe(null);
    expect(result.current.validationErrors).toBe(null);
  });

  it('should detect validation errors', () => {
    const { result } = renderHook(() => useWarrantyCreation());

    const invalidInput = {
      customer: {
        firstName: '',
        lastName: 'Dupont',
        email: 'invalid-email',
        phone: '123',
        address: '123',
        city: 'Montreal',
        province: 'INVALID',
        postalCode: 'INVALID',
        languagePreference: 'fr',
        consentMarketing: true
      }
    };

    const validated = result.current.validateInput(invalidInput);
    expect(validated).toBe(null);
    expect(result.current.validationErrors).not.toBe(null);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useWarrantyCreation());

    result.current.reset();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.warrantyId).toBe(null);
    expect(result.current.validationErrors).toBe(null);
  });
});
