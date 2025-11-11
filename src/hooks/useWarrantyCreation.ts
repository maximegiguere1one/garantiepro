import { useState, useCallback } from 'react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { warrantyCreationSchema, type WarrantyCreationInput } from '../lib/validation/warranty-schemas';
import { errorMonitor } from '../lib/monitoring/error-monitor';
import { performanceMonitor } from '../lib/monitoring/performance-monitor';
import { generateAndStoreDocuments } from '../lib/document-utils';

interface UseWarrantyCreationOptions {
  onSuccess?: (warrantyId: string) => void;
  onError?: (error: Error) => void;
}

interface WarrantyCreationState {
  isLoading: boolean;
  error: Error | null;
  warrantyId: string | null;
  validationErrors: z.ZodError | null;
}

export function useWarrantyCreation(options: UseWarrantyCreationOptions = {}) {
  const [state, setState] = useState<WarrantyCreationState>({
    isLoading: false,
    error: null,
    warrantyId: null,
    validationErrors: null
  });

  const validateInput = useCallback((input: unknown): WarrantyCreationInput | null => {
    try {
      const validated = warrantyCreationSchema.parse(input);
      setState(prev => ({ ...prev, validationErrors: null }));
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setState(prev => ({ ...prev, validationErrors: error }));
      }
      return null;
    }
  }, []);

  const createWarranty = useCallback(async (input: unknown) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const validatedInput = validateInput(input);
      if (!validatedInput) {
        throw new Error('Validation failed');
      }

      const warrantyId = await performanceMonitor.measureAsync(
        'createWarranty',
        async () => {
          const { customer, trailer, planId, selectedOptions, pricing } = validatedInput;

          let customerId: string;
          const { data: existingCustomer, error: customerLookupError } = await supabase
            .from('customers')
            .select('id')
            .eq('email', customer.email)
            .maybeSingle();

          if (customerLookupError) {
            throw new Error(`Customer lookup failed: ${customerLookupError.message}`);
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;

            const { error: updateError } = await supabase
              .from('customers')
              .update({
                first_name: customer.firstName,
                last_name: customer.lastName,
                phone: customer.phone,
                address: customer.address,
                city: customer.city,
                province: customer.province,
                postal_code: customer.postalCode,
                language_preference: customer.languagePreference,
                consent_marketing: customer.consentMarketing
              })
              .eq('id', customerId);

            if (updateError) {
              throw new Error(`Customer update failed: ${updateError.message}`);
            }
          } else {
            const { data: newCustomer, error: createError } = await supabase
              .from('customers')
              .insert({
                first_name: customer.firstName,
                last_name: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                city: customer.city,
                province: customer.province,
                postal_code: customer.postalCode,
                language_preference: customer.languagePreference,
                consent_marketing: customer.consentMarketing
              })
              .select('id')
              .single();

            if (createError || !newCustomer) {
              throw new Error(`Customer creation failed: ${createError?.message}`);
            }

            customerId = newCustomer.id;
          }

          const { data: trailerData, error: trailerError } = await supabase
            .from('trailers')
            .insert({
              vin: trailer.vin,
              make: trailer.make,
              model: trailer.model,
              year: trailer.year,
              category: trailer.category,
              purchase_date: trailer.purchaseDate,
              purchase_price: trailer.purchasePrice,
              manufacturer_warranty_end_date: trailer.manufacturerWarrantyEndDate,
              is_promotional: trailer.isPromotional,
              customer_id: customerId
            })
            .select('id')
            .single();

          if (trailerError || !trailerData) {
            throw new Error(`Trailer creation failed: ${trailerError?.message}`);
          }

          const { data: warrantyData, error: warrantyError } = await supabase
            .from('warranties')
            .insert({
              customer_id: customerId,
              trailer_id: trailerData.id,
              warranty_plan_id: planId,
              start_date: new Date().toISOString(),
              subtotal: pricing.subtotal,
              gst: pricing.gst,
              pst: pricing.pst,
              hst: pricing.hst,
              qst: pricing.qst,
              total_price: pricing.total,
              status: 'active'
            })
            .select('id')
            .single();

          if (warrantyError || !warrantyData) {
            throw new Error(`Warranty creation failed: ${warrantyError?.message}`);
          }

          if (selectedOptions.length > 0) {
            const optionsToInsert = selectedOptions.map(optionId => ({
              warranty_id: warrantyData.id,
              warranty_option_id: optionId
            }));

            const { error: optionsError } = await supabase
              .from('warranty_selected_options')
              .insert(optionsToInsert);

            if (optionsError) {
              console.error('Failed to insert options:', optionsError);
            }
          }

          try {
            await generateAndStoreDocuments(warrantyData.id);
          } catch (docError) {
            console.error('Document generation failed:', docError);
          }

          return warrantyData.id;
        }
      );

      setState({
        isLoading: false,
        error: null,
        warrantyId,
        validationErrors: null
      });

      options.onSuccess?.(warrantyId);

      return warrantyId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      errorMonitor.captureError(err, {
        action: 'createWarranty',
        component: 'useWarrantyCreation'
      }, 'high');

      setState({
        isLoading: false,
        error: err,
        warrantyId: null,
        validationErrors: null
      });

      options.onError?.(err);

      throw err;
    }
  }, [validateInput, options]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      warrantyId: null,
      validationErrors: null
    });
  }, []);

  return {
    ...state,
    createWarranty,
    validateInput,
    reset
  };
}
