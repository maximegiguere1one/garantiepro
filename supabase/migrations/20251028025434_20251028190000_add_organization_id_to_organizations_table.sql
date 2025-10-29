/*
  # Ajout de organization_id à la Table organizations
  Date: 28 Octobre 2025

  ## Résumé
  Ajoute organization_id à la table organizations pour permettre l'auto-référence
  et la hiérarchie d'organisations.

  ## Stratégie
  - organization_id fait référence à l'organisation parente
  - Permet de créer des hiérarchies: Siège social -> Franchises -> Sous-franchises
  - NULL = organisation racine (niveau supérieur)
  - NON-NULL = sous-organisation d'une autre organisation

  ## Note
  Cette colonne est identique à parent_organization_id mais nommée organization_id
  pour la cohérence avec les autres tables du système.
*/

-- =====================================================
-- AJOUT DE organization_id À organizations
-- =====================================================

-- Ajouter la colonne organization_id comme référence parente
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Créer un index pour performance
CREATE INDEX IF NOT EXISTS idx_organizations_organization_id 
ON organizations(organization_id);

-- Ajouter un commentaire pour clarté
COMMENT ON COLUMN organizations.organization_id IS 'Référence à l''organisation parente. NULL = organisation racine.';

-- =====================================================
-- MISE À JOUR DES RLS POLICIES
-- =====================================================

-- Les policies existantes fonctionnent déjà, pas besoin de modifications
-- car organizations utilise déjà des policies basées sur les rôles

-- =====================================================
-- SYNCHRONISATION AVEC parent_organization_id
-- =====================================================

-- Si parent_organization_id existe et a des valeurs, copier vers organization_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'parent_organization_id'
  ) THEN
    UPDATE organizations 
    SET organization_id = parent_organization_id 
    WHERE parent_organization_id IS NOT NULL 
    AND organization_id IS NULL;
  END IF;
END $$;

-- =====================================================
-- TRIGGER POUR SYNCHRONISER LES DEUX COLONNES
-- =====================================================

-- Fonction pour synchroniser organization_id et parent_organization_id
CREATE OR REPLACE FUNCTION sync_organization_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Si organization_id est modifié, synchroniser avec parent_organization_id
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    NEW.parent_organization_id := NEW.organization_id;
  END IF;
  
  -- Si parent_organization_id est modifié, synchroniser avec organization_id
  IF NEW.parent_organization_id IS DISTINCT FROM OLD.parent_organization_id THEN
    NEW.organization_id := NEW.parent_organization_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS sync_organization_hierarchy_trigger ON organizations;
CREATE TRIGGER sync_organization_hierarchy_trigger
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION sync_organization_hierarchy();