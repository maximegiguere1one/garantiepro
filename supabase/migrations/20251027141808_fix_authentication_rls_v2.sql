/*
  # Fix Authentication and RLS - Complete Setup v2
  
  ## Summary
  This migration creates all necessary tables and RLS policies to fix the authentication
  and database connection errors. It creates a clean, working setup from scratch.
  
  ## Tables Created
  1. **organizations** - Store franchises and business entities
  2. **profiles** - User profiles with roles
  
  ## Security Features
  - RLS enabled on all tables
  - Simple, non-circular policies
  - Automatic profile creation on user signup
  - Users can always read their own profile
*/

-- =====================================================
-- STEP 1: Create organizations table
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text DEFAULT 'franchisee' CHECK (type IN ('owner', 'franchisee')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Create profiles table
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'dealer' CHECK (role IN ('customer', 'dealer', 'employee', 'operator', 'support', 'admin', 'master')),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create RLS policies for organizations
-- =====================================================

CREATE POLICY "authenticated_view_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- STEP 4: Create RLS policies for profiles
-- =====================================================

-- Policy 1: Every user can ALWAYS read their own profile (CRITICAL)
CREATE POLICY "users_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Users can insert their own profile (for signup)
CREATE POLICY "users_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- STEP 5: Create automatic profile creation function
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id uuid;
  v_role text;
  v_full_name text;
BEGIN
  -- Extract role from metadata, default to 'dealer'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dealer');

  -- Extract full_name with fallback
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Extract organization_id from metadata
  BEGIN
    v_organization_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_organization_id := NULL;
  END;

  -- If no organization_id, get or create the default owner organization
  IF v_organization_id IS NULL THEN
    SELECT id INTO v_organization_id
    FROM public.organizations
    WHERE type = 'owner'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_organization_id IS NULL THEN
      -- Create a default owner organization
      INSERT INTO public.organizations (name, type, status)
      VALUES ('Location Pro-Remorque', 'owner', 'active')
      RETURNING id INTO v_organization_id;
    END IF;
  END IF;

  -- Insert the profile
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_organization_id
    );
  EXCEPTION WHEN unique_violation THEN
    -- Profile already exists, skip
    NULL;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 6: Create trigger on auth.users
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 7: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
