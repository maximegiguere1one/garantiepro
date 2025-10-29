import { loadPDFLibraries, verifyAutoTableAvailable } from './pdf-lazy-loader';
import { validateWarrantyNumericFields, safeNumber, safeToFixed } from './numeric-utils';
import type { Database } from './database.types';

function isValidBase64Image(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') return false;

  const base64Pattern = /^data:image\/(png|jpeg|jpg|gif);base64,/;
  if (!base64Pattern.test(dataUrl)) return false;

  try {
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data || base64Data.length === 0) return false;

    atob(base64Data);
    return true;
  } catch (error) {
    console.error('[pdf-wrapper] Invalid base64 image data:', error);
    return false;
  }
}

function validateInvoiceData(data: InvoiceData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.warranty) errors.push('Warranty data is missing');
  if (!data.customer) errors.push('Customer data is missing');
  if (!data.trailer) errors.push('Trailer data is missing');
  if (!data.plan) errors.push('Plan data is missing');
  if (!data.companyInfo) errors.push('Company info is missing');

  if (data.customer) {
    if (!data.customer.first_name || !data.customer.last_name) {
      errors.push('Customer name is incomplete');
    }
    if (!data.customer.email) {
      errors.push('Customer email is missing');
    }
  }

  if (data.trailer) {
    if (!data.trailer.vin) errors.push('Trailer VIN is missing');
    if (!data.trailer.make || !data.trailer.model) errors.push('Trailer make/model is missing');
  }

  if (data.warranty) {
    const numericValidation = validateWarrantyNumericFields({
      base_price: data.warranty.base_price,
      options_price: data.warranty.options_price,
      taxes: data.warranty.taxes,
      total_price: data.warranty.total_price,
      margin: data.warranty.margin,
      deductible: data.warranty.deductible
    });

    if (!numericValidation.isValid) {
      errors.push(...numericValidation.errors.map(e => `Warranty numeric validation: ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}

type Warranty = Database['public']['Tables']['warranties']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Trailer = Database['public']['Tables']['trailers']['Row'];
type WarrantyPlan = Database['public']['Tables']['warranty_plans']['Row'];

interface InvoiceData {
  warranty: Warranty;
  customer: Customer;
  trailer: Trailer;
  plan: WarrantyPlan;
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
}

let pdfModule: any = null;
let professionalPdfModule: any = null;
let loadingPromise: Promise<any> | null = null;

async function ensurePDFModulesLoaded() {
  // If already loaded, verify and return
  if (pdfModule && professionalPdfModule) {
    console.log('[pdf-wrapper] PDF modules already loaded, verifying autoTable...');
    try {
      verifyAutoTableAvailable();
      console.log('[pdf-wrapper] autoTable verification passed, modules ready');
      return { pdfModule, professionalPdfModule };
    } catch (verifyError) {
      console.warn('[pdf-wrapper] autoTable verification failed, reloading modules:', verifyError);
      pdfModule = null;
      professionalPdfModule = null;
      loadingPromise = null;
    }
  }

  // If currently loading, wait for that to finish
  if (loadingPromise) {
    console.log('[pdf-wrapper] Waiting for PDF modules to finish loading...');
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      console.log('[pdf-wrapper] ========================================');
      console.log('[pdf-wrapper] Starting PDF libraries initialization');
      console.log('[pdf-wrapper] ========================================');

      console.log('[pdf-wrapper] Step 1: Loading core PDF libraries (jsPDF + autoTable)...');
      const { jsPDF, autoTable } = await loadPDFLibraries();

      if (!jsPDF) {
        throw new Error('jsPDF failed to load - returned null or undefined');
      }

      if (!autoTable) {
        console.warn('[pdf-wrapper] autoTable module is null/undefined, but may still be attached to jsPDF.API');
      }

      console.log('[pdf-wrapper] Step 2: Verifying autoTable plugin attachment...');

      let verificationAttempts = 0;
      const maxVerificationAttempts = 3;
      let verificationPassed = false;

      while (verificationAttempts < maxVerificationAttempts && !verificationPassed) {
        try {
          verifyAutoTableAvailable();
          verificationPassed = true;
          console.log('[pdf-wrapper] ✓ autoTable plugin verified and ready');
        } catch (verifyError: any) {
          verificationAttempts++;
          console.warn(`[pdf-wrapper] autoTable verification attempt ${verificationAttempts}/${maxVerificationAttempts} failed:`, verifyError?.message);

          if (verificationAttempts < maxVerificationAttempts) {
            console.log('[pdf-wrapper] Waiting 300ms before retry...');
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            console.error('[pdf-wrapper] ✗ All autoTable verification attempts failed');
            throw new Error(`autoTable plugin verification failed after ${maxVerificationAttempts} attempts: ${verifyError?.message}`);
          }
        }
      }

      console.log('[pdf-wrapper] Step 3: Importing PDF generator modules...');

      const [pdfGen, profPdfGen, optPdfGen] = await Promise.all([
        import('./pdf-generator'),
        import('./pdf-generator-professional'),
        import('./pdf-generator-optimized')
      ]);

      pdfModule = pdfGen;
      professionalPdfModule = optPdfGen;

      console.log('[pdf-wrapper] ========================================');
      console.log('[pdf-wrapper] ✓ All PDF modules loaded and verified');
      console.log('[pdf-wrapper] Available functions:', {
        generateOptimizedContractPDF: !!professionalPdfModule?.generateOptimizedContractPDF,
        generateOptimizedMerchantInvoicePDF: !!professionalPdfModule?.generateOptimizedMerchantInvoicePDF
      });
      console.log('[pdf-wrapper] ========================================');

      return { pdfModule, professionalPdfModule };
    } catch (error: any) {
      console.error('[pdf-wrapper] ========================================');
      console.error('[pdf-wrapper] ✗ CRITICAL ERROR loading PDF modules');
      console.error('[pdf-wrapper] Error:', error?.message);
      console.error('[pdf-wrapper] Stack:', error?.stack);
      console.error('[pdf-wrapper] ========================================');
      loadingPromise = null;
      pdfModule = null;
      professionalPdfModule = null;
      throw new Error(`Failed to load PDF libraries: ${error?.message || 'Unknown error'}`);
    }
  })();

  return loadingPromise;
}

export async function generateInvoicePDF(data: InvoiceData) {
  try {
    console.log('[pdf-wrapper] generateInvoicePDF called');

    const dataValidation = validateInvoiceData(data);
    if (!dataValidation.valid) {
      console.error('[pdf-wrapper] Invoice data validation failed:', dataValidation.errors);
      throw new Error(`Invalid invoice data: ${dataValidation.errors.join(', ')}`);
    }

    console.log('[pdf-wrapper] Validating warranty numeric fields before generation');

    const validation = validateWarrantyNumericFields({
      base_price: data.warranty.base_price,
      options_price: data.warranty.options_price,
      taxes: data.warranty.taxes,
      total_price: data.warranty.total_price,
      margin: data.warranty.margin,
      deductible: data.warranty.deductible
    });

    if (!validation.isValid) {
      console.error('[pdf-wrapper] Numeric validation failed:', validation.errors);
      throw new Error(`Invalid warranty numeric data: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('[pdf-wrapper] Numeric validation warnings:', validation.warnings);
    }

    const { professionalPdfModule } = await ensurePDFModulesLoaded();

    if (!professionalPdfModule?.generateOptimizedContractPDF) {
      throw new Error('generateOptimizedContractPDF function not found in module');
    }

    console.log('[pdf-wrapper] Calling optimized invoice generator (integrated in contract)...');
    const result = await professionalPdfModule.generateOptimizedContractPDF(data, undefined, undefined, undefined, undefined);
    console.log('[pdf-wrapper] Invoice PDF generated successfully');
    return result;
  } catch (error: any) {
    console.error('[pdf-wrapper] Error in generateInvoicePDF:', error);
    console.error('[pdf-wrapper] Warranty data at time of error:', {
      contract_number: data.warranty.contract_number,
      base_price: data.warranty.base_price,
      options_price: data.warranty.options_price,
      taxes: data.warranty.taxes,
      total_price: data.warranty.total_price,
      deductible: data.warranty.deductible
    });
    throw new Error(`Invoice PDF generation failed: ${error?.message || 'Unknown error'}`);
  }
}

export async function generateContractPDF(
  data: InvoiceData,
  signatureDataUrl?: string,
  customSections?: any[],
  claimSubmissionUrl?: string,
  qrCodeDataUrl?: string
) {
  try {
    console.log('[pdf-wrapper] generateContractPDF called');
    console.log('[pdf-wrapper] Has signature:', !!signatureDataUrl);
    console.log('[pdf-wrapper] Has custom sections:', !!customSections && customSections.length > 0);
    console.log('[pdf-wrapper] Has claim URL:', !!claimSubmissionUrl);
    console.log('[pdf-wrapper] Has QR code:', !!qrCodeDataUrl);

    const dataValidation = validateInvoiceData(data);
    if (!dataValidation.valid) {
      console.error('[pdf-wrapper] Contract data validation failed:', dataValidation.errors);
      throw new Error(`Invalid contract data: ${dataValidation.errors.join(', ')}`);
    }

    if (signatureDataUrl && !isValidBase64Image(signatureDataUrl)) {
      console.error('[pdf-wrapper] Invalid signature data URL format');
      console.warn('[pdf-wrapper] Proceeding without signature due to invalid format');
      signatureDataUrl = undefined;
    }

    if (qrCodeDataUrl && !isValidBase64Image(qrCodeDataUrl)) {
      console.error('[pdf-wrapper] Invalid QR code data URL format');
      console.warn('[pdf-wrapper] Proceeding without QR code due to invalid format');
      qrCodeDataUrl = undefined;
    }

    console.log('[pdf-wrapper] Validating warranty numeric fields before generation');

    const validation = validateWarrantyNumericFields({
      base_price: data.warranty.base_price,
      options_price: data.warranty.options_price,
      taxes: data.warranty.taxes,
      total_price: data.warranty.total_price,
      margin: data.warranty.margin,
      deductible: data.warranty.deductible
    });

    if (!validation.isValid) {
      throw new Error(`Invalid warranty numeric data: ${validation.errors.join(', ')}`);
    }

    const { professionalPdfModule } = await ensurePDFModulesLoaded();

    if (!professionalPdfModule?.generateOptimizedContractPDF) {
      throw new Error('generateOptimizedContractPDF function not found in module');
    }

    console.log('[pdf-wrapper] Calling generateOptimizedContractPDF...');
    const result = await professionalPdfModule.generateOptimizedContractPDF(
      data,
      signatureDataUrl,
      customSections,
      claimSubmissionUrl,
      qrCodeDataUrl
    );
    console.log('[pdf-wrapper] Contract PDF generated successfully');
    return result;
  } catch (error: any) {
    console.error('[pdf-wrapper] Error in generateContractPDF:', error);
    throw new Error(`Contract PDF generation failed: ${error?.message || 'Unknown error'}`);
  }
}

export async function generateMerchantInvoicePDF(data: InvoiceData) {
  try {
    console.log('[pdf-wrapper] generateMerchantInvoicePDF called');
    console.log('[pdf-wrapper] Validating warranty numeric fields before generation');

    const validation = validateWarrantyNumericFields({
      base_price: data.warranty.base_price,
      options_price: data.warranty.options_price,
      taxes: data.warranty.taxes,
      total_price: data.warranty.total_price,
      margin: data.warranty.margin,
      deductible: data.warranty.deductible
    });

    if (!validation.isValid) {
      throw new Error(`Invalid warranty numeric data: ${validation.errors.join(', ')}`);
    }

    const { professionalPdfModule } = await ensurePDFModulesLoaded();

    if (!professionalPdfModule?.generateOptimizedMerchantInvoicePDF) {
      throw new Error('generateOptimizedMerchantInvoicePDF function not found in module');
    }

    console.log('[pdf-wrapper] Calling generateOptimizedMerchantInvoicePDF...');
    const result = await professionalPdfModule.generateOptimizedMerchantInvoicePDF(data);
    console.log('[pdf-wrapper] Merchant invoice PDF generated successfully');
    return result;
  } catch (error: any) {
    console.error('[pdf-wrapper] Error in generateMerchantInvoicePDF:', error);
    throw new Error(`Merchant invoice PDF generation failed: ${error?.message || 'Unknown error'}`);
  }
}

export function getPDFBlob(doc: any): Blob {
  return doc.output('blob');
}

export function getPDFDataUrl(doc: any): string {
  return doc.output('dataurlstring');
}

export function downloadPDF(doc: any, filename: string) {
  doc.save(filename);
}
