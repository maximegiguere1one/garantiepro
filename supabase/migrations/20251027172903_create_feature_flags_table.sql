/*
  # Create Feature Flags Table

  ## Summary
  Creates a feature_flags table to manage application feature toggles.

  ## Tables Created
  - feature_flags: Store feature toggle configurations

  ## Security
  - RLS enabled
  - Only authenticated users can read feature flags
  - Only admins can manage feature flags
*/

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  flag_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_key ON public.feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_organization_id ON public.feature_flags(organization_id);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view feature flags for their organization
CREATE POLICY "Users can view feature flags"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin')
    )
  );

-- Policy: Admins can manage feature flags
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'master')
    )
  );

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, organization_id)
VALUES 
  ('product_tours_enabled', 'Product Tours', 'Enable in-app product tours for new users', true, NULL),
  ('realtime_notifications', 'Realtime Notifications', 'Enable real-time push notifications', true, NULL),
  ('advanced_analytics', 'Advanced Analytics', 'Enable advanced analytics dashboard', false, NULL)
ON CONFLICT (flag_key) DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Feature flags table created successfully';
  RAISE NOTICE 'Default feature flags inserted';
END $$;
