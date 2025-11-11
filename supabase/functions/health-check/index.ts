import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-environment",
};

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'pass' | 'fail';
      responseTime?: number;
      error?: string;
    };
    auth: {
      status: 'pass' | 'fail';
      error?: string;
    };
    storage: {
      status: 'pass' | 'fail';
      error?: string;
    };
    environment: {
      status: 'pass' | 'fail';
      missing?: string[];
    };
  };
  uptime: number;
}

const startTime = Date.now();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      database: { status: 'pass' },
      auth: { status: 'pass' },
      storage: { status: 'pass' },
      environment: { status: 'pass' },
    },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  let overallHealthy = true;

  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingEnvVars = requiredEnvVars.filter(v => !Deno.env.get(v));

  if (missingEnvVars.length > 0) {
    result.checks.environment.status = 'fail';
    result.checks.environment.missing = missingEnvVars;
    overallHealthy = false;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const dbStart = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const dbResponseTime = Date.now() - dbStart;

    if (error) {
      result.checks.database.status = 'fail';
      result.checks.database.error = error.message;
      overallHealthy = false;
    } else {
      result.checks.database.responseTime = dbResponseTime;

      if (dbResponseTime > 2000) {
        result.status = 'degraded';
      }
    }
  } catch (error) {
    result.checks.database.status = 'fail';
    result.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    overallHealthy = false;
  }

  if (!overallHealthy) {
    result.status = 'unhealthy';
  }

  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

  return new Response(
    JSON.stringify(result, null, 2),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});