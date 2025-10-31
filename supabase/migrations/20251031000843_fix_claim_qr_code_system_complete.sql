/*
  # Correction Complète du Système de QR Code pour Réclamations
  
  ## Problèmes identifiés
  1. claim_submission_url contient seulement le path relatif au lieu de l'URL complète
  2. Le QR code ne peut pas fonctionner avec un path relatif
  3. L'URL de base n'est pas configurée dans le trigger
  
  ## Solutions
  1. Modifier le trigger pour générer l'URL complète avec le domaine
  2. Ajouter un fallback pour les tokens existants
  3. Créer une fonction helper pour obtenir l'URL complète
  4. Mettre à jour tous les tokens existants avec l'URL complète
*/

-- =====================================================
-- ÉTAPE 1: Créer fonction helper pour URL complète
-- =====================================================

CREATE OR REPLACE FUNCTION get_claim_submission_base_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- URL de production
  -- Peut être configurée via les settings de l'organisation plus tard
  RETURN 'https://app.garantieproremorque.com';
END;
$$;

COMMENT ON FUNCTION get_claim_submission_base_url IS
'Retourne l''URL de base pour les liens de soumission de réclamation';

-- =====================================================
-- ÉTAPE 2: Recréer le trigger avec URL complète
-- =====================================================

CREATE OR REPLACE FUNCTION create_claim_token_for_warranty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token text;
  base_url text;
  full_url text;
BEGIN
  -- Only create token for active warranties
  IF NEW.status = 'active' THEN
    -- Generate unique token
    new_token := generate_claim_token();
    
    -- Get base URL
    base_url := get_claim_submission_base_url();
    
    -- Build full URL
    full_url := base_url || '/claim/submit/' || new_token;
    
    -- Insert token record
    INSERT INTO warranty_claim_tokens (
      warranty_id,
      token,
      expires_at,
      organization_id
    ) VALUES (
      NEW.id,
      new_token,
      NEW.end_date::timestamptz,
      NEW.organization_id
    )
    ON CONFLICT (warranty_id) DO UPDATE
    SET 
      token = EXCLUDED.token,
      expires_at = EXCLUDED.expires_at,
      updated_at = now();
    
    -- Update warranty with FULL claim submission URL
    UPDATE warranties
    SET claim_submission_url = full_url
    WHERE id = NEW.id;
    
    RAISE NOTICE 'Created claim token % with full URL: %', new_token, full_url;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_create_claim_token ON warranties;

CREATE TRIGGER trigger_create_claim_token
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION create_claim_token_for_warranty();

COMMENT ON TRIGGER trigger_create_claim_token ON warranties IS
'Crée automatiquement un token de réclamation avec URL complète pour chaque nouvelle garantie active';

-- =====================================================
-- ÉTAPE 3: Ajouter organization_id et updated_at si manquants
-- =====================================================

DO $$
BEGIN
  -- Ajouter organization_id si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_claim_tokens' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE warranty_claim_tokens 
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    
    -- Remplir organization_id depuis les warranties
    UPDATE warranty_claim_tokens wct
    SET organization_id = w.organization_id
    FROM warranties w
    WHERE wct.warranty_id = w.id
    AND wct.organization_id IS NULL;
  END IF;
  
  -- Ajouter updated_at si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_claim_tokens' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE warranty_claim_tokens 
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_organization 
ON warranty_claim_tokens(organization_id);

-- =====================================================
-- ÉTAPE 4: Mettre à jour tous les tokens existants avec URL complète
-- =====================================================

DO $$
DECLARE
  v_base_url text;
  v_updated_count integer := 0;
BEGIN
  v_base_url := get_claim_submission_base_url();
  
  -- Mettre à jour toutes les URLs qui ne sont pas complètes
  UPDATE warranties w
  SET claim_submission_url = v_base_url || w.claim_submission_url
  FROM warranty_claim_tokens wct
  WHERE w.id = wct.warranty_id
  AND w.claim_submission_url IS NOT NULL
  AND w.claim_submission_url NOT LIKE 'http%'
  AND w.claim_submission_url LIKE '/claim/submit/%';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Updated % existing warranties with complete URLs', v_updated_count;
END $$;

-- =====================================================
-- ÉTAPE 5: Fonction pour regénérer le token d'une garantie
-- =====================================================

CREATE OR REPLACE FUNCTION regenerate_claim_token(p_warranty_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_token text;
  v_base_url text;
  v_full_url text;
  v_end_date timestamptz;
  v_organization_id uuid;
BEGIN
  -- Vérifier que la garantie existe
  SELECT end_date, organization_id 
  INTO v_end_date, v_organization_id
  FROM warranties 
  WHERE id = p_warranty_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warranty not found: %', p_warranty_id;
  END IF;
  
  -- Générer nouveau token
  v_new_token := generate_claim_token();
  v_base_url := get_claim_submission_base_url();
  v_full_url := v_base_url || '/claim/submit/' || v_new_token;
  
  -- Mettre à jour ou insérer le token
  INSERT INTO warranty_claim_tokens (
    warranty_id,
    token,
    expires_at,
    organization_id
  ) VALUES (
    p_warranty_id,
    v_new_token,
    v_end_date,
    v_organization_id
  )
  ON CONFLICT (warranty_id) DO UPDATE
  SET 
    token = EXCLUDED.token,
    is_used = false,
    used_at = NULL,
    claim_id = NULL,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
  
  -- Mettre à jour l'URL dans la garantie
  UPDATE warranties
  SET claim_submission_url = v_full_url
  WHERE id = p_warranty_id;
  
  RETURN v_full_url;
END;
$$;

COMMENT ON FUNCTION regenerate_claim_token IS
'Régénère un nouveau token de réclamation pour une garantie existante';

-- =====================================================
-- ÉTAPE 6: Fonction de test du système
-- =====================================================

CREATE OR REPLACE FUNCTION test_claim_token_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_warranties integer;
  v_warranties_with_tokens integer;
  v_tokens_with_full_url integer;
  v_tokens_without_url integer;
BEGIN
  -- Compter les garanties actives
  SELECT COUNT(*)
  INTO v_total_warranties
  FROM warranties
  WHERE status = 'active';
  
  -- Compter les garanties avec tokens
  SELECT COUNT(DISTINCT warranty_id)
  INTO v_warranties_with_tokens
  FROM warranty_claim_tokens;
  
  -- Compter les tokens avec URL complète
  SELECT COUNT(*)
  INTO v_tokens_with_full_url
  FROM warranties w
  INNER JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
  WHERE w.claim_submission_url LIKE 'http%';
  
  -- Compter les tokens sans URL complète
  SELECT COUNT(*)
  INTO v_tokens_without_url
  FROM warranties w
  INNER JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
  WHERE w.claim_submission_url IS NULL 
     OR w.claim_submission_url NOT LIKE 'http%';
  
  -- Construire le résultat
  v_result := jsonb_build_object(
    'total_active_warranties', v_total_warranties,
    'warranties_with_tokens', v_warranties_with_tokens,
    'tokens_with_complete_url', v_tokens_with_full_url,
    'tokens_needing_fix', v_tokens_without_url,
    'base_url', get_claim_submission_base_url(),
    'status', CASE
      WHEN v_tokens_without_url = 0 THEN 'ALL_GOOD'
      WHEN v_tokens_without_url > 0 THEN 'NEEDS_FIX'
      ELSE 'UNKNOWN'
    END
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION test_claim_token_system IS
'Teste le système de tokens de réclamation et retourne les statistiques';

-- =====================================================
-- ÉTAPE 7: Ajouter contrainte unique sur warranty_id
-- =====================================================

DO $$
BEGIN
  -- Supprimer les doublons potentiels d'abord
  DELETE FROM warranty_claim_tokens wct1
  WHERE EXISTS (
    SELECT 1 FROM warranty_claim_tokens wct2
    WHERE wct2.warranty_id = wct1.warranty_id
    AND wct2.created_at > wct1.created_at
  );
  
  -- Ajouter la contrainte unique
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'warranty_claim_tokens_warranty_id_key'
  ) THEN
    ALTER TABLE warranty_claim_tokens
    ADD CONSTRAINT warranty_claim_tokens_warranty_id_key UNIQUE (warranty_id);
  END IF;
END $$;

-- =====================================================
-- INFORMATIONS ET TESTS
-- =====================================================

-- Pour tester le système:
-- SELECT test_claim_token_system();

-- Pour voir les tokens récents:
-- SELECT 
--   w.contract_number,
--   w.claim_submission_url,
--   wct.token,
--   wct.is_used,
--   wct.expires_at
-- FROM warranties w
-- LEFT JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
-- WHERE w.status = 'active'
-- ORDER BY w.created_at DESC
-- LIMIT 10;

-- Pour régénérer un token:
-- SELECT regenerate_claim_token('warranty_id_here');
