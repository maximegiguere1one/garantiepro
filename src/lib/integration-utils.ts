import { supabase } from './supabase';

export interface IntegrationCredentials {
  id: string;
  dealer_id: string;
  integration_type: string;
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  company_id?: string;
  is_active: boolean;
  is_test_mode: boolean;
  last_sync_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  dealer_id: string;
  integration_type: string;
  event_type: string;
  status: string;
  request_data: Record<string, any>;
  response_data: Record<string, any>;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
}

export async function getIntegrationCredentials(
  integrationType: string
): Promise<IntegrationCredentials | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('dealer_id', user.id)
      .eq('integration_type', integrationType)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching integration credentials:', error);
    return null;
  }
}

export async function saveIntegrationCredentials(
  integrationType: string,
  credentials: {
    api_key?: string;
    api_secret?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    company_id?: string;
    is_test_mode?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const existingCreds = await getIntegrationCredentials(integrationType);

    if (existingCreds) {
      const { error } = await supabase
        .from('integration_credentials')
        .update({
          ...credentials,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCreds.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('integration_credentials')
        .insert({
          dealer_id: user.id,
          integration_type: integrationType,
          ...credentials,
          is_active: true,
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving integration credentials:', error);
    return { success: false, error: error.message };
  }
}

export async function disconnectIntegration(
  integrationType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('integration_credentials')
      .update({ is_active: false })
      .eq('dealer_id', user.id)
      .eq('integration_type', integrationType);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error disconnecting integration:', error);
    return { success: false, error: error.message };
  }
}

export async function isIntegrationConnected(
  integrationType: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('is_integration_connected', {
        p_dealer_id: user.id,
        p_integration_type: integrationType,
      });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking integration status:', error);
    return false;
  }
}

export async function logIntegrationEvent(
  integrationType: string,
  eventType: string,
  status: string,
  requestData: Record<string, any> = {},
  responseData: Record<string, any> = {},
  errorMessage?: string,
  processingTimeMs?: number
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('log_integration_event', {
      p_dealer_id: user.id,
      p_integration_type: integrationType,
      p_event_type: eventType,
      p_status: status,
      p_request_data: requestData,
      p_response_data: responseData,
      p_error_message: errorMessage,
      p_processing_time_ms: processingTimeMs,
    });
  } catch (error) {
    console.error('Error logging integration event:', error);
  }
}

export async function getIntegrationLogs(
  integrationType?: string,
  limit: number = 50
): Promise<IntegrationLog[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('integration_logs')
      .select('*')
      .eq('dealer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (integrationType) {
      query = query.eq('integration_type', integrationType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching integration logs:', error);
    return [];
  }
}

export async function testStripeConnection(
  apiKey: string
): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
  try {
    const startTime = Date.now();

    const response = await fetch('https://api.stripe.com/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const processingTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      await logIntegrationEvent(
        'stripe',
        'test_connection',
        'failed',
        { api_key_prefix: apiKey.substring(0, 12) + '...' },
        data,
        data.error?.message || 'Connection failed',
        processingTime
      );

      return {
        success: false,
        error: data.error?.message || 'Failed to connect to Stripe',
      };
    }

    await logIntegrationEvent(
      'stripe',
      'test_connection',
      'success',
      { api_key_prefix: apiKey.substring(0, 12) + '...' },
      { account_id: data.id, business_name: data.business_profile?.name },
      undefined,
      processingTime
    );

    return {
      success: true,
      accountInfo: {
        id: data.id,
        email: data.email,
        business_name: data.business_profile?.name,
        country: data.country,
        currency: data.default_currency,
      },
    };
  } catch (error: any) {
    await logIntegrationEvent(
      'stripe',
      'test_connection',
      'failed',
      {},
      {},
      error.message
    );

    return {
      success: false,
      error: error.message || 'Failed to test Stripe connection',
    };
  }
}

export async function syncStripeCustomer(
  customerData: {
    email: string;
    name: string;
    phone?: string;
    metadata?: Record<string, string>;
  }
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const credentials = await getIntegrationCredentials('stripe');
    if (!credentials || !credentials.api_key) {
      return { success: false, error: 'Stripe not connected' };
    }

    const startTime = Date.now();

    const formData = new URLSearchParams();
    formData.append('email', customerData.email);
    formData.append('name', customerData.name);
    if (customerData.phone) formData.append('phone', customerData.phone);
    if (customerData.metadata) {
      Object.entries(customerData.metadata).forEach(([key, value]) => {
        formData.append(`metadata[${key}]`, value);
      });
    }

    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.api_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const processingTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      await logIntegrationEvent(
        'stripe',
        'create_customer',
        'failed',
        customerData,
        data,
        data.error?.message,
        processingTime
      );

      return {
        success: false,
        error: data.error?.message || 'Failed to create Stripe customer',
      };
    }

    await logIntegrationEvent(
      'stripe',
      'create_customer',
      'success',
      customerData,
      { customer_id: data.id },
      undefined,
      processingTime
    );

    return {
      success: true,
      customerId: data.id,
    };
  } catch (error: any) {
    await logIntegrationEvent(
      'stripe',
      'create_customer',
      'failed',
      customerData,
      {},
      error.message
    );

    return {
      success: false,
      error: error.message || 'Failed to sync customer to Stripe',
    };
  }
}

export function getQuickBooksAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state: state,
  });

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

export async function exchangeQuickBooksCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const startTime = Date.now();

    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    });

    const auth = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const processingTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      await logIntegrationEvent(
        'quickbooks',
        'oauth_exchange',
        'failed',
        { code_prefix: code.substring(0, 10) + '...' },
        data,
        data.error_description || 'OAuth exchange failed',
        processingTime
      );

      return {
        success: false,
        error: data.error_description || 'Failed to exchange OAuth code',
      };
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await saveIntegrationCredentials('quickbooks', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: expiresAt,
      metadata: {
        token_type: data.token_type,
      },
    });

    await logIntegrationEvent(
      'quickbooks',
      'oauth_exchange',
      'success',
      {},
      { expires_in: data.expires_in },
      undefined,
      processingTime
    );

    return { success: true };
  } catch (error: any) {
    await logIntegrationEvent(
      'quickbooks',
      'oauth_exchange',
      'failed',
      {},
      {},
      error.message
    );

    return {
      success: false,
      error: error.message || 'Failed to exchange QuickBooks OAuth code',
    };
  }
}

export async function syncWarrantyToAcomba(
  warrantyData: {
    contract_number: string;
    customer_name: string;
    customer_email: string;
    description: string;
    subtotal: number;
    tps: number;
    tvq: number;
    total: number;
    created_at: string;
  }
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const credentials = await getIntegrationCredentials('acomba');
    if (!credentials || !credentials.api_key) {
      return { success: false, error: 'Acomba non connecté' };
    }

    const startTime = Date.now();

    const invoicePayload = {
      date: new Date(warrantyData.created_at).toISOString().split('T')[0],
      invoice_number: warrantyData.contract_number,
      customer: {
        code: warrantyData.customer_email,
        name: warrantyData.customer_name,
      },
      lines: [
        {
          description: warrantyData.description,
          quantity: 1,
          unit_price: warrantyData.subtotal,
          tps: warrantyData.tps,
          tvq: warrantyData.tvq,
        }
      ],
      total: warrantyData.total,
    };

    const response = await fetch(`${credentials.metadata?.api_url || 'https://api.acomba.com'}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.api_key}`,
        'Content-Type': 'application/json',
        'X-Company-Id': credentials.company_id || '',
      },
      body: JSON.stringify(invoicePayload),
    });

    const processingTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      await logIntegrationEvent(
        'acomba',
        'create_invoice',
        'failed',
        invoicePayload,
        data,
        data.error?.message || 'Failed to create invoice',
        processingTime
      );

      return {
        success: false,
        error: data.error?.message || 'Échec de création de facture dans Acomba',
      };
    }

    await logIntegrationEvent(
      'acomba',
      'create_invoice',
      'success',
      invoicePayload,
      { invoice_id: data.id },
      undefined,
      processingTime
    );

    return {
      success: true,
      invoiceId: data.id,
    };
  } catch (error: any) {
    await logIntegrationEvent(
      'acomba',
      'create_invoice',
      'failed',
      warrantyData,
      {},
      error.message
    );

    return {
      success: false,
      error: error.message || 'Erreur de synchronisation avec Acomba',
    };
  }
}

export async function testAcombaConnection(
  apiKey: string,
  companyId: string,
  apiUrl?: string
): Promise<{ success: boolean; error?: string; companyInfo?: any }> {
  try {
    const startTime = Date.now();

    const response = await fetch(`${apiUrl || 'https://api.acomba.com'}/v1/company/info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Company-Id': companyId,
      },
    });

    const processingTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      await logIntegrationEvent(
        'acomba',
        'test_connection',
        'failed',
        { api_key_prefix: apiKey.substring(0, 12) + '...', company_id: companyId },
        data,
        data.error?.message || 'Connection failed',
        processingTime
      );

      return {
        success: false,
        error: data.error?.message || 'Impossible de se connecter à Acomba',
      };
    }

    await logIntegrationEvent(
      'acomba',
      'test_connection',
      'success',
      { company_id: companyId },
      { company_name: data.name },
      undefined,
      processingTime
    );

    return {
      success: true,
      companyInfo: data,
    };
  } catch (error: any) {
    await logIntegrationEvent(
      'acomba',
      'test_connection',
      'failed',
      {},
      {},
      error.message
    );

    return {
      success: false,
      error: error.message || 'Erreur de test de connexion Acomba',
    };
  }
}
