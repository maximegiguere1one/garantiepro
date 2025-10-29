import { supabase } from './supabase';

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'cad',
  metadata: Record<string, string> = {}
): Promise<StripePaymentIntent | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: Math.round(amount * 100),
        currency,
        metadata,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return null;
  }
}

export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-refund', {
      body: {
        payment_intent_id: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error creating refund:', error);
    return { success: false, error: error.message };
  }
}

export async function getPaymentHistory(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        warranties(
          contract_number,
          customers(first_name, last_name)
        )
      `)
      .eq('warranties.customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
}

export async function createSubscription(
  customerId: string,
  priceId: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: {
        customer_id: customerId,
        price_id: priceId,
        metadata,
      },
    });

    if (error) throw error;
    return { success: true, subscriptionId: data.id };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message };
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: {
        subscription_id: subscriptionId,
        immediately,
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: error.message };
  }
}

export function formatAmount(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getPaymentStatusBadge(status: string): { color: string; label: string } {
  const statusMap: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Complété' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Échoué' },
    refunded: { color: 'bg-primary-100 text-primary-800', label: 'Remboursé' },
  };

  return statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
}
