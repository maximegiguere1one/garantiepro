/*
  Script SQL pour générer des tokens de réclamation pour toutes les garanties existantes
  qui n'en ont pas encore.

  Utilisation:
  1. Exécutez ce script dans Supabase SQL Editor
  2. Il créera automatiquement un token pour chaque garantie sans token
  3. Les tokens sont valides pour 1 an

  Sécurité:
  - Ne modifie pas les tokens existants
  - Crée uniquement pour les garanties sans token
  - Génère des tokens uniques et sécurisés
*/

-- Fonction pour générer un token unique
CREATE OR REPLACE FUNCTION generate_unique_claim_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Générer un token aléatoire
    new_token := 'claim_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 9);

    -- Vérifier s'il existe déjà
    SELECT EXISTS(SELECT 1 FROM warranty_claim_tokens WHERE token = new_token) INTO token_exists;

    -- Si le token n'existe pas, on le retourne
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Créer des tokens pour toutes les garanties qui n'en ont pas
DO $$
DECLARE
  warranty_record RECORD;
  new_token TEXT;
  tokens_created INTEGER := 0;
BEGIN
  RAISE NOTICE 'Début de la génération des tokens manquants...';

  -- Pour chaque garantie sans token
  FOR warranty_record IN
    SELECT w.id, w.warranty_number
    FROM warranties w
    WHERE NOT EXISTS (
      SELECT 1
      FROM warranty_claim_tokens wct
      WHERE wct.warranty_id = w.id
    )
  LOOP
    -- Générer un token unique
    new_token := generate_unique_claim_token();

    -- Insérer le token
    INSERT INTO warranty_claim_tokens (
      warranty_id,
      token,
      expires_at,
      is_used,
      used_at,
      created_at
    ) VALUES (
      warranty_record.id,
      new_token,
      (now() + interval '1 year')::timestamptz,
      false,
      NULL,
      now()
    );

    tokens_created := tokens_created + 1;

    -- Log tous les 10 tokens
    IF tokens_created % 10 = 0 THEN
      RAISE NOTICE 'Tokens créés: %', tokens_created;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Génération terminée: % tokens créés', tokens_created;

  -- Afficher les statistiques
  RAISE NOTICE '=== STATISTIQUES ===';
  RAISE NOTICE 'Total garanties: %', (SELECT COUNT(*) FROM warranties);
  RAISE NOTICE 'Garanties avec tokens: %', (SELECT COUNT(DISTINCT warranty_id) FROM warranty_claim_tokens);
  RAISE NOTICE 'Tokens valides: %', (SELECT COUNT(*) FROM warranty_claim_tokens WHERE is_used = false AND expires_at > now());
END $$;

-- Vérification finale
SELECT
  'Total garanties' as type,
  COUNT(*) as count
FROM warranties
UNION ALL
SELECT
  'Garanties avec tokens' as type,
  COUNT(DISTINCT warranty_id) as count
FROM warranty_claim_tokens
UNION ALL
SELECT
  'Tokens valides' as type,
  COUNT(*) as count
FROM warranty_claim_tokens
WHERE is_used = false AND expires_at > now()
UNION ALL
SELECT
  'Garanties SANS tokens' as type,
  COUNT(*) as count
FROM warranties w
WHERE NOT EXISTS (
  SELECT 1
  FROM warranty_claim_tokens wct
  WHERE wct.warranty_id = w.id
);
