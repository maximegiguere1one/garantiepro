import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-environment',
};

interface WarrantyDocuments {
  contractUrl: string | null;
  customerInvoiceUrl: string | null;
  warrantyDetails: {
    contractNumber: string;
    customerName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const documentType = url.searchParams.get('type') || 'all'; // 'contract', 'customer_invoice', 'all'

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token de téléchargement requis',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get client info for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log('[download-warranty-documents] Request received', {
      token,
      documentType,
      ipAddress,
      userAgent: userAgent.substring(0, 100),
    });

    // Validate token
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_warranty_download_token', { p_token: token });

    if (validationError) {
      console.error('[download-warranty-documents] Validation error:', validationError);

      // Log failed attempt
      await supabase.rpc('log_warranty_download', {
        p_token: token,
        p_document_type: documentType,
        p_access_result: 'failed',
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_failure_reason: `Validation error: ${validationError.message}`,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreur lors de la validation du token',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validation = Array.isArray(validationResult) ? validationResult[0] : validationResult;

    if (!validation || !validation.is_valid) {
      const errorMessage = validation?.error_message || 'Token invalide';

      console.log('[download-warranty-documents] Token validation failed:', errorMessage);

      // Log failed attempt
      await supabase.rpc('log_warranty_download', {
        p_token: token,
        p_document_type: documentType,
        p_access_result: 'denied',
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_failure_reason: errorMessage,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          expired: errorMessage.includes('expiré'),
          revoked: errorMessage.includes('révoqué'),
          limitReached: errorMessage.includes('limite'),
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[download-warranty-documents] Token validated successfully', {
      warrantyId: validation.warranty_id,
      downloadsRemaining: validation.downloads_remaining,
    });

    // Get warranty documents and details
    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .select(`
        id,
        contract_number,
        contract_pdf_url,
        customer_invoice_pdf_url,
        start_date,
        end_date,
        total_price,
        customers!inner(first_name, last_name)
      `)
      .eq('id', validation.warranty_id)
      .single();

    if (warrantyError || !warranty) {
      console.error('[download-warranty-documents] Warranty not found:', warrantyError);

      await supabase.rpc('log_warranty_download', {
        p_token: token,
        p_document_type: documentType,
        p_access_result: 'failed',
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_failure_reason: 'Warranty not found in database',
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Garantie introuvable',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate signed URLs for documents
    const documents: WarrantyDocuments = {
      contractUrl: null,
      customerInvoiceUrl: null,
      warrantyDetails: {
        contractNumber: warranty.contract_number,
        customerName: `${warranty.customers.first_name} ${warranty.customers.last_name}`,
        startDate: warranty.start_date,
        endDate: warranty.end_date,
        totalPrice: warranty.total_price,
      },
    };

    // Generate signed URL for contract if requested
    if ((documentType === 'all' || documentType === 'contract') && warranty.contract_pdf_url) {
      const contractPath = warranty.contract_pdf_url.split('/').pop();
      if (contractPath) {
        const { data: contractSignedUrl } = await supabase.storage
          .from('warranty-documents')
          .createSignedUrl(contractPath, 3600); // 1 hour expiry

        if (contractSignedUrl) {
          documents.contractUrl = contractSignedUrl.signedUrl;
        }
      }
    }

    // Generate signed URL for customer invoice if requested
    if ((documentType === 'all' || documentType === 'customer_invoice') && warranty.customer_invoice_pdf_url) {
      const invoicePath = warranty.customer_invoice_pdf_url.split('/').pop();
      if (invoicePath) {
        const { data: invoiceSignedUrl } = await supabase.storage
          .from('warranty-documents')
          .createSignedUrl(invoicePath, 3600); // 1 hour expiry

        if (invoiceSignedUrl) {
          documents.customerInvoiceUrl = invoiceSignedUrl.signedUrl;
        }
      }
    }

    // Log successful access
    await supabase.rpc('log_warranty_download', {
      p_token: token,
      p_document_type: documentType,
      p_access_result: 'success',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_failure_reason: null,
    });

    console.log('[download-warranty-documents] Documents generated successfully', {
      hasContract: !!documents.contractUrl,
      hasInvoice: !!documents.customerInvoiceUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        documents,
        downloadsRemaining: validation.downloads_remaining,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[download-warranty-documents] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Une erreur inattendue est survenue',
        details: error?.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
