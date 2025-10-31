/*
  # Fix Warranty Creation - Missing Columns and Trigger Errors

  Date: 31 Octobre 2025

  ## Problèmes identifiés

  1. **Erreur: column "full_name" does not exist**
     - Le trigger `notify_new_claim()` référence `c.full_name`
     - La table `customers` utilise `first_name` et `last_name` séparément
     - Erreur survient lors de INSERT dans warranties car le trigger se déclenche

  2. **Colonnes manquantes dans warranties**
     - `signed_at` (timestamptz) - Utilisé par NewWarranty.tsx ligne 916
     - `signature_ip` (text) - Utilisé par NewWarranty.tsx ligne 928
     - Ces colonnes sont référencées dans le code mais n'existent pas dans la table

  ## Solutions

  1. Corriger le trigger `notify_new_claim()` pour utiliser CONCAT(first_name, last_name)
  2. Ajouter les colonnes manquantes `signed_at` et `signature_ip`
  3. Ajouter des index pour performance sur les nouvelles colonnes

  ## Changements

  - Mise à jour de la fonction `notify_new_claim()`
  - Ajout de `signed_at` timestamptz à warranties
  - Ajout de `signature_ip` text à warranties
  - Ajout d'index sur `signed_at` pour requêtes temporelles
*/

-- ============================================================================
-- 1. CORRIGER LE TRIGGER notify_new_claim()
-- ============================================================================

-- Recréer la fonction avec la correction du nom de colonne
CREATE OR REPLACE FUNCTION notify_new_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty RECORD;
  v_admin RECORD;
BEGIN
  -- CORRECTION: Utiliser CONCAT(first_name, ' ', last_name) au lieu de full_name
  SELECT w.warranty_number, CONCAT(c.first_name, ' ', c.last_name) as customer_name
  INTO v_warranty
  FROM warranties w
  LEFT JOIN customers c ON w.customer_id = c.id
  WHERE w.id = NEW.warranty_id;

  FOR v_admin IN
    SELECT id
    FROM profiles
    WHERE organization_id = NEW.organization_id
      AND role IN ('admin', 'manager', 'master', 'franchisee_admin')
  LOOP
    PERFORM create_notification(
      NEW.organization_id,
      v_admin.id,
      'new_claim',
      'Nouvelle réclamation soumise',
      'Réclamation #' || NEW.claim_number || ' pour ' || COALESCE(v_warranty.customer_name, 'client'),
      '/claims',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Le trigger existe déjà, pas besoin de le recréer
-- DROP TRIGGER IF EXISTS trigger_notify_new_claim ON claims;
-- CREATE TRIGGER trigger_notify_new_claim
--   AFTER INSERT ON claims
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_new_claim();

-- ============================================================================
-- 2. AJOUTER LES COLONNES MANQUANTES À warranties
-- ============================================================================

DO $$
BEGIN
  -- Ajouter signed_at (date/heure de signature)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties'
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE warranties ADD COLUMN signed_at timestamptz;
    RAISE NOTICE 'Colonne signed_at ajoutée à warranties';
  ELSE
    RAISE NOTICE 'Colonne signed_at existe déjà';
  END IF;

  -- Ajouter signature_ip (adresse IP lors de la signature)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties'
    AND column_name = 'signature_ip'
  ) THEN
    ALTER TABLE warranties ADD COLUMN signature_ip text;
    RAISE NOTICE 'Colonne signature_ip ajoutée à warranties';
  ELSE
    RAISE NOTICE 'Colonne signature_ip existe déjà';
  END IF;
END $$;

-- ============================================================================
-- 3. AJOUTER DES INDEX POUR PERFORMANCE
-- ============================================================================

-- Index sur signed_at pour requêtes temporelles et tri
CREATE INDEX IF NOT EXISTS idx_warranties_signed_at
ON warranties(signed_at)
WHERE signed_at IS NOT NULL;

-- Index sur signature_ip pour audit et analyse de sécurité
CREATE INDEX IF NOT EXISTS idx_warranties_signature_ip
ON warranties(signature_ip)
WHERE signature_ip IS NOT NULL;

-- ============================================================================
-- 4. COMMENTAIRES EXPLICATIFS
-- ============================================================================

COMMENT ON COLUMN warranties.signed_at IS 'Date et heure exacte de la signature du contrat';
COMMENT ON COLUMN warranties.signature_ip IS 'Adresse IP du client lors de la signature (pour audit et conformité)';

-- ============================================================================
-- 5. VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
  v_signed_at_exists boolean;
  v_signature_ip_exists boolean;
BEGIN
  -- Vérifier que les colonnes existent maintenant
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'signed_at'
  ) INTO v_signed_at_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'signature_ip'
  ) INTO v_signature_ip_exists;

  IF v_signed_at_exists AND v_signature_ip_exists THEN
    RAISE NOTICE '✓ Migration réussie - Toutes les colonnes existent';
  ELSE
    RAISE EXCEPTION 'Migration échouée - Colonnes manquantes';
  END IF;
END $$;
