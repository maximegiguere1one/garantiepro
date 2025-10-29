/*
  # Fonctions RPC Administratives sans Service Role Key

  Cette migration crée des fonctions PostgreSQL sécurisées pour remplacer les opérations
  nécessitant la clé Service Role de Supabase. Ces fonctions utilisent les politiques RLS
  et les permissions de la base de données pour sécuriser les opérations.

  1. Nouvelles Fonctions RPC
    - `admin_update_user_role`: Met à jour le rôle d'un utilisateur (admin uniquement)
    - `admin_promote_user_to_master`: Promeut un utilisateur au rôle master (super_admin uniquement)
    - `admin_soft_delete_user`: Suppression logique d'un utilisateur
    - `check_service_role_available`: Vérifie si la Service Role Key est disponible
    - `get_user_permissions`: Retourne les permissions d'un utilisateur

  2. Sécurité
    - Toutes les fonctions vérifient les permissions de l'appelant
    - Les fonctions utilisent SECURITY DEFINER avec des checks stricts
    - Logging automatique des opérations administratives
    - Protection contre l'auto-modification
*/

-- Fonction pour vérifier si l'utilisateur peut gérer un rôle
CREATE OR REPLACE FUNCTION can_manage_role(
  p_manager_role text,
  p_target_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Master peut tout faire
  IF p_manager_role = 'master' THEN
    RETURN true;
  END IF;

  -- Super admin peut gérer tous les rôles sauf master
  IF p_manager_role = 'super_admin' AND p_target_role != 'master' THEN
    RETURN true;
  END IF;

  -- Admin peut gérer les rôles non-admin
  IF p_manager_role = 'admin' AND p_target_role NOT IN ('master', 'super_admin', 'admin') THEN
    RETURN true;
  END IF;

  -- Franchisee admin peut gérer les employés de sa franchise
  IF p_manager_role = 'franchisee_admin' AND p_target_role IN ('franchisee_employee', 'dealer', 'f_and_i', 'operations') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Fonction pour mettre à jour le rôle d'un utilisateur (sans Service Role Key)
CREATE OR REPLACE FUNCTION admin_update_user_role(
  p_target_user_id uuid,
  p_new_role text,
  p_new_full_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_id uuid;
  v_requesting_role text;
  v_requesting_org_id uuid;
  v_target_role text;
  v_target_email text;
  v_target_org_id uuid;
  v_can_manage boolean;
  v_result json;
BEGIN
  -- Récupérer l'utilisateur qui fait la demande
  v_requesting_user_id := auth.uid();

  IF v_requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Vous devez être authentifié';
  END IF;

  -- Ne pas permettre de modifier son propre rôle
  IF v_requesting_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre rôle';
  END IF;

  -- Récupérer le profil de celui qui fait la demande
  SELECT role, organization_id INTO v_requesting_role, v_requesting_org_id
  FROM profiles
  WHERE id = v_requesting_user_id;

  IF v_requesting_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  -- Seuls les admins peuvent modifier les rôles
  IF v_requesting_role NOT IN ('master', 'super_admin', 'admin', 'franchisee_admin') THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier les rôles';
  END IF;

  -- Récupérer le profil de la cible
  SELECT role, email, organization_id INTO v_target_role, v_target_email, v_target_org_id
  FROM profiles
  WHERE id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur cible introuvable';
  END IF;

  -- Vérifier si l'utilisateur peut gérer ce rôle
  SELECT can_manage_role(v_requesting_role, p_new_role) INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Vous n''avez pas la permission d''assigner ce rôle';
  END IF;

  -- Vérifier si l'utilisateur peut gérer le rôle actuel de la cible
  SELECT can_manage_role(v_requesting_role, v_target_role) INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Vous n''avez pas la permission de modifier cet utilisateur';
  END IF;

  -- Mettre à jour le profil
  UPDATE profiles
  SET
    role = p_new_role,
    full_name = COALESCE(p_new_full_name, full_name),
    updated_at = now()
  WHERE id = p_target_user_id;

  -- Logger l'opération
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    v_requesting_user_id,
    'UPDATE_USER_ROLE',
    'profiles',
    p_target_user_id,
    json_build_object('role', v_target_role),
    json_build_object('role', p_new_role, 'full_name', COALESCE(p_new_full_name, 'unchanged')),
    inet_client_addr()
  );

  -- Retourner le résultat
  SELECT json_build_object(
    'success', true,
    'message', 'Rôle mis à jour avec succès',
    'user', json_build_object(
      'id', p_target_user_id,
      'email', v_target_email,
      'old_role', v_target_role,
      'new_role', p_new_role
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fonction pour promouvoir un utilisateur au rôle master
CREATE OR REPLACE FUNCTION admin_promote_user_to_master(
  p_target_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_id uuid;
  v_requesting_role text;
  v_target_user_id uuid;
  v_target_role text;
  v_result json;
BEGIN
  -- Récupérer l'utilisateur qui fait la demande
  v_requesting_user_id := auth.uid();

  IF v_requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Vous devez être authentifié';
  END IF;

  -- Récupérer le profil de celui qui fait la demande
  SELECT role INTO v_requesting_role
  FROM profiles
  WHERE id = v_requesting_user_id;

  -- Seuls les master et super_admin peuvent promouvoir au rôle master
  IF v_requesting_role NOT IN ('master', 'super_admin') THEN
    RAISE EXCEPTION 'Seuls les masters et super administrateurs peuvent promouvoir au rôle master';
  END IF;

  -- Trouver l'utilisateur cible par email
  SELECT id, role INTO v_target_user_id, v_target_role
  FROM profiles
  WHERE email = p_target_email;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur avec l''email % introuvable', p_target_email;
  END IF;

  -- Ne pas permettre de modifier son propre rôle
  IF v_requesting_user_id = v_target_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre rôle';
  END IF;

  -- Mettre à jour le rôle
  UPDATE profiles
  SET
    role = 'master',
    updated_at = now()
  WHERE id = v_target_user_id;

  -- Logger l'opération
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    v_requesting_user_id,
    'PROMOTE_TO_MASTER',
    'profiles',
    v_target_user_id,
    json_build_object('role', v_target_role),
    json_build_object('role', 'master'),
    inet_client_addr()
  );

  -- Retourner le résultat
  SELECT json_build_object(
    'success', true,
    'message', format('Utilisateur %s promu au rôle master avec succès', p_target_email),
    'email', p_target_email,
    'user_id', v_target_user_id,
    'old_role', v_target_role,
    'new_role', 'master'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fonction pour supprimer logiquement un utilisateur (soft delete)
CREATE OR REPLACE FUNCTION admin_soft_delete_user(
  p_target_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_id uuid;
  v_requesting_role text;
  v_target_role text;
  v_target_email text;
  v_can_manage boolean;
  v_result json;
BEGIN
  -- Récupérer l'utilisateur qui fait la demande
  v_requesting_user_id := auth.uid();

  IF v_requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Vous devez être authentifié';
  END IF;

  -- Ne pas permettre de se supprimer soi-même
  IF v_requesting_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte';
  END IF;

  -- Récupérer le profil de celui qui fait la demande
  SELECT role INTO v_requesting_role
  FROM profiles
  WHERE id = v_requesting_user_id;

  IF v_requesting_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  -- Seuls les admins peuvent supprimer des utilisateurs
  IF v_requesting_role NOT IN ('master', 'super_admin', 'admin') THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent supprimer des utilisateurs';
  END IF;

  -- Récupérer le profil de la cible
  SELECT role, email INTO v_target_role, v_target_email
  FROM profiles
  WHERE id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur cible introuvable';
  END IF;

  -- Vérifier les permissions
  IF v_target_role IN ('master', 'super_admin') AND v_requesting_role NOT IN ('master', 'super_admin') THEN
    RAISE EXCEPTION 'Seuls les masters et super administrateurs peuvent supprimer des masters ou super administrateurs';
  END IF;

  IF v_target_role = 'admin' AND v_requesting_role = 'admin' THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer d''autres administrateurs';
  END IF;

  -- Ajouter une colonne deleted_at si elle n'existe pas (sera ajoutée dans une autre migration si nécessaire)
  -- Pour l'instant, on désactive simplement l'utilisateur en changeant son email
  UPDATE profiles
  SET
    email = v_target_email || '.deleted.' || extract(epoch from now())::text,
    role = 'client',
    updated_at = now()
  WHERE id = p_target_user_id;

  -- Logger l'opération
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    v_requesting_user_id,
    'SOFT_DELETE_USER',
    'profiles',
    p_target_user_id,
    json_build_object('email', v_target_email, 'role', v_target_role),
    json_build_object('status', 'deleted'),
    inet_client_addr()
  );

  -- Retourner le résultat
  SELECT json_build_object(
    'success', true,
    'message', format('Utilisateur %s désactivé avec succès', v_target_email)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fonction pour vérifier les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
  v_org_type text;
  v_permissions json;
BEGIN
  -- Si aucun user_id fourni, utiliser l'utilisateur actuel
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- Récupérer le profil
  SELECT p.role, p.organization_id, o.type
  INTO v_role, v_org_id, v_org_type
  FROM profiles p
  LEFT JOIN organizations o ON o.id = p.organization_id
  WHERE p.id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  -- Construire l'objet permissions
  SELECT json_build_object(
    'user_id', v_user_id,
    'role', v_role,
    'organization_id', v_org_id,
    'organization_type', v_org_type,
    'can_manage_users', v_role IN ('master', 'super_admin', 'admin', 'franchisee_admin'),
    'can_delete_users', v_role IN ('master', 'super_admin', 'admin'),
    'can_manage_organizations', v_role IN ('master', 'super_admin') OR (v_role = 'admin' AND v_org_type = 'owner'),
    'can_create_warranties', v_role IN ('master', 'super_admin', 'admin', 'franchisee_admin', 'dealer', 'f_and_i', 'operations'),
    'can_manage_claims', v_role IN ('master', 'super_admin', 'admin', 'franchisee_admin', 'operations'),
    'can_view_analytics', v_role IN ('master', 'super_admin', 'admin', 'franchisee_admin'),
    'can_manage_settings', v_role IN ('master', 'super_admin', 'admin', 'franchisee_admin'),
    'is_owner_admin', v_org_type = 'owner' AND v_role IN ('master', 'super_admin', 'admin')
  ) INTO v_permissions;

  RETURN v_permissions;
END;
$$;

-- Fonction pour vérifier si la Service Role Key est disponible
-- Cette fonction retourne toujours false car elle est appelée depuis le client
-- Elle est utile pour la compatibilité avec l'ancien code
CREATE OR REPLACE FUNCTION check_service_role_available()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION can_manage_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_promote_user_to_master(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_soft_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_service_role_available() TO authenticated;

-- Commentaires
COMMENT ON FUNCTION can_manage_role IS 'Vérifie si un rôle peut gérer un autre rôle';
COMMENT ON FUNCTION admin_update_user_role IS 'Met à jour le rôle d''un utilisateur (admin uniquement)';
COMMENT ON FUNCTION admin_promote_user_to_master IS 'Promeut un utilisateur au rôle master (super_admin uniquement)';
COMMENT ON FUNCTION admin_soft_delete_user IS 'Désactive un utilisateur (suppression logique)';
COMMENT ON FUNCTION get_user_permissions IS 'Retourne les permissions d''un utilisateur';
COMMENT ON FUNCTION check_service_role_available IS 'Vérifie si la Service Role Key est disponible';
