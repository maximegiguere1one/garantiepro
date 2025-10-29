/*
  # Ajout des colonnes pour conformité légale des signatures
  
  Conforme à:
  - LCCJTI (Québec) - Articles 39-48
  - LPRPDE (Canada)
  - Loi sur la protection du consommateur (Québec)
  - Code civil du Québec - Articles 2827, 2860
*/

-- Ajouter colonnes d'identification du signataire
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
END $$;

-- Ajouter colonnes de consentement
DO $$
BEGIN
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
END $$;

-- Ajouter colonnes d'intégrité
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_hash') THEN
    ALTER TABLE warranties ADD COLUMN document_hash text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_version') THEN
    ALTER TABLE warranties ADD COLUMN document_version text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signed_document_url') THEN
    ALTER TABLE warranties ADD COLUMN signed_document_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'certificate_url') THEN
    ALTER TABLE warranties ADD COLUMN certificate_url text;
  END IF;
END $$;

-- Ajouter colonnes d'audit trail
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'user_agent') THEN
    ALTER TABLE warranties ADD COLUMN user_agent text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'geolocation') THEN
    ALTER TABLE warranties ADD COLUMN geolocation jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'interface_language') THEN
    ALTER TABLE warranties ADD COLUMN interface_language text DEFAULT 'fr';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_viewed_at') THEN
    ALTER TABLE warranties ADD COLUMN document_viewed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'document_view_duration') THEN
    ALTER TABLE warranties ADD COLUMN document_view_duration integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signature_session_id') THEN
    ALTER TABLE warranties ADD COLUMN signature_session_id text;
  END IF;
END $$;

COMMENT ON COLUMN warranties.signer_full_name IS 'Nom complet du signataire (LCCJTI Art. 40)';
COMMENT ON COLUMN warranties.document_hash IS 'Hash SHA-256 du document pour intégrité (LCCJTI Art. 41)';
COMMENT ON COLUMN warranties.consent_given IS 'Consentement explicite donné (LPRPDE)';
COMMENT ON COLUMN warranties.withdrawal_notice_shown IS 'Avis de droit de rétractation affiché (LPC)';
