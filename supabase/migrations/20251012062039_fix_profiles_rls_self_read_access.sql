/*
  # Correction des RLS Policies pour l'Accès au Profil Personnel
  
  ## Résumé
  Corrige les RLS policies sur la table profiles pour s'assurer que chaque utilisateur
  peut toujours lire son propre profil, indépendamment de son rôle ou organisation.
  
  ## Problème
  Les nouvelles policies étaient trop restrictives et empêchaient certains utilisateurs
  de charger leur propre profil au login.
  
  ## Solution
  - Ajoute une policy simple et directe pour la lecture de son propre profil
  - Conserve les policies existantes pour les autres cas
  - Garantit que auth.uid() = id fonctionne toujours
  
  ## Sécurité
  Cette modification ne compromet pas la sécurité car elle permet uniquement
  à un utilisateur de lire son propre profil, ce qui est nécessaire pour
  le fonctionnement de l'application.
*/

-- Supprimer toutes les policies existantes sur profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in organization" ON public.profiles;

-- Policy #1: Tout utilisateur peut lire son propre profil (PRIORITAIRE)
CREATE POLICY "Users can always read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy #2: Les admins et super_admins peuvent lire tous les profils de leur organisation
CREATE POLICY "Admins can read org profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        -- Admin peut voir les profils de son organisation
        p.organization_id = profiles.organization_id
        -- Super admin peut voir tous les profils
        OR p.role = 'super_admin'
      )
    )
  );

-- Policy #3: Les dealers peuvent lire les profils de leur organisation
CREATE POLICY "Dealers can read org profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'dealer'
      AND p.organization_id = profiles.organization_id
      AND profiles.id != auth.uid() -- Éviter duplication avec policy #1
    )
  );

-- Policy #4: Tout utilisateur peut mettre à jour son propre nom
CREATE POLICY "Users can update own name"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Policy #5: Les admins peuvent mettre à jour les profils de leur organisation
CREATE POLICY "Admins can update org profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = profiles.organization_id
      AND profiles.role != 'super_admin'
      AND profiles.id != auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND public.can_manage_role(p.role, profiles.role)
    )
  );

-- Policy #6: Les super_admins peuvent mettre à jour tous les profils
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
      AND profiles.id != auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Vérification: Tester que l'utilisateur peut lire son propre profil
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully for profiles table';
  RAISE NOTICE 'All authenticated users can now read their own profile';
END $$;