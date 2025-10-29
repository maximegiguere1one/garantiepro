/**
 * Utilitaires pour ajouter des zones de signature aux PDFs
 * Fusionne le PDF custom avec une page de signatures générée
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Convertit base64 en Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Enlever le préfixe data:application/pdf;base64, si présent
  const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convertit Uint8Array en base64
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return 'data:application/pdf;base64,' + btoa(binary);
}

/**
 * Crée une page de signatures professionnelle
 */
async function createSignaturePage(pdfDoc: PDFDocument): Promise<void> {
  console.log('[createSignaturePage] Adding signature page...');

  // Ajouter une nouvelle page
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  // Charger les polices
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const centerX = width / 2;

  // TITRE DE LA PAGE
  page.drawText('PAGE DE SIGNATURES', {
    x: centerX - 120,
    y: height - 80,
    size: 24,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Ligne horizontale sous le titre
  page.drawLine({
    start: { x: margin, y: height - 100 },
    end: { x: width - margin, y: height - 100 },
    thickness: 2,
    color: rgb(0.3, 0.3, 0.3),
  });

  // === SECTION CLIENT ===
  const clientY = height - 250;
  const boxWidth = 250;
  const boxHeight = 100;

  // Titre section client
  page.drawText('CLIENT', {
    x: margin,
    y: clientY + 120,
    size: 16,
    font: boldFont,
    color: rgb(0, 0.3, 0.6),
  });

  // Cadre signature client
  page.drawRectangle({
    x: margin,
    y: clientY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });

  page.drawText('Signature:', {
    x: margin + 10,
    y: clientY + boxHeight - 20,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Ligne pour la date (client)
  page.drawText('Date:', {
    x: margin,
    y: clientY - 30,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: margin + 50, y: clientY - 25 },
    end: { x: margin + 200, y: clientY - 25 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Ligne pour le nom (client)
  page.drawText('Nom (lettres moulées):', {
    x: margin,
    y: clientY - 60,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: margin, y: clientY - 80 },
    end: { x: margin + boxWidth, y: clientY - 80 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // === SECTION VENDEUR ===
  const vendorX = width - margin - boxWidth;

  // Titre section vendeur
  page.drawText('VENDEUR / REPRÉSENTANT', {
    x: vendorX,
    y: clientY + 120,
    size: 16,
    font: boldFont,
    color: rgb(0.6, 0.3, 0),
  });

  // Cadre signature vendeur
  page.drawRectangle({
    x: vendorX,
    y: clientY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });

  page.drawText('Signature:', {
    x: vendorX + 10,
    y: clientY + boxHeight - 20,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Ligne pour la date (vendeur)
  page.drawText('Date:', {
    x: vendorX,
    y: clientY - 30,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: vendorX + 50, y: clientY - 25 },
    end: { x: vendorX + 200, y: clientY - 25 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Ligne pour le nom (vendeur)
  page.drawText('Nom (lettres moulées):', {
    x: vendorX,
    y: clientY - 60,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: vendorX, y: clientY - 80 },
    end: { x: vendorX + boxWidth, y: clientY - 80 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // === DÉCLARATION EN BAS ===
  const declarationY = 150;
  const declarationText = [
    'En apposant ma signature ci-dessus, je confirme avoir lu, compris et accepté',
    'tous les termes et conditions du présent contrat de garantie prolongée.',
  ];

  declarationText.forEach((line, index) => {
    page.drawText(line, {
      x: centerX - 250,
      y: declarationY - (index * 20),
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  // Numéro de page en bas
  const totalPages = pdfDoc.getPageCount();
  page.drawText(`Page ${totalPages} de ${totalPages}`, {
    x: centerX - 50,
    y: 30,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  console.log('[createSignaturePage] Signature page added successfully');
}

/**
 * Ajoute une page de signatures à un PDF existant
 * @param pdfBase64 - PDF original en base64
 * @returns PDF avec page de signatures en base64
 */
export async function addSignatureFields(pdfBase64: string): Promise<string> {
  try {
    console.log('[addSignatureFields] Starting...');

    if (!pdfBase64 || pdfBase64.length === 0) {
      throw new Error('PDF base64 is empty or undefined');
    }

    console.log('[addSignatureFields] Decoding base64...');
    const pdfBytes = base64ToUint8Array(pdfBase64);
    console.log('[addSignatureFields] PDF bytes length:', pdfBytes.length);

    console.log('[addSignatureFields] Loading PDF document...');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('[addSignatureFields] Original pages:', pdfDoc.getPageCount());

    console.log('[addSignatureFields] Adding signature page...');
    await createSignaturePage(pdfDoc);

    console.log('[addSignatureFields] Saving modified PDF...');
    const modifiedPdfBytes = await pdfDoc.save();
    console.log('[addSignatureFields] Modified PDF size:', modifiedPdfBytes.length);

    console.log('[addSignatureFields] Converting to base64...');
    const result = uint8ArrayToBase64(modifiedPdfBytes);
    console.log('[addSignatureFields] Success! Total pages:', pdfDoc.getPageCount());

    return result;
  } catch (error) {
    console.error('[addSignatureFields] Error:', error);
    if (error instanceof Error) {
      console.error('[addSignatureFields] Error message:', error.message);
      console.error('[addSignatureFields] Error stack:', error.stack);
    }
    throw error;
  }
}
