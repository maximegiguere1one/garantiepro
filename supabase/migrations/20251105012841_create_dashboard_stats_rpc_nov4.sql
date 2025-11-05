/*
  # Create Dashboard Stats RPC Function
  
  1. Purpose
    - Create RPC function to calculate dashboard statistics
    - Returns aggregated data for a specific organization
    
  2. Returns
    - Total warranties count
    - Active warranties count
    - Total revenue
    - Total margin
    - Open claims count
    - Average sale duration
    - Monthly growth percentage
    
  3. Security
    - Function is SECURITY DEFINER but validates user has access to organization
    - Returns data only for the specified organization
*/

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_warranties int;
  v_active_warranties int;
  v_total_revenue numeric;
  v_total_margin numeric;
  v_open_claims int;
  v_avg_sale_duration numeric;
  v_monthly_growth numeric;
  v_last_month_warranties int;
  v_this_month_warranties int;
BEGIN
  -- Verify user has access to this organization
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (organization_id = p_organization_id OR role IN ('master', 'admin'))
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Total warranties
  SELECT COUNT(*)
  INTO v_total_warranties
  FROM warranties
  WHERE organization_id = p_organization_id;

  -- Active warranties (not expired)
  SELECT COUNT(*)
  INTO v_active_warranties
  FROM warranties
  WHERE organization_id = p_organization_id
  AND status = 'active'
  AND end_date >= CURRENT_DATE;

  -- Total revenue
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_total_revenue
  FROM warranties
  WHERE organization_id = p_organization_id;

  -- Total margin
  SELECT COALESCE(SUM(margin), 0)
  INTO v_total_margin
  FROM warranties
  WHERE organization_id = p_organization_id;

  -- Open claims
  SELECT COUNT(*)
  INTO v_open_claims
  FROM claims c
  JOIN warranties w ON w.id = c.warranty_id
  WHERE w.organization_id = p_organization_id
  AND c.status IN ('submitted', 'in_review', 'approved');

  -- Average sale duration (in seconds)
  SELECT COALESCE(AVG(sale_duration_seconds), 0)
  INTO v_avg_sale_duration
  FROM warranties
  WHERE organization_id = p_organization_id
  AND sale_duration_seconds IS NOT NULL;

  -- Monthly growth calculation
  -- Last month warranties
  SELECT COUNT(*)
  INTO v_last_month_warranties
  FROM warranties
  WHERE organization_id = p_organization_id
  AND created_at >= (CURRENT_DATE - INTERVAL '2 months')
  AND created_at < (CURRENT_DATE - INTERVAL '1 month');

  -- This month warranties
  SELECT COUNT(*)
  INTO v_this_month_warranties
  FROM warranties
  WHERE organization_id = p_organization_id
  AND created_at >= (CURRENT_DATE - INTERVAL '1 month');

  -- Calculate growth percentage
  IF v_last_month_warranties > 0 THEN
    v_monthly_growth := ((v_this_month_warranties - v_last_month_warranties)::numeric / v_last_month_warranties::numeric) * 100;
  ELSE
    v_monthly_growth := 0;
  END IF;

  -- Return JSON object with all stats
  RETURN json_build_object(
    'totalWarranties', v_total_warranties,
    'activeWarranties', v_active_warranties,
    'totalRevenue', v_total_revenue,
    'totalMargin', v_total_margin,
    'openClaims', v_open_claims,
    'avgSaleDuration', v_avg_sale_duration,
    'monthlyGrowth', v_monthly_growth
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_dashboard_stats IS 'Returns dashboard statistics for a specific organization';
