export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          type: 'owner' | 'franchisee'
          owner_organization_id: string | null
          status: 'active' | 'suspended' | 'inactive'
          billing_email: string
          billing_phone: string | null
          address: string | null
          city: string | null
          province: string
          postal_code: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'owner' | 'franchisee'
          owner_organization_id?: string | null
          status?: 'active' | 'suspended' | 'inactive'
          billing_email?: string
          billing_phone?: string | null
          address?: string | null
          city?: string | null
          province?: string
          postal_code?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'owner' | 'franchisee'
          owner_organization_id?: string | null
          status?: 'active' | 'suspended' | 'inactive'
          billing_email?: string
          billing_phone?: string | null
          address?: string | null
          city?: string | null
          province?: string
          postal_code?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_billing_config: {
        Row: {
          id: string
          organization_id: string
          billing_type: 'percentage_of_warranty' | 'fixed_per_warranty'
          percentage_rate: number
          fixed_amount: number | null
          minimum_monthly_fee: number | null
          setup_fee: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          billing_type?: 'percentage_of_warranty' | 'fixed_per_warranty'
          percentage_rate?: number
          fixed_amount?: number | null
          minimum_monthly_fee?: number | null
          setup_fee?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          billing_type?: 'percentage_of_warranty' | 'fixed_per_warranty'
          percentage_rate?: number
          fixed_amount?: number | null
          minimum_monthly_fee?: number | null
          setup_fee?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      warranty_transactions: {
        Row: {
          id: string
          warranty_id: string
          organization_id: string
          warranty_total_price: number
          commission_percentage: number
          commission_amount: number
          transaction_date: string
          billing_status: 'pending' | 'invoiced' | 'paid'
          invoice_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          warranty_id: string
          organization_id: string
          warranty_total_price: number
          commission_percentage?: number
          commission_amount: number
          transaction_date?: string
          billing_status?: 'pending' | 'invoiced' | 'paid'
          invoice_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          warranty_id?: string
          organization_id?: string
          warranty_total_price?: number
          commission_percentage?: number
          commission_amount?: number
          transaction_date?: string
          billing_status?: 'pending' | 'invoiced' | 'paid'
          invoice_id?: string | null
          created_at?: string
        }
      }
      franchise_invoices: {
        Row: {
          id: string
          franchisee_organization_id: string
          invoice_number: string
          billing_period_start: string
          billing_period_end: string
          total_warranties_sold: number
          subtotal_amount: number
          taxes: number
          total_amount: number
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          due_date: string
          paid_at: string | null
          stripe_invoice_id: string | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          franchisee_organization_id: string
          invoice_number: string
          billing_period_start: string
          billing_period_end: string
          total_warranties_sold?: number
          subtotal_amount?: number
          taxes?: number
          total_amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          due_date: string
          paid_at?: string | null
          stripe_invoice_id?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          franchisee_organization_id?: string
          invoice_number?: string
          billing_period_start?: string
          billing_period_end?: string
          total_warranties_sold?: number
          subtotal_amount?: number
          taxes?: number
          total_amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string
          paid_at?: string | null
          stripe_invoice_id?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      franchise_payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_method: 'stripe' | 'manual' | 'bank_transfer' | 'check'
          stripe_payment_id: string | null
          paid_at: string
          payment_status: 'succeeded' | 'failed' | 'refunded' | 'pending'
          receipt_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          payment_method?: 'stripe' | 'manual' | 'bank_transfer' | 'check'
          stripe_payment_id?: string | null
          paid_at?: string
          payment_status?: 'succeeded' | 'failed' | 'refunded' | 'pending'
          receipt_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          payment_method?: 'stripe' | 'manual' | 'bank_transfer' | 'check'
          stripe_payment_id?: string | null
          paid_at?: string
          payment_status?: 'succeeded' | 'failed' | 'refunded' | 'pending'
          receipt_url?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      stripe_customer_organizations: {
        Row: {
          id: string
          organization_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          payment_method_id: string | null
          auto_pay_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          payment_method_id?: string | null
          auto_pay_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          payment_method_id?: string | null
          auto_pay_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      company_settings: {
        Row: {
          id: string
          company_name: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          contact_email: string | null
          contact_phone: string | null
          contact_address: string | null
          website_url: string | null
          business_number: string | null
          license_numbers: Json
          email_signature_fr: string | null
          email_signature_en: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_name?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_address?: string | null
          website_url?: string | null
          business_number?: string | null
          license_numbers?: Json
          email_signature_fr?: string | null
          email_signature_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_name?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_address?: string | null
          website_url?: string | null
          business_number?: string | null
          license_numbers?: Json
          email_signature_fr?: string | null
          email_signature_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      tax_rates: {
        Row: {
          id: string
          province_code: string
          province_name: string
          gst_rate: number
          pst_rate: number
          hst_rate: number
          is_active: boolean
          effective_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          province_code: string
          province_name: string
          gst_rate?: number
          pst_rate?: number
          hst_rate?: number
          is_active?: boolean
          effective_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          province_code?: string
          province_name?: string
          gst_rate?: number
          pst_rate?: number
          hst_rate?: number
          is_active?: boolean
          effective_date?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      pricing_rules: {
        Row: {
          id: string
          rule_name: string
          min_purchase_price: number
          max_purchase_price: number
          annual_claim_limit: number
          loyalty_credit_amount: number
          loyalty_credit_promotional: number
          default_deductible: number
          min_margin_percentage: number
          max_margin_percentage: number
          is_active: boolean
          priority: number
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          rule_name: string
          min_purchase_price: number
          max_purchase_price: number
          annual_claim_limit: number
          loyalty_credit_amount?: number
          loyalty_credit_promotional?: number
          default_deductible?: number
          min_margin_percentage?: number
          max_margin_percentage?: number
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          rule_name?: string
          min_purchase_price?: number
          max_purchase_price?: number
          annual_claim_limit?: number
          loyalty_credit_amount?: number
          loyalty_credit_promotional?: number
          default_deductible?: number
          min_margin_percentage?: number
          max_margin_percentage?: number
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      notification_templates: {
        Row: {
          id: string
          template_name: string
          template_type: 'email' | 'sms'
          subject: string | null
          body_fr: string
          body_en: string
          variables: Json
          trigger_event: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          template_name: string
          template_type: 'email' | 'sms'
          subject?: string | null
          body_fr: string
          body_en: string
          variables?: Json
          trigger_event?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          template_name?: string
          template_type?: 'email' | 'sms'
          subject?: string | null
          body_fr?: string
          body_en?: string
          variables?: Json
          trigger_event?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      claim_settings: {
        Row: {
          id: string
          sla_hours: number
          auto_approval_threshold: number
          require_supervisor_approval_above: number
          exclusion_keywords: Json
          workflow_steps: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          sla_hours?: number
          auto_approval_threshold?: number
          require_supervisor_approval_above?: number
          exclusion_keywords?: Json
          workflow_steps?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          sla_hours?: number
          auto_approval_threshold?: number
          require_supervisor_approval_above?: number
          exclusion_keywords?: Json
          workflow_steps?: Json
          updated_at?: string
          updated_by?: string | null
        }
      }
      integration_settings: {
        Row: {
          id: string
          integration_name: string
          is_enabled: boolean
          api_key_encrypted: string | null
          config_json: Json
          last_sync_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          integration_name: string
          is_enabled?: boolean
          api_key_encrypted?: string | null
          config_json?: Json
          last_sync_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          integration_name?: string
          is_enabled?: boolean
          api_key_encrypted?: string | null
          config_json?: Json
          last_sync_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      settings_audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          setting_name: string
          old_value: Json | null
          new_value: Json | null
          changed_by: string | null
          changed_at: string
          ip_address: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          setting_name: string
          old_value?: Json | null
          new_value?: Json | null
          changed_by?: string | null
          changed_at?: string
          ip_address?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          setting_name?: string
          old_value?: Json | null
          new_value?: Json | null
          changed_by?: string | null
          changed_at?: string
          ip_address?: string | null
        }
      }
      dealer_inventory: {
        Row: {
          id: string
          organization_id: string
          vin: string
          make: string
          model: string
          year: number
          type: string
          color: string | null
          purchase_date: string | null
          purchase_price: number | null
          asking_price: number | null
          status: string | null
          location: string | null
          notes: string | null
          sold_date: string | null
          sold_price: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          vin: string
          make: string
          model: string
          year: number
          type: string
          color?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          asking_price?: number | null
          status?: string | null
          location?: string | null
          notes?: string | null
          sold_date?: string | null
          sold_price?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          vin?: string
          make?: string
          model?: string
          year?: number
          type?: string
          color?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          asking_price?: string | null
          status?: string | null
          location?: string | null
          notes?: string | null
          sold_date?: string | null
          sold_price?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'master' | 'super_admin' | 'admin' | 'franchisee_admin' | 'franchisee_employee' | 'dealer' | 'f_and_i' | 'operations' | 'client'
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'master' | 'super_admin' | 'admin' | 'franchisee_admin' | 'franchisee_employee' | 'dealer' | 'f_and_i' | 'operations' | 'client'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'employee' | 'dealer' | 'f_and_i' | 'operations' | 'client'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warranty_plans: {
        Row: {
          id: string
          name: string
          name_fr: string | null
          name_en: string | null
          base_price: number
          coverage_matrix: Json
          contract_template_fr: string | null
          contract_template_en: string | null
          is_active: boolean
          version: number
          status: 'draft' | 'published'
          dealer_id: string | null
          is_template: boolean
          description: string
          coverage_details: string
          duration_months: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_fr?: string | null
          name_en?: string | null
          base_price: number
          coverage_matrix?: Json
          contract_template_fr?: string | null
          contract_template_en?: string | null
          is_active?: boolean
          version?: number
          status?: 'draft' | 'published'
          dealer_id?: string | null
          is_template?: boolean
          description?: string
          coverage_details?: string
          duration_months?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_fr?: string | null
          name_en?: string | null
          base_price?: number
          coverage_matrix?: Json
          contract_template_fr?: string | null
          contract_template_en?: string | null
          is_active?: boolean
          version?: number
          status?: 'draft' | 'published'
          dealer_id?: string | null
          is_template?: boolean
          description?: string
          coverage_details?: string
          duration_months?: number
          created_at?: string
          updated_at?: string
        }
      }
      warranty_options: {
        Row: {
          id: string
          name: string
          name_fr: string
          name_en: string
          price: number
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_fr: string
          name_en: string
          price: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_fr?: string
          name_en?: string
          price?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          address: string
          city: string
          province: string
          postal_code: string
          language_preference: 'fr' | 'en'
          consent_marketing: boolean
          consent_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          address: string
          city: string
          province: string
          postal_code: string
          language_preference?: 'fr' | 'en'
          consent_marketing?: boolean
          consent_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          address?: string
          city?: string
          province?: string
          postal_code?: string
          language_preference?: 'fr' | 'en'
          consent_marketing?: boolean
          consent_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trailers: {
        Row: {
          id: string
          customer_id: string
          vin: string
          make: string
          model: string
          year: number
          category: 'fermee' | 'ouverte' | 'utilitaire'
          purchase_date: string
          purchase_price: number
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          vin: string
          make: string
          model: string
          year: number
          category: 'fermee' | 'ouverte' | 'utilitaire'
          purchase_date: string
          purchase_price: number
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          vin?: string
          make?: string
          model?: string
          year?: number
          category?: 'fermee' | 'ouverte' | 'utilitaire'
          purchase_date?: string
          purchase_price?: number
          created_at?: string
        }
      }
      warranties: {
        Row: {
          id: string
          contract_number: string
          customer_id: string
          trailer_id: string
          plan_id: string
          organization_id: string
          language: 'fr' | 'en'
          province: string
          start_date: string
          end_date: string
          duration_months: number
          base_price: number
          options_price: number
          taxes: number
          total_price: number
          margin: number
          deductible: number
          selected_options: Json
          status: 'draft' | 'active' | 'expired' | 'cancelled'
          customer_invoice_pdf_url: string | null
          merchant_invoice_pdf_url: string | null
          contract_pdf_url: string | null
          signature_proof_url: string | null
          signed_at: string | null
          signature_ip: string | null
          legal_validation_passed: boolean
          legal_validation_errors: Json
          legal_validation_warnings: Json
          sale_duration_seconds: number | null
          created_by: string | null
          dealer_inventory_id: string | null
          claim_submission_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_number: string
          customer_id: string
          trailer_id: string
          plan_id: string
          organization_id: string
          language: 'fr' | 'en'
          province: string
          start_date: string
          end_date: string
          duration_months: number
          base_price: number
          options_price?: number
          taxes: number
          total_price: number
          margin: number
          deductible: number
          selected_options?: Json
          status?: 'draft' | 'active' | 'expired' | 'cancelled'
          customer_invoice_pdf_url?: string | null
          merchant_invoice_pdf_url?: string | null
          contract_pdf_url?: string | null
          signature_proof_url?: string | null
          signed_at?: string | null
          signature_ip?: string | null
          legal_validation_passed?: boolean
          legal_validation_errors?: Json
          legal_validation_warnings?: Json
          sale_duration_seconds?: number | null
          created_by?: string | null
          dealer_inventory_id?: string | null
          claim_submission_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_number?: string
          customer_id?: string
          trailer_id?: string
          plan_id?: string
          organization_id?: string
          language?: 'fr' | 'en'
          province?: string
          start_date?: string
          end_date?: string
          duration_months?: number
          base_price?: number
          options_price?: number
          taxes?: number
          total_price?: number
          margin?: number
          deductible?: number
          selected_options?: Json
          status?: 'draft' | 'active' | 'expired' | 'cancelled'
          customer_invoice_pdf_url?: string | null
          merchant_invoice_pdf_url?: string | null
          contract_pdf_url?: string | null
          signature_proof_url?: string | null
          signed_at?: string | null
          signature_ip?: string | null
          legal_validation_passed?: boolean
          legal_validation_errors?: Json
          legal_validation_warnings?: Json
          sale_duration_seconds?: number | null
          created_by?: string | null
          dealer_inventory_id?: string | null
          claim_submission_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          warranty_id: string
          stripe_payment_intent_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method: string | null
          receipt_url: string | null
          invoice_pdf_url: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          warranty_id: string
          stripe_payment_intent_id?: string | null
          amount: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method?: string | null
          receipt_url?: string | null
          invoice_pdf_url?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          warranty_id?: string
          stripe_payment_intent_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method?: string | null
          receipt_url?: string | null
          invoice_pdf_url?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          created_at?: string
        }
      }
      claims: {
        Row: {
          id: string
          claim_number: string
          warranty_id: string
          customer_id: string
          incident_date: string
          incident_description: string
          reported_date: string
          current_step: number
          status: 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'denied' | 'completed'
          approved_amount: number | null
          denied_reason: string | null
          repair_shop_name: string | null
          repair_shop_contact: string | null
          po_number: string | null
          po_amount: number | null
          issue_letter_sent_at: string | null
          issue_letter_type: 'approved' | 'partially_approved' | 'denied' | null
          sla_deadline: string | null
          assigned_to: string | null
          submission_method: 'internal' | 'public_link'
          submission_token: string | null
          submission_ip: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          claim_number: string
          warranty_id: string
          customer_id: string
          incident_date: string
          incident_description: string
          reported_date?: string
          current_step?: number
          status?: 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'denied' | 'completed'
          approved_amount?: number | null
          denied_reason?: string | null
          repair_shop_name?: string | null
          repair_shop_contact?: string | null
          po_number?: string | null
          po_amount?: number | null
          issue_letter_sent_at?: string | null
          issue_letter_type?: 'approved' | 'partially_approved' | 'denied' | null
          sla_deadline?: string | null
          assigned_to?: string | null
          submission_method?: 'internal' | 'public_link'
          submission_token?: string | null
          submission_ip?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          claim_number?: string
          warranty_id?: string
          customer_id?: string
          incident_date?: string
          incident_description?: string
          reported_date?: string
          current_step?: number
          status?: 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'denied' | 'completed'
          approved_amount?: number | null
          denied_reason?: string | null
          repair_shop_name?: string | null
          repair_shop_contact?: string | null
          po_number?: string | null
          po_amount?: number | null
          issue_letter_sent_at?: string | null
          issue_letter_type?: 'approved' | 'partially_approved' | 'denied' | null
          sla_deadline?: string | null
          assigned_to?: string | null
          submission_method?: 'internal' | 'public_link'
          submission_token?: string | null
          submission_ip?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      claim_timeline: {
        Row: {
          id: string
          claim_id: string
          event_type: string
          description: string
          created_by: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          event_type: string
          description: string
          created_by?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          claim_id?: string
          event_type?: string
          description?: string
          created_by?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      claim_attachments: {
        Row: {
          id: string
          claim_id: string
          file_url: string
          file_name: string
          file_type: string
          file_size: number
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          file_url: string
          file_name: string
          file_type: string
          file_size: number
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          claim_id?: string
          file_url?: string
          file_name?: string
          file_type?: string
          file_size?: number
          uploaded_by?: string | null
          created_at?: string
        }
      }
      loyalty_credits: {
        Row: {
          id: string
          customer_id: string
          warranty_id: string
          credit_amount: number
          is_eligible: boolean
          eligibility_checked_at: string | null
          applied_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          warranty_id: string
          credit_amount?: number
          is_eligible?: boolean
          eligibility_checked_at?: string | null
          applied_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          warranty_id?: string
          credit_amount?: number
          is_eligible?: boolean
          eligibility_checked_at?: string | null
          applied_at?: string | null
          created_at?: string
        }
      }
      nps_surveys: {
        Row: {
          id: string
          customer_id: string
          warranty_id: string | null
          claim_id: string | null
          survey_type: 'post_sale' | 'post_claim'
          score: number | null
          feedback: string | null
          google_review_invited: boolean
          google_review_invited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          warranty_id?: string | null
          claim_id?: string | null
          survey_type: 'post_sale' | 'post_claim'
          score?: number | null
          feedback?: string | null
          google_review_invited?: boolean
          google_review_invited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          warranty_id?: string | null
          claim_id?: string | null
          survey_type?: 'post_sale' | 'post_claim'
          score?: number | null
          feedback?: string | null
          google_review_invited?: boolean
          google_review_invited_at?: string | null
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          old_values: Json | null
          new_values: Json | null
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'create' | 'update' | 'delete'
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          type: 'email' | 'sms'
          template_name: string
          subject: string | null
          body: string
          status: 'pending' | 'sent' | 'failed'
          sent_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          type: 'email' | 'sms'
          template_name: string
          subject?: string | null
          body: string
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          type?: 'email' | 'sms'
          template_name?: string
          subject?: string | null
          body?: string
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      warranty_claim_tokens: {
        Row: {
          id: string
          warranty_id: string
          token: string
          created_at: string
          expires_at: string
          is_used: boolean
          used_at: string | null
          claim_id: string | null
          access_count: number
          last_accessed_at: string | null
        }
        Insert: {
          id?: string
          warranty_id: string
          token: string
          created_at?: string
          expires_at: string
          is_used?: boolean
          used_at?: string | null
          claim_id?: string | null
          access_count?: number
          last_accessed_at?: string | null
        }
        Update: {
          id?: string
          warranty_id?: string
          token?: string
          created_at?: string
          expires_at?: string
          is_used?: boolean
          used_at?: string | null
          claim_id?: string | null
          access_count?: number
          last_accessed_at?: string | null
        }
      }
      public_claim_access_logs: {
        Row: {
          id: string
          token: string
          ip_address: string | null
          user_agent: string | null
          accessed_at: string
          action: 'view_form' | 'submit_claim' | 'upload_file' | 'invalid_token'
          success: boolean
          error_message: string | null
        }
        Insert: {
          id?: string
          token: string
          ip_address?: string | null
          user_agent?: string | null
          accessed_at?: string
          action: 'view_form' | 'submit_claim' | 'upload_file' | 'invalid_token'
          success?: boolean
          error_message?: string | null
        }
        Update: {
          id?: string
          token?: string
          ip_address?: string | null
          user_agent?: string | null
          accessed_at?: string
          action?: 'view_form' | 'submit_claim' | 'upload_file' | 'invalid_token'
          success?: boolean
          error_message?: string | null
        }
      }
      customer_products: {
        Row: {
          id: string
          customer_id: string
          warranty_id: string | null
          product_name: string
          vin: string | null
          make: string | null
          model: string | null
          year: number | null
          purchase_date: string | null
          warranty_start_date: string | null
          warranty_end_date: string | null
          status: 'active' | 'expired' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          warranty_id?: string | null
          product_name: string
          vin?: string | null
          make?: string | null
          model?: string | null
          year?: number | null
          purchase_date?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          status?: 'active' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          warranty_id?: string | null
          product_name?: string
          vin?: string | null
          make?: string | null
          model?: string | null
          year?: number | null
          purchase_date?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          status?: 'active' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      employee_signatures: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          full_name: string
          signature_type: 'generated' | 'drawn'
          signature_data: string
          style_name: string | null
          is_active: boolean
          is_approved: boolean
          approved_by: string | null
          approved_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          full_name: string
          signature_type?: 'generated' | 'drawn'
          signature_data: string
          style_name?: string | null
          is_active?: boolean
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          full_name?: string
          signature_type?: 'generated' | 'drawn'
          signature_data?: string
          style_name?: string | null
          is_active?: boolean
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      signature_styles: {
        Row: {
          id: string
          style_name: string
          display_name: string
          font_family: string
          description: string
          preview_url: string | null
          css_properties: Json
          is_active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          style_name: string
          display_name: string
          font_family: string
          description: string
          preview_url?: string | null
          css_properties?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          style_name?: string
          display_name?: string
          font_family?: string
          description?: string
          preview_url?: string | null
          css_properties?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
      }
    }
  }
}
