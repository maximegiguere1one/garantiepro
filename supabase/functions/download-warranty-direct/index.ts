import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Token de téléchargement requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log('[download-warranty-direct] Request received', { token: token.substring(0, 10) + '...', ipAddress });

    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_secure_download_token', { p_secure_token: token });

    if (validationError) {
      console.error('[download-warranty-direct] Validation error:', validationError);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la validation du token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validation = Array.isArray(validationResult) ? validationResult[0] : validationResult;

    if (!validation || !validation.is_valid) {
      const errorMessage = validation?.error_message || 'Token invalide';
      console.log('[download-warranty-direct] Token validation failed:', errorMessage);
      return new Response(JSON.stringify({ success: false, error: errorMessage }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[download-warranty-direct] Token validated', { warrantyId: validation.warranty_id });

    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .select('id, contract_number, contract_pdf_url')
      .eq('id', validation.warranty_id)
      .single();

    if (warrantyError || !warranty) {
      console.error('[download-warranty-direct] Warranty not found:', warrantyError);
      return new Response(JSON.stringify({ success: false, error: 'Garantie introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!warranty.contract_pdf_url) {
      return new Response(JSON.stringify({ success: false, error: 'Document de garantie non disponible' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contractPath = warranty.contract_pdf_url.split('/').pop();
    if (!contractPath) {
      return new Response(JSON.stringify({ success: false, error: 'Chemin du document invalide' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('warranty-documents')
      .download(contractPath);

    if (downloadError || !fileData) {
      console.error('[download-warranty-direct] Download error:', downloadError);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors du téléchargement du document' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.rpc('record_secure_download', { p_secure_token: token, p_ip_address: ipAddress });

    console.log('[download-warranty-direct] File downloaded successfully', { contractNumber: warranty.contract_number });

    const fileName = `Garantie_${warranty.contract_number}.pdf`;
    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileData.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('[download-warranty-direct] Unexpected error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Une erreur inattendue est survenue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});