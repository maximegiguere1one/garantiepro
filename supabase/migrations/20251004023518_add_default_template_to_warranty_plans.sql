/*
  # Ajouter liaison entre Plans et Modèles

  ## Changements
  
  1. Nouvelles colonnes dans `warranty_plans`
    - `default_template_id` (uuid, référence à warranty_templates) - Modèle par défaut pour ce plan
    - `allow_template_override` (boolean) - Permettre de changer le modèle lors de la vente
  
  2. Amélioration de l'expérience utilisateur
    - Si un plan a un modèle par défaut, il sera automatiquement sélectionné
    - Le vendeur peut toujours changer le modèle si autorisé
    - Maximum de flexibilité sans complexité
  
  3. Sécurité
    - Aucune modification RLS nécessaire
    - Les références utilisent ON DELETE SET NULL pour éviter les problèmes
*/

-- Ajouter colonne default_template_id à warranty_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'default_template_id'
  ) THEN
    ALTER TABLE warranty_plans 
    ADD COLUMN default_template_id uuid REFERENCES warranty_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'allow_template_override'
  ) THEN
    ALTER TABLE warranty_plans 
    ADD COLUMN allow_template_override boolean DEFAULT true;
  END IF;
END $$;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_warranty_plans_default_template 
ON warranty_plans(default_template_id) 
WHERE default_template_id IS NOT NULL;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN warranty_plans.default_template_id IS 'Modèle de document par défaut pour ce plan commercial';
COMMENT ON COLUMN warranty_plans.allow_template_override IS 'Autoriser le changement de modèle lors de la vente';
