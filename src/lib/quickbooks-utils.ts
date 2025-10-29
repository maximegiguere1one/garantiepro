import { supabase } from './supabase';
import { getIntegrationCredentials, logIntegrationEvent } from './integration-utils';

const QUICKBOOKS_BASE_URL = 'https://quickbooks.api.intuit.com/v3';
const QUICKBOOKS_SANDBOX_URL = 'https://sandbox-quickbooks.api.intuit.com/v3';

interface QuickBooksConfig {
  realmId: string;
  accessToken: string;
  baseUrl: string;
}

async function getQuickBooksConfig(): Promise<QuickBooksConfig | null> {
  try {
    const credentials = await getIntegrationCredentials('quickbooks');

    if (!credentials || !credentials.access_token || !credentials.company_id) {
      return null;
    }

    const isExpired = credentials.token_expires_at
      ? new Date(credentials.token_expires_at) < new Date()
      : true;

    if (isExpired) {
      console.warn('QuickBooks token expired, needs refresh');
      return null;
    }

    return {
      realmId: credentials.company_id,
      accessToken: credentials.access_token,
      baseUrl: credentials.is_test_mode ? QUICKBOOKS_SANDBOX_URL : QUICKBOOKS_BASE_URL,
    };
  } catch (error) {
    console.error('Error getting QuickBooks config:', error);
    return null;
  }
}

async function makeQuickBooksRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const config = await getQuickBooksConfig();

    if (!config) {
      return { success: false, error: 'QuickBooks not configured or token expired' };
    }

    const url = `${config.baseUrl}/company/${config.realmId}/${endpoint}`;
    const startTime = Date.now();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const processingTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      await logIntegrationEvent(
        'quickbooks',
        method.toLowerCase() + '_' + endpoint.split('/')[0],
        'failed',
        { endpoint, body },
        data,
        data.Fault?.Error?.[0]?.Message || 'Request failed',
        processingTime
      );

      return {
        success: false,
        error: data.Fault?.Error?.[0]?.Message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    await logIntegrationEvent(
      'quickbooks',
      method.toLowerCase() + '_' + endpoint.split('/')[0],
      'success',
      { endpoint, body },
      { response_size: JSON.stringify(data).length },
      undefined,
      processingTime
    );

    return { success: true, data };
  } catch (error: any) {
    await logIntegrationEvent(
      'quickbooks',
      'api_request',
      'failed',
      { endpoint, method },
      {},
      error.message
    );

    return { success: false, error: error.message };
  }
}

export async function syncCustomerToQuickBooks(customer: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  qb_customer_id?: string;
}): Promise<{ success: boolean; qbCustomerId?: string; error?: string }> {
  try {
    const { data: existingMapping } = await supabase
      .from('customer_products')
      .select('quickbooks_customer_id')
      .eq('customer_email', customer.email)
      .not('quickbooks_customer_id', 'is', null)
      .maybeSingle();

    const qbCustomer = {
      DisplayName: customer.name,
      PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
      PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
      BillAddr: customer.address ? {
        Line1: customer.address,
        City: customer.city,
        CountrySubDivisionCode: customer.province,
        PostalCode: customer.postal_code,
        Country: 'Canada',
      } : undefined,
    };

    let result;

    if (customer.qb_customer_id || existingMapping?.quickbooks_customer_id) {
      const qbId = customer.qb_customer_id || existingMapping.quickbooks_customer_id;

      const { data: existingCustomer } = await makeQuickBooksRequest(
        'GET',
        `customer/${qbId}?minorversion=65`
      );

      if (existingCustomer?.Customer) {
        result = await makeQuickBooksRequest(
          'POST',
          'customer?minorversion=65',
          {
            ...qbCustomer,
            Id: qbId,
            SyncToken: existingCustomer.Customer.SyncToken,
          }
        );
      } else {
        result = await makeQuickBooksRequest('POST', 'customer?minorversion=65', qbCustomer);
      }
    } else {
      result = await makeQuickBooksRequest('POST', 'customer?minorversion=65', qbCustomer);
    }

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const qbCustomerId = result.data?.Customer?.Id;

    await supabase
      .from('customer_products')
      .update({ quickbooks_customer_id: qbCustomerId })
      .eq('customer_email', customer.email);

    return { success: true, qbCustomerId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncInvoiceToQuickBooks(warranty: {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  taxes: number;
  qb_invoice_id?: string;
  qb_customer_id?: string;
}): Promise<{ success: boolean; qbInvoiceId?: string; error?: string }> {
  try {
    let customerId = warranty.qb_customer_id;

    if (!customerId) {
      const customerSync = await syncCustomerToQuickBooks({
        id: warranty.id,
        name: warranty.customer_name,
        email: warranty.customer_email,
      });

      if (!customerSync.success) {
        return { success: false, error: 'Failed to sync customer: ' + customerSync.error };
      }

      customerId = customerSync.qbCustomerId;
    }

    const subtotal = warranty.total_price - warranty.taxes;

    const qbInvoice = {
      CustomerRef: {
        value: customerId,
      },
      Line: [
        {
          Amount: subtotal,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: {
              value: '1',
              name: 'Services',
            },
            Qty: 1,
            UnitPrice: subtotal,
          },
          Description: `Warranty ${warranty.contract_number}`,
        },
      ],
      TxnTaxDetail: {
        TotalTax: warranty.taxes,
      },
      DocNumber: warranty.contract_number,
    };

    let result;

    if (warranty.qb_invoice_id) {
      const { data: existingInvoice } = await makeQuickBooksRequest(
        'GET',
        `invoice/${warranty.qb_invoice_id}?minorversion=65`
      );

      if (existingInvoice?.Invoice) {
        result = await makeQuickBooksRequest(
          'POST',
          'invoice?minorversion=65',
          {
            ...qbInvoice,
            Id: warranty.qb_invoice_id,
            SyncToken: existingInvoice.Invoice.SyncToken,
          }
        );
      } else {
        result = await makeQuickBooksRequest('POST', 'invoice?minorversion=65', qbInvoice);
      }
    } else {
      result = await makeQuickBooksRequest('POST', 'invoice?minorversion=65', qbInvoice);
    }

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const qbInvoiceId = result.data?.Invoice?.Id;

    await supabase
      .from('warranties')
      .update({
        quickbooks_invoice_id: qbInvoiceId,
        quickbooks_customer_id: customerId,
      })
      .eq('id', warranty.id);

    return { success: true, qbInvoiceId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncPaymentToQuickBooks(payment: {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  warranty_id: string;
  qb_payment_id?: string;
  qb_invoice_id?: string;
  qb_customer_id?: string;
}): Promise<{ success: boolean; qbPaymentId?: string; error?: string }> {
  try {
    if (!payment.qb_customer_id || !payment.qb_invoice_id) {
      return { success: false, error: 'Customer or Invoice not synced to QuickBooks' };
    }

    const qbPayment = {
      CustomerRef: {
        value: payment.qb_customer_id,
      },
      TotalAmt: payment.amount,
      TxnDate: payment.payment_date,
      Line: [
        {
          Amount: payment.amount,
          LinkedTxn: [
            {
              TxnId: payment.qb_invoice_id,
              TxnType: 'Invoice',
            },
          ],
        },
      ],
      PaymentMethodRef: {
        value: payment.payment_method === 'credit_card' ? '1' : '2',
      },
    };

    let result;

    if (payment.qb_payment_id) {
      const { data: existingPayment } = await makeQuickBooksRequest(
        'GET',
        `payment/${payment.qb_payment_id}?minorversion=65`
      );

      if (existingPayment?.Payment) {
        result = await makeQuickBooksRequest(
          'POST',
          'payment?minorversion=65',
          {
            ...qbPayment,
            Id: payment.qb_payment_id,
            SyncToken: existingPayment.Payment.SyncToken,
          }
        );
      } else {
        result = await makeQuickBooksRequest('POST', 'payment?minorversion=65', qbPayment);
      }
    } else {
      result = await makeQuickBooksRequest('POST', 'payment?minorversion=65', qbPayment);
    }

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const qbPaymentId = result.data?.Payment?.Id;

    await supabase
      .from('payments')
      .update({ quickbooks_payment_id: qbPaymentId })
      .eq('id', payment.id);

    return { success: true, qbPaymentId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function queryQuickBooks(
  entity: string,
  query: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const encodedQuery = encodeURIComponent(query);
  return makeQuickBooksRequest('GET', `query?query=${encodedQuery}&minorversion=65`);
}

export async function getQuickBooksCompanyInfo(): Promise<{
  success: boolean;
  companyInfo?: any;
  error?: string
}> {
  const result = await makeQuickBooksRequest('GET', 'companyinfo/0?minorversion=65');

  if (result.success) {
    return {
      success: true,
      companyInfo: result.data?.CompanyInfo,
    };
  }

  return result;
}

export async function syncAllUnsynced(): Promise<{
  success: boolean;
  synced: { customers: number; invoices: number; payments: number };
  errors: string[];
}> {
  const synced = { customers: 0, invoices: 0, payments: 0 };
  const errors: string[] = [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: warranties } = await supabase
      .from('warranties')
      .select('*, customer:customers(*)')
      .eq('dealer_id', user.id)
      .is('quickbooks_invoice_id', null)
      .limit(50);

    if (warranties) {
      for (const warranty of warranties) {
        const result = await syncInvoiceToQuickBooks({
          id: warranty.id,
          contract_number: warranty.contract_number,
          customer_name: warranty.customer?.name || 'Unknown',
          customer_email: warranty.customer_email,
          total_price: warranty.total_price,
          taxes: warranty.taxes || 0,
        });

        if (result.success) {
          synced.invoices++;
        } else {
          errors.push(`Invoice ${warranty.contract_number}: ${result.error}`);
        }
      }
    }

    return { success: true, synced, errors };
  } catch (error: any) {
    return {
      success: false,
      synced,
      errors: [...errors, error.message]
    };
  }
}
