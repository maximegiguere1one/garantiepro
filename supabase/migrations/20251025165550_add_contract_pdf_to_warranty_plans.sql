/*
  # Ajouter support des PDFs de contrat aux plans de garantie

  1. Changements
    - Ajoute la colonne `contract_pdf_url` à `warranty_plans`
    - Permet de stocker l'URL du PDF de contrat téléchargé
    - Le PDF sera affiché lors de la signature au lieu d'être généré

  2. Utilité
    - Les franchisés peuvent télécharger leurs propres contrats PDF
    - Ces PDFs sont affichés directement lors de la signature
    - Remplace la génération automatique de PDF
*/

-- Ajouter la colonne pour stocker l'URL du PDF de contrat
ALTER TABLE warranty_plans 
ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

-- Ajouter un commentaire pour documenter l'usage
COMMENT ON COLUMN warranty_plans.contract_pdf_url IS 'URL du fichier PDF de contrat téléchargé (Supabase Storage). Ce PDF sera affiché lors de la signature au lieu d''être généré automatiquement.';
