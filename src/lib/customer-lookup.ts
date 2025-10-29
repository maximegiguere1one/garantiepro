import { supabase } from './supabase';

export interface CustomerLookupResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  languagePreference: 'fr' | 'en';
  consentMarketing: boolean;
  warrantyCount: number;
}

export async function lookupCustomerByEmail(email: string): Promise<CustomerLookupResult | null> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        language_preference,
        consent_marketing,
        warranties:warranties(count)
      `)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postal_code,
      languagePreference: data.language_preference as 'fr' | 'en',
      consentMarketing: data.consent_marketing,
      warrantyCount: Array.isArray(data.warranties) ? data.warranties.length : 0,
    };
  } catch (error) {
    console.error('Error looking up customer:', error);
    return null;
  }
}

export async function searchCustomers(query: string, limit: number = 10): Promise<CustomerLookupResult[]> {
  try {
    const searchTerm = query.toLowerCase().trim();

    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        language_preference,
        consent_marketing
      `)
      .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) throw error;

    return (data || []).map(customer => ({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postalCode: customer.postal_code,
      languagePreference: customer.language_preference as 'fr' | 'en',
      consentMarketing: customer.consent_marketing,
      warrantyCount: 0,
    }));
  } catch (error) {
    console.error('Error searching customers:', error);
    return [];
  }
}

export async function checkDuplicateCustomer(
  email: string,
  phone: string
): Promise<{
  hasDuplicate: boolean;
  duplicates: CustomerLookupResult[];
  confidence: 'high' | 'medium' | 'low';
}> {
  try {
    const emailLower = email.toLowerCase().trim();
    const phoneClean = phone.replace(/\D/g, '');

    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        language_preference,
        consent_marketing
      `)
      .or(`email.eq.${emailLower},phone.ilike.%${phoneClean}%`);

    if (error) throw error;

    const duplicates: CustomerLookupResult[] = (data || []).map(customer => ({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postalCode: customer.postal_code,
      languagePreference: customer.language_preference as 'fr' | 'en',
      consentMarketing: customer.consent_marketing,
      warrantyCount: 0,
    }));

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (duplicates.some(d => d.email.toLowerCase() === emailLower)) {
      confidence = 'high';
    } else if (duplicates.length > 0) {
      confidence = 'medium';
    }

    return {
      hasDuplicate: duplicates.length > 0,
      duplicates,
      confidence,
    };
  } catch (error) {
    console.error('Error checking for duplicate customer:', error);
    return { hasDuplicate: false, duplicates: [], confidence: 'low' };
  }
}
