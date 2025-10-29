/*
  # Ajouter toutes les colonnes manquantes à la table warranties

  1. Colonnes PPR (garantie prolongée)
    - `franchise_amount` (numeric): Montant de la franchise
    - `annual_claim_limit` (numeric): Limite annuelle de réclamation
    - `total_claimed_current_year` (numeric): Total réclamé cette année
    - `warranty_year` (integer): Année de garantie actuelle (1-6)
    - `is_promotional_purchase` (boolean): Achat promotionnel
    - `entretien_annuel_completed_years` (jsonb): Années d'entretien complétées
    - `next_entretien_due` (date): Prochaine date d'entretien obligatoire
  
  2. Colonnes Template personnalisé
    - `custom_template_id` (uuid): Référence au template personnalisé utilisé
    - `template_pdf_url` (text): URL du PDF du template
  
  3. Colonnes Signature légale (conformité)
    - `signer_full_name` (text): Nom complet du signataire
    - `signer_email` (text): Email du signataire
    - `signer_phone` (text): Téléphone du signataire
    - `signature_session_id` (text): ID unique de session de signature
    - `consent_given` (boolean): Consentement donné
    - `consent_timestamp` (timestamptz): Moment du consentement
    - `terms_disclosed` (boolean): Conditions divulguées
    - `withdrawal_notice_shown` (boolean): Avis de rétractation montré
    - `interface_language` (text): Langue de l'interface lors signature
    - `user_agent` (text): User agent du navigateur
    - `document_hash` (text): Hash du document signé
    - `document_viewed_at` (timestamptz): Moment où document consulté
    - `document_view_duration` (integer): Durée de consultation (secondes)
    - `geolocation` (jsonb): Géolocalisation lors signature
*/

-- Ajouter colonnes PPR
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'franchise_amount') THEN
    ALTER TABLE warranties ADD COLUMN franchise_amount numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'annual_claim_limit') THEN
    ALTER TABLE warranties ADD COLUMN annual_claim_limit numeric DEFAULT 5000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'total_claimed_current_year') THEN
    ALTER TABLE warranties ADD COLUMN total_claimed_current_year numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'warranty_year') THEN
    ALTER TABLE warranties ADD COLUMN warranty_year integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'is_promotional_purchase') THEN
    ALTER TABLE warranties ADD COLUMN is_promotional_purchase boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'entretien_annuel_completed_years') THEN
    ALTER TABLE warranties ADD COLUMN entretien_annuel_completed_years jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'next_entretien_due') THEN
    ALTER TABLE warranties ADD COLUMN next_entretien_due date;
  END IF;
END $$;

-- Ajouter colonnes Template
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'custom_template_id') THEN
    ALTER TABLE warranties ADD COLUMN custom_template_id uuid REFERENCES warranty_templates(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_warranties_custom_template ON warranties(custom_template_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'template_pdf_url') THEN
    ALTER TABLE warranties ADD COLUMN template_pdf_url text;
  END IF;
END $$;

-- Ajouter colonnes Signature légale
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signer_full_name') THEN
    ALTER TABLE warranties ADD COLUMN signer_full_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signer_email') THEN
    ALTER TABLE warranties ADD COLUMN signer_email text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signer_phone') THEN
    ALTER TABLE warranties ADD COLUMN signer_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signature_session_id') THEN
    ALTER TABLE warranties ADD COLUMN signature_session_id text;
    CREATE INDEX IF NOT EXISTS idx_warranties_signature_session ON warranties(signature_session_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'consent_given') THEN
    ALTER TABLE warranties ADD COLUMN consent_given boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'consent_timestamp') THEN
    ALTER TABLE warranties ADD COLUMN consent_timestamp timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'terms_disclosed') THEN
    ALTER TABLE warranties ADD COLUMN terms_disclosed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'withdrawal_notice_shown') THEN
    ALTER TABLE warranties ADD COLUMN withdrawal_notice_shown boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'interface_language') THEN
    ALTER TABLE warranties ADD COLUMN interface_language text DEFAULT 'fr';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'user_agent') THEN
    ALTER TABLE warranties ADD COLUMN user_agent text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_hash') THEN
    ALTER TABLE warranties ADD COLUMN document_hash text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_viewed_at') THEN
    ALTER TABLE warranties ADD COLUMN document_viewed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_view_duration') THEN
    ALTER TABLE warranties ADD COLUMN document_view_duration integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'geolocation') THEN
    ALTER TABLE warranties ADD COLUMN geolocation jsonb;
  END IF;
END $$;

-- Commentaires explicatifs
COMMENT ON COLUMN warranties.franchise_amount IS 'Montant de la franchise/déductible';
COMMENT ON COLUMN warranties.annual_claim_limit IS 'Limite annuelle de réclamation';
COMMENT ON COLUMN warranties.total_claimed_current_year IS 'Total des réclamations cette année';
COMMENT ON COLUMN warranties.warranty_year IS 'Année de garantie actuelle (1-6 pour 6 ans)';
COMMENT ON COLUMN warranties.is_promotional_purchase IS 'Achat pendant une période promotionnelle';
COMMENT ON COLUMN warranties.entretien_annuel_completed_years IS 'Liste des années où entretien annuel complété';
COMMENT ON COLUMN warranties.next_entretien_due IS 'Prochaine date d''entretien obligatoire';
COMMENT ON COLUMN warranties.custom_template_id IS 'Template personnalisé utilisé pour cette garantie';
COMMENT ON COLUMN warranties.template_pdf_url IS 'URL du PDF du template personnalisé';
COMMENT ON COLUMN warranties.signer_full_name IS 'Nom complet du signataire';
COMMENT ON COLUMN warranties.signer_email IS 'Email du signataire pour conformité';
COMMENT ON COLUMN warranties.signer_phone IS 'Téléphone du signataire';
COMMENT ON COLUMN warranties.signature_session_id IS 'ID unique de session de signature pour audit';
COMMENT ON COLUMN warranties.consent_given IS 'Consentement explicite donné';
COMMENT ON COLUMN warranties.consent_timestamp IS 'Moment exact du consentement';
COMMENT ON COLUMN warranties.terms_disclosed IS 'Conditions générales divulguées au client';
COMMENT ON COLUMN warranties.withdrawal_notice_shown IS 'Avis de droit de rétractation montré';
COMMENT ON COLUMN warranties.interface_language IS 'Langue de l''interface lors de la signature';
COMMENT ON COLUMN warranties.user_agent IS 'User agent du navigateur (audit technique)';
COMMENT ON COLUMN warranties.document_hash IS 'Hash SHA-256 du document signé';
COMMENT ON COLUMN warranties.document_viewed_at IS 'Timestamp de consultation du document';
COMMENT ON COLUMN warranties.document_view_duration IS 'Durée de consultation en secondes';
COMMENT ON COLUMN warranties.geolocation IS 'Coordonnées GPS lors de la signature (si disponible)';