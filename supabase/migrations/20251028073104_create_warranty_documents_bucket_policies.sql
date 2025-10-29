/*
  # Créer les policies pour le bucket warranty-documents

  1. Buckets
    - Bucket `warranty-documents` pour stocker les documents de garantie
  
  2. Security (Storage RLS Policies)
    - INSERT: Les utilisateurs authentifiés peuvent uploader dans leur dossier organisation
    - SELECT: Les utilisateurs peuvent lire les documents de leur organisation
    - UPDATE: Les utilisateurs peuvent mettre à jour les documents de leur organisation
    - DELETE: Les admins peuvent supprimer les documents de leur organisation

  Note: Le bucket a déjà été créé, cette migration ajoute uniquement les policies RLS.
*/

-- Policy pour permettre l'upload (INSERT) des fichiers dans warranty-documents
CREATE POLICY "Users can upload warranty documents to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'warranty-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy pour permettre la lecture (SELECT) des fichiers
CREATE POLICY "Users can read warranty documents from their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'warranty-documents' 
  AND (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'super_admin')
    )
  )
);

-- Policy pour permettre la mise à jour (UPDATE) des fichiers
CREATE POLICY "Users can update warranty documents in their organization"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'warranty-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy pour permettre la suppression (DELETE) des fichiers
CREATE POLICY "Admins can delete warranty documents in their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'warranty-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('master', 'super_admin', 'franchisee_admin', 'admin')
  )
);
