/*
  # Système de Gestion des Documents de Garantie

  1. Nouveaux Champs
    - `signed_contract_scan_url` : PDF du contrat signé numérisé/scanné
    - `customer_invoice_generated_at` : Date de génération facture client
    - `merchant_invoice_generated_at` : Date de génération facture marchand
    - `documents_completed` : Indicateur si tous les documents sont au dossier

  2. Nouveau Bucket Storage
    - `warranty-documents` : Stocke les scans de contrats signés

  3. Sécurité
    - RLS sur le nouveau bucket
    - Permissions par organisation
*/

-- Ajouter les nouveaux champs à la table warranties
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS signed_contract_scan_url text;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS customer_invoice_generated_at timestamptz;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS merchant_invoice_generated_at timestamptz;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS documents_completed boolean DEFAULT false;

-- Créer index pour recherche rapide des garanties sans documents
CREATE INDEX IF NOT EXISTS idx_warranties_documents_completed
ON warranties(documents_completed)
WHERE documents_completed = false;

-- Créer le bucket pour les documents scannés
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'warranty-documents',
  'warranty-documents',
  false,
  20971520, -- 20MB (pour scans haute résolution)
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Nettoyer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Organization members can upload warranty documents" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can read warranty documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete warranty documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update warranty document metadata" ON storage.objects;

-- Politique : Upload - Admins et franchisees
CREATE POLICY "Organization members can upload warranty documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'warranty-documents'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master', 'franchisee', 'employee')
    )
  )
);

-- Politique : Lecture - Tous les membres authentifiés
CREATE POLICY "Organization members can read warranty documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'warranty-documents'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
);

-- Politique : Suppression - Admins seulement
CREATE POLICY "Admins can delete warranty documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'warranty-documents'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  )
);

-- Politique : Mise à jour - Admins seulement
CREATE POLICY "Admins can update warranty document metadata"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'warranty-documents'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  )
);

-- Fonction pour vérifier si tous les documents sont complets
CREATE OR REPLACE FUNCTION check_warranty_documents_complete(warranty_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT
      signed_contract_scan_url IS NOT NULL
      AND customer_invoice_pdf_url IS NOT NULL
      AND merchant_invoice_pdf_url IS NOT NULL
    FROM warranties
    WHERE id = warranty_id
  );
END;
$$;

-- Trigger pour mettre à jour automatiquement documents_completed
CREATE OR REPLACE FUNCTION update_warranty_documents_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.documents_completed := (
    NEW.signed_contract_scan_url IS NOT NULL
    AND NEW.customer_invoice_pdf_url IS NOT NULL
    AND NEW.merchant_invoice_pdf_url IS NOT NULL
  );
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_warranty_documents_completed ON warranties;
CREATE TRIGGER trigger_update_warranty_documents_completed
  BEFORE INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_warranty_documents_completed();

-- Mettre à jour les garanties existantes
UPDATE warranties
SET documents_completed = (
  signed_contract_scan_url IS NOT NULL
  AND customer_invoice_pdf_url IS NOT NULL
  AND merchant_invoice_pdf_url IS NOT NULL
)
WHERE documents_completed IS NULL OR documents_completed = false;
