import type { Database } from './database.types';
import { safeToFixed, safeNumber, safeAdd, normalizeWarrantyNumbers, safeLocaleString } from './numeric-utils';

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
}

function checkPageBreak(doc: any, yPos: number, requiredSpace: number = 30): number {
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 40;

  if (yPos + requiredSpace > pageHeight - bottomMargin) {
    doc.addPage();
    return 20; // Start position on new page
  }
  return yPos;
}

export function generateInvoicePDF(data: InvoiceData): any {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available. Ensure loadPDFLibraries() was called first.');
  }

  const doc = new jsPDF();

  if (typeof (doc as any).autoTable !== 'function') {
    console.error('[pdf-generator] autoTable is not a function on doc instance');
    throw new Error('autoTable plugin not available on jsPDF instance. PDF generation cannot proceed.');
  }
  const { warranty, customer, trailer, plan, companyInfo } = data;

  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  console.log('[pdf-generator] Generating invoice with normalized warranty');

  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Numéro de facture: ${warranty.contract_number}`, 20, yPos);
  doc.text(`Date: ${new Date(warranty.created_at).toLocaleDateString('fr-CA')}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations du vendeur', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyInfo.name, 20, yPos);
  yPos += 5;
  if (companyInfo.address) {
    doc.text(companyInfo.address, 20, yPos);
    yPos += 5;
  }
  if (companyInfo.phone) {
    doc.text(`Tél: ${companyInfo.phone}`, 20, yPos);
    yPos += 5;
  }
  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, 20, yPos);
    yPos += 5;
  }
  if (companyInfo.businessNumber) {
    doc.text(`NEQ: ${companyInfo.businessNumber}`, 20, yPos);
    yPos += 5;
  }

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Facturé à', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${customer.first_name} ${customer.last_name}`, 20, yPos);
  yPos += 5;
  doc.text(customer.address, 20, yPos);
  yPos += 5;
  doc.text(`${customer.city}, ${customer.province} ${customer.postal_code}`, 20, yPos);
  yPos += 5;
  doc.text(`Email: ${customer.email}`, 20, yPos);
  yPos += 5;
  doc.text(`Tél: ${customer.phone}`, 20, yPos);

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Détails de la remorque', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${trailer.year} ${trailer.make} ${trailer.model}`, 20, yPos);
  yPos += 5;
  doc.text(`NIV: ${trailer.vin}`, 20, yPos);
  yPos += 5;
  doc.text(`Type: ${trailer.trailer_type}`, 20, yPos);

  yPos += 15;

  const tableData = [
    ['Plan de garantie', plan.name_fr || plan.name, '', `${safeToFixed(normalizedWarranty.base_price, 2)} $`],
  ];

  const selectedOptions = normalizedWarranty.selected_options as any[] || [];
  selectedOptions.forEach((option: any) => {
    tableData.push(['Option', option.name || 'Option additionnelle', '', `${safeToFixed(option.price, 2)} $`]);
  });

  const subtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  tableData.push(['', '', 'Sous-total', `${safeToFixed(subtotal, 2)} $`]);
  tableData.push(['', '', 'Taxes', `${safeToFixed(normalizedWarranty.taxes, 2)} $`]);
  tableData.push(['', '', 'Total', `${safeToFixed(normalizedWarranty.total_price, 2)} $`]);

  (doc as any).autoTable({
    startY: yPos,
    head: [['Description', 'Détails', '', 'Montant']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations de couverture', 20, finalY);

  let coverageY = finalY + 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Durée: ${safeNumber(normalizedWarranty.duration_months, 0)} mois`, 20, coverageY);
  coverageY += 5;
  doc.text(`Date de début: ${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')}`, 20, coverageY);
  coverageY += 5;
  doc.text(`Date de fin: ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')}`, 20, coverageY);
  coverageY += 5;
  doc.text(`Franchise: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $`, 20, coverageY);

  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Merci pour votre confiance!', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function generateContractPDF(
  data: InvoiceData,
  signatureDataUrl?: string,
  customSections?: any[],
  claimSubmissionUrl?: string,
  qrCodeDataUrl?: string
): any {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available. Ensure loadPDFLibraries() was called first.');
  }

  const doc = new jsPDF();

  if (typeof (doc as any).autoTable !== 'function') {
    console.error('[pdf-generator] autoTable is not a function on doc instance');
    throw new Error('autoTable plugin not available on jsPDF instance. PDF generation cannot proceed.');
  }
  const { warranty, customer, trailer, plan, companyInfo } = data;

  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRAT DE GARANTIE', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Numéro de contrat: ${warranty.contract_number}`, 20, yPos);
  doc.text(`Date: ${new Date(warranty.created_at).toLocaleDateString('fr-CA')}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTRE:', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Le vendeur: ${companyInfo.name}`, 20, yPos);
  yPos += 5;
  if (companyInfo.address) {
    doc.text(companyInfo.address, 20, yPos);
    yPos += 5;
  }
  if (companyInfo.businessNumber) {
    doc.text(`NEQ: ${companyInfo.businessNumber}`, 20, yPos);
    yPos += 5;
  }

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ET:', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Le client: ${customer.first_name} ${customer.last_name}`, 20, yPos);
  yPos += 5;
  doc.text(`${customer.address}, ${customer.city}, ${customer.province} ${customer.postal_code}`, 20, yPos);

  yPos += 15;

  if (customSections && customSections.length > 0) {
    const maxWidth = pageWidth - 40;

    customSections.forEach((section: any) => {
      const splitContent = doc.splitTextToSize(section.content, maxWidth);
      yPos = checkPageBreak(doc, yPos, splitContent.length * 5 + 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(section.name.toUpperCase(), 20, yPos);

      yPos += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(splitContent, 20, yPos);
      yPos += splitContent.length * 5 + 10;
    });

    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DE COUVERTURE', 20, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Remorque: ${trailer.year} ${trailer.make} ${trailer.model} (NIV: ${trailer.vin})`, 20, yPos);
    yPos += 5;
    doc.text(`Durée: ${safeNumber(normalizedWarranty.duration_months, 0)} mois (${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')} - ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')})`, 20, yPos);
    yPos += 5;
    doc.text(`Franchise: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $`, 20, yPos);
    yPos += 5;
    doc.text(`Province: ${normalizedWarranty.province}`, 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTANT TOTAL', 20, yPos);

    yPos += 7;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD (taxes incluses)`, 25, yPos);
    yPos += 15;
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBJET DU CONTRAT', 20, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const maxWidth = pageWidth - 40;
    const contractText = `Le présent contrat de garantie couvre la remorque ${trailer.year} ${trailer.make} ${trailer.model} (NIV: ${trailer.vin}) selon les modalités du plan "${plan.name_fr || plan.name}".`;
    const splitText = doc.splitTextToSize(contractText, maxWidth);
    doc.text(splitText, 20, yPos);
    yPos += splitText.length * 5 + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DURÉE ET COUVERTURE', 20, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Durée: ${safeNumber(normalizedWarranty.duration_months, 0)} mois`, 25, yPos);
    yPos += 5;
    doc.text(`• Date de début: ${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')}`, 25, yPos);
    yPos += 5;
    doc.text(`• Date de fin: ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')}`, 25, yPos);
    yPos += 5;
    doc.text(`• Franchise applicable: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $`, 25, yPos);
    yPos += 5;
    doc.text(`• Province: ${normalizedWarranty.province}`, 25, yPos);

    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTANT TOTAL', 20, yPos);

    yPos += 7;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD (taxes incluses)`, 25, yPos);

    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const termsText = `Le client reconnaît avoir lu et accepté les conditions générales de ce contrat de garantie. Le client confirme que toutes les informations fournies sont exactes et complètes.`;
    const splitTerms = doc.splitTextToSize(termsText, maxWidth);
    doc.text(splitTerms, 20, yPos);
    yPos += splitTerms.length * 5 + 15;
  }

  if (claimSubmissionUrl && qrCodeDataUrl) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SOUMETTRE UNE RÉCLAMATION', pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const maxWidth = pageWidth - 40;
    const claimText = `En cas de problème couvert par votre garantie, vous pouvez soumettre une réclamation facilement en utilisant le lien unique ci-dessous ou en scannant le code QR avec votre téléphone.`;
    const splitClaimText = doc.splitTextToSize(claimText, maxWidth);
    doc.text(splitClaimText, 20, yPos);
    yPos += splitClaimText.length * 6 + 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(15, yPos, pageWidth - 30, 50, 'F');

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Votre lien de réclamation unique:', 20, yPos);

    yPos += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.textWithLink(claimSubmissionUrl, 20, yPos, { url: claimSubmissionUrl });
    doc.setTextColor(0, 0, 0);

    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Ce lien est unique à votre contrat et ne peut être utilisé qu\'une seule fois.', 20, yPos);
    doc.setTextColor(0, 0, 0);

    yPos += 20;

    try {
      const qrSize = 60;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);

      yPos += qrSize + 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Scannez ce code QR avec votre téléphone', pageWidth / 2, yPos, { align: 'center' });
    } catch (error) {
      console.error('Error adding QR code to PDF:', error);
    }

    yPos += 15;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions pour soumettre une réclamation:', 20, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const instructions = [
      '1. Cliquez sur le lien ci-dessus ou scannez le code QR',
      '2. Remplissez le formulaire avec les détails de l\'incident',
      '3. Téléchargez des photos des dommages et tout document pertinent',
      '4. Soumettez votre réclamation',
      '5. Vous recevrez un numéro de réclamation et des mises à jour par courriel'
    ];

    instructions.forEach((instruction) => {
      doc.text(instruction, 25, yPos);
      yPos += 6;
    });

    yPos += 10;
    doc.setFillColor(254, 243, 199);
    doc.rect(15, yPos, pageWidth - 30, 25, 'F');

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('⚠ Important:', 20, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const importantText = `Votre réclamation sera traitée dans les 48 heures ouvrables. Conservez tous les documents et factures liés à l'incident. En cas de questions, contactez-nous: ${companyInfo.phone || 'voir coordonnées sur le contrat'}.`;
    const splitImportant = doc.splitTextToSize(importantText, maxWidth - 10);
    doc.text(splitImportant, 20, yPos);
    doc.setTextColor(0, 0, 0);
  }

  doc.addPage();
  yPos = 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Signatures:', 20, yPos);
  yPos += 10;

  const col1Width = (pageWidth - 50) / 2;
  const col2X = 20 + col1Width + 10;

  doc.setFontSize(9);
  doc.text('LE VENDEUR', 20, yPos);
  doc.text('LE CLIENT', col2X, yPos);
  yPos += 5;

  if (companyInfo.vendorSignatureUrl) {
    try {
      doc.addImage(companyInfo.vendorSignatureUrl, 'PNG', 20, yPos, 40, 15);
    } catch (error) {
      console.error('Error adding vendor signature:', error);
    }
  }

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', col2X, yPos, 40, 15);
    } catch (error) {
      console.error('Error adding signature to PDF:', error);
    }
    yPos += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(companyInfo.name, 20, yPos);
    doc.text(`${customer.first_name} ${customer.last_name}`, col2X, yPos);
    yPos += 5;
    doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, 20, yPos);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, col2X, yPos);
  } else {
    yPos += 5;
    doc.line(col2X, yPos, col2X + 50, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(companyInfo.name, 20, yPos);
    doc.text('Date: ___________________', col2X, yPos);
  }

  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${new Date().toLocaleString('fr-CA')}`, pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadPDF(doc: any, filename: string) {
  doc.save(filename);
}

export function getPDFBlob(doc: any): Blob {
  return doc.output('blob');
}

export function getPDFDataUrl(doc: any): string {
  return doc.output('dataurlstring');
}

export function generateMerchantInvoicePDF(data: InvoiceData): any {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available. Ensure loadPDFLibraries() was called first.');
  }

  const doc = new jsPDF();

  if (typeof (doc as any).autoTable !== 'function') {
    console.error('[pdf-generator] autoTable is not a function on doc instance');
    throw new Error('autoTable plugin not available on jsPDF instance. PDF generation cannot proceed.');
  }
  const { warranty, customer, trailer, plan, companyInfo } = data;

  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  console.log('[pdf-generator] Generating merchant invoice with normalized warranty');

  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE MARCHANDE', pageWidth / 2, yPos, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  yPos += 7;
  doc.text('Document interne - Confidentiel', pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Numéro de contrat: ${warranty.contract_number}`, 20, yPos);
  doc.text(`Date: ${new Date(warranty.created_at).toLocaleDateString('fr-CA')}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations de la vente', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vendeur: ${companyInfo.name}`, 20, yPos);
  yPos += 5;
  doc.text(`Client: ${customer.first_name} ${customer.last_name}`, 20, yPos);
  yPos += 5;
  doc.text(`Remorque: ${trailer.year} ${trailer.make} ${trailer.model}`, 20, yPos);
  yPos += 5;
  doc.text(`NIV: ${trailer.vin}`, 20, yPos);

  if (normalizedWarranty.sale_duration_seconds) {
    yPos += 5;
    const durationSec = safeNumber(normalizedWarranty.sale_duration_seconds, 0);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    doc.text(`Durée de la vente: ${minutes}m ${seconds}s`, 20, yPos);
  }

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Détails de la garantie', 20, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Plan: ${plan.name_fr || plan.name}`, 20, yPos);
  yPos += 5;

  // Add description if available
  if (plan.description) {
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(plan.description, 170);
    doc.text(descriptionLines, 20, yPos);
    yPos += (descriptionLines.length * 5);
  }

  // Add coverage details if available
  if (plan.coverage_details) {
    doc.setFont('helvetica', 'bold');
    doc.text('Couverture:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const coverageLines = doc.splitTextToSize(plan.coverage_details, 170);
    doc.text(coverageLines, 20, yPos);
    yPos += (coverageLines.length * 5);
  }

  yPos += 3;
  doc.text(`Durée: ${safeNumber(normalizedWarranty.duration_months, 0)} mois`, 20, yPos);
  yPos += 5;
  doc.text(`Province: ${normalizedWarranty.province}`, 20, yPos);
  yPos += 5;
  doc.text(`Franchise: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $`, 20, yPos);

  yPos += 15;

  const subtotalValue = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  const tableData = [
    ['Description', 'Montant'],
    ['Prix de base du plan', `${safeToFixed(normalizedWarranty.base_price, 2)} $`],
    ['Options additionnelles', `${safeToFixed(normalizedWarranty.options_price, 2)} $`],
    ['Sous-total', `${safeToFixed(subtotalValue, 2)} $`],
    ['Taxes', `${safeToFixed(normalizedWarranty.taxes, 2)} $`],
    ['', ''],
    ['Total facturé au client', `${safeToFixed(normalizedWarranty.total_price, 2)} $`],
  ];

  (doc as any).autoTable({
    startY: yPos,
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'normal' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'normal' },
    },
    didParseCell: function (data: any) {
      if (data.row.index === 5) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFillColor(15, 23, 42);
  doc.rect(20, finalY, pageWidth - 40, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MARGE BÉNÉFICIAIRE', pageWidth / 2, finalY + 10, { align: 'center' });

  doc.setFontSize(20);
  doc.text(`${safeToFixed(normalizedWarranty.margin, 2)} $ CAD`, pageWidth / 2, finalY + 22, { align: 'center' });

  const marginValue = safeNumber(normalizedWarranty.margin, 0);
  const totalValue = safeNumber(normalizedWarranty.total_price, 1);
  const marginPercent = totalValue > 0 ? ((marginValue / totalValue) * 100) : 0;
  const marginPercentStr = safeToFixed(marginPercent, 1);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`(${marginPercentStr}% du total)`, pageWidth / 2, finalY + 27, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  finalY += 40;

  if (warranty.created_by) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Créé par: ${warranty.created_by}`, 20, finalY);
  }

  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Document confidentiel - Usage interne uniquement', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}
