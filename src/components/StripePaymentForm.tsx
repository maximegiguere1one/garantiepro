import { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { createPaymentIntent, formatAmount } from '../lib/stripe-utils';
import { useToast } from '../contexts/ToastContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  amount: number;
  warrantyId: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function CheckoutForm({ amount, warrantyId, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setPaymentStatus('error');
        toast.error('Erreur de paiement', error.message || 'Le paiement a échoué');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('success');
        toast.success('Succès', 'Paiement effectué avec succès');
        onSuccess(paymentIntent.id);
      }
    } catch (error: any) {
      setPaymentStatus('error');
      toast.error('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary-900">Montant total</span>
          <span className="text-2xl font-bold text-primary-900">{formatAmount(amount)}</span>
        </div>
      </div>

      <PaymentElement />

      {paymentStatus === 'success' && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-primary-600" />
          <span className="text-sm text-green-900">Paiement réussi!</span>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-900">Le paiement a échoué. Veuillez réessayer.</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing || paymentStatus === 'success'}
          className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Payer {formatAmount(amount)}
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-center text-slate-500">
        Paiement sécurisé par Stripe. Vos informations sont protégées.
      </p>
    </form>
  );
}

export function StripePaymentForm({ amount, warrantyId, onSuccess, onCancel }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    initializePayment();
  }, [amount, warrantyId]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      const paymentIntent = await createPaymentIntent(amount, 'cad', {
        warranty_id: warrantyId,
      });

      if (paymentIntent?.client_secret) {
        setClientSecret(paymentIntent.client_secret);
      } else {
        toast.error('Erreur', 'Impossible d\'initialiser le paiement');
      }
    } catch (error) {
      toast.error('Erreur', 'Une erreur est survenue lors de l\'initialisation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-700">Impossible d'initialiser le paiement</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2563eb',
          },
        },
      }}
    >
      <CheckoutForm
        amount={amount}
        warrantyId={warrantyId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
