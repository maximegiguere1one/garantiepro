/*
  # Create Personalization System

  1. New Tables
    - `tour_progress`
      - Tracks user progress through product tours
      - Links to auth.users and stores completion status
    - `feature_flags`
      - Controls feature rollout and A/B testing
      - Supports role-based and percentage-based rollout
    - `ab_test_assignments`
      - Tracks A/B test group assignments per user

  2. Security
    - Enable RLS on all tables
    - Users can only access their own tour progress
    - Only admins can manage feature flags
    - All users can read feature flags

  3. Indexes
    - Optimized for fast lookups by user_id and flag_key
*/

-- Tour Progress Tracking Table
CREATE TABLE IF NOT EXISTS tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tour_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completed boolean DEFAULT false,
  skipped_at timestamptz,
  steps_completed integer DEFAULT 0,
  total_steps integer,
  current_step_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

-- Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  enabled_for_roles text[] DEFAULT ARRAY[]::text[],
  enabled_for_users uuid[] DEFAULT ARRAY[]::uuid[],
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- A/B Test Assignments Table
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_name text NOT NULL,
  test_group text NOT NULL CHECK (test_group IN ('control', 'treatment')),
  assigned_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, test_name)
);

-- Enable RLS
ALTER TABLE tour_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

-- Tour Progress RLS Policies
CREATE POLICY "Users can view own tour progress"
  ON tour_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tour progress"
  ON tour_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tour progress"
  ON tour_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Feature Flags RLS Policies
CREATE POLICY "All authenticated users can view feature flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage feature flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  );

-- A/B Test Assignments RLS Policies
CREATE POLICY "Users can view own test assignments"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test assignments"
  ON ab_test_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all test assignments"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tour_progress_user_id ON tour_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_progress_tour_id ON tour_progress(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_progress_completed ON tour_progress(completed);
CREATE INDEX IF NOT EXISTS idx_tour_progress_user_tour ON tour_progress(user_id, tour_id);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_name ON ab_test_assignments(test_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_test ON ab_test_assignments(user_id, test_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_tour_progress_updated_at
  BEFORE UPDATE ON tour_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default feature flags
INSERT INTO feature_flags (flag_key, enabled, description, rollout_percentage) VALUES
  ('personalization_enabled', true, 'Enable role-based UI personalization', 100),
  ('product_tours_enabled', true, 'Enable guided product tours', 100),
  ('progressive_disclosure', true, 'Enable progressive disclosure for advanced features', 100),
  ('personalization_ab_test', false, 'A/B test for personalization features', 50)
ON CONFLICT (flag_key) DO NOTHING;
