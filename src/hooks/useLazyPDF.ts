import { useState, useCallback } from 'react';

interface UseLazyPDFResult {
  generatePDF: (data: any) => Promise<Blob>;
  isLoading: boolean;
  error: Error | null;
}

export function useLazyPDF(): UseLazyPDFResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generatePDF = useCallback(async (data: any): Promise<Blob> => {
    setIsLoading(true);
    setError(null);

    try {
      const [{ generateContractPDF, getPDFBlob }, { loadPDFLibraries }] = await Promise.all([
        import('../lib/pdf-wrapper'),
        import('../lib/pdf-lazy-loader'),
      ]);

      await loadPDFLibraries();

      const doc = await generateContractPDF(
        data,
        data.signatureDataUrl,
        data.customSections,
        data.claimSubmissionUrl,
        data.qrCodeDataUrl
      );

      const blob = getPDFBlob(doc);
      setIsLoading(false);
      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('PDF generation failed');
      setError(error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return { generatePDF, isLoading, error };
}

export function useLazyInvoicePDF() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateInvoice = useCallback(async (data: any): Promise<Blob> => {
    setIsLoading(true);
    setError(null);

    try {
      const [{ generateInvoicePDF, getPDFBlob }, { loadPDFLibraries }] = await Promise.all([
        import('../lib/pdf-wrapper'),
        import('../lib/pdf-lazy-loader'),
      ]);

      await loadPDFLibraries();
      const doc = await generateInvoicePDF(data);
      const blob = getPDFBlob(doc);
      setIsLoading(false);
      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Invoice generation failed');
      setError(error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return { generateInvoice, isLoading, error };
}

export function useLazyMerchantPDF() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateMerchantInvoice = useCallback(async (data: any): Promise<Blob> => {
    setIsLoading(true);
    setError(null);

    try {
      const [{ generateMerchantInvoicePDF, getPDFBlob }, { loadPDFLibraries }] =
        await Promise.all([
          import('../lib/pdf-wrapper'),
          import('../lib/pdf-lazy-loader'),
        ]);

      await loadPDFLibraries();
      const doc = await generateMerchantInvoicePDF(data);
      const blob = getPDFBlob(doc);
      setIsLoading(false);
      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Merchant invoice generation failed');
      setError(error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  return { generateMerchantInvoice, isLoading, error };
}
