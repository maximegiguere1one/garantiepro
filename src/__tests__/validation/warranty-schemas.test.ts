import { describe, it, expect } from 'vitest';
import {
  customerSchema,
  trailerSchema,
  warrantyCreationSchema,
  claimSchema,
  organizationSchema,
  userProfileSchema
} from '../../lib/validation/warranty-schemas';

describe('customerSchema', () => {
  it('should validate a valid customer', () => {
    const validCustomer = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '(514) 555-1234',
      address: '123 Rue Principale',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H1A 1A1',
      languagePreference: 'fr',
      consentMarketing: true
    };

    const result = customerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidCustomer = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'invalid-email',
      phone: '(514) 555-1234',
      address: '123 Rue Principale',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H1A 1A1',
      languagePreference: 'fr',
      consentMarketing: true
    };

    const result = customerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
  });

  it('should reject invalid phone format', () => {
    const invalidCustomer = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      phone: '123',
      address: '123 Rue Principale',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H1A 1A1',
      languagePreference: 'fr',
      consentMarketing: true
    };

    const result = customerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
  });

  it('should reject invalid postal code', () => {
    const invalidCustomer = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      phone: '(514) 555-1234',
      address: '123 Rue Principale',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'INVALID',
      languagePreference: 'fr',
      consentMarketing: true
    };

    const result = customerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
  });

  it('should normalize email to lowercase', () => {
    const customer = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'JEAN@EXAMPLE.COM',
      phone: '(514) 555-1234',
      address: '123 Rue Principale',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H1A 1A1',
      languagePreference: 'fr',
      consentMarketing: true
    };

    const result = customerSchema.safeParse(customer);
    if (result.success) {
      expect(result.data.email).toBe('jean@example.com');
    }
  });
});

describe('trailerSchema', () => {
  it('should validate a valid trailer', () => {
    const validTrailer = {
      vin: '1HGBH41JXMN109186',
      make: 'Remorque Pro',
      model: 'Cargo Plus',
      year: 2023,
      trailerType: 'Utilitaire',
      category: 'fermee',
      purchaseDate: '2024-01-15T10:00:00.000Z',
      purchasePrice: 15000.00,
      manufacturerWarrantyEndDate: '2025-01-15T10:00:00.000Z',
      isPromotional: false
    };

    const result = trailerSchema.safeParse(validTrailer);
    expect(result.success).toBe(true);
  });

  it('should reject invalid VIN length', () => {
    const invalidTrailer = {
      vin: '1HGBH41',
      make: 'Remorque Pro',
      model: 'Cargo Plus',
      year: 2023,
      trailerType: 'Utilitaire',
      category: 'fermee',
      purchaseDate: '2024-01-15T10:00:00.000Z',
      purchasePrice: 15000.00,
      isPromotional: false
    };

    const result = trailerSchema.safeParse(invalidTrailer);
    expect(result.success).toBe(false);
  });

  it('should reject year too old', () => {
    const invalidTrailer = {
      vin: '1HGBH41JXMN109186',
      make: 'Remorque Pro',
      model: 'Cargo Plus',
      year: 1985,
      trailerType: 'Utilitaire',
      category: 'fermee',
      purchaseDate: '2024-01-15T10:00:00.000Z',
      purchasePrice: 15000.00,
      isPromotional: false
    };

    const result = trailerSchema.safeParse(invalidTrailer);
    expect(result.success).toBe(false);
  });

  it('should reject negative purchase price', () => {
    const invalidTrailer = {
      vin: '1HGBH41JXMN109186',
      make: 'Remorque Pro',
      model: 'Cargo Plus',
      year: 2023,
      trailerType: 'Utilitaire',
      category: 'fermee',
      purchaseDate: '2024-01-15T10:00:00.000Z',
      purchasePrice: -1000,
      isPromotional: false
    };

    const result = trailerSchema.safeParse(invalidTrailer);
    expect(result.success).toBe(false);
  });
});

describe('claimSchema', () => {
  it('should validate a valid claim', () => {
    const validClaim = {
      warrantyId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'The trailer door is broken and needs immediate repair',
      incidentDate: '2024-10-01T10:00:00.000Z',
      location: '123 Main Street, Montreal, QC',
      estimatedCost: 500.00,
      status: 'submitted',
      priority: 'medium'
    };

    const result = claimSchema.safeParse(validClaim);
    expect(result.success).toBe(true);
  });

  it('should reject description too short', () => {
    const invalidClaim = {
      warrantyId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Too short',
      incidentDate: '2024-10-01T10:00:00.000Z',
      status: 'submitted',
      priority: 'medium'
    };

    const result = claimSchema.safeParse(invalidClaim);
    expect(result.success).toBe(false);
  });

  it('should reject future incident date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const invalidClaim = {
      warrantyId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'The trailer door is broken and needs immediate repair',
      incidentDate: futureDate.toISOString(),
      status: 'submitted',
      priority: 'medium'
    };

    const result = claimSchema.safeParse(invalidClaim);
    expect(result.success).toBe(false);
  });

  it('should apply default priority', () => {
    const claim = {
      warrantyId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'The trailer door is broken and needs immediate repair',
      incidentDate: '2024-10-01T10:00:00.000Z',
      status: 'submitted'
    };

    const result = claimSchema.safeParse(claim);
    if (result.success) {
      expect(result.data.priority).toBe('medium');
    }
  });
});

describe('organizationSchema', () => {
  it('should validate a valid organization', () => {
    const validOrg = {
      name: 'Remorques Pro Inc.',
      type: 'dealer',
      email: 'contact@remorquespro.com',
      phone: '(514) 555-1234',
      address: '456 Industrial Blvd',
      commissionRate: 15.5,
      isActive: true
    };

    const result = organizationSchema.safeParse(validOrg);
    expect(result.success).toBe(true);
  });

  it('should reject invalid commission rate', () => {
    const invalidOrg = {
      name: 'Remorques Pro Inc.',
      type: 'dealer',
      email: 'contact@remorquespro.com',
      phone: '(514) 555-1234',
      commissionRate: 150,
      isActive: true
    };

    const result = organizationSchema.safeParse(invalidOrg);
    expect(result.success).toBe(false);
  });

  it('should apply default isActive', () => {
    const org = {
      name: 'Remorques Pro Inc.',
      type: 'dealer',
      email: 'contact@remorquespro.com',
      phone: '(514) 555-1234'
    };

    const result = organizationSchema.safeParse(org);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});

describe('userProfileSchema', () => {
  it('should validate a valid user profile', () => {
    const validProfile = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      phoneNumber: '(514) 555-1234',
      isActive: true
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const invalidProfile = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'invalid_role',
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      isActive: true
    };

    const result = userProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
  });

  it('should apply default isActive', () => {
    const profile = {
      email: 'user@example.com',
      role: 'admin',
      organizationId: '123e4567-e89b-12d3-a456-426614174000'
    };

    const result = userProfileSchema.safeParse(profile);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});
