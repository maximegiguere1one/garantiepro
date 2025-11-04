/*
  # Ajout de la colonne deductible aux plans de garantie

  ## Problème
  La colonne `deductible` (franchise) n'existe pas dans la table `warranty_plans`.
  Le code tente de lire `selectedPlan.deductible` mais la colonne n'existe pas en BD.

  ## Solution
  1. Ajouter la colonne `deductible` avec une valeur par défaut de 100
  2. Mettre à jour tous les plans existants avec une franchise de 100$
  3. La colonne est NOT NULL car chaque plan doit avoir une franchise

  ## Impact
  - Les plans de garantie peuvent maintenant définir leur propre franchise
  - Plus besoin de constantes PPR hardcodées
  - Flexibilité totale pour créer des plans personnalisés
*/

-- Ajouter la colonne deductible aux plans de garantie
ALTER TABLE warranty_plans
ADD COLUMN IF NOT EXISTS deductible numeric NOT NULL DEFAULT 100;

-- Commentaire sur la colonne
COMMENT ON COLUMN warranty_plans.deductible IS 'Franchise (montant payable par le client) en dollars pour chaque réclamation de ce plan';

-- Mettre à jour les plans existants avec une valeur raisonnable
-- (100$ était l'ancienne valeur PPR par défaut)
UPDATE warranty_plans
SET deductible = 100
WHERE deductible IS NULL OR deductible = 0;

-- Log de succès
DO $$
BEGIN
  RAISE NOTICE '✓ Colonne deductible ajoutée avec succès à warranty_plans';
  RAISE NOTICE '✓ Tous les plans existants ont une franchise de 100$ par défaut';
  RAISE NOTICE 'Les administrateurs peuvent maintenant personnaliser la franchise pour chaque plan';
END $$;
