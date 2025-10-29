import { useReducer, useCallback } from 'react';
import type { Database } from '../lib/database.types';

type WarrantyPlan = Database['public']['Tables']['warranty_plans']['Row'];
type WarrantyOption = Database['public']['Tables']['warranty_options']['Row'];

export interface CustomerData {
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
}

export interface TrailerData {
  vin: string;
  make: string;
  model: string;
  year: number;
  trailerType: string;
  category: 'fermee' | 'ouverte' | 'utilitaire';
  purchaseDate: string;
  purchasePrice: number;
  manufacturerWarrantyEndDate: string;
  isPromotional: boolean;
}

export interface PricingData {
  basePrice: number;
  optionsPrice: number;
  subtotal: number;
  taxes: number;
  totalPrice: number;
  margin: number;
  deductible: number;
}

export interface SignatureData {
  method: 'online' | 'in_person' | null;
  dataUrl: string;
  completedAt: string | null;
  metadata: any;
}

export type WarrantyStep = 1 | 2 | 3 | 4;

export interface WarrantyState {
  currentStep: WarrantyStep;
  customer: CustomerData;
  trailer: TrailerData;
  selectedPlan: WarrantyPlan | null;
  selectedOptions: string[];
  pricing: PricingData | null;
  signature: SignatureData;
  errors: Record<string, string>;
  loading: boolean;
  submitting: boolean;
}

type WarrantyAction =
  | { type: 'SET_STEP'; payload: WarrantyStep }
  | { type: 'UPDATE_CUSTOMER'; payload: Partial<CustomerData> }
  | { type: 'UPDATE_TRAILER'; payload: Partial<TrailerData> }
  | { type: 'SELECT_PLAN'; payload: WarrantyPlan }
  | { type: 'TOGGLE_OPTION'; payload: string }
  | { type: 'UPDATE_PRICING'; payload: PricingData }
  | { type: 'SET_SIGNATURE'; payload: Partial<SignatureData> }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESET' };

const initialCustomer: CustomerData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: 'QC',
  postalCode: '',
  languagePreference: 'fr',
  consentMarketing: false
};

const initialTrailer: TrailerData = {
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  trailerType: '',
  category: 'fermee',
  purchaseDate: new Date().toISOString().split('T')[0],
  purchasePrice: 1000,
  manufacturerWarrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
  isPromotional: false
};

const initialSignature: SignatureData = {
  method: null,
  dataUrl: '',
  completedAt: null,
  metadata: {}
};

const initialState: WarrantyState = {
  currentStep: 1,
  customer: initialCustomer,
  trailer: initialTrailer,
  selectedPlan: null,
  selectedOptions: [],
  pricing: null,
  signature: initialSignature,
  errors: {},
  loading: false,
  submitting: false
};

function warrantyReducer(state: WarrantyState, action: WarrantyAction): WarrantyState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customer: { ...state.customer, ...action.payload }
      };

    case 'UPDATE_TRAILER':
      return {
        ...state,
        trailer: { ...state.trailer, ...action.payload }
      };

    case 'SELECT_PLAN':
      return {
        ...state,
        selectedPlan: action.payload,
        // Reset options when plan changes
        selectedOptions: []
      };

    case 'TOGGLE_OPTION': {
      const optionId = action.payload;
      const isSelected = state.selectedOptions.includes(optionId);

      return {
        ...state,
        selectedOptions: isSelected
          ? state.selectedOptions.filter((id) => id !== optionId)
          : [...state.selectedOptions, optionId]
      };
    }

    case 'UPDATE_PRICING':
      return { ...state, pricing: action.payload };

    case 'SET_SIGNATURE':
      return {
        ...state,
        signature: { ...state.signature, ...action.payload }
      };

    case 'SET_ERRORS':
      return { ...state, errors: action.payload };

    case 'CLEAR_ERROR': {
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return { ...state, errors: newErrors };
    }

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/**
 * Custom hook for managing warranty creation state
 */
export function useWarrantyState() {
  const [state, dispatch] = useReducer(warrantyReducer, initialState);

  // Action creators
  const setStep = useCallback((step: WarrantyStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const updateCustomer = useCallback((data: Partial<CustomerData>) => {
    dispatch({ type: 'UPDATE_CUSTOMER', payload: data });
  }, []);

  const updateTrailer = useCallback((data: Partial<TrailerData>) => {
    dispatch({ type: 'UPDATE_TRAILER', payload: data });
  }, []);

  const selectPlan = useCallback((plan: WarrantyPlan) => {
    dispatch({ type: 'SELECT_PLAN', payload: plan });
  }, []);

  const toggleOption = useCallback((optionId: string) => {
    dispatch({ type: 'TOGGLE_OPTION', payload: optionId });
  }, []);

  const updatePricing = useCallback((pricing: PricingData) => {
    dispatch({ type: 'UPDATE_PRICING', payload: pricing });
  }, []);

  const setSignature = useCallback((signature: Partial<SignatureData>) => {
    dispatch({ type: 'SET_SIGNATURE', payload: signature });
  }, []);

  const setErrors = useCallback((errors: Record<string, string>) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const clearError = useCallback((field: string) => {
    dispatch({ type: 'CLEAR_ERROR', payload: field });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: submitting });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Navigation helpers
  const goToNextStep = useCallback(() => {
    if (state.currentStep < 4) {
      setStep((state.currentStep + 1) as WarrantyStep);
    }
  }, [state.currentStep, setStep]);

  const goToPreviousStep = useCallback(() => {
    if (state.currentStep > 1) {
      setStep((state.currentStep - 1) as WarrantyStep);
    }
  }, [state.currentStep, setStep]);

  // Validation helpers
  const canProceedToStep2 = useCallback(() => {
    const { customer } = state;
    return !!(
      customer.firstName &&
      customer.lastName &&
      customer.email &&
      customer.phone &&
      customer.address &&
      customer.city &&
      customer.province &&
      customer.postalCode
    );
  }, [state]);

  const canProceedToStep3 = useCallback(() => {
    const { trailer } = state;
    return !!(
      trailer.vin &&
      trailer.make &&
      trailer.model &&
      trailer.year &&
      trailer.trailerType &&
      trailer.purchasePrice > 0
    );
  }, [state]);

  const canProceedToStep4 = useCallback(() => {
    return state.selectedPlan !== null;
  }, [state]);

  return {
    state,
    actions: {
      setStep,
      updateCustomer,
      updateTrailer,
      selectPlan,
      toggleOption,
      updatePricing,
      setSignature,
      setErrors,
      clearError,
      setLoading,
      setSubmitting,
      reset,
      goToNextStep,
      goToPreviousStep
    },
    validation: {
      canProceedToStep2,
      canProceedToStep3,
      canProceedToStep4
    }
  };
}
