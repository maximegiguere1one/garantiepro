/*
  # Créer le bucket Storage pour les contrats PDF

  1. Nouveau bucket
    - `warranty-contracts` : Stocke les PDFs de contrat
    - Public : false (accès contrôlé)
    - File size limit : 10MB

  2. Sécurité RLS
    - Upload : Admins/Franchisees de l'organisation
    - Read : Tous les membres de l'organisation
    - Delete : Admins seulement
*/

-- Créer le bucket pour les contrats PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'warranty-contracts',
  'warranty-contracts',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Nettoyer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Organization members can upload contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can read contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update contract PDF metadata" ON storage.objects;

-- Politique : Les admins et franchisees peuvent uploader des PDFs
CREATE POLICY "Organization members can upload contract PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'warranty-contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master', 'franchisee')
    )
  )
);

-- Politique : Tous les membres authentifiés de l'organisation peuvent lire les PDFs
CREATE POLICY "Organization members can read contract PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'warranty-contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
);

-- Politique : Seuls les admins peuvent supprimer
CREATE POLICY "Only admins can delete contract PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'warranty-contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  )
);

-- Politique : Les admins peuvent mettre à jour les métadonnées
CREATE POLICY "Admins can update contract PDF metadata"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'warranty-contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'master')
    )
  )
);
