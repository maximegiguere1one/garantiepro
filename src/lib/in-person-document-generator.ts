import { generateQRCodeDataUrl } from './qr-code-utils';

interface WarrantyDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  trailerVin: string;
  trailerMake: string;
  trailerModel: string;
  trailerYear: string;
  trailerType: string;
  trailerPurchasePrice: string;
  planName: string;
  duration: string;
  deductible: string;
  annualLimit: string;
  loyaltyCredit: string;
  basePrice: string;
  optionsPrice: string;
  taxes: string;
  totalPrice: string;
  selectedOptions: string[];
  startDate: string;
  endDate: string;
  nextMaintenance: string;
}

interface InPersonDocumentData {
  physicalDocumentNumber: string;
  warrantyDetails?: WarrantyDetails;
  companyInfo: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  generatedBy?: string;
}

export async function generateInPersonSignatureDocument(data: InPersonDocumentData): Promise<any> {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available. Ensure loadPDFLibraries() was called first.');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const BRAND_RED = [215, 25, 32];
  const BLACK = [0, 0, 0];
  const GRAY_DARK = [51, 51, 51];
  const GRAY_MEDIUM = [112, 112, 112];
  const GRAY_LIGHT = [245, 245, 245];
  const SUCCESS_GREEN = [34, 197, 94];

  let yPos = 15;

  doc.setFillColor(...BRAND_RED);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CONTRAT DE GARANTIE PROLONGÉE', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Document pour signature en personne', pageWidth / 2, 27, { align: 'center' });
  doc.text('À FAIRE SIGNER PAR LE CLIENT', pageWidth / 2, 34, { align: 'center' });

  doc.setFillColor(...BLACK);
  doc.rect(0, 40, pageWidth, 2, 'F');

  yPos = 52;

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
  yPos += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_RED);
  doc.text('NUMÉRO DE DOCUMENT PHYSIQUE', 20, yPos);
  doc.setTextColor(...BLACK);

  yPos += 10;

  try {
    const qrText = `PHY-DOC:${data.physicalDocumentNumber}`;
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrText);

    if (qrCodeDataUrl) {
      const qrSize = 40;
      const qrX = pageWidth - 60;
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos - 5, qrSize, qrSize);
    }
  } catch (error) {
    console.error('[in-person-doc] Error generating QR code:', error);
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(data.physicalDocumentNumber, 20, yPos + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MEDIUM);
  doc.text('Scannez le code QR pour retrouver ce dossier', 20, yPos + 11);

  yPos += 25;

  if (data.warrantyDetails) {
    const details = data.warrantyDetails;

    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_RED);
    doc.text('INFORMATIONS DU CLIENT', 20, yPos);
    doc.setTextColor(...BLACK);

    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Nom complet:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.customerName, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Courriel:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.customerEmail, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Téléphone:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.customerPhone, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Adresse:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    const addressLines = doc.splitTextToSize(details.customerAddress, pageWidth - 65);
    doc.text(addressLines, 55, yPos);
    yPos += (addressLines.length - 1) * 5;

    yPos += 12;

    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_RED);
    doc.text('REMORQUE COUVERTE', 20, yPos);
    doc.setTextColor(...BLACK);

    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NIV:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.trailerVin, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Véhicule:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${details.trailerYear} ${details.trailerMake} ${details.trailerModel}`, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Type:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.trailerType, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Prix d\'achat:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.trailerPurchasePrice, 55, yPos);

    yPos += 12;

    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_RED);
    doc.text('DÉTAILS DE LA GARANTIE', 20, yPos);
    doc.setTextColor(...BLACK);

    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Plan sélectionné:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.planName, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Durée de couverture:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.duration, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Franchise:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.deductible, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Limite annuelle:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.annualLimit, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Crédit fidélité:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.loyaltyCredit, 55, yPos);

    yPos += 10;

    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_RED);
    doc.text('DATES DE GARANTIE', 20, yPos);
    doc.setTextColor(...BLACK);

    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date de début:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.startDate, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Date de fin:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.endDate, 55, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Prochain entretien:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(details.nextMaintenance, 55, yPos);

    doc.addPage();
    yPos = 20;

    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_RED);
    doc.text('TARIFICATION DÉTAILLÉE', 20, yPos);
    doc.setTextColor(...BLACK);

    yPos += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Prix de base du plan:', 25, yPos);
    doc.text(details.basePrice, pageWidth - 45, yPos, { align: 'right' });

    yPos += 6;
    doc.text('Options additionnelles:', 25, yPos);
    doc.text(details.optionsPrice, pageWidth - 45, yPos, { align: 'right' });

    if (details.selectedOptions && details.selectedOptions.length > 0) {
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      details.selectedOptions.forEach(option => {
        doc.text(`• ${option}`, 30, yPos);
        yPos += 4;
      });
      yPos += 2;
      doc.setFontSize(9);
    }

    yPos += 3;
    doc.setDrawColor(...GRAY_MEDIUM);
    doc.line(25, yPos, pageWidth - 25, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Sous-total:', 25, yPos);
    const subtotal = (parseFloat(details.basePrice.replace(/[^\d.-]/g, '')) + parseFloat(details.optionsPrice.replace(/[^\d.-]/g, ''))).toFixed(2);
    doc.text(`${subtotal} $`, pageWidth - 45, yPos, { align: 'right' });

    yPos += 6;
    doc.text('Taxes:', 25, yPos);
    doc.text(details.taxes, pageWidth - 45, yPos, { align: 'right' });

    yPos += 3;
    doc.setLineWidth(1.5);
    doc.line(25, yPos, pageWidth - 25, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(20, yPos - 5, pageWidth - 40, 12, 2, 2, 'F');
    doc.setTextColor(...SUCCESS_GREEN);
    doc.text('MONTANT TOTAL:', 25, yPos + 3);
    doc.text(details.totalPrice, pageWidth - 45, yPos + 3, { align: 'right' });
    doc.setTextColor(...BLACK);

    yPos += 20;
  }

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_RED);
  doc.text('⚠ INSTRUCTIONS IMPORTANTES', 20, yPos);

  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  const instructions = [
    '1. Vérifiez l\'identité du client avec une pièce d\'identité valide (permis, passeport)',
    '2. Faites lire le contrat au complet au client',
    '3. Répondez à toutes les questions du client',
    '4. Faites signer le client sur la tablette numérique (signature électronique)',
    '5. Obtenez la signature du témoin (vendeur présent)',
    '6. Scannez ce document signé et téléversez-le dans le système'
  ];

  instructions.forEach(instruction => {
    doc.text(instruction, 22, yPos);
    yPos += 4;
  });

  yPos += 10;

  doc.setFillColor(...GRAY_LIGHT);
  doc.roundedRect(15, yPos, pageWidth - 30, 8, 2, 2, 'F');
  yPos += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_RED);
  doc.text('SIGNATURES', 20, yPos);
  doc.setTextColor(...BLACK);

  yPos += 12;

  const signatureBoxWidth = (pageWidth - 50) / 2;
  const col2X = 20 + signatureBoxWidth + 10;

  doc.setDrawColor(...GRAY_MEDIUM);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPos, signatureBoxWidth, 40, 2, 2, 'S');
  doc.roundedRect(col2X, yPos, signatureBoxWidth, 40, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('SIGNATURE DU CLIENT', 25, yPos + 8);
  doc.text('SIGNATURE DU TÉMOIN', col2X + 5, yPos + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MEDIUM);
  doc.text('(Sur tablette numérique)', 25, yPos + 13);
  doc.text('(Vendeur présent)', col2X + 5, yPos + 13);

  doc.setTextColor(...BLACK);
  doc.line(25, yPos + 28, 20 + signatureBoxWidth - 5, yPos + 28);
  doc.line(col2X + 5, yPos + 28, col2X + signatureBoxWidth - 5, yPos + 28);

  doc.setFontSize(7);
  doc.text('Signature', 25, yPos + 32);
  doc.text('Signature', col2X + 5, yPos + 32);

  doc.setFont('helvetica', 'normal');
  doc.text('Date: _______________', 25, yPos + 37);
  doc.text('Date: _______________', col2X + 5, yPos + 37);

  yPos += 52;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SUCCESS_GREEN);
  doc.text('✓ VALIDATION DU DOCUMENT', 20, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.setFontSize(7);
  doc.text('Ce document doit être scanné et téléversé dans le système après signature des deux parties.', 20, yPos);
  yPos += 3.5;
  doc.text('Le code QR en première page permet de retrouver rapidement ce dossier dans le système.', 20, yPos);

  const footerY = pageHeight - 20;
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MEDIUM);
  doc.text(data.companyInfo.name, 20, footerY);
  doc.text(`Généré le ${new Date().toLocaleString('fr-CA')}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Page 2/2`, pageWidth - 20, footerY, { align: 'right' });

  doc.setFontSize(6);
  if (data.companyInfo.phone) {
    doc.text(`Tél: ${data.companyInfo.phone}`, 20, footerY + 3.5);
  }
  if (data.companyInfo.email) {
    doc.text(`Email: ${data.companyInfo.email}`, pageWidth / 2, footerY + 3.5, { align: 'center' });
  }
  if (data.generatedBy) {
    doc.text(`Généré par: ${data.generatedBy}`, pageWidth - 20, footerY + 3.5, { align: 'right' });
  }

  console.log('[in-person-doc] Professional 2-page document generated successfully');
  return doc;
}

export function openPDFInNewTab(doc: any) {
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 100);
}

export function downloadPDF(doc: any, filename: string) {
  doc.save(filename);
}
