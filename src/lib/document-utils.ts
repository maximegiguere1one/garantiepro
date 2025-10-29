import { supabase } from './supabase';
import { generateInvoicePDF, generateContractPDF, generateMerchantInvoicePDF, getPDFBlob } from './pdf-wrapper';
import { generateQRCodeDataUrl, getFullClaimUrl } from './qr-code-utils';
import { logError, initDocumentGenerationStatus, updateDocumentStatus } from './error-tracking';
import { validateWarrantyNumericFields, normalizeWarrantyNumbers } from './numeric-utils';
import { loadPDFLibraries, verifyAutoTableAvailable } from './pdf-lazy-loader';
import { getEmployeeSignatureForPDF } from './signature-generator-utils';
import type { Database } from './database.types';

type InvoiceData = {
  warranty: Database['public']['Tables']['warranties']['Row'];
  customer: Database['public']['Tables']['customers']['Row'];
  trailer: Database['public']['Tables']['trailers']['Row'];
  plan: Database['public']['Tables']['warranty_plans']['Row'];
  companyInfo: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    businessNumber: string | null;
    vendorSignatureUrl: string | null;
  };
  employeeSignature?: {
    full_name: string;
    signature_data: string;
  } | null;
};

export async function generateAndStoreDocuments(
  warrantyId: string,
  data: { warranty: any; customer: any; trailer: any; plan: any },
  signatureDataUrl?: string,
  customTemplate?: any
) {
  console.log('[generateAndStoreDocuments] =====================================');
  console.log('[generateAndStoreDocuments] Starting document generation');
  console.log('[generateAndStoreDocuments] Warranty ID:', warrantyId);
  console.log('[generateAndStoreDocuments] =====================================');
  console.log('[generateAndStoreDocuments] Input data validation:', {
    hasWarranty: !!data.warranty,
    hasCustomer: !!data.customer,
    hasTrailer: !!data.trailer,
    hasPlan: !!data.plan,
    hasSignature: !!signatureDataUrl,
    hasTemplate: !!customTemplate
  });

  // STEP 0: Pre-load and verify PDF libraries BEFORE any other operations
  console.log('[generateAndStoreDocuments] STEP 0: Pre-loading PDF libraries...');
  try {
    await loadPDFLibraries();
    console.log('[generateAndStoreDocuments] PDF libraries loaded successfully');

    verifyAutoTableAvailable();
    console.log('[generateAndStoreDocuments] autoTable plugin verified and ready');
    console.log('[generateAndStoreDocuments] ✓ PDF system ready for document generation');
  } catch (pdfLoadError: any) {
    console.error('[generateAndStoreDocuments] CRITICAL: Failed to load PDF libraries:', pdfLoadError);
    throw new Error(`Cannot proceed with document generation: ${pdfLoadError?.message || 'PDF libraries failed to load'}`);
  }

  // Validate and normalize warranty numeric fields
  console.log('[generateAndStoreDocuments] Validating warranty numeric fields');
  const numericValidation = validateWarrantyNumericFields({
    base_price: data.warranty.base_price,
    options_price: data.warranty.options_price,
    taxes: data.warranty.taxes,
    total_price: data.warranty.total_price,
    margin: data.warranty.margin,
    deductible: data.warranty.deductible
  });

  if (!numericValidation.isValid) {
    console.error('[generateAndStoreDocuments] Numeric validation failed:', numericValidation.errors);
    throw new Error(`Invalid warranty numeric fields: ${numericValidation.errors.join(', ')}`);
  }

  if (numericValidation.warnings.length > 0) {
    console.warn('[generateAndStoreDocuments] Numeric validation warnings:', numericValidation.warnings);
  }

  // Normalize warranty data to ensure safe numeric values
  const normalizedWarrantyData = {
    ...data.warranty,
    ...normalizeWarrantyNumbers(data.warranty)
  };

  console.log('[generateAndStoreDocuments] Warranty numeric fields normalized:', {
    base_price: normalizedWarrantyData.base_price,
    options_price: normalizedWarrantyData.options_price,
    taxes: normalizedWarrantyData.taxes,
    total_price: normalizedWarrantyData.total_price,
    margin: normalizedWarrantyData.margin,
    deductible: normalizedWarrantyData.deductible
  });

  // Replace warranty data with normalized version
  data.warranty = normalizedWarrantyData;

  // Initialiser le statut de génération
  await initDocumentGenerationStatus(warrantyId, data.warranty.organization_id);

  try {
    if (!warrantyId) {
      throw new Error('Warranty ID is required');
    }

    if (!data.warranty.organization_id) {
      throw new Error('Organization ID is required for warranty');
    }

    if (!data.customer || !data.trailer || !data.plan) {
      throw new Error('Customer, trailer, and plan data are required');
    }

    // Validate critical customer fields
    if (!data.customer.first_name || !data.customer.last_name) {
      throw new Error('Customer first name and last name are required');
    }

    if (!data.customer.email) {
      throw new Error('Customer email is required');
    }

    // Validate critical trailer fields
    if (!data.trailer.vin) {
      throw new Error('Trailer VIN is required');
    }

    if (!data.trailer.year || !data.trailer.make || !data.trailer.model) {
      throw new Error('Trailer year, make, and model are required');
    }

    // Validate plan
    if (!data.plan.name && !data.plan.name_fr) {
      throw new Error('Plan name is required');
    }

    console.log('[generateAndStoreDocuments] Step 1/6: Fetching company settings');

    const { data: companyData, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .eq('organization_id', data.warranty.organization_id)
      .maybeSingle();

    if (companyError) {
      console.error('[generateAndStoreDocuments] Error fetching company settings:', companyError);
    }

    const companyInfo = {
      name: companyData?.company_name || '',
      address: companyData?.contact_address || null,
      phone: companyData?.contact_phone || null,
      email: companyData?.contact_email || '',
      businessNumber: companyData?.business_number || null,
      vendorSignatureUrl: companyData?.vendor_signature_url || null,
    };

    console.log('[generateAndStoreDocuments] Step 1/6: Company settings loaded');

    console.log('[generateAndStoreDocuments] Step 1.5/6: Fetching employee signature');
    let employeeSignature = null;
    if (data.warranty.created_by) {
      try {
        employeeSignature = await getEmployeeSignatureForPDF(data.warranty.created_by);
        if (employeeSignature) {
          console.log('[generateAndStoreDocuments] Employee signature loaded:', employeeSignature.full_name);
        } else {
          console.log('[generateAndStoreDocuments] No active employee signature found');
        }
      } catch (sigError) {
        console.warn('[generateAndStoreDocuments] Error loading employee signature:', sigError);
      }
    }

    console.log('[generateAndStoreDocuments] Step 2/6: Generating invoices');

    const invoiceData: InvoiceData = {
      warranty: data.warranty,
      customer: data.customer,
      trailer: data.trailer,
      plan: data.plan,
      companyInfo,
      employeeSignature,
    };

    let customerInvoicePDF;
    let merchantInvoicePDF;

    try {
      console.log('[generateAndStoreDocuments] Generating customer invoice...');
      await updateDocumentStatus(warrantyId, 'customer_invoice', 'generating');
      customerInvoicePDF = await generateInvoicePDF(invoiceData);
      await updateDocumentStatus(warrantyId, 'customer_invoice', 'completed');
      console.log('[generateAndStoreDocuments] Step 2/6: Customer invoice generated successfully');
    } catch (invoiceError: any) {
      console.error('[generateAndStoreDocuments] Error generating customer invoice:', invoiceError);
      console.error('[generateAndStoreDocuments] Invoice error details:', {
        message: invoiceError?.message,
        stack: invoiceError?.stack,
        name: invoiceError?.name,
        warranty_numeric_fields: {
          base_price: data.warranty.base_price,
          options_price: data.warranty.options_price,
          taxes: data.warranty.taxes,
          total_price: data.warranty.total_price
        }
      });

      const errorMsg = `Failed to generate customer invoice: ${invoiceError?.message || 'Unknown error'}`;
      await updateDocumentStatus(warrantyId, 'customer_invoice', 'failed', errorMsg);
      await logError({
        errorType: 'pdf_generation',
        errorMessage: errorMsg,
        severity: 'error',
        stackTrace: invoiceError?.stack,
        context: {
          warrantyId,
          documentType: 'customer_invoice',
          organizationId: data.warranty.organization_id
        },
        relatedEntityType: 'warranty',
        relatedEntityId: warrantyId
      });

      throw new Error(errorMsg);
    }

    try {
      console.log('[generateAndStoreDocuments] Generating merchant invoice...');
      await updateDocumentStatus(warrantyId, 'merchant_invoice', 'generating');
      merchantInvoicePDF = await generateMerchantInvoicePDF(invoiceData);
      await updateDocumentStatus(warrantyId, 'merchant_invoice', 'completed');
      console.log('[generateAndStoreDocuments] Step 2/6: Merchant invoice generated successfully');
    } catch (invoiceError: any) {
      console.error('[generateAndStoreDocuments] Error generating merchant invoice:', invoiceError);
      console.error('[generateAndStoreDocuments] Merchant invoice error details:', {
        message: invoiceError?.message,
        stack: invoiceError?.stack,
        name: invoiceError?.name
      });

      const errorMsg = `Failed to generate merchant invoice: ${invoiceError?.message || 'Unknown error'}`;
      await updateDocumentStatus(warrantyId, 'merchant_invoice', 'failed', errorMsg);
      await logError({
        errorType: 'pdf_generation',
        errorMessage: errorMsg,
        severity: 'error',
        stackTrace: invoiceError?.stack,
        context: {
          warrantyId,
          documentType: 'merchant_invoice',
          organizationId: data.warranty.organization_id
        },
        relatedEntityType: 'warranty',
        relatedEntityId: warrantyId
      });

      throw new Error(errorMsg);
    }

    console.log('[generateAndStoreDocuments] Step 3/6: Fetching claim token for QR code');

    const { data: tokenData, error: tokenError } = await supabase
      .from('warranty_claim_tokens')
      .select('token')
      .eq('warranty_id', warrantyId)
      .maybeSingle();

    if (tokenError) {
      console.error('[generateAndStoreDocuments] Error fetching claim token:', tokenError);
    }

    let claimSubmissionUrl: string | undefined;
    let qrCodeDataUrl: string | undefined;

    if (tokenData?.token) {
      claimSubmissionUrl = getFullClaimUrl(tokenData.token);
      try {
        qrCodeDataUrl = await generateQRCodeDataUrl(claimSubmissionUrl);
        console.log('[generateAndStoreDocuments] Step 3/6: QR code generated successfully');
      } catch (qrError) {
        console.error('[generateAndStoreDocuments] Error generating QR code:', qrError);
      }
    } else {
      console.warn('[generateAndStoreDocuments] No claim token found - QR code will not be generated');
    }

    console.log('[generateAndStoreDocuments] Step 4/6: Generating contract PDF');

    let contractBase64: string;

    try {
      await updateDocumentStatus(warrantyId, 'contract', 'generating');

      if (customTemplate?.template_type === 'uploaded_pdf' && customTemplate.pdf_content_base64) {
        console.log('[generateAndStoreDocuments] Using uploaded PDF template');

        try {
          const testDecode = atob(customTemplate.pdf_content_base64.split(',')[1] || customTemplate.pdf_content_base64);
          if (testDecode.length === 0) {
            throw new Error('Template PDF base64 is empty after decode');
          }
          contractBase64 = customTemplate.pdf_content_base64;
          console.log('[generateAndStoreDocuments] Uploaded PDF template validated successfully');
        } catch (templateError) {
          console.error('[generateAndStoreDocuments] Invalid uploaded PDF template:', templateError);
          console.warn('[generateAndStoreDocuments] Falling back to standard template due to invalid custom template');

          const contractPDF = await generateContractPDF(
            invoiceData,
            signatureDataUrl,
            undefined,
            claimSubmissionUrl,
            qrCodeDataUrl
          );
          const contractBlob = getPDFBlob(contractPDF);
          contractBase64 = await blobToBase64(contractBlob);
        }
      } else if (customTemplate?.template_type === 'custom_built' && customTemplate.template_sections) {
        console.log('[generateAndStoreDocuments] Using custom-built template');
        console.log('[generateAndStoreDocuments] Template sections:', customTemplate.template_sections?.length || 0);

        try {
          const contractPDF = await generateContractPDF(
            invoiceData,
            signatureDataUrl,
            customTemplate.template_sections,
            claimSubmissionUrl,
            qrCodeDataUrl
          );
          const contractBlob = getPDFBlob(contractPDF);
          contractBase64 = await blobToBase64(contractBlob);
          console.log('[generateAndStoreDocuments] Custom-built template generated successfully');
        } catch (customError) {
          console.error('[generateAndStoreDocuments] Error with custom-built template:', customError);
          console.warn('[generateAndStoreDocuments] Falling back to standard template');

          const contractPDF = await generateContractPDF(
            invoiceData,
            signatureDataUrl,
            undefined,
            claimSubmissionUrl,
            qrCodeDataUrl
          );
          const contractBlob = getPDFBlob(contractPDF);
          contractBase64 = await blobToBase64(contractBlob);
        }
      } else {
        console.log('[generateAndStoreDocuments] Using standard template');
        const contractPDF = await generateContractPDF(
          invoiceData,
          signatureDataUrl,
          undefined,
          claimSubmissionUrl,
          qrCodeDataUrl
        );
        const contractBlob = getPDFBlob(contractPDF);
        contractBase64 = await blobToBase64(contractBlob);
      }

      if (!contractBase64 || contractBase64.length === 0) {
        throw new Error('Generated contract PDF is empty');
      }

      await updateDocumentStatus(warrantyId, 'contract', 'completed');
      console.log('[generateAndStoreDocuments] Step 4/6: Contract PDF generated successfully');
      console.log('[generateAndStoreDocuments] Contract base64 length:', contractBase64?.length || 0);
      console.log('[generateAndStoreDocuments] Has signature in data:', !!signatureDataUrl);
      console.log('[generateAndStoreDocuments] Has QR code:', !!qrCodeDataUrl);
    } catch (contractError: any) {
      console.error('[generateAndStoreDocuments] Error generating contract PDF:', contractError);
      console.error('[generateAndStoreDocuments] Contract error details:', {
        message: contractError?.message,
        stack: contractError?.stack,
        name: contractError?.name,
        templateType: customTemplate?.template_type
      });

      const errorMsg = `Failed to generate contract PDF: ${contractError?.message || 'Unknown error'}`;
      await updateDocumentStatus(warrantyId, 'contract', 'failed', errorMsg);
      await logError({
        errorType: 'pdf_generation',
        errorMessage: errorMsg,
        severity: 'error',
        stackTrace: contractError?.stack,
        context: {
          warrantyId,
          documentType: 'contract',
          organizationId: data.warranty.organization_id,
          templateType: customTemplate?.template_type || 'standard'
        },
        relatedEntityType: 'warranty',
        relatedEntityId: warrantyId
      });

      throw new Error(errorMsg);
    }

    console.log('[generateAndStoreDocuments] Step 5/6: Converting PDFs to base64');

    let customerInvoiceBase64: string;
    let merchantInvoiceBase64: string;

    try {
      const customerInvoiceBlob = getPDFBlob(customerInvoicePDF);
      const merchantInvoiceBlob = getPDFBlob(merchantInvoicePDF);

      customerInvoiceBase64 = await blobToBase64(customerInvoiceBlob);
      merchantInvoiceBase64 = await blobToBase64(merchantInvoiceBlob);
      console.log('[generateAndStoreDocuments] Step 5/6: PDFs converted to base64');
    } catch (conversionError) {
      console.error('[generateAndStoreDocuments] Error converting PDFs to base64:', conversionError);
      throw new Error('Failed to convert PDFs to base64');
    }

    console.log('[generateAndStoreDocuments] Step 6/6: Updating warranty with document URLs');
    console.log('[generateAndStoreDocuments] Documents summary:', {
      hasCustomerInvoice: !!customerInvoiceBase64,
      hasMerchantInvoice: !!merchantInvoiceBase64,
      hasContract: !!contractBase64,
      hasSignature: !!signatureDataUrl,
      customerInvoiceLength: customerInvoiceBase64?.length || 0,
      merchantInvoiceLength: merchantInvoiceBase64?.length || 0,
      contractLength: contractBase64?.length || 0
    });

    const { error: updateError } = await supabase
      .from('warranties')
      .update({
        customer_invoice_pdf_url: customerInvoiceBase64,
        merchant_invoice_pdf_url: merchantInvoiceBase64,
        contract_pdf_url: contractBase64,
        signature_proof_url: signatureDataUrl || null,
        signed_at: signatureDataUrl ? new Date().toISOString() : null,
      })
      .eq('id', warrantyId);

    if (updateError) {
      console.error('[generateAndStoreDocuments] Error updating warranty:', updateError);
      console.error('[generateAndStoreDocuments] Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      throw new Error(`Failed to update warranty with documents: ${updateError.message}`);
    }

    console.log('[generateAndStoreDocuments] Step 6/6: Warranty updated successfully');

    console.log('[generateAndStoreDocuments] All documents generated and stored successfully');

    return {
      customerInvoiceUrl: customerInvoiceBase64,
      merchantInvoiceUrl: merchantInvoiceBase64,
      contractUrl: contractBase64,
      success: true,
    };
  } catch (error) {
    console.error('[generateAndStoreDocuments] CRITICAL ERROR:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToPDF(base64: string): Blob {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'application/pdf' });
}

export function downloadBase64PDF(base64: string, filename: string) {
  const blob = base64ToPDF(base64);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
