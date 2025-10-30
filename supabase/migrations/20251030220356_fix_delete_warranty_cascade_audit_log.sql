/*
  # Correction de la fonction delete_warranty_with_cascade

  1. Modifications
    - Mise à jour de l'insertion dans audit_log pour utiliser les colonnes existantes
    - Utilise table_name, record_id, action, old_values, new_values au lieu de organization_id, resource_type, resource_id, changes
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
    -- Pour les masters, vérifier s'ils peuvent accéder à cette organisation
    IF user_role != 'master' THEN
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
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    'warranties',
    warranty_id_param,
    'DELETE',
    warranty_data,
    jsonb_build_object(
      'deleted_payments', deleted_payments,
      'deleted_tokens', deleted_tokens,
      'updated_claims', updated_claims,
      'contract_number', warranty_record.contract_number,
      'organization_id', warranty_record.organization_id
    ),
    auth.uid(),
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
