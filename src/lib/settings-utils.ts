import { supabase } from './supabase';

export interface TaxRate {
  province_code: string;
  gst_rate: number;
  pst_rate: number;
  hst_rate: number;
}

export interface PricingRule {
  min_purchase_price: number;
  max_purchase_price: number;
  annual_claim_limit: number;
  loyalty_credit_amount: number;
  loyalty_credit_promotional: number;
  default_deductible: number;
}

let taxRatesCache: Record<string, TaxRate> | null = null;
let taxRatesCacheTime: number = 0;
let pricingRulesCache: PricingRule[] | null = null;
let pricingRulesCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function getTaxRates(): Promise<Record<string, TaxRate>> {
  const now = Date.now();

  if (taxRatesCache && (now - taxRatesCacheTime) < CACHE_DURATION) {
    return taxRatesCache;
  }

  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('province_code, gst_rate, pst_rate, hst_rate')
      .eq('is_active', true);

    if (error) throw error;

    const rates: Record<string, TaxRate> = {};
    (data || []).forEach((rate) => {
      rates[rate.province_code] = {
        province_code: rate.province_code,
        gst_rate: rate.gst_rate,
        pst_rate: rate.pst_rate,
        hst_rate: rate.hst_rate,
      };
    });

    taxRatesCache = rates;
    taxRatesCacheTime = now;
    return rates;
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return {
      QC: { province_code: 'QC', gst_rate: 0.05, pst_rate: 0.09975, hst_rate: 0 },
      ON: { province_code: 'ON', gst_rate: 0, pst_rate: 0, hst_rate: 0.13 },
    };
  }
}

export async function getPricingRules(): Promise<PricingRule[]> {
  const now = Date.now();

  if (pricingRulesCache && (now - pricingRulesCacheTime) < CACHE_DURATION) {
    return pricingRulesCache;
  }

  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('min_purchase_price, max_purchase_price, annual_claim_limit, loyalty_credit_amount, loyalty_credit_promotional, default_deductible')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;

    pricingRulesCache = data || [];
    pricingRulesCacheTime = now;
    return pricingRulesCache;
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    return [
      {
        min_purchase_price: 0,
        max_purchase_price: 5000,
        annual_claim_limit: 1000,
        loyalty_credit_amount: 250,
        loyalty_credit_promotional: 0,
        default_deductible: 100,
      },
    ];
  }
}

export function findPricingRule(purchasePrice: number, rules: PricingRule[]): PricingRule | null {
  return rules.find(
    (rule) => purchasePrice >= rule.min_purchase_price && purchasePrice <= rule.max_purchase_price
  ) || null;
}

export function calculateTaxes(subtotal: number, provinceCode: string, taxRates: Record<string, TaxRate>): number {
  // Validation des entrées
  if (!subtotal || typeof subtotal !== 'number' || isNaN(subtotal)) {
    return 0;
  }

  if (!provinceCode || !taxRates) {
    return 0;
  }

  const rate = taxRates[provinceCode];
  if (!rate) {
    // Fallback pour QC si le taux n'est pas trouvé
    if (provinceCode === 'QC') {
      return subtotal * (0.05 + 0.09975); // TPS + TVQ
    }
    return 0;
  }

  if (rate.hst_rate > 0) {
    return subtotal * rate.hst_rate;
  }

  return subtotal * (rate.gst_rate + rate.pst_rate);
}

export function clearSettingsCache() {
  taxRatesCache = null;
  taxRatesCacheTime = 0;
  pricingRulesCache = null;
  pricingRulesCacheTime = 0;
}
