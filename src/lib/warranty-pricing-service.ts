import { getTaxRates, calculateTaxes, type TaxRate } from './settings-utils';
import { safeNumber, safeAdd, safeMultiply } from './numeric-utils';
import type { Database } from './database.types';

type WarrantyPlan = Database['public']['Tables']['warranty_plans']['Row'];
type WarrantyOption = Database['public']['Tables']['warranty_options']['Row'];

export interface PricingInput {
  plan: WarrantyPlan;
  selectedOptions: WarrantyOption[];
  province: string;
  purchasePrice: number;
  isPromotional?: boolean;
}

export interface PricingResult {
  basePrice: number;
  optionsPrice: number;
  subtotal: number;
  taxes: number;
  totalPrice: number;
  margin: number;
  deductible: number;
  taxBreakdown: {
    gst: number;
    pst: number;
    hst: number;
  };
}

export interface PricingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Warranty Pricing Service
 * Centralizes all pricing calculation logic for warranties
 */
export class WarrantyPricingService {
  private taxRatesCache: Map<string, TaxRate> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get tax rates with caching
   */
  private async getTaxRatesWithCache(): Promise<Record<string, TaxRate>> {
    const now = Date.now();

    if (now < this.cacheExpiry && this.taxRatesCache.size > 0) {
      return Object.fromEntries(this.taxRatesCache);
    }

    const rates = await getTaxRates();
    this.taxRatesCache = new Map(Object.entries(rates));
    this.cacheExpiry = now + this.CACHE_TTL;

    return rates;
  }

  /**
   * Calculate complete warranty pricing
   */
  async calculatePricing(input: PricingInput): Promise<PricingResult> {
    // Validate input
    const validation = this.validatePricingInput(input);
    if (!validation.isValid) {
      throw new Error(`Invalid pricing input: ${validation.errors.join(', ')}`);
    }

    // Calculate base and options prices
    const basePrice = safeNumber(input.plan.base_price);
    const optionsPrice = input.selectedOptions.reduce(
      (sum, option) => safeAdd(sum, safeNumber(option.price)),
      0
    );

    const subtotal = safeAdd(basePrice, optionsPrice);

    // Get tax rates and calculate taxes
    const taxRates = await this.getTaxRatesWithCache();
    const taxRate = taxRates[input.province];

    if (!taxRate) {
      throw new Error(`No tax rate found for province: ${input.province}`);
    }

    const taxBreakdown = calculateTaxes(subtotal, taxRate);
    const taxes = safeAdd(
      safeAdd(taxBreakdown.gst, taxBreakdown.pst),
      taxBreakdown.hst
    );

    const totalPrice = safeAdd(subtotal, taxes);

    // Calculate margin based on purchase price
    const margin = this.calculateMargin(totalPrice, input.purchasePrice);

    // Get deductible (fixed at $100 for PPR)
    const deductible = 100;

    return {
      basePrice,
      optionsPrice,
      subtotal,
      taxes,
      totalPrice,
      margin,
      deductible,
      taxBreakdown
    };
  }

  /**
   * Calculate margin percentage
   */
  private calculateMargin(totalPrice: number, purchasePrice: number): number {
    if (purchasePrice <= 0) return 0;

    const profit = totalPrice - purchasePrice;
    const marginPercent = (profit / purchasePrice) * 100;

    return safeNumber(marginPercent);
  }

  /**
   * Validate pricing input
   */
  validatePricingInput(input: PricingInput): PricingValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate plan
    if (!input.plan) {
      errors.push('Plan is required');
    } else {
      if (input.plan.base_price <= 0) {
        errors.push('Plan base price must be greater than 0');
      }
      if (input.plan.duration_months <= 0) {
        errors.push('Plan duration must be greater than 0');
      }
    }

    // Validate province
    if (!input.province || input.province.length !== 2) {
      errors.push('Valid province code is required');
    }

    // Validate purchase price
    if (input.purchasePrice <= 0) {
      errors.push('Purchase price must be greater than 0');
    }

    // Validate options
    if (input.selectedOptions) {
      input.selectedOptions.forEach((option, index) => {
        if (option.price < 0) {
          errors.push(`Option ${index + 1} has invalid price`);
        }
      });
    }

    // Warnings for business logic
    if (input.purchasePrice > 100000) {
      warnings.push('Purchase price is unusually high');
    }

    if (input.selectedOptions && input.selectedOptions.length > 10) {
      warnings.push('Large number of options selected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate price with promotional discount
   */
  applyPromotionalDiscount(
    pricing: PricingResult,
    discountPercent: number
  ): PricingResult {
    if (discountPercent <= 0 || discountPercent > 100) {
      return pricing;
    }

    const discountMultiplier = 1 - (discountPercent / 100);
    const discountedSubtotal = safeMultiply(pricing.subtotal, discountMultiplier);

    // Recalculate taxes on discounted amount
    const discountedTaxes = safeMultiply(pricing.taxes, discountMultiplier);
    const discountedTotal = safeAdd(discountedSubtotal, discountedTaxes);

    return {
      ...pricing,
      subtotal: discountedSubtotal,
      taxes: discountedTaxes,
      totalPrice: discountedTotal,
      taxBreakdown: {
        gst: safeMultiply(pricing.taxBreakdown.gst, discountMultiplier),
        pst: safeMultiply(pricing.taxBreakdown.pst, discountMultiplier),
        hst: safeMultiply(pricing.taxBreakdown.hst, discountMultiplier)
      }
    };
  }

  /**
   * Get pricing preview without full calculation
   */
  getQuickEstimate(
    basePrice: number,
    optionsTotal: number,
    province: string
  ): { subtotal: number; estimatedTotal: number } {
    const subtotal = safeAdd(basePrice, optionsTotal);

    // Use average tax rate of 14% for quick estimate
    const estimatedTax = safeMultiply(subtotal, 0.14);
    const estimatedTotal = safeAdd(subtotal, estimatedTax);

    return {
      subtotal,
      estimatedTotal
    };
  }

  /**
   * Clear tax rates cache (useful after settings update)
   */
  clearCache(): void {
    this.taxRatesCache.clear();
    this.cacheExpiry = 0;
  }
}

// Export singleton instance
export const warrantyPricingService = new WarrantyPricingService();
