import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-client';
import { performanceMonitor } from '../lib/monitoring/performance-monitor';
import type { Database } from '../lib/database.types';

type Warranty = Database['public']['Tables']['warranties']['Row'];

interface WarrantiesFilters {
  status?: string;
  customerId?: string;
  organizationId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export function useWarranties(filters?: WarrantiesFilters) {
  return useQuery({
    queryKey: queryKeys.warranties.list(filters),
    queryFn: async () => {
      return performanceMonitor.measureAsync('fetchWarranties', async () => {
        let query = supabase
          .from('warranties')
          .select(`
            id,
            contract_number,
            customer_id,
            trailer_id,
            plan_id,
            organization_id,
            status,
            start_date,
            end_date,
            duration_months,
            base_price,
            options_price,
            taxes,
            total_price,
            margin,
            deductible,
            contract_pdf_url,
            customer_invoice_pdf_url,
            merchant_invoice_pdf_url,
            signature_proof_url,
            created_at,
            updated_at,
            customer:customers(*),
            trailer:trailers(*),
            plan:warranty_plans(*)
          `)
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }

        if (filters?.organizationId) {
          query = query.eq('organization_id', filters.organizationId);
        }

        if (filters?.searchTerm) {
          query = query.or(`
            customer.first_name.ilike.%${filters.searchTerm}%,
            customer.last_name.ilike.%${filters.searchTerm}%,
            customer.email.ilike.%${filters.searchTerm}%,
            trailer.vin.ilike.%${filters.searchTerm}%
          `);
        }

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as Warranty[];
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useWarranty(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warranties.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Warranty ID is required');

      return performanceMonitor.measureAsync('fetchWarranty', async () => {
        const { data, error } = await supabase
          .from('warranties')
          .select(`
            id,
            contract_number,
            customer_id,
            trailer_id,
            plan_id,
            organization_id,
            status,
            start_date,
            end_date,
            duration_months,
            base_price,
            options_price,
            taxes,
            total_price,
            margin,
            deductible,
            contract_pdf_url,
            customer_invoice_pdf_url,
            merchant_invoice_pdf_url,
            signature_proof_url,
            signer_full_name,
            signed_at,
            created_at,
            updated_at,
            customer:customers(*),
            trailer:trailers(*),
            plan:warranty_plans(*),
            options:warranty_selected_options(
              warranty_option:warranty_options(*)
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        return data;
      });
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warrantyData: any) => {
      return performanceMonitor.measureAsync('createWarranty', async () => {
        const { data, error } = await supabase
          .from('warranties')
          .insert(warrantyData)
          .select('id, contract_number, organization_id, customer_id, status, created_at, contract_pdf_url')
          .single();

        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
    },
  });
}

export function useUpdateWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Warranty> }) => {
      const { data, error } = await supabase
        .from('warranties')
        .update(updates)
        .eq('id', id)
        .select('id, contract_number, organization_id, customer_id, status, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.detail(data.id) });
    },
  });
}

export function useDeleteWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warranties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
    },
  });
}

export function useWarrantiesStats(organizationId?: string) {
  return useQuery({
    queryKey: [...queryKeys.warranties.all, 'stats', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('warranties')
        .select('status, total_price', { count: 'exact' });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const stats = {
        total: count || 0,
        active: data?.filter(w => w.status === 'active').length || 0,
        expired: data?.filter(w => w.status === 'expired').length || 0,
        cancelled: data?.filter(w => w.status === 'cancelled').length || 0,
        totalRevenue: data?.reduce((sum, w) => sum + (w.total_price || 0), 0) || 0,
      };

      return stats;
    },
    staleTime: 5 * 60 * 1000,
  });
}
