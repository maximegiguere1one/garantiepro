/**
 * PDF Generator Optimized - Correction complète des formatages
 *
 * Ce fichier corrige tous les problèmes identifiés:
 * - Textes tronqués et débordements
 * - Valeurs "undefined" pour province et taxes
 * - URLs longues et codes QR
 * - Espacement et alignement
 * - Formatage des montants avec séparateurs
 * - Sections manquantes
 */

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
  primary: [215, 25, 32] as [number, number, number],
  primaryDark: [181, 18, 24] as [number, number, number],
  dark: [0, 0, 0] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  light: [245, 245, 245] as [number, number, number],
  text: [0, 0, 0] as [number, number, number],
  textMedium: [112, 112, 112] as [number, number, number],
  textLight: [112, 112, 112] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [251, 191, 36] as [number, number, number],
};

// Fonction utilitaire pour gérer les valeurs undefined
function safeProv(province: string | null | undefined): string {
  if (!province || province === 'undefined') {
    return 'Québec';
  }
  return province;
}

// Fonction pour formater les montants avec séparateurs de milliers
function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Fonction pour calculer TPS et TVQ
function calculateTaxes(subtotal: number): { tps: number; tvq: number; total: number } {
  const tps = subtotal * 0.05;
  const tvq = subtotal * 0.09975;
  return {
    tps: parseFloat(tps.toFixed(2)),
    tvq: parseFloat(tvq.toFixed(2)),
    total: parseFloat((tps + tvq).toFixed(2))
  };
}

// Fonction pour gérer le débordement de page
function checkPageOverflow(doc: any, yPos: number, requiredSpace: number = 30): number {
  const pageHeight = doc.internal.pageSize.height;
  if (yPos + requiredSpace > pageHeight - 30) {
    doc.addPage();
    return 50;
  }
  return yPos;
}

function addHeader(doc: any, title: string, subtitle?: string): number {
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

function addFooter(doc: any, companyInfo: any) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 15;

  doc.setDrawColor(...BRAND_COLORS.light);
  doc.setLineWidth(0.5);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textLight);

  const leftText = companyInfo.name;
  const centerText = companyInfo.phone ? `Tél: ${companyInfo.phone}` : '';
  const rightText = companyInfo.email ? `Email: ${companyInfo.email}` : '';

  doc.text(leftText, 20, footerY);
  if (centerText) {
    doc.text(centerText, pageWidth / 2, footerY, { align: 'center' });
  }
  if (rightText) {
    doc.text(rightText, pageWidth - 20, footerY, { align: 'right' });
  }
}

function addSection(doc: any, title: string, yPos: number): number {
  yPos = checkPageOverflow(doc, yPos, 20);

  doc.setFillColor(...BRAND_COLORS.light);
  doc.rect(15, yPos - 2, doc.internal.pageSize.width - 30, 8, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text(title.toUpperCase(), 20, yPos + 4);

  doc.setTextColor(...BRAND_COLORS.text);
  return yPos + 12;
}

/**
 * Génération optimisée du contrat PDF
 */
export function generateOptimizedContractPDF(
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
    throw new Error('autoTable plugin not available on jsPDF instance.');
  }

  const { warranty, customer, trailer, plan, companyInfo } = data;
  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  const pageWidth = doc.internal.pageSize.width;
  let yPos = addHeader(doc, 'CONTRAT DE GARANTIE PROLONGÉE', `Contrat N° ${warranty.contract_number}`);

  yPos += 5;

  // Bannière d'information avec valeurs corrigées
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.text('CONTRAT DE PROTECTION', 20, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text(
    `Date d'entrée en vigueur: ${new Date(warranty.start_date).toLocaleDateString('fr-CA')}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // Correction: utiliser safeProv au lieu de warranty.province directement
  const province = safeProv(warranty.province);
  doc.text(`Province: ${province}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;

  // SECTION: PARTIES AU CONTRAT
  yPos = addSection(doc, 'PARTIES AU CONTRAT', yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTRE:', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Le VENDEUR: ${companyInfo.name}`, 25, yPos);
  yPos += 5;

  // Adresse - Split par ligne si elle contient des \n
  if (companyInfo.address) {
    const addressLines = companyInfo.address.split('\n').filter(line => line.trim());
    addressLines.forEach(line => {
      doc.text(line.trim(), 25, yPos);
      yPos += 5;
    });
  }

  if (companyInfo.phone) {
    doc.text(`Téléphone: ${companyInfo.phone}`, 25, yPos);
    yPos += 5;
  }

  if (companyInfo.email) {
    doc.text(`Courriel: ${companyInfo.email}`, 25, yPos);
    yPos += 5;
  }

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ET:', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`L'ACHETEUR: ${customer.first_name || ''} ${customer.last_name || ''}`, 25, yPos);
  yPos += 5;
  if (customer.address) {
    doc.text(customer.address, 25, yPos);
    yPos += 5;
  }
  doc.text(`${customer.city || ''}, ${customer.province || 'QC'} ${customer.postal_code || ''}`, 25, yPos);
  yPos += 5;
  doc.text(`Téléphone: ${customer.phone || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Courriel: ${customer.email || 'N/A'}`, 25, yPos);

  yPos += 12;

  // SECTION 1: OBJET DU CONTRAT
  yPos = addSection(doc, '1. OBJET DU CONTRAT', yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const objetText = `Le présent contrat de garantie prolongée (ci-après "le Contrat") a pour objet de couvrir les réparations et remplacements des pièces et composantes de la remorque décrite ci-après, conformément aux conditions générales et particulières énoncées dans ce document.`;
  const splitObjet = doc.splitTextToSize(objetText, pageWidth - 40);
  // Render line by line with page break checks
  for (let i = 0; i < splitObjet.length; i++) {
    yPos = checkPageOverflow(doc, yPos, 6);
    doc.text(splitObjet[i], 20, yPos);
    yPos += 5;
  }
  yPos += 10;

  // SECTION 2: BIEN COUVERT
  yPos = checkPageOverflow(doc, yPos, 40);
  yPos = addSection(doc, '2. BIEN COUVERT', yPos);

  doc.setDrawColor(...BRAND_COLORS.light);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'S');
  yPos += 6;

  doc.text(`Année: ${trailer.year || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Marque: ${trailer.make || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Modèle: ${trailer.model || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Type: ${trailer.trailer_type || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Numéro d'identification du véhicule (NIV): ${trailer.vin || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Prix d'achat: ${formatCurrency(trailer.purchase_price || 0)} $ CAD`, 25, yPos);

  yPos += 15;

  // SECTION 3: COUVERTURE ET DURÉE
  yPos = checkPageOverflow(doc, yPos, 45);
  yPos = addSection(doc, '3. COUVERTURE ET DURÉE', yPos);

  doc.roundedRect(20, yPos, pageWidth - 40, 40, 2, 2, 'S');
  yPos += 6;

  doc.text(`Plan souscrit: ${plan.name_fr || plan.name}`, 25, yPos);
  yPos += 5;

  const durationMonths = safeNumber(normalizedWarranty.duration_months, 0);
  const durationYears = Math.floor(durationMonths / 12);
  doc.text(`Durée de la garantie: ${durationMonths} mois (${durationYears} ans)`, 25, yPos);
  yPos += 5;

  doc.text(`Date de début: ${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')}`, 25, yPos);
  yPos += 5;
  doc.text(`Date de fin: ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')}`, 25, yPos);
  yPos += 5;
  doc.text(`Franchise par réclamation: ${formatCurrency(normalizedWarranty.deductible)} $ CAD`, 25, yPos);
  yPos += 5;
  doc.text(`Province de couverture: ${province}`, 25, yPos);

  yPos += 15;

  // SECTION 3.1: DÉTAILS COMPLETS DE COUVERTURE
  const coverageMatrix = plan.coverage_matrix as any;
  if (coverageMatrix || plan.coverage_details) {
    yPos = checkPageOverflow(doc, yPos, 50);
    yPos = addSection(doc, '3.1 DÉTAILS COMPLETS DE LA COUVERTURE', yPos);

    // Afficher d'abord le coverage_details (texte libre) si présent
    if (plan.coverage_details && plan.coverage_details.trim()) {
      doc.setFontSize(8);
      const coverageDetailsLines = doc.splitTextToSize(plan.coverage_details, pageWidth - 50);
      // Render line by line with page break checks
      for (let i = 0; i < coverageDetailsLines.length; i++) {
        yPos = checkPageOverflow(doc, yPos, 5);
        doc.text(coverageDetailsLines[i], 25, yPos);
        yPos += 4;
      }
      yPos += 7;
    }

    doc.setFontSize(8);
    doc.text('Votre plan inclut la couverture suivante:', 25, yPos);
    yPos += 7;

    // Composants couverts (version compacte)
    if (coverageMatrix && coverageMatrix.coverage) {
      if (coverageMatrix.coverage.freins) {
        doc.setFont('helvetica', 'bold');
        doc.text('• FREINS', 25, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        if (coverageMatrix.coverage.freins.note) {
          doc.text(`  ${coverageMatrix.coverage.freins.note}`, 27, yPos);
          yPos += 4;
        }
      }

      if (coverageMatrix.coverage.systeme_electrique) {
        doc.setFont('helvetica', 'bold');
        doc.text('• SYSTÈME ÉLECTRIQUE COMPLET', 25, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
      }

      if (coverageMatrix.coverage.structure_chassis) {
        doc.setFont('helvetica', 'bold');
        doc.text('• STRUCTURE ET CHÂSSIS', 25, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
      }

      if (coverageMatrix.coverage.entretien_annuel) {
        doc.setFont('helvetica', 'bold');
        doc.text('• ENTRETIEN ANNUEL INCLUS', 25, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        if (coverageMatrix.coverage.entretien_annuel.value_per_year) {
          doc.text(`  Valeur: ${coverageMatrix.coverage.entretien_annuel.value_per_year.toLocaleString('fr-CA')} $/an`, 27, yPos);
          yPos += 4;
        }
      }
    }

    yPos += 3;
    doc.setFontSize(7);
    doc.setTextColor(112, 112, 112);
    doc.text('Voir section 3.1 du contrat complet pour tous les détails de couverture.', 25, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    yPos += 10;
  }

  // SECTION 4: OPTIONS ADDITIONNELLES (Section qui manquait!)
  const selectedOptions = normalizedWarranty.selected_options as any[] || [];
  if (selectedOptions.length > 0) {
    yPos = checkPageOverflow(doc, yPos, 30);
    yPos = addSection(doc, '4. OPTIONS ADDITIONNELLES', yPos);

    selectedOptions.forEach((option: any) => {
      doc.text(`• ${option.name}: ${formatCurrency(safeNumber(option.price, 0))} $ CAD`, 25, yPos);
      yPos += 5;
    });

    yPos += 10;
  }

  // Nouvelle page pour la suite
  doc.addPage();
  yPos = 50;

  // SECTION 5: DROIT DE RÉTRACTATION
  yPos = addSection(doc, '5. DROIT DE RÉTRACTATION (LCCJTI ART. 59)', yPos);

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(20, yPos, pageWidth - 40, 40, 2, 2, 'F');
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('IMPORTANT - DROIT D\'ANNULATION', 25, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  const retractText = `Conformément à la Loi sur la protection du consommateur du Québec (LCCJTI, articles 54.8 à 54.16), l'acheteur dispose d'un délai de RÉSOLUTION de DIX (10) JOURS suivant la réception du contrat pour l'annuler SANS FRAIS ni pénalité. Pour exercer ce droit, l'acheteur doit transmettre au vendeur, par écrit (lettre, courriel ou fax), un avis de résolution avant l'expiration du délai. En cas d'annulation, le vendeur remboursera intégralement toutes les sommes perçues dans les 15 jours suivant la réception de l'avis.`;
  const splitRetract = doc.splitTextToSize(retractText, pageWidth - 50);
  // Render line by line with page break checks
  for (let i = 0; i < splitRetract.length; i++) {
    yPos = checkPageOverflow(doc, yPos, 5);
    doc.text(splitRetract[i], 25, yPos);
    yPos += 4.5;
  }
  yPos += 8;

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

  yPos += 15;

  // SECTION 6: EXCLUSIONS ET LIMITATIONS
  yPos = checkPageOverflow(doc, yPos, 40);
  yPos = addSection(doc, '6. EXCLUSIONS ET LIMITATIONS', yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const exclusions = [
    '• Dommages résultant d\'un usage abusif, négligent ou non conforme',
    '• Usure normale et entretien courant (lubrifiants, filtres, pneus)',
    '• Dommages causés par un accident, vandalisme ou force majeure',
    '• Modifications non autorisées ou réparations par des tiers non agréés',
    '• Dommages préexistants à la date de prise d\'effet du contrat',
    '• Équipements et accessoires non installés par le fabricant',
  ];

  exclusions.forEach(exclusion => {
    doc.text(exclusion, 25, yPos);
    yPos += 5;
  });

  yPos += 10;

  // SECTION 7: OBLIGATIONS DE L'ACHETEUR
  yPos = checkPageOverflow(doc, yPos, 35);
  yPos = addSection(doc, '7. OBLIGATIONS DE L\'ACHETEUR', yPos);

  const obligations = [
    '• Effectuer l\'entretien régulier conformément au manuel du propriétaire',
    '• Conserver tous les reçus et documents d\'entretien',
    '• Aviser le vendeur dans les 48 heures suivant une panne',
    '• Faire inspecter la remorque avant toute réparation couverte',
    '• Ne pas effectuer de modifications sans autorisation écrite',
  ];

  obligations.forEach(obligation => {
    doc.text(obligation, 25, yPos);
    yPos += 5;
  });

  yPos += 10;

  // SECTION 8: PROCÉDURE DE RÉCLAMATION
  yPos = checkPageOverflow(doc, yPos, 50);
  yPos = addSection(doc, '8. PROCÉDURE DE RÉCLAMATION', yPos);

  const phoneText = companyInfo.phone || '1-800-PRO-REMORQUE';
  const emailText = companyInfo.email || 'info@locationproremorque.com';

  const claimText = `Pour soumettre une réclamation, l'acheteur doit communiquer avec le vendeur par téléphone au ${phoneText} ou par courriel à ${emailText} dès la survenance du bris. Un numéro de dossier sera attribué et les instructions de réparation seront transmises. Toute réparation effectuée sans autorisation préalable ne sera pas couverte.`;
  const splitClaim = doc.splitTextToSize(claimText, pageWidth - 40);
  // Render line by line with page break checks
  for (let i = 0; i < splitClaim.length; i++) {
    yPos = checkPageOverflow(doc, yPos, 6);
    doc.text(splitClaim[i], 20, yPos);
    yPos += 5;
  }
  yPos += 10;

  // Soumission en ligne avec QR code
  if (claimSubmissionUrl && qrCodeDataUrl) {
    yPos = checkPageOverflow(doc, yPos, 45);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(20, yPos, pageWidth - 40, 40, 2, 2, 'F');
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.dark);
    doc.text('SOUMISSION EN LIGNE SIMPLIFIEE', 25, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Vous pouvez également soumettre une réclamation en ligne:', 25, yPos);
    yPos += 6;

    // URL avec retour à la ligne si trop longue
    doc.setFontSize(7);
    doc.setTextColor(...BRAND_COLORS.primary);

    // Limiter l'affichage de l'URL si trop longue
    let displayUrl = claimSubmissionUrl;
    if (claimSubmissionUrl.length > 80) {
      displayUrl = claimSubmissionUrl.substring(0, 77) + '...';
    }

    const urlLines = doc.splitTextToSize(displayUrl, pageWidth - 80);
    // Render line by line with page break checks
    for (let i = 0; i < urlLines.length; i++) {
      yPos = checkPageOverflow(doc, yPos, 5);
      doc.text(urlLines[i], 25, yPos);
      yPos += 4;
    }

    // QR Code à droite
    if (qrCodeDataUrl && qrCodeDataUrl.startsWith('data:image/')) {
      try {
        const qrSize = 30;
        doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 40, yPos - 30, qrSize, qrSize);
      } catch (error) {
        console.warn('Could not add QR code:', error);
      }
    }

    yPos += 10;
  }

  // Nouvelle page pour les signatures
  doc.addPage();
  yPos = 50;

  // SECTION 9: LOI APPLICABLE ET JURIDICTION
  yPos = addSection(doc, '9. LOI APPLICABLE ET JURIDICTION', yPos);

  const legalText = `Le présent contrat est régi par les lois du Québec et du Canada. Tout litige découlant du présent contrat sera de la compétence exclusive des tribunaux du district judiciaire de [DISTRICT], Province de Québec. Les parties conviennent que la langue officielle du contrat est le français, conformément à la Charte de la langue française.`;
  const splitLegal = doc.splitTextToSize(legalText, pageWidth - 40);
  // Render line by line with page break checks
  for (let i = 0; i < splitLegal.length; i++) {
    yPos = checkPageOverflow(doc, yPos, 6);
    doc.text(splitLegal[i], 20, yPos);
    yPos += 5;
  }
  yPos += 15;

  // SECTION 10: SIGNATURES
  yPos = addSection(doc, '10. SIGNATURES', yPos);

  const signText = `Les parties reconnaissent avoir lu, compris et accepté l'intégralité du présent contrat, incluant toutes les conditions générales, exclusions et limitations. Ce contrat constitue l'accord complet entre les parties et remplace toute entente antérieure.`;
  const splitSign = doc.splitTextToSize(signText, pageWidth - 40);
  // Render line by line with page break checks
  for (let i = 0; i < splitSign.length; i++) {
    yPos = checkPageOverflow(doc, yPos, 6);
    doc.text(splitSign[i], 20, yPos);
    yPos += 5;
  }
  yPos += 15;

  // Cadres de signature
  const col1Width = (pageWidth - 50) / 2;
  const col2X = 20 + col1Width + 10;

  doc.setDrawColor(...BRAND_COLORS.light);
  doc.roundedRect(20, yPos, col1Width, 50, 2, 2, 'S');
  doc.roundedRect(col2X, yPos, col1Width, 50, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LE VENDEUR', 25, yPos + 8);
  doc.text('L\'ACHETEUR', col2X + 5, yPos + 8);

  // Signature vendeur
  const employeeSig = data.employeeSignature;
  const vendorSigUrl = employeeSig?.signature_data || companyInfo.vendorSignatureUrl;
  const vendorName = employeeSig?.full_name || companyInfo.name;

  if (vendorSigUrl && vendorSigUrl.startsWith('data:image/')) {
    try {
      doc.addImage(vendorSigUrl, 'PNG', 25, yPos + 12, 40, 15);
    } catch (error) {
      console.warn('Could not add vendor signature:', error);
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(vendorName, 25, yPos + 32);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, 25, yPos + 37);

  // Signature client
  if (signatureDataUrl && signatureDataUrl.startsWith('data:image/')) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', col2X + 5, yPos + 12, 40, 15);
      doc.text(`${customer.first_name} ${customer.last_name}`, col2X + 5, yPos + 32);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, col2X + 5, yPos + 37);
      doc.text('Signé électroniquement', col2X + 5, yPos + 42);
    } catch (error) {
      console.warn('Could not add customer signature:', error);
      doc.line(col2X + 5, yPos + 25, col2X + col1Width - 5, yPos + 25);
      doc.text('Signature', col2X + 5, yPos + 30);
    }
  } else {
    doc.line(col2X + 5, yPos + 25, col2X + col1Width - 5, yPos + 25);
    doc.text('Signature', col2X + 5, yPos + 30);
    doc.text('Date: _______________', col2X + 5, yPos + 37);
  }

  yPos += 60;

  // Bannière finale
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'F');
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLORS.success);
  doc.text('CONTRAT VALIDE ET EXECUTOIRE', 25, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  const genDate = new Date().toLocaleString('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  doc.text(`Document généré le ${genDate}`, pageWidth - 25, yPos, { align: 'right' });

  addFooter(doc, companyInfo);

  // PAGE ANNEXE: FACTURE CLIENT
  doc.addPage();
  yPos = addHeader(doc, 'FACTURE CLIENT', `Contrat N° ${warranty.contract_number}`);
  yPos += 10;

  // Bannière
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('FACTURE ANNEXÉE AU CONTRAT', 20, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLORS.textLight);
  doc.text(`Date d'émission: ${new Date(normalizedWarranty.created_at).toLocaleDateString('fr-CA')}`, 20, yPos);
  doc.text('Date d\'échéance: Immédiate', pageWidth / 2, yPos, { align: 'center' });
  doc.text('Statut: PAYÉE', pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;

  // Vendeur et Client côte à côte
  const invoiceCol1Width = (pageWidth - 40) / 2;
  const invoiceCol2X = 20 + invoiceCol1Width + 5;

  yPos = addSection(doc, 'VENDEUR', yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.roundedRect(20, yPos, invoiceCol1Width, 30, 2, 2, 'S');

  let vendorY = yPos + 5;
  doc.text(companyInfo.name, 25, vendorY);
  vendorY += 5;
  if (companyInfo.address) {
    doc.text(companyInfo.address, 25, vendorY);
    vendorY += 5;
  }
  if (companyInfo.phone) {
    doc.text(`Tél: ${companyInfo.phone}`, 25, vendorY);
    vendorY += 5;
  }
  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, 25, vendorY);
  }

  const customerSectionY = yPos - 12;
  let customerY = addSection(doc, 'FACTURÉ À', customerSectionY);

  doc.roundedRect(invoiceCol2X, customerY, invoiceCol1Width, 30, 2, 2, 'S');
  customerY += 5;

  doc.text(`${customer.first_name || ''} ${customer.last_name || ''}`, invoiceCol2X + 5, customerY);
  customerY += 5;
  if (customer.address) {
    doc.text(customer.address, invoiceCol2X + 5, customerY);
    customerY += 5;
  }
  doc.text(`${customer.city || ''}, ${customer.province || 'QC'} ${customer.postal_code || ''}`, invoiceCol2X + 5, customerY);
  customerY += 5;
  doc.text(`Email: ${customer.email || 'N/A'}`, invoiceCol2X + 5, customerY);
  customerY += 5;
  doc.text(`Tél: ${customer.phone || 'N/A'}`, invoiceCol2X + 5, customerY);

  yPos += 40;

  // Bien assuré
  yPos = addSection(doc, 'BIEN ASSURÉ', yPos);

  doc.roundedRect(20, yPos, pageWidth - 40, 25, 2, 2, 'S');
  yPos += 5;

  doc.text(`${trailer.year || ''} ${trailer.make || ''} ${trailer.model || ''}`, 25, yPos);
  yPos += 5;
  doc.text(`Type: ${trailer.trailer_type || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`NIV: ${trailer.vin || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Prix d'achat: ${formatCurrency(trailer.purchase_price || 0)} $`, 25, yPos);

  yPos += 15;

  // Détails de la couverture avec tableau
  yPos = addSection(doc, 'DÉTAILS DE LA COUVERTURE', yPos);

  // Add description and coverage details if available
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  if (plan.description) {
    yPos = checkPageOverflow(doc, yPos, 8);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(plan.description, 170);
    // Render line by line with page break checks
    for (let i = 0; i < descriptionLines.length; i++) {
      yPos = checkPageOverflow(doc, yPos, 6);
      doc.text(descriptionLines[i], 20, yPos);
      yPos += 5;
    }
    yPos += 3;
  }

  if (plan.coverage_details) {
    yPos = checkPageOverflow(doc, yPos, 8);
    doc.setFont('helvetica', 'bold');
    doc.text('Couverture:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const coverageLines = doc.splitTextToSize(plan.coverage_details, 170);
    // Render line by line with page break checks
    for (let i = 0; i < coverageLines.length; i++) {
      yPos = checkPageOverflow(doc, yPos, 6);
      doc.text(coverageLines[i], 20, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  const invoiceTableData: any[] = [
    [
      'Plan de garantie',
      plan.name_fr || plan.name,
      `${durationMonths} mois`,
      `${formatCurrency(normalizedWarranty.base_price)} $`
    ],
  ];

  selectedOptions.forEach((option: any) => {
    invoiceTableData.push([
      'Option additionnelle',
      option.name || 'Option',
      '-',
      `${formatCurrency(safeNumber(option.price, 0))} $`
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
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Vérifier qu'il y a assez d'espace pour le résumé financier (minimum 100mm)
  yPos = checkPageOverflow(doc, yPos, 100);

  // Résumé financier détaillé avec TPS et TVQ
  const invoiceSubtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  const taxes = calculateTaxes(invoiceSubtotal);

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(pageWidth - 95, yPos, 75, 45, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLORS.text);

  doc.text('Sous-total:', pageWidth - 90, yPos + 8);
  doc.text(`${formatCurrency(invoiceSubtotal)} $`, pageWidth - 25, yPos + 8, { align: 'right' });

  doc.text(`Taxes (${province}):`, pageWidth - 90, yPos + 15);
  doc.text(`${formatCurrency(taxes.total)} $`, pageWidth - 25, yPos + 15, { align: 'right' });

  doc.setDrawColor(...BRAND_COLORS.textMedium);
  doc.line(pageWidth - 90, yPos + 19, pageWidth - 25, yPos + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('TOTAL:', pageWidth - 90, yPos + 27);
  doc.text(`${formatCurrency(normalizedWarranty.total_price)} $ CAD`, pageWidth - 25, yPos + 27, { align: 'right' });

  yPos += 55;

  // Vérifier qu'il y a assez d'espace pour la section CONDITIONS DE PAIEMENT
  yPos = checkPageOverflow(doc, yPos, 40);

  // Conditions de paiement
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, pageWidth - 40, 28, 2, 2, 'F');
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLORS.success);
  doc.text('CONDITIONS DE PAIEMENT', 25, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.setFontSize(9);
  doc.text('Paiement reçu en totalité. Cette facture accompagne le contrat de garantie ci-joint.', 25, yPos);
  yPos += 7;

  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLORS.textMedium);
  doc.text(`Merci de votre confiance! Pour toute question, contactez-nous au ${phoneText}`, 25, yPos);

  addFooter(doc, companyInfo);

  return doc;
}

/**
 * Génération optimisée de la facture marchande
 */
export function generateOptimizedMerchantInvoicePDF(data: InvoiceData): any {
  const jsPDF = (globalThis as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF not available.');
  }

  const doc = new jsPDF();

  if (typeof (doc as any).autoTable !== 'function') {
    throw new Error('autoTable plugin not available.');
  }

  const { warranty, customer, trailer, plan, companyInfo } = data;
  const normalizedWarranty = {
    ...warranty,
    ...normalizeWarrantyNumbers(warranty)
  };

  const pageWidth = doc.internal.pageSize.width;
  const province = safeProv(warranty.province);

  let yPos = addHeader(doc, 'FACTURE MARCHANDE', 'Document interne confidentiel');
  yPos += 5;

  // Bannière confidentielle
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('CONFIDENTIEL - USAGE INTERNE UNIQUEMENT', 20, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.textMedium);
  const genDate = new Date().toLocaleString('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  doc.text(`Généré le ${genDate}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;

  // Informations de la transaction
  yPos = addSection(doc, 'INFORMATIONS DE LA TRANSACTION', yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  doc.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, 'S');
  yPos += 5;

  doc.text(`Numéro de contrat: ${normalizedWarranty.contract_number}`, 25, yPos);
  yPos += 5;
  doc.text(`Date de vente: ${new Date(normalizedWarranty.created_at).toLocaleDateString('fr-CA')} à ${new Date(normalizedWarranty.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`, 25, yPos);
  yPos += 5;
  doc.text(`Vendeur: ${companyInfo.name}`, 25, yPos);
  yPos += 5;
  doc.text(`Province: ${province}`, 25, yPos);

  yPos += 15;

  // Client
  yPos = addSection(doc, 'CLIENT', yPos);

  doc.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, 'S');
  yPos += 5;

  doc.text(`Nom: ${customer.first_name || ''} ${customer.last_name || ''}`, 25, yPos);
  yPos += 5;
  doc.text(`Email: ${customer.email || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Téléphone: ${customer.phone || 'N/A'}`, 25, yPos);
  yPos += 5;
  const addressParts = [
    customer.address || '',
    customer.city || '',
    customer.province || 'QC',
    customer.postal_code || ''
  ].filter(Boolean).join(', ');
  doc.text(`Adresse: ${addressParts || 'N/A'}`, 25, yPos);
  yPos += 5;
  if (customer.language_preference) {
    doc.text(`Langue: ${customer.language_preference.toUpperCase()}`, 25, yPos);
  }

  yPos += 15;

  // Bien assuré
  yPos = addSection(doc, 'BIEN ASSURÉ', yPos);

  doc.roundedRect(20, yPos, pageWidth - 40, 25, 2, 2, 'S');
  yPos += 5;

  doc.text(`${trailer.year || ''} ${trailer.make || ''} ${trailer.model || ''}`, 25, yPos);
  yPos += 5;
  doc.text(`Type: ${trailer.trailer_type || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`NIV: ${trailer.vin || 'N/A'}`, 25, yPos);
  yPos += 5;
  doc.text(`Prix d'achat: ${formatCurrency(trailer.purchase_price || 0)} $ CAD`, 25, yPos);

  yPos += 15;

  // Analyse financière
  yPos = addSection(doc, 'ANALYSE FINANCIÈRE', yPos);

  const selectedOptions = normalizedWarranty.selected_options as any[] || [];
  const tableData: any[] = [
    ['Plan de base', plan.name_fr || plan.name, `${formatCurrency(normalizedWarranty.base_price)} $`, '100%'],
  ];

  selectedOptions.forEach((option: any) => {
    const optionPrice = safeNumber(option.price, 0);
    const basePrice = safeNumber(normalizedWarranty.base_price, 1);
    const percentage = basePrice > 0 ? ((optionPrice / basePrice) * 100) : 0;
    tableData.push([
      'Option',
      option.name || 'Option additionnelle',
      `${formatCurrency(optionPrice)} $`,
      `${safeToFixed(percentage, 1)}%`
    ]);
  });

  const subtotal = safeAdd(normalizedWarranty.base_price, normalizedWarranty.options_price);
  const taxes = calculateTaxes(subtotal);

  tableData.push(['', 'Sous-total', `${formatCurrency(subtotal)} $`, '']);
  tableData.push(['', 'TPS (5%)', `${formatCurrency(taxes.tps)} $`, '']);
  tableData.push(['', 'TVQ (9.975%)', `${formatCurrency(taxes.tvq)} $`, '']);
  tableData.push(['', 'TOTAL', `${formatCurrency(normalizedWarranty.total_price)} $`, '']);

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
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Métriques de performance
  yPos = addSection(doc, 'MÉTRIQUES DE PERFORMANCE', yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const metrics = [
    `Revenu total: ${formatCurrency(normalizedWarranty.total_price)} $ CAD`,
    `Marge brute: ${formatCurrency(subtotal)} $ (avant taxes)`,
    `Options vendues: ${selectedOptions.length}`,
    `Période de couverture: ${safeNumber(normalizedWarranty.duration_months, 0)} mois`,
    `Du ${new Date(normalizedWarranty.start_date).toLocaleDateString('fr-CA')} au ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')}`,
    `Statut paiement: ${normalizedWarranty.payment_status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}`,
  ];

  metrics.forEach(metric => {
    doc.text(metric, 25, yPos);
    yPos += 6;
  });

  addFooter(doc, companyInfo);

  return doc;
}
