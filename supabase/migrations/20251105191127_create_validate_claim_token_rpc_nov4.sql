/*
  # Create RPC Function to Validate Claim Token
  
  1. Purpose
    - Validate a claim token and return all related data in one call
    - Bypasses RLS context issues with nested queries
    
  2. Returns
    - Token validity
    - Warranty data
    - Customer data
    - Trailer data
    - Warranty plan data
    
  3. Security
    - Function is SECURITY DEFINER but validates token first
    - Only returns data if token is valid, not used, and not expired
*/

CREATE OR REPLACE FUNCTION validate_claim_token_rpc(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record warranty_claim_tokens%ROWTYPE;
  v_warranty warranties%ROWTYPE;
  v_customer customers%ROWTYPE;
  v_trailer trailers%ROWTYPE;
  v_plan warranty_plans%ROWTYPE;
BEGIN
  -- Get token record
  SELECT * INTO v_token_record
  FROM warranty_claim_tokens
  WHERE token = p_token;

  -- Check if token exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Token invalide'
    );
  END IF;

  -- Check if token is already used
  IF v_token_record.is_used THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Ce lien a déjà été utilisé pour soumettre une réclamation'
    );
  END IF;

  -- Check if token is expired
  IF v_token_record.expires_at < now() THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Ce lien a expiré'
    );
  END IF;

  -- Get warranty
  SELECT * INTO v_warranty
  FROM warranties
  WHERE id = v_token_record.warranty_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Garantie introuvable'
    );
  END IF;

  -- Get customer
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_warranty.customer_id;

  -- Get trailer
  SELECT * INTO v_trailer
  FROM trailers
  WHERE id = v_warranty.trailer_id;

  -- Get warranty plan
  SELECT * INTO v_plan
  FROM warranty_plans
  WHERE id = v_warranty.plan_id;

  -- Update access count
  UPDATE warranty_claim_tokens
  SET 
    access_count = access_count + 1,
    last_accessed_at = now()
  WHERE id = v_token_record.id;

  -- Return all data
  RETURN json_build_object(
    'valid', true,
    'token', row_to_json(v_token_record),
    'warranty', json_build_object(
      'id', v_warranty.id,
      'contract_number', v_warranty.contract_number,
      'status', v_warranty.status,
      'start_date', v_warranty.start_date,
      'end_date', v_warranty.end_date,
      'total_price', v_warranty.total_price,
      'customer_id', v_warranty.customer_id,
      'trailer_id', v_warranty.trailer_id,
      'plan_id', v_warranty.plan_id,
      'customers', row_to_json(v_customer),
      'trailers', row_to_json(v_trailer),
      'warranty_plans', row_to_json(v_plan)
    )
  );
END;
$$;

-- Grant execute to anon (public access via token)
GRANT EXECUTE ON FUNCTION validate_claim_token_rpc(text) TO anon;
GRANT EXECUTE ON FUNCTION validate_claim_token_rpc(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION validate_claim_token_rpc IS 'Validates a claim token and returns all related warranty data';
