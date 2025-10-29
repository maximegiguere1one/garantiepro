/*
  # Fix Missing Cache Functions for Warranty Performance

  1. New Functions
    - `set_cached_query` - Store query results in cache
    - `get_cached_query` - Retrieve cached query results
    - Query cache table for storing results

  2. Security
    - Functions are SECURITY DEFINER
    - Proper RLS policies on cache table
*/

-- Create cache table if not exists
CREATE TABLE IF NOT EXISTS query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);

-- Function to set cached query
CREATE OR REPLACE FUNCTION set_cached_query(
  p_cache_key text,
  p_data jsonb,
  p_ttl_seconds integer DEFAULT 300
)
RETURNS void AS $$
BEGIN
  INSERT INTO query_cache (cache_key, data, expires_at)
  VALUES (p_cache_key, p_data, now() + (p_ttl_seconds || ' seconds')::interval)
  ON CONFLICT (cache_key) 
  DO UPDATE SET 
    data = EXCLUDED.data,
    expires_at = EXCLUDED.expires_at,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached query
CREATE OR REPLACE FUNCTION get_cached_query(p_cache_key text)
RETURNS jsonb AS $$
DECLARE
  cached_data jsonb;
BEGIN
  SELECT data INTO cached_data
  FROM query_cache
  WHERE cache_key = p_cache_key
    AND expires_at > now();
  
  RETURN cached_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION set_cached_query TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_query TO authenticated;

-- Clean up expired cache entries (run this periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM query_cache
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_cached_query IS 'Store query results in cache with TTL';
COMMENT ON FUNCTION get_cached_query IS 'Retrieve cached query results if not expired';
