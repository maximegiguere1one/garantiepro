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
  employeeSignature?: {
    full_name: string;
    signature_data: string;
  } | null;
}

const BRAND_COLORS = {
  primary: [215, 25, 32] as [number, number, number],        // Rouge Pro Remorque #D71920
  primaryDark: [181, 18, 24] as [number, number, number],    // Rouge foncé hover #B51218
  dark: [0, 0, 0] as [number, number, number],               // Noir profond #000000
  white: [255, 255, 255] as [number, number, number],        // Blanc pur #FFFFFF
  light: [245, 245, 245] as [number, number, number],        // Gris clair neutre #F5F5F5
  text: [0, 0, 0] as [number, number, number],               // Noir pour texte principal #000000
  textMedium: [112, 112, 112] as [number, number, number],   // Gris moyen #707070
  textLight: [112, 112, 112] as [number, number, number],    // Gris moyen pour labels #707070
  success: [34, 197, 94] as [number, number, number],        // Vert succès (gardé pour status)
  warning: [251, 191, 36] as [number, number, number],       // Jaune warning (gardé pour alertes)
  accent: [215, 25, 32] as [number, number, number],         // Même que primary pour cohérence
};

function addHeader(doc: any, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(...BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth / 2, 18, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });
  }

  doc.setFillColor(...BRAND_COLORS.dark);
  doc.rect(0, 40, pageWidth, 3, 'F');

  return 50;
}

function addFooter(doc: any, pageNumber: number, totalPages: number, companyInfo: any) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 25;

  doc.setDrawColor(...BRAND_COLORS.light);
  doc.setLineWidth(0.5);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textLight);

  doc.text(companyInfo.name, 20, footerY);
  doc.text(`Page ${pageNumber} sur ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(new Date().toLocaleDateString('fr-CA'), pageWidth - 20, footerY, { align: 'right' });

  doc.setFontSize(7);
  if (companyInfo.phone) {
    doc.text(`Tél: ${companyInfo.phone}`, 20, footerY + 4);
  }
  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, pageWidth / 2, footerY + 4, { align: 'center' });
  }
  if (companyInfo.businessNumber) {
    doc.text(`NEQ: ${companyInfo.businessNumber}`, pageWidth - 20, footerY + 4, { align: 'right' });
  }
}

function checkPageBreak(doc: any, yPos: number, requiredSpace: number = 30): number {
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 40; // Space for footer

  if (yPos + requiredSpace > pageHeight - bottomMargin) {
    doc.addPage();
    return 50; // Start position after header on new page
  }
  return yPos;
}

function addSection(doc: any, title: string, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 20);

  doc.setFillColor(...BRAND_COLORS.light);
  doc.rect(15, yPos - 2, doc.internal.pageSize.width - 30, 8, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text(title.toUpperCase(), 20, yPos + 4);

  doc.setTextColor(...BRAND_COLORS.text);
  return yPos + 12;
}

function addInfoBox(doc: any, x: number, y: number, width: number, lines: string[]) {
  y = checkPageBreak(doc, y, lines.length * 5 + 10);

  doc.setDrawColor(...BRAND_COLORS.light);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, lines.length * 5 + 6, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  let currentY = y + 5;
  lines.forEach(line => {
    doc.text(line, x + 3, currentY);
    currentY += 5;
  });

  return y + lines.length * 5 + 6;
}

export function generateProfessionalInvoicePDF(data: InvoiceData): any {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available. Ensure loadPDFLibraries() was called first.');
  }

  const doc = new jsPDF();

  if (typeof (doc as any).autoTable !== 'function') {
    console.error('[pdf-generator-professional] autoTable is not a function on doc instance');
    throw new Error('autoTable plugin not available on jsPDF instance. PDF generation cannot proceed.');
  }
  const { warranty, customer, trailer, plan, companyInfo } = data;

  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  console.log('[pdf-generator-professional] Generating invoice with normalized warranty:', {
    base_price: normalizedWarranty.base_price,
    options_price: normalizedWarranty.options_price,
    taxes: normalizedWarranty.taxes,
    total_price: normalizedWarranty.total_price
  });

  const pageWidth = doc.internal.pageSize.width;

  let yPos = addHeader(doc, 'FACTURE', `N° ${warranty.contract_number}`);
  yPos += 5;

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('FACTURE CLIENT', 20, yPos);

  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textLight);
  doc.text(`Date d'émission: ${new Date(warranty.created_at).toLocaleDateString('fr-CA')}`, 20, yPos);
  doc.text(`Date d'échéance: Immédiate`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Statut: ${warranty.payment_status === 'paid' ? 'PAYEE' : 'EN ATTENTE'}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;

  const col1Width = (pageWidth - 40) / 2;
  const col2X = 20 + col1Width + 5;

  yPos = addSection(doc, 'VENDEUR', yPos);
  const vendorLines = [
    companyInfo.name,
    companyInfo.address || '',
    companyInfo.phone ? `Tél: ${companyInfo.phone}` : '',
    companyInfo.email ? `Email: ${companyInfo.email}` : '',
    companyInfo.businessNumber ? `NEQ: ${companyInfo.businessNumber}` : '',
  ].filter(Boolean);
  yPos = addInfoBox(doc, 20, yPos, col1Width, vendorLines);

  const customerYStart = yPos - vendorLines.length * 5 - 6 - 12;
  let customerY = addSection(doc, 'FACTURE A', customerYStart);
  const customerLines = [
    `${customer.first_name} ${customer.last_name}`,
    customer.address,
    `${customer.city}, ${customer.province} ${customer.postal_code}`,
    `Email: ${customer.email}`,
    `Tél: ${customer.phone}`,
  ];
  addInfoBox(doc, col2X, customerY, col1Width, customerLines);

  yPos += 10;
  yPos = addSection(doc, 'BIEN ASSURE', yPos);
  const trailerLines = [
    `${trailer.year} ${trailer.make} ${trailer.model}`,
    `Type: ${trailer.trailer_type}`,
    `NIV: ${trailer.vin}`,
    `Prix d'achat: ${trailer.purchase_price.toLocaleString('fr-CA')} $`,
  ];
  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, trailerLines);

  yPos += 10;
  yPos = addSection(doc, 'DETAILS DE LA COUVERTURE', yPos);

  // Add description and coverage details if available
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  if (plan.description) {
    yPos = checkPageBreak(doc, yPos, 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(plan.description, 170);

    // Render description line by line with page break checks
    for (let i = 0; i < descriptionLines.length; i++) {
      yPos = checkPageBreak(doc, yPos, 5);
      doc.text(descriptionLines[i], 20, yPos);
      yPos += 5;
    }
    yPos += 3;
  }

  if (plan.coverage_details) {
    yPos = checkPageBreak(doc, yPos, 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Couverture:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const coverageLines = doc.splitTextToSize(plan.coverage_details, 170);

    // Render coverage details line by line with page break checks
    for (let i = 0; i < coverageLines.length; i++) {
      yPos = checkPageBreak(doc, yPos, 5);
      doc.text(coverageLines[i], 20, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  const tableData: any[] = [
    [
      'Plan de garantie',
      plan.name_fr || plan.name,
      `${safeNumber(normalizedWarranty.duration_months, 0)} mois`,
      `${safeToFixed(normalizedWarranty.base_price, 2)} $`
    ],
  ];

  const selectedOptions = normalizedWarranty.selected_options as any[] || [];
  selectedOptions.forEach((option: any) => {
    tableData.push([
      'Option additionnelle',
      option.name || 'Option',
      '-',
      `${safeToFixed(option.price, 2)} $`
    ]);
  });

  (doc as any).autoTable({
    startY: yPos,
    head: [['Description', 'Détails', 'Durée', 'Montant']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: BRAND_COLORS.primary,
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: BRAND_COLORS.text,
    },
    alternateRowStyles: {
      fillColor: BRAND_COLORS.light,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  const subtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  const summaryX = pageWidth - 90;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  doc.text('Sous-total:', summaryX, yPos);
  doc.text(`${safeToFixed(subtotal, 2)} $`, summaryX + 55, yPos, { align: 'right' });

  yPos += 6;
  doc.text('TPS (5%):', summaryX, yPos);
  const tps = safeNumber(subtotal, 0) * 0.05;
  doc.text(`${safeToFixed(tps, 2)} $`, summaryX + 55, yPos, { align: 'right' });

  yPos += 6;
  doc.text('TVQ (9.975%):', summaryX, yPos);
  const tvq = safeNumber(subtotal, 0) * 0.09975;
  doc.text(`${safeToFixed(tvq, 2)} $`, summaryX + 55, yPos, { align: 'right' });

  yPos += 8;
  doc.setDrawColor(...BRAND_COLORS.primary);
  doc.setLineWidth(1);
  doc.line(summaryX, yPos - 2, summaryX + 60, yPos - 2);

  yPos += 2;
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.roundedRect(summaryX - 5, yPos - 5, 70, 10, 2, 2, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', summaryX, yPos + 2);
  doc.text(`${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD`, summaryX + 55, yPos + 2, { align: 'right' });

  yPos += 20;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, 'F');

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.success);
  doc.text('CONDITIONS DE PAIEMENT', 25, yPos);

  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  const paymentText = `Cette facture est payable immédiatement. Garantie active dès réception du paiement complet. Durée de couverture: ${safeNumber(normalizedWarranty.duration_months, 0)} mois (du ${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')} au ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')}).`;
  const splitPayment = doc.splitTextToSize(paymentText, pageWidth - 50);

  // Render text line by line with page break checks
  for (let i = 0; i < splitPayment.length; i++) {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(splitPayment[i], 25, yPos);
    yPos += 5;
  }
  yPos -= 5;

  yPos += 25;

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(20, yPos, pageWidth - 40, 25, 2, 2, 'F');

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('INFORMATIONS IMPORTANTES', 25, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  const importantText = `Franchise applicable: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $ par réclamation. Droit de rétractation: 10 jours. Cette garantie est régie par les lois du Québec.`;
  const splitImportant = doc.splitTextToSize(importantText, pageWidth - 50);

  // Render text line by line with page break checks
  for (let i = 0; i < splitImportant.length; i++) {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(splitImportant[i], 25, yPos);
    yPos += 5;
  }
  yPos -= 5;

  addFooter(doc, 1, 1, companyInfo);

  return doc;
}

export function generateProfessionalContractPDF(
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
    console.error('[pdf-generator-professional] autoTable is not a function on doc instance');
    throw new Error('autoTable plugin not available on jsPDF instance. PDF generation cannot proceed.');
  }
  const { warranty, customer, trailer, plan, companyInfo } = data;

  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  console.log('[pdf-generator-professional] Generating contract with normalized warranty');

  const pageWidth = doc.internal.pageSize.width;

  let yPos = addHeader(doc, 'CONTRAT DE GARANTIE PROLONGÉE', `Contrat N° ${warranty.contract_number}`);
  yPos += 5;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.text('CONTRAT DE PROTECTION', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text(`Date d'entrée en vigueur: ${new Date(warranty.start_date).toLocaleDateString('fr-CA')}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Province: ${warranty.province}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;
  yPos = addSection(doc, 'Parties au contrat', yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text('ENTRE:', 20, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');

  // Vendeur - Première ligne
  doc.text(`Le VENDEUR: ${companyInfo.name}`, 25, yPos);
  yPos += 5;

  // Adresse - Split par ligne si elle contient des \n
  if (companyInfo.address) {
    const addressLines = companyInfo.address.split('\n').filter(line => line.trim());
    addressLines.forEach(line => {
      yPos = checkPageBreak(doc, yPos, 6);
      doc.text(line.trim(), 25, yPos);
      yPos += 5;
    });
  }

  // NEQ
  if (companyInfo.businessNumber) {
    doc.text(`NEQ: ${companyInfo.businessNumber}`, 25, yPos);
    yPos += 5;
  }

  // Téléphone
  if (companyInfo.phone) {
    doc.text(`Téléphone: ${companyInfo.phone}`, 25, yPos);
    yPos += 5;
  }

  // Courriel
  if (companyInfo.email) {
    doc.text(`Courriel: ${companyInfo.email}`, 25, yPos);
    yPos += 5;
  }

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('ET:', 20, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const clientLines = [
    `L'ACHETEUR: ${customer.first_name} ${customer.last_name}`,
    `${customer.address}`,
    `${customer.city}, ${customer.province} ${customer.postal_code}`,
    `Téléphone: ${customer.phone}`,
    `Courriel: ${customer.email}`,
  ];

  clientLines.forEach(line => {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(line, 25, yPos);
    yPos += 5;
  });

  yPos += 10;
  yPos = addSection(doc, '1. OBJET DU CONTRAT', yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  const objetText = `Le présent contrat de garantie prolongée (ci-après "le Contrat") a pour objet de couvrir les réparations et remplacements des pièces et composantes de la remorque décrite ci-après, conformément aux conditions générales et particulières énoncées dans ce document.`;
  const splitObjet = doc.splitTextToSize(objetText, pageWidth - 40);

  // Render text line by line with page break checks
  for (let i = 0; i < splitObjet.length; i++) {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(splitObjet[i], 20, yPos);
    yPos += 5;
  }
  yPos += 10;

  yPos = addSection(doc, '2. BIEN COUVERT', yPos);

  const trailerBox = [
    `Année: ${trailer.year}`,
    `Marque: ${trailer.make}`,
    `Modèle: ${trailer.model}`,
    `Type: ${trailer.trailer_type}`,
    `Numéro d'identification du véhicule (NIV): ${trailer.vin}`,
    `Prix d'achat: ${trailer.purchase_price.toLocaleString('fr-CA')} $ CAD`,
  ];
  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, trailerBox);

  yPos += 10;
  yPos = addSection(doc, '3. COUVERTURE ET DURÉE', yPos);

  // Prepare coverage lines
  const coverageLines = [
    `Plan souscrit: ${plan.name_fr || plan.name}`,
    `Durée de la garantie: ${safeNumber(normalizedWarranty.duration_months, 0)} mois (${Math.floor(safeNumber(normalizedWarranty.duration_months, 0) / 12)} ans)`,
    `Date de début: ${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')}`,
    `Date de fin: ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')}`,
    `Franchise par réclamation: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $ CAD`,
    `Province de couverture: ${normalizedWarranty.province}`,
  ];

  // Add max claim limit line from warranty (calculated based on purchase price and plan barème)
  if (normalizedWarranty.annual_claim_limit && normalizedWarranty.annual_claim_limit > 0) {
    coverageLines.push(`Limite maximale de réclamation: ${safeLocaleString(normalizedWarranty.annual_claim_limit, 'fr-CA')} $ CAD`);
  } else {
    coverageLines.push(`Limite maximale de réclamation: Illimitée`);
  }

  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, coverageLines);

  // SECTION 3.1: DÉTAILS COMPLETS DE COUVERTURE DU PLAN
  yPos += 10;

  // Parser le coverage_matrix pour afficher tous les détails
  const coverageMatrix = plan.coverage_matrix as any;

  if (coverageMatrix || plan.coverage_details) {
    yPos = addSection(doc, '3.1 DÉTAILS COMPLETS DE LA COUVERTURE', yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.text);

    // Afficher d'abord le coverage_details (texte libre) si présent
    if (plan.coverage_details && plan.coverage_details.trim()) {
      const coverageDetailsLines = doc.splitTextToSize(plan.coverage_details, pageWidth - 50);

      // Render coverage details line by line with page break checks
      for (let i = 0; i < coverageDetailsLines.length; i++) {
        yPos = checkPageBreak(doc, yPos, 6);
        doc.text(coverageDetailsLines[i], 25, yPos);
        yPos += 5;
      }
      yPos += 10;
    }

    // COMPOSANTS COUVERTS
    if (coverageMatrix && coverageMatrix.coverage) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('COMPOSANTS ET SYSTÈMES COUVERTS:', 25, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Freins
      if (coverageMatrix.coverage.freins) {
        const freins = coverageMatrix.coverage.freins;
        const estimatedLines = 5 + (freins.includes?.length || 0) * 4;
        yPos = checkPageBreak(doc, yPos, estimatedLines);

        doc.setFont('helvetica', 'bold');
        doc.text('• FREINS', 30, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        if (freins.note) {
          doc.text(`  ${freins.note}`, 35, yPos);
          yPos += 5;
        }
        if (freins.value) {
          doc.text(`  Valeur maximale: ${freins.value.toLocaleString('fr-CA')} $`, 35, yPos);
          yPos += 5;
        }
        if (freins.includes && freins.includes.length > 0) {
          doc.text('  Inclus:', 35, yPos);
          yPos += 5;
          freins.includes.forEach((item: string) => {
            yPos = checkPageBreak(doc, yPos, 5);
            doc.text(`    - ${item}`, 40, yPos);
            yPos += 4;
          });
        }
        yPos += 3;
      }

      // Système électrique
      if (coverageMatrix.coverage.systeme_electrique) {
        const elec = coverageMatrix.coverage.systeme_electrique;
        const estimatedLines = 10 + (elec.includes?.length || 0) * 4;
        yPos = checkPageBreak(doc, yPos, estimatedLines);

        doc.setFont('helvetica', 'bold');
        doc.text('• SYSTÈME ÉLECTRIQUE', 30, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        if (elec.includes && elec.includes.length > 0) {
          doc.text('  Couverture complète incluant:', 35, yPos);
          yPos += 5;
          elec.includes.forEach((item: string) => {
            yPos = checkPageBreak(doc, yPos, 5);
            doc.text(`    - ${item}`, 40, yPos);
            yPos += 4;
          });
        }
        yPos += 3;
      }

      // Structure et châssis
      if (coverageMatrix.coverage.structure_chassis) {
        const structure = coverageMatrix.coverage.structure_chassis;
        const estimatedLines = 10 + (structure.includes?.length || 0) * 4;
        yPos = checkPageBreak(doc, yPos, estimatedLines);

        doc.setFont('helvetica', 'bold');
        doc.text('• STRUCTURE ET CHÂSSIS', 30, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        if (structure.includes && structure.includes.length > 0) {
          doc.text('  Couverture complète incluant:', 35, yPos);
          yPos += 5;
          structure.includes.forEach((item: string) => {
            yPos = checkPageBreak(doc, yPos, 5);
            doc.text(`    - ${item}`, 40, yPos);
            yPos += 4;
          });
        }
        yPos += 3;
      }

      // Entretien annuel inclus
      if (coverageMatrix.coverage.entretien_annuel) {
        const entretien = coverageMatrix.coverage.entretien_annuel;
        const estimatedLines = 15 + (entretien.services?.length || 0) * 4;
        yPos = checkPageBreak(doc, yPos, estimatedLines);

        doc.setFont('helvetica', 'bold');
        doc.setFillColor(34, 197, 94); // Vert pour avantage
        doc.rect(25, yPos - 4, 3, 6, 'F');
        doc.text('• ENTRETIEN ANNUEL INCLUS (AVANTAGE)', 30, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        if (entretien.services && entretien.services.length > 0) {
          doc.text('  Services inclus chaque année:', 35, yPos);
          yPos += 5;
          entretien.services.forEach((service: string) => {
            yPos = checkPageBreak(doc, yPos, 5);
            doc.text(`    - ${service}`, 40, yPos);
            yPos += 4;
          });
        }
        if (entretien.value_per_year) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  Valeur annuelle: ${entretien.value_per_year.toLocaleString('fr-CA')} $`, 35, yPos);
          yPos += 5;
        }
        if (entretien.total_value) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.setFont('helvetica', 'bold');
          doc.text(`  Valeur totale du programme: ${entretien.total_value.toLocaleString('fr-CA')} $`, 35, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
        }
        yPos += 3;
      }
    }

    // LIMITES ANNUELLES PAR TRANCHE DE PRIX
    if (coverageMatrix.annual_limits) {
      const limitsCount = Object.keys(coverageMatrix.annual_limits).length;
      yPos = checkPageBreak(doc, yPos, 20 + limitsCount * 5);

      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LIMITES DE RÉPARATION ANNUELLES:', 25, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Selon le prix d\'achat de votre remorque:', 30, yPos);
      yPos += 5;

      const limits = coverageMatrix.annual_limits;
      Object.keys(limits).forEach((range: string) => {
        yPos = checkPageBreak(doc, yPos, 5);
        const limit = limits[range];
        doc.text(`  • Remorque ${range} $: jusqu\'à ${limit.toLocaleString('fr-CA')} $ / an`, 35, yPos);
        yPos += 5;
      });
      yPos += 3;
    }

    // FRANCHISE
    if (coverageMatrix.franchise !== undefined) {
      yPos = checkPageBreak(doc, yPos, 20);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('FRANCHISE:', 25, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Franchise par réclamation: ${coverageMatrix.franchise.toLocaleString('fr-CA')} $ CAD`, 30, yPos);
      yPos += 7;
    }

    // AVANTAGES SUPPLÉMENTAIRES
    if (coverageMatrix.avantages) {
      yPos = checkPageBreak(doc, yPos, 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(34, 197, 94);
      doc.rect(25, yPos - 4, 3, 6, 'F');
      doc.text('AVANTAGES SUPPLÉMENTAIRES INCLUS:', 30, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Programme de fidélité
      if (coverageMatrix.avantages.programme_fidelite) {
        const fidelite = coverageMatrix.avantages.programme_fidelite;
        yPos = checkPageBreak(doc, yPos, 20);
        doc.setFont('helvetica', 'bold');
        doc.text('• Programme de fidélité', 35, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        if (fidelite.remorque_10000_ou_moins) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  - Crédit pour remorque ≤ 10 000 $: ${fidelite.remorque_10000_ou_moins.toLocaleString('fr-CA')} $`, 40, yPos);
          yPos += 4;
        }
        if (fidelite.remorque_plus_10000) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  - Crédit pour remorque > 10 000 $: ${fidelite.remorque_plus_10000.toLocaleString('fr-CA')} $`, 40, yPos);
          yPos += 4;
        }
        if (fidelite.note) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.setFontSize(8);
          doc.setTextColor(...BRAND_COLORS.textLight);
          doc.text(`  Note: ${fidelite.note}`, 40, yPos);
          doc.setTextColor(...BRAND_COLORS.text);
          doc.setFontSize(9);
          yPos += 4;
        }
        yPos += 3;
      }

      // Assistance remorquage
      if (coverageMatrix.avantages.assistance_remorquage) {
        const remorquage = coverageMatrix.avantages.assistance_remorquage;
        yPos = checkPageBreak(doc, yPos, 15);
        doc.setFont('helvetica', 'bold');
        doc.text('• Assistance remorquage', 35, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        if (remorquage.description) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  ${remorquage.description}`, 40, yPos);
          yPos += 4;
        }
        if (remorquage.montant_par_evenement) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  Montant par événement: ${remorquage.montant_par_evenement.toLocaleString('fr-CA')} $`, 40, yPos);
          yPos += 4;
        }
        yPos += 3;
      }
      yPos += 5;
    }

    // DURÉE ET TRANSFÉRABILITÉ
    if (coverageMatrix.duration) {
      const duration = coverageMatrix.duration;
      yPos = checkPageBreak(doc, yPos, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DURÉE ET TRANSFÉRABILITÉ:', 25, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (duration.years) {
        yPos = checkPageBreak(doc, yPos, 5);
        doc.text(`• Durée totale: ${duration.years} ans`, 30, yPos);
        yPos += 5;
      }
      if (duration.starts_after_manufacturer) {
        yPos = checkPageBreak(doc, yPos, 5);
        doc.text('• Débute après la garantie du fabricant', 30, yPos);
        yPos += 5;
      }
      if (duration.transferable) {
        yPos = checkPageBreak(doc, yPos, 15);
        doc.text('• Garantie transférable au nouveau propriétaire', 30, yPos);
        yPos += 5;
        if (duration.transfer_fee) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  Frais de transfert: ${duration.transfer_fee.toLocaleString('fr-CA')} $`, 35, yPos);
          yPos += 4;
        }
        if (duration.transfer_notice_days) {
          yPos = checkPageBreak(doc, yPos, 5);
          doc.text(`  Délai de notification: ${duration.transfer_notice_days} jours`, 35, yPos);
          yPos += 4;
        }
      }
      yPos += 5;
    }

    // EXCLUSIONS
    if (coverageMatrix.exclusions && coverageMatrix.exclusions.length > 0) {
      yPos = checkPageBreak(doc, yPos, 20 + coverageMatrix.exclusions.length * 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(...BRAND_COLORS.warning);
      doc.rect(25, yPos - 4, 3, 6, 'F');
      doc.text('EXCLUSIONS:', 30, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Les éléments suivants NE sont PAS couverts par cette garantie:', 30, yPos);
      yPos += 5;
      coverageMatrix.exclusions.forEach((exclusion: string) => {
        yPos = checkPageBreak(doc, yPos, 5);
        doc.text(`• ${exclusion}`, 35, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // OBLIGATIONS DE L'ACHETEUR
    if (coverageMatrix.obligations && coverageMatrix.obligations.length > 0) {
      yPos = checkPageBreak(doc, yPos, 30);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(...BRAND_COLORS.primary);
      doc.rect(25, yPos - 4, 3, 6, 'F');
      doc.text('OBLIGATIONS DE L\'ACHETEUR (IMPORTANT):', 30, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Pour maintenir la validité de cette garantie, vous DEVEZ:', 30, yPos);
      yPos += 5;
      coverageMatrix.obligations.forEach((obligation: string) => {
        const splitObligation = doc.splitTextToSize(`• ${obligation}`, pageWidth - 70);

        // Render obligation line by line with page break checks
        for (let i = 0; i < splitObligation.length; i++) {
          yPos = checkPageBreak(doc, yPos, 6);
          doc.text(splitObligation[i], 35, yPos);
          yPos += 5;
        }
      });
      yPos += 5;
    }
  }

  yPos += 10;
  yPos = addSection(doc, '4. CONDITIONS FINANCIÈRES', yPos);

  doc.setFontSize(9);
  doc.text(`Prix de base du plan: ${safeToFixed(normalizedWarranty.base_price, 2)} $ CAD`, 25, yPos);
  yPos += 5;

  const selectedOptions = normalizedWarranty.selected_options as any[] || [];
  if (selectedOptions.length > 0) {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text('Options additionnelles:', 25, yPos);
    yPos += 5;
    selectedOptions.forEach((option: any) => {
      yPos = checkPageBreak(doc, yPos, 6);
      doc.text(`  • ${option.name}: ${safeToFixed(option.price, 2)} $ CAD`, 30, yPos);
      yPos += 5;
    });
  }

  const subtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  yPos += 3;
  doc.text(`Sous-total: ${safeToFixed(subtotal, 2)} $ CAD`, 25, yPos);
  yPos += 5;
  doc.text(`Taxes applicables: ${safeToFixed(normalizedWarranty.taxes, 2)} $ CAD`, 25, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`MONTANT TOTAL PAYÉ: ${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD`, 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  doc.addPage();
  yPos = 50;

  yPos = addSection(doc, '5. DROIT DE RÉTRACTATION (LCCJTI Art. 59)', yPos);

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'F');

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('IMPORTANT - DROIT D\'ANNULATION', 25, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  const retractText = `Conformément à la Loi sur la protection du consommateur du Québec (LCCJTI, articles 54.8 à 54.16), l'acheteur dispose d'un délai de RÉSOLUTION de DIX (10) JOURS suivant la réception du contrat pour l'annuler SANS FRAIS ni pénalité. Pour exercer ce droit, l'acheteur doit transmettre au vendeur, par écrit (lettre, courriel ou fax), un avis de résolution avant l'expiration du délai. En cas d'annulation, le vendeur remboursera intégralement toutes les sommes perçues dans les 15 jours suivant la réception de l'avis.`;
  const splitRetract = doc.splitTextToSize(retractText, pageWidth - 50);

  // Render text line by line with page break checks
  for (let i = 0; i < splitRetract.length; i++) {
    yPos = checkPageBreak(doc, yPos, 5);
    doc.text(splitRetract[i], 25, yPos);
    yPos += 4.5;
  }
  yPos -= 4.5;

  yPos += splitRetract.length * 4.5 + 10;

  // Calculer la date limite (10 jours après created_at ou aujourd'hui si invalide)
  let deadlineDate: Date;
  if (normalizedWarranty.created_at && !isNaN(new Date(normalizedWarranty.created_at).getTime())) {
    deadlineDate = new Date(normalizedWarranty.created_at);
  } else if (normalizedWarranty.signed_at && !isNaN(new Date(normalizedWarranty.signed_at).getTime())) {
    deadlineDate = new Date(normalizedWarranty.signed_at);
  } else {
    deadlineDate = new Date();
  }
  deadlineDate.setDate(deadlineDate.getDate() + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Date limite pour exercer ce droit: ${deadlineDate.toLocaleDateString('fr-CA')}`, 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  yPos += 15;
  yPos = addSection(doc, '6. EXCLUSIONS ET LIMITATIONS', yPos);

  const exclusions = [
    '• Dommages résultant d\'un usage abusif, négligent ou non conforme',
    '• Usure normale et entretien courant (lubrifiants, filtres, pneus)',
    '• Dommages causés par un accident, vandalisme ou force majeure',
    '• Modifications non autorisées ou réparations par des tiers non agréés',
    '• Dommages préexistants à la date de prise d\'effet du contrat',
    '• Équipements et accessoires non installés par le fabricant',
  ];

  exclusions.forEach(exclusion => {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(exclusion, 25, yPos);
    yPos += 5;
  });

  yPos += 10;
  yPos = addSection(doc, '7. OBLIGATIONS DE L\'ACHETEUR', yPos);

  const obligations = [
    '• Effectuer l\'entretien régulier conformément au manuel du propriétaire',
    '• Conserver tous les reçus et documents d\'entretien',
    '• Aviser le vendeur dans les 48 heures suivant une panne',
    '• Faire inspecter la remorque avant toute réparation couverte',
    '• Ne pas effectuer de modifications sans autorisation écrite',
  ];

  obligations.forEach(obligation => {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(obligation, 25, yPos);
    yPos += 5;
  });

  yPos += 10;
  yPos = addSection(doc, '8. PROCÉDURE DE RÉCLAMATION', yPos);

  doc.setFontSize(9);
  const claimText = `Pour soumettre une réclamation, l'acheteur doit communiquer avec le vendeur par téléphone au ${companyInfo.phone || '[TÉLÉPHONE]'} ou par courriel à ${companyInfo.email || '[EMAIL]'} dès la survenance du bris. Un numéro de dossier sera attribué et les instructions de réparation seront transmises. Toute réparation effectuée sans autorisation préalable ne sera pas couverte.`;
  const splitClaim = doc.splitTextToSize(claimText, pageWidth - 40);

  // Render text line by line with page break checks
  for (let i = 0; i < splitClaim.length; i++) {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(splitClaim[i], 20, yPos);
    yPos += 5;
  }
  yPos += 5;

  if (claimSubmissionUrl && qrCodeDataUrl) {
    yPos += 5;
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'F');

    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.dark);
    doc.text('SOUMISSION EN LIGNE SIMPLIFIEE', 25, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.text);
    doc.text('Vous pouvez également soumettre une réclamation en ligne:', 25, yPos);

    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.primary);
    doc.textWithLink(claimSubmissionUrl, 25, yPos, { url: claimSubmissionUrl });

    try {
      console.log('[pdf-professional] Adding QR code to contract');

      if (qrCodeDataUrl.startsWith('data:image/')) {
        const base64Data = qrCodeDataUrl.split(',')[1];
        if (base64Data && base64Data.length > 0) {
          const qrSize = 25;
          doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 35, yPos - 20, qrSize, qrSize);
          console.log('[pdf-professional] QR code added successfully');
        } else {
          console.warn('[pdf-professional] QR code base64 data is empty');
        }
      } else {
        console.warn('[pdf-professional] Invalid QR code URL format');
      }
    } catch (error) {
      console.error('[pdf-professional] Error adding QR code:', error);
      console.warn('[pdf-professional] Continuing without QR code');
    }

    yPos += 10;
  }

  doc.addPage();
  yPos = 50;

  yPos = addSection(doc, '9. LOI APPLICABLE ET JURIDICTION', yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  const legalText = `Le présent contrat est régi par les lois du Québec et du Canada. Tout litige découlant du présent contrat sera de la compétence exclusive des tribunaux du district judiciaire de [DISTRICT], Province de Québec. Les parties conviennent que la langue officielle du contrat est le français, conformément à la Charte de la langue française.`;
  const splitLegal = doc.splitTextToSize(legalText, pageWidth - 40);

  // Render text line by line with page break checks
  for (let i = 0; i < splitLegal.length; i++) {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(splitLegal[i], 20, yPos);
    yPos += 5;
  }
  yPos += 15;

  yPos = addSection(doc, '10. SIGNATURES', yPos);

  doc.setFontSize(9);
  const signText = `Les parties reconnaissent avoir lu, compris et accepté l'intégralité du présent contrat, incluant toutes les conditions générales, exclusions et limitations. Ce contrat constitue l'accord complet entre les parties et remplace toute entente antérieure.`;
  const splitSign = doc.splitTextToSize(signText, pageWidth - 40);

  // Render text line by line with page break checks
  for (let i = 0; i < splitSign.length; i++) {
    yPos = checkPageBreak(doc, yPos, 6);
    doc.text(splitSign[i], 20, yPos);
    yPos += 5;
  }
  yPos += 15;

  const col1Width = (pageWidth - 50) / 2;
  const col2X = 20 + col1Width + 10;

  doc.setDrawColor(...BRAND_COLORS.light);
  doc.roundedRect(20, yPos, col1Width, 45, 2, 2, 'S');
  doc.roundedRect(col2X, yPos, col1Width, 45, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text('LE VENDEUR', 25, yPos + 8);
  doc.text('L\'ACHETEUR', col2X + 5, yPos + 8);

  const employeeSig = data.employeeSignature;
  const signatureUrl = employeeSig?.signature_data || companyInfo.vendorSignatureUrl;
  const signerName = employeeSig?.full_name || companyInfo.name;

  if (signatureUrl) {
    try {
      console.log('[pdf-professional] Adding employee/vendor signature to contract');
      if (employeeSig) {
        console.log('[pdf-professional] Using employee signature:', employeeSig.full_name);
      } else {
        console.log('[pdf-professional] Using company vendor signature');
      }

      if (signatureUrl.startsWith('data:image/')) {
        doc.addImage(signatureUrl, 'PNG', 25, yPos + 12, 40, 15);
        console.log('[pdf-professional] Signature added successfully');
      } else {
        console.warn('[pdf-professional] Invalid signature URL format, skipping');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(signerName, 25, yPos + 32);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, 25, yPos + 37);
    } catch (error) {
      console.error('[pdf-professional] Error adding signature:', error);
      console.warn('[pdf-professional] Continuing without signature image');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(signerName, 25, yPos + 32);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, 25, yPos + 37);
    }
  } else {
    console.log('[pdf-professional] No employee or vendor signature provided');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(signerName, 25, yPos + 32);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, 25, yPos + 37);
  }

  if (signatureDataUrl) {
    let signatureAdded = false;
    try {
      console.log('[pdf-professional] Adding customer signature to contract');

      if (signatureDataUrl.startsWith('data:image/')) {
        const base64Data = signatureDataUrl.split(',')[1];
        if (base64Data && base64Data.length > 0) {
          doc.addImage(signatureDataUrl, 'PNG', col2X + 5, yPos + 12, 40, 15);
          signatureAdded = true;
          console.log('[pdf-professional] Customer signature added successfully');
        } else {
          console.warn('[pdf-professional] Signature base64 data is empty');
        }
      } else {
        console.warn('[pdf-professional] Invalid signature URL format');
      }
    } catch (error) {
      console.error('[pdf-professional] Error adding customer signature:', error);
      console.error('[pdf-professional] Signature URL length:', signatureDataUrl?.length || 0);
      console.warn('[pdf-professional] Contract will be generated without signature image');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${customer.first_name} ${customer.last_name}`, col2X + 5, yPos + 32);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, col2X + 5, yPos + 37);

    if (signatureAdded) {
      doc.text(`Signé électroniquement`, col2X + 5, yPos + 42);
    } else {
      doc.setTextColor(...BRAND_COLORS.warning);
      doc.text(`Signature non disponible`, col2X + 5, yPos + 42);
      doc.setTextColor(...BRAND_COLORS.text);
    }
  } else {
    console.log('[pdf-professional] No customer signature provided');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.line(col2X + 5, yPos + 25, col2X + col1Width - 5, yPos + 25);
    doc.text('Signature', col2X + 5, yPos + 30);
    doc.text('Date: _______________', col2X + 5, yPos + 37);
  }

  yPos += 55;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'F');
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.success);
  doc.text('CONTRAT VALIDE ET EXECUTOIRE', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text(`Document généré le ${new Date().toLocaleString('fr-CA')}`, pageWidth - 25, yPos, { align: 'right' });

  addFooter(doc, 2, 2, companyInfo);

  // NOUVELLE SECTION: Ajouter la facture client en annexe
  doc.addPage();
  yPos = 50;

  // En-tête de la section facture
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FACTURE CLIENT', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contrat N° ${warranty.contract_number}`, pageWidth / 2, 28, { align: 'center' });

  // Bannière d'information
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('FACTURE ANNEXÉE AU CONTRAT', 20, yPos);

  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textLight);
  doc.text(`Date d'émission: ${new Date(normalizedWarranty.created_at).toLocaleDateString('fr-CA')}`, 20, yPos);
  doc.text(`Date d'échéance: Immédiate`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Statut: PAYÉE`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;

  // Section vendeur et client
  const invoiceCol1Width = (pageWidth - 40) / 2;
  const invoiceCol2X = 20 + invoiceCol1Width + 5;

  yPos = addSection(doc, 'VENDEUR', yPos);
  const invoiceVendorLines = [
    companyInfo.name,
    companyInfo.address || '',
    companyInfo.phone ? `Tél: ${companyInfo.phone}` : '',
    companyInfo.email ? `Email: ${companyInfo.email}` : '',
    companyInfo.businessNumber ? `NEQ: ${companyInfo.businessNumber}` : '',
  ].filter(Boolean);
  yPos = addInfoBox(doc, 20, yPos, invoiceCol1Width, invoiceVendorLines);

  const invoiceCustomerYStart = yPos - invoiceVendorLines.length * 5 - 6 - 12;
  let invoiceCustomerY = addSection(doc, 'FACTURÉ À', invoiceCustomerYStart);
  const invoiceCustomerLines = [
    `${customer.first_name} ${customer.last_name}`,
    customer.address,
    `${customer.city}, ${customer.province} ${customer.postal_code}`,
    `Email: ${customer.email}`,
    `Tél: ${customer.phone}`,
  ];
  addInfoBox(doc, invoiceCol2X, invoiceCustomerY, invoiceCol1Width, invoiceCustomerLines);

  yPos += 10;
  yPos = addSection(doc, 'BIEN ASSURÉ', yPos);
  const invoiceTrailerLines = [
    `${trailer.year} ${trailer.make} ${trailer.model}`,
    `Type: ${trailer.trailer_type}`,
    `NIV: ${trailer.vin}`,
    `Prix d'achat: ${trailer.purchase_price.toLocaleString('fr-CA')} $`,
  ];
  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, invoiceTrailerLines);

  yPos += 10;
  yPos = addSection(doc, 'DÉTAILS DE LA COUVERTURE', yPos);

  // Add description and coverage details if available
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  if (plan.description) {
    yPos = checkPageBreak(doc, yPos, 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(plan.description, 170);

    // Render description line by line with page break checks
    for (let i = 0; i < descriptionLines.length; i++) {
      yPos = checkPageBreak(doc, yPos, 5);
      doc.text(descriptionLines[i], 20, yPos);
      yPos += 5;
    }
    yPos += 3;
  }

  if (plan.coverage_details) {
    yPos = checkPageBreak(doc, yPos, 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Couverture:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const coverageLines = doc.splitTextToSize(plan.coverage_details, 170);

    // Render coverage details line by line with page break checks
    for (let i = 0; i < coverageLines.length; i++) {
      yPos = checkPageBreak(doc, yPos, 5);
      doc.text(coverageLines[i], 20, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  // Tableau des items
  const invoiceTableData: any[] = [
    [
      'Plan de garantie',
      plan.name_fr || plan.name,
      `${safeNumber(normalizedWarranty.duration_months, 0)} mois`,
      `${safeToFixed(normalizedWarranty.base_price, 2)} $`
    ],
  ];

  const invoiceSelectedOptions = normalizedWarranty.selected_options as any[] || [];
  invoiceSelectedOptions.forEach((option: any) => {
    invoiceTableData.push([
      'Option additionnelle',
      option.name || 'Option',
      '-',
      `${safeToFixed(safeNumber(option.price, 0), 2)} $`
    ]);
  });

  (doc as any).autoTable({
    startY: yPos,
    head: [['Type', 'Description', 'Durée', 'Montant']],
    body: invoiceTableData,
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_COLORS.dark,
      textColor: BRAND_COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: BRAND_COLORS.text,
    },
    alternateRowStyles: {
      fillColor: BRAND_COLORS.light
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Résumé financier
  const invoiceSubtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(pageWidth - 90, yPos, 70, 35, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  doc.text('Sous-total:', pageWidth - 85, yPos + 8);
  doc.text(`${safeToFixed(invoiceSubtotal, 2)} $`, pageWidth - 25, yPos + 8, { align: 'right' });

  doc.text(`Taxes (${normalizedWarranty.province}):`, pageWidth - 85, yPos + 15);
  doc.text(`${safeToFixed(normalizedWarranty.taxes, 2)} $`, pageWidth - 25, yPos + 15, { align: 'right' });

  doc.setDrawColor(...BRAND_COLORS.textMedium);
  doc.line(pageWidth - 85, yPos + 19, pageWidth - 25, yPos + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('TOTAL:', pageWidth - 85, yPos + 27);
  doc.text(`${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD`, pageWidth - 25, yPos + 27, { align: 'right' });

  yPos += 45;

  // Conditions de paiement
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, pageWidth - 40, 20, 2, 2, 'F');
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.success);
  doc.text('CONDITIONS DE PAIEMENT', 25, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text('Paiement reçu en totalité. Cette facture accompagne le contrat de garantie ci-joint.', 25, yPos);

  yPos += 6;
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text(`Merci de votre confiance! Pour toute question, contactez-nous au ${companyInfo.phone || '[TÉLÉPHONE]'}`, 25, yPos);

  // Pied de page pour la facture
  addFooter(doc, 3, 3, companyInfo);

  return doc;
}

export function generateProfessionalMerchantInvoicePDF(data: InvoiceData): any {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available. Ensure loadPDFLibraries() was called first.');
  }

  const doc = new jsPDF();

  if (typeof (doc as any).autoTable !== 'function') {
    console.error('[pdf-generator-professional] autoTable is not a function on doc instance');
    throw new Error('autoTable plugin not available on jsPDF instance. PDF generation cannot proceed.');
  }
  const { warranty, customer, trailer, plan, companyInfo } = data;

  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  console.log('[pdf-generator-professional] Generating merchant invoice with normalized warranty');

  const pageWidth = doc.internal.pageSize.width;

  let yPos = addHeader(doc, 'FACTURE MARCHANDE', 'Document interne confidentiel');
  yPos += 5;

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('CONFIDENTIEL - USAGE INTERNE UNIQUEMENT', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text(`Généré le ${new Date().toLocaleString('fr-CA')}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;
  yPos = addSection(doc, 'Informations de la transaction', yPos);

  const transactionLines = [
    `Numéro de contrat: ${normalizedWarranty.contract_number}`,
    `Date de vente: ${new Date(normalizedWarranty.created_at).toLocaleDateString('fr-CA')} à ${new Date(normalizedWarranty.created_at).toLocaleTimeString('fr-CA')}`,
    normalizedWarranty.sale_duration_seconds ? `Durée de la vente: ${Math.floor(safeNumber(normalizedWarranty.sale_duration_seconds, 0) / 60)}m ${safeNumber(normalizedWarranty.sale_duration_seconds, 0) % 60}s` : '',
    `Vendeur: ${companyInfo.name}`,
    `Province: ${normalizedWarranty.province}`,
  ].filter(Boolean);
  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, transactionLines);

  yPos += 10;
  yPos = addSection(doc, 'Client', yPos);

  const clientLines = [
    `Nom: ${customer.first_name} ${customer.last_name}`,
    `Email: ${customer.email}`,
    `Téléphone: ${customer.phone}`,
    `Adresse: ${customer.address}, ${customer.city}, ${customer.province} ${customer.postal_code}`,
    customer.language_preference ? `Langue: ${customer.language_preference.toUpperCase()}` : '',
  ].filter(Boolean);
  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, clientLines);

  yPos += 10;
  yPos = addSection(doc, 'Bien assuré', yPos);

  const vehicleLines = [
    `${trailer.year} ${trailer.make} ${trailer.model}`,
    `Type: ${trailer.trailer_type}`,
    `NIV: ${trailer.vin}`,
    `Prix d'achat: ${safeLocaleString(trailer.purchase_price, 'fr-CA')} $ CAD`,
    trailer.license_plate ? `Plaque: ${trailer.license_plate}` : '',
  ].filter(Boolean);
  yPos = addInfoBox(doc, 20, yPos, pageWidth - 40, vehicleLines);

  yPos += 10;
  yPos = addSection(doc, 'Analyse financière', yPos);

  const tableData: any[] = [
    ['Plan de base', plan.name_fr || plan.name, `${safeToFixed(normalizedWarranty.base_price, 2)} $`, '100%'],
  ];

  const selectedOptions = normalizedWarranty.selected_options as any[] || [];
  selectedOptions.forEach((option: any) => {
    const optionPrice = safeNumber(option.price, 0);
    const basePrice = safeNumber(normalizedWarranty.base_price, 1);
    const percentage = basePrice > 0 ? ((optionPrice / basePrice) * 100) : 0;
    tableData.push([
      'Option',
      option.name || 'Option additionnelle',
      `${safeToFixed(optionPrice, 2)} $`,
      `${safeToFixed(percentage, 1)}%`
    ]);
  });

  const subtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  const tps = safeNumber(subtotal, 0) * 0.05;
  const tvq = safeNumber(subtotal, 0) * 0.09975;

  tableData.push(['', 'Sous-total', `${safeToFixed(subtotal, 2)} $`, '']);
  tableData.push(['', 'TPS (5%)', `${safeToFixed(tps, 2)} $`, '']);
  tableData.push(['', 'TVQ (9.975%)', `${safeToFixed(tvq, 2)} $`, '']);
  tableData.push(['', 'TOTAL', `${safeToFixed(normalizedWarranty.total_price, 2)} $`, '']);

  (doc as any).autoTable({
    startY: yPos,
    head: [['Type', 'Description', 'Montant', '% du plan']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: BRAND_COLORS.dark,
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: BRAND_COLORS.text,
    },
    alternateRowStyles: {
      fillColor: BRAND_COLORS.light,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 80 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  yPos = addSection(doc, 'Métriques de performance', yPos);

  const metrics = [
    `Revenu total: ${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD`,
    `Marge brute: ${safeToFixed(safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price), 2)} $ (avant taxes)`,
    `Options vendues: ${selectedOptions.length}`,
    `Duree de vente: ${normalizedWarranty.sale_duration_seconds ? `${Math.floor(safeNumber(normalizedWarranty.sale_duration_seconds, 0) / 60)}m ${safeNumber(normalizedWarranty.sale_duration_seconds, 0) % 60}s` : 'N/A'}`,
    `Periode de couverture: ${safeNumber(normalizedWarranty.duration_months, 0)} mois (${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')} - ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')})`,
    `Statut paiement: ${normalizedWarranty.payment_status === 'paid' ? 'PAYE' : 'EN ATTENTE'}`,
  ];

  metrics.forEach(metric => {
    yPos = checkPageBreak(doc, yPos, 7);
    doc.setFontSize(9);
    doc.text(metric, 25, yPos);
    yPos += 6;
  });

  yPos += 10;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, yPos, pageWidth - 40, 20, 2, 2, 'F');
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.text('NOTES INTERNES', 25, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text('Espace réservé pour notes additionnelles ou commentaires spécifiques à cette vente.', 25, yPos);

  addFooter(doc, 1, 1, companyInfo);

  return doc;
}
