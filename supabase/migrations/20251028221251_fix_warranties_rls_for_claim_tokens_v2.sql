/*
  # Fix: Permettre l'accès anonyme aux garanties via tokens de réclamation
  
  ## Problème Identifié
  - Les utilisateurs anonymes ne peuvent pas lire les garanties
  - Erreur: "Garantie introuvable" lors de la validation d'un token
  - Les tokens de réclamation sont valides mais inutilisables
  
  ## Solution
  - Ajouter une RLS policy pour permettre aux utilisateurs anonymes
  - de lire les garanties et tables associées avec un token valide
  
  ## Sécurité
  - L'accès est limité aux garanties avec un token valide
  - Le token doit être non utilisé et non expiré
  - Seules les données nécessaires sont accessibles
*/

-- Permettre aux utilisateurs anonymes de lire les garanties avec un token valide
CREATE POLICY "Public can view warranties with valid claim token"
  ON warranties
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM warranty_claim_tokens
      WHERE warranty_claim_tokens.warranty_id = warranties.id
        AND warranty_claim_tokens.is_used = false
        AND warranty_claim_tokens.expires_at > now()
    )
  );

-- Permettre l'accès aux clients liés aux garanties avec token valide
CREATE POLICY "Public can view customers with valid warranty claim token"
  ON customers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM warranties w
      JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
      WHERE w.customer_id = customers.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Permettre l'accès aux remorques liées aux garanties avec token valide
CREATE POLICY "Public can view trailers with valid warranty claim token"
  ON trailers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM warranties w
      JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
      WHERE w.trailer_id = trailers.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Permettre l'accès aux plans de garantie liés avec token valide
CREATE POLICY "Public can view warranty plans with valid claim token"
  ON warranty_plans
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM warranties w
      JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
      WHERE w.plan_id = warranty_plans.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );
