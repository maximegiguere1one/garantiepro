/*
  # Create tax_settings table

  1. New Tables
    - `tax_settings`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, unique, not null)
      - `user_id` (uuid, nullable for backwards compat)
      - `gst_rate` (numeric, default 0.05)
      - `qst_rate` (numeric, default 0.09975)
      - `pst_rate` (numeric, default 0)
      - `hst_rate` (numeric, default 0)
      - `apply_gst` (boolean, default true)
      - `apply_qst` (boolean, default true)
      - `apply_pst` (boolean, default false)
      - `apply_hst` (boolean, default false)
      - `tax_number_gst` (text)
      - `tax_number_qst` (text)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tax_settings` table
    - Add policies for authenticated users to manage their org's settings
*/

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  user_id uuid,
  gst_rate numeric(5,3) NOT NULL DEFAULT 0.05,
  qst_rate numeric(5,3) NOT NULL DEFAULT 0.09975,
  pst_rate numeric(5,3) NOT NULL DEFAULT 0,
  hst_rate numeric(5,3) NOT NULL DEFAULT 0,
  apply_gst boolean NOT NULL DEFAULT true,
  apply_qst boolean NOT NULL DEFAULT true,
  apply_pst boolean NOT NULL DEFAULT false,
  apply_hst boolean NOT NULL DEFAULT false,
  tax_number_gst text DEFAULT '',
  tax_number_qst text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index on organization_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_tax_settings_organization_id 
ON public.tax_settings(organization_id);

-- Enable RLS
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read their organization's settings
CREATE POLICY "Users can read own org tax settings"
ON public.tax_settings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Policies: Admins can insert/update their organization's settings
CREATE POLICY "Admins can insert own org tax settings"
ON public.tax_settings
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
);

CREATE POLICY "Admins can update own org tax settings"
ON public.tax_settings
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tax_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_settings_updated_at
BEFORE UPDATE ON public.tax_settings
FOR EACH ROW
EXECUTE FUNCTION update_tax_settings_updated_at();
