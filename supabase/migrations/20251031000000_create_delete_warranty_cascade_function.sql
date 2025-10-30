/*
  # Fonction de suppression en cascade des garanties

  1. Nouvelle fonction RPC
    - `delete_warranty_with_cascade` - Supprime une garantie et toutes ses données liées de manière sécurisée

  2. Actions de suppression en cascade
    - Supprime les paiements associés (payments)
    - Supprime les tokens de téléchargement (warranty_download_tokens)
    - Met à jour les réclamations pour les marquer comme orphelines (claims)
    - Supprime la garantie elle-même (warranties)
    - Crée une entrée dans audit_log pour traçabilité

  3. Sécurité
    - Vérifie que l'utilisateur appartient à l'organisation de la garantie
    - Vérifie que l'utilisateur a le rôle admin ou master
    - Utilise SECURITY DEFINER pour exécuter avec les privilèges appropriés
    - Retourne le nombre d'éléments supprimés pour confirmation
*/

-- Fonction pour supprimer une garantie avec toutes ses dépendances
CREATE OR REPLACE FUNCTION delete_warranty_with_cascade(
  warranty_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  warranty_record RECORD;
  user_org_id UUID;
  user_role TEXT;
  deleted_payments INTEGER := 0;
  deleted_tokens INTEGER := 0;
  updated_claims INTEGER := 0;
  warranty_data JSONB;
BEGIN
  -- Récupérer l'organisation et le rôle de l'utilisateur
  SELECT organization_id, role INTO user_org_id, user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Vérifier que l'utilisateur a les permissions (admin ou master)
  IF user_role NOT IN ('admin', 'master') THEN
    RAISE EXCEPTION 'Permission refusée: seuls les administrateurs peuvent supprimer des garanties';
  END IF;

  -- Récupérer les informations de la garantie avant suppression
  SELECT * INTO warranty_record
  FROM warranties
  WHERE id = warranty_id_param;

  -- Vérifier que la garantie existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Garantie introuvable: %', warranty_id_param;
  END IF;

  -- Vérifier que l'utilisateur appartient à l'organisation de la garantie
  IF warranty_record.organization_id != user_org_id THEN
    -- Vérifier si l'utilisateur est un master admin qui peut accéder à cette organisation
    IF NOT user_can_access_organization(warranty_record.organization_id) THEN
      RAISE EXCEPTION 'Permission refusée: vous ne pouvez pas supprimer des garanties d''une autre organisation';
    END IF;
  END IF;

  -- Sauvegarder les données de la garantie pour l'audit
  warranty_data := to_jsonb(warranty_record);

  -- 1. Supprimer les paiements associés
  DELETE FROM payments
  WHERE warranty_id = warranty_id_param;
  GET DIAGNOSTICS deleted_payments = ROW_COUNT;

  -- 2. Supprimer les tokens de téléchargement
  DELETE FROM warranty_download_tokens
  WHERE warranty_id = warranty_id_param;
  GET DIAGNOSTICS deleted_tokens = ROW_COUNT;

  -- 3. Mettre à jour les réclamations pour les marquer comme orphelines
  UPDATE claims
  SET
    warranty_id = NULL,
    status = CASE
      WHEN status IN ('submitted', 'under_review') THEN 'denied'
      ELSE status
    END,
    denied_reason = COALESCE(denied_reason, '') || ' [Garantie supprimée le ' || CURRENT_DATE::TEXT || ']',
    updated_at = NOW()
  WHERE warranty_id = warranty_id_param;
  GET DIAGNOSTICS updated_claims = ROW_COUNT;

  -- 4. Créer une entrée d'audit avant suppression
  INSERT INTO audit_log (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    changes,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    warranty_record.organization_id,
    'DELETE_WARRANTY',
    'warranty',
    warranty_id_param,
    jsonb_build_object(
      'warranty_data', warranty_data,
      'deleted_payments', deleted_payments,
      'deleted_tokens', deleted_tokens,
      'updated_claims', updated_claims,
      'contract_number', warranty_record.contract_number
    ),
    inet_client_addr()::TEXT,
    current_setting('request.headers', true)::json->>'user-agent',
    NOW()
  );

  -- 5. Supprimer la garantie elle-même
  DELETE FROM warranties
  WHERE id = warranty_id_param;

  -- Retourner un résumé de la suppression
  RETURN json_build_object(
    'success', true,
    'warranty_id', warranty_id_param,
    'contract_number', warranty_record.contract_number,
    'deleted_payments', deleted_payments,
    'deleted_tokens', deleted_tokens,
    'updated_claims', updated_claims,
    'message', 'Garantie supprimée avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner les détails
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'message', 'Erreur lors de la suppression de la garantie'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter un commentaire explicatif
COMMENT ON FUNCTION delete_warranty_with_cascade IS
'Supprime une garantie et toutes ses données liées (paiements, tokens, met à jour les réclamations).
Vérifie les permissions de l''utilisateur avant suppression.
Crée automatiquement une entrée d''audit pour traçabilité.
Retourne un JSON avec le résultat de l''opération.';

-- Grant execute permission to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION delete_warranty_with_cascade TO authenticated;
