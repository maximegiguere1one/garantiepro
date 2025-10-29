import { z } from 'zod';

// Company Settings Schema
export const companySettingsSchema = z.object({
  organization_id: z.string().uuid(),
  company_name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  contact_address: z.string().default(''),
  contact_phone: z.string().default(''),
  contact_email: z.string().email('Email invalide').or(z.literal('')),
  website_url: z.string().url('URL invalide').or(z.literal('')),
  logo_url: z.string().url('URL invalide').or(z.literal('')),
  business_number: z.string().default(''),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Couleur hexadécimale invalide').default('#0f172a'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Couleur hexadécimale invalide').default('#3b82f6'),
  vendor_signature_url: z.string().default(''),
});

export type CompanySettings = z.infer<typeof companySettingsSchema>;

// Tax Settings Schema
export const taxSettingsSchema = z.object({
  organization_id: z.string().uuid(),
  gst_rate: z.number().min(0).max(100).default(5.0),
  qst_rate: z.number().min(0).max(100).default(9.975),
  pst_rate: z.number().min(0).max(100).default(0),
  hst_rate: z.number().min(0).max(100).default(0),
  apply_gst: z.boolean().default(true),
  apply_qst: z.boolean().default(true),
  apply_pst: z.boolean().default(false),
  apply_hst: z.boolean().default(false),
  tax_number_gst: z.string().default(''),
  tax_number_qst: z.string().default(''),
}).refine(
  (data) => {
    // At least one tax must be enabled
    return data.apply_gst || data.apply_qst || data.apply_pst || data.apply_hst;
  },
  {
    message: 'Au moins une taxe doit être activée',
  }
);

export type TaxSettings = z.infer<typeof taxSettingsSchema>;

// Pricing Settings Schema
export const pricingSettingsSchema = z.object({
  organization_id: z.string().uuid(),
  default_margin_percentage: z.number().min(0).max(100).default(20),
  minimum_warranty_price: z.number().min(0).default(50),
  maximum_warranty_price: z.number().min(0).default(10000),
  price_rounding_method: z.enum(['none', 'nearest', 'up', 'down']).default('nearest'),
  price_rounding_to: z.number().min(0).max(0.99).default(0.99),
  apply_volume_discounts: z.boolean().default(false),
  volume_discount_threshold: z.number().int().min(1).default(10),
  volume_discount_percentage: z.number().min(0).max(100).default(5),
}).refine(
  (data) => data.maximum_warranty_price >= data.minimum_warranty_price,
  {
    message: 'Le prix maximum doit être supérieur ou égal au prix minimum',
    path: ['maximum_warranty_price'],
  }
);

export type PricingSettings = z.infer<typeof pricingSettingsSchema>;

// Notification Settings Schema
export const notificationSettingsSchema = z.object({
  organization_id: z.string().uuid(),
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  notify_new_warranty: z.boolean().default(true),
  notify_warranty_expiring: z.boolean().default(true),
  notify_claim_submitted: z.boolean().default(true),
  notify_claim_approved: z.boolean().default(true),
  notify_claim_rejected: z.boolean().default(true),
  expiring_warranty_days: z.number().int().min(1).max(365).default(30),
  notification_email: z.string().email('Email invalide').or(z.literal('')),
  notification_phone: z.string().default(''),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

// Claim Settings Schema
export const claimSettingsSchema = z.object({
  organization_id: z.string().uuid(),
  sla_hours: z.number().int().min(1).default(48),
  auto_approval_threshold: z.number().min(0).default(500),
  require_supervisor_approval_above: z.number().min(0).default(2000),
  auto_approve_under_amount: z.number().min(0).default(100),
  require_manager_approval: z.boolean().default(true),
  manager_approval_threshold: z.number().min(0).default(500),
  allow_partial_approvals: z.boolean().default(true),
  max_claim_processing_days: z.number().int().min(1).default(14),
  require_photo_evidence: z.boolean().default(true),
  require_receipt: z.boolean().default(false),
  email_customer_on_status_change: z.boolean().default(true),
  exclusion_keywords: z.any().default([]),
  workflow_steps: z.any().default([]),
}).refine(
  (data) => data.require_supervisor_approval_above >= data.auto_approval_threshold,
  {
    message: 'Le seuil d\'approbation superviseur doit être supérieur au seuil d\'auto-approbation',
    path: ['require_supervisor_approval_above'],
  }
);

export type ClaimSettings = z.infer<typeof claimSettingsSchema>;
