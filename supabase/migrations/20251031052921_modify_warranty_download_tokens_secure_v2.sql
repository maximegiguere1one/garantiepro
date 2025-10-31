/*
  # Modifier Warranty Download Tokens - Version 2
  
  1. Ajout
     - Colonne `secure_token` pour tokens longs
     - Colonnes de tracking (last_download_ip, last_downloaded_at)
  
  2. Fonctions
     - Génération automatique avec organization_id
     - Validation de token
     - Enregistrement des téléchargements
*/

-- Ajouter les colonnes manquantes
ALTER TABLE warranty_download_tokens
ADD COLUMN IF NOT EXISTS secure_token text UNIQUE,
ADD COLUMN IF NOT EXISTS last_download_ip text,
ADD COLUMN IF NOT EXISTS last_downloaded_at timestamptz;

-- Fonction pour générer un token sécurisé de 64 caractères
CREATE OR REPLACE FUNCTION generate_secure_download_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Fonction pour créer un token sécurisé pour une garantie
CREATE OR REPLACE FUNCTION create_secure_download_token_for_warranty(p_warranty_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secure_token text;
  v_existing_id uuid;
  v_org_id uuid;
  v_customer_name text;
  v_customer_email text;
BEGIN
  -- Récupérer l'organization_id et les infos client de la garantie
  SELECT 
    w.organization_id,
    CONCAT(c.first_name, ' ', c.last_name),
    c.email
  INTO v_org_id, v_customer_name, v_customer_email
  FROM warranties w
  JOIN customers c ON c.id = w.customer_id
  WHERE w.id = p_warranty_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Warranty not found: %', p_warranty_id;
  END IF;
  
  -- Vérifier si un token existe déjà
  SELECT id INTO v_existing_id
  FROM warranty_download_tokens
  WHERE warranty_id = p_warranty_id
  LIMIT 1;
  
  -- Générer un token unique
  LOOP
    v_secure_token := generate_secure_download_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM warranty_download_tokens WHERE secure_token = v_secure_token);
  END LOOP;
  
  IF v_existing_id IS NOT NULL THEN
    -- Mettre à jour le token existant
    UPDATE warranty_download_tokens
    SET 
      secure_token = v_secure_token,
      customer_name = v_customer_name,
      customer_email = v_customer_email,
      updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    -- Créer un nouveau token
    INSERT INTO warranty_download_tokens (
      warranty_id,
      organization_id,
      token,
      secure_token,
      customer_name,
      customer_email,
      is_active,
      expires_at
    ) VALUES (
      p_warranty_id,
      v_org_id,
      gen_random_uuid(),
      v_secure_token,
      v_customer_name,
      v_customer_email,
      true,
      now() + interval '90 days'
    );
  END IF;
  
  RETURN v_secure_token;
END;
$$;

-- Trigger pour créer automatiquement un token sécurisé
CREATE OR REPLACE FUNCTION trigger_create_secure_download_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_secure_download_token_for_warranty(NEW.id);
  RETURN NEW;
END;
$$;

-- Attacher le trigger
DROP TRIGGER IF EXISTS trg_create_secure_download_token ON warranties;
CREATE TRIGGER trg_create_secure_download_token
AFTER INSERT ON warranties
FOR EACH ROW
EXECUTE FUNCTION trigger_create_secure_download_token();

-- Fonction de validation de token
CREATE OR REPLACE FUNCTION validate_secure_download_token(p_secure_token text)
RETURNS TABLE (
  warranty_id uuid,
  is_valid boolean,
  error_message text,
  customer_name text,
  customer_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token warranty_download_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token
  FROM warranty_download_tokens
  WHERE secure_token = p_secure_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Token invalide'::text, NULL::text, NULL::text;
    RETURN;
  END IF;
  
  IF NOT v_token.is_active THEN
    RETURN QUERY SELECT v_token.warranty_id, false, 'Token révoqué'::text, v_token.customer_name, v_token.customer_email;
    RETURN;
  END IF;
  
  IF v_token.expires_at < now() THEN
    RETURN QUERY SELECT v_token.warranty_id, false, 'Token expiré'::text, v_token.customer_name, v_token.customer_email;
    RETURN;
  END IF;
  
  IF v_token.max_downloads IS NOT NULL AND v_token.downloads_count >= v_token.max_downloads THEN
    RETURN QUERY SELECT v_token.warranty_id, false, 'Limite atteinte'::text, v_token.customer_name, v_token.customer_email;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT v_token.warranty_id, true, NULL::text, v_token.customer_name, v_token.customer_email;
END;
$$;

-- Fonction pour enregistrer un téléchargement
CREATE OR REPLACE FUNCTION record_secure_download(p_secure_token text, p_ip_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE warranty_download_tokens
  SET 
    downloads_count = downloads_count + 1,
    last_downloaded_at = now(),
    last_download_ip = p_ip_address,
    last_accessed_at = now(),
    updated_at = now()
  WHERE secure_token = p_secure_token;
  
  RETURN FOUND;
END;
$$;

-- Créer des tokens pour garanties existantes sans token sécurisé
DO $$
DECLARE
  warranty_rec RECORD;
BEGIN
  FOR warranty_rec IN 
    SELECT DISTINCT w.id 
    FROM warranties w
    LEFT JOIN warranty_download_tokens wdt ON wdt.warranty_id = w.id AND wdt.secure_token IS NOT NULL
    WHERE wdt.id IS NULL
  LOOP
    BEGIN
      PERFORM create_secure_download_token_for_warranty(warranty_rec.id);
    EXCEPTION WHEN OTHERS THEN
      -- Skip si erreur (garantie sans client, etc.)
      CONTINUE;
    END;
  END LOOP;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_wdt_secure_token 
ON warranty_download_tokens(secure_token) 
WHERE secure_token IS NOT NULL;

-- RLS pour Edge Function
CREATE POLICY "Service role full access" 
ON warranty_download_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
