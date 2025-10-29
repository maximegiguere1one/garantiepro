import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.error('[qr-code-utils] Invalid input text for QR code generation');
    return '';
  }

  try {
    console.log('[qr-code-utils] Generating QR code for URL:', text.substring(0, 50) + '...');

    const qrDataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    if (!qrDataUrl || !qrDataUrl.startsWith('data:image/png;base64,')) {
      console.error('[qr-code-utils] Generated QR code has invalid format');
      return '';
    }

    console.log('[qr-code-utils] QR code generated successfully, length:', qrDataUrl.length);
    return qrDataUrl;
  } catch (error) {
    console.error('[qr-code-utils] Error generating QR code:', error);
    console.error('[qr-code-utils] Input text length:', text?.length || 0);
    return '';
  }
}

export function getFullClaimUrl(token: string, baseUrl?: string): string {
  if (!token || typeof token !== 'string') {
    console.error('[qr-code-utils] Invalid token provided to getFullClaimUrl');
    return '';
  }

  try {
    const base = baseUrl || import.meta.env.VITE_SITE_URL || 'https://www.garantieproremorque.com';
    const fullUrl = `${base}/claim/submit/${token}`;

    console.log('[qr-code-utils] Generated claim URL:', fullUrl);
    return fullUrl;
  } catch (error) {
    console.error('[qr-code-utils] Error generating claim URL:', error);
    return '';
  }
}

export function validateQRCodeDataUrl(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return false;
  }

  if (!dataUrl.startsWith('data:image/png;base64,')) {
    return false;
  }

  try {
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data || base64Data.length === 0) {
      return false;
    }

    atob(base64Data);
    return true;
  } catch (error) {
    console.error('[qr-code-utils] Invalid QR code data URL:', error);
    return false;
  }
}
