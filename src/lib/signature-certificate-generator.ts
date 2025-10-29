import jsPDF from 'jspdf';
import { formatDateForLegal, getBrowserInfo } from './legal-signature-utils';

interface CertificateData {
  warrantyNumber: string;
  contractNumber: string;
  signerFullName: string;
  signerEmail: string;
  signerPhone?: string;
  signedAt: Date;
  documentHash: string;
  documentVersion: string;
  ipAddress?: string;
  userAgent: string;
  geolocation?: { latitude: number; longitude: number };
  documentViewedAt: Date;
  documentViewDuration: number;
  consentTimestamp: Date;
  sessionId: string;
  companyName: string;
  language?: 'fr' | 'en';
}

export function generateSignatureCertificate(data: CertificateData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const isFrench = data.language === 'fr' || !data.language;

  let yPos = 20;

  // Header avec bordure
  doc.setFillColor(240, 248, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(0, 40, pageWidth, 40);

  // Titre
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  const title = isFrench ? 'CERTIFICAT DE SIGNATURE ÉLECTRONIQUE' : 'ELECTRONIC SIGNATURE CERTIFICATE';
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const subtitle = isFrench ? 'Conforme LCCJTI (Québec) et LPRPDE (Canada)' : 'Compliant with AECST (Quebec) and PIPEDA (Canada)';
  doc.text(subtitle, pageWidth / 2, 30, { align: 'center' });

  yPos = 55;

  // Section: Informations du document
  doc.setFillColor(249, 250, 251);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 35, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(isFrench ? '📄 DOCUMENT SIGNÉ' : '📄 SIGNED DOCUMENT', marginLeft, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  doc.text(isFrench ? 'Contrat de garantie:' : 'Warranty contract:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(data.contractNumber, marginLeft + 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Numéro de garantie:' : 'Warranty number:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(data.warrantyNumber, marginLeft + 60, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Date de signature:' : 'Signature date:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateForLegal(data.signedAt), marginLeft + 60, yPos);

  yPos += 15;

  // Section: Signataire
  doc.setFillColor(249, 250, 251);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 30, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(isFrench ? '👤 SIGNATAIRE' : '👤 SIGNATORY', marginLeft, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  doc.text(isFrench ? 'Nom complet:' : 'Full name:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(data.signerFullName, marginLeft + 40, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Courriel:' : 'Email:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(data.signerEmail, marginLeft + 40, yPos);

  if (data.signerPhone) {
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(isFrench ? 'Téléphone:' : 'Phone:', marginLeft, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(data.signerPhone, marginLeft + 40, yPos);
  }

  yPos += 15;

  // Section: Preuve d'intégrité
  doc.setFillColor(254, 249, 195);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 25, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(isFrench ? '🔒 PREUVE D\'INTÉGRITÉ' : '🔒 PROOF OF INTEGRITY', marginLeft, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  doc.text(isFrench ? 'Hash SHA-256:' : 'SHA-256 Hash:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  const hashLines = doc.splitTextToSize(data.documentHash, contentWidth - 40);
  doc.text(hashLines, marginLeft + 35, yPos);

  yPos += hashLines.length * 4 + 2;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Version du document:' : 'Document version:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(data.documentVersion, marginLeft + 50, yPos);

  yPos += 15;

  // Section: Contexte technique
  doc.setFillColor(249, 250, 251);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 35, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(isFrench ? '💻 CONTEXTE TECHNIQUE' : '💻 TECHNICAL CONTEXT', marginLeft, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  if (data.ipAddress) {
    doc.text(isFrench ? 'Adresse IP:' : 'IP Address:', marginLeft, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(data.ipAddress, marginLeft + 35, yPos);
    yPos += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Navigateur:' : 'Browser:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  const browserInfo = getBrowserInfo();
  const browserLines = doc.splitTextToSize(browserInfo, contentWidth - 35);
  doc.text(browserLines, marginLeft + 35, yPos);
  yPos += browserLines.length * 5;

  if (data.geolocation) {
    doc.setFont('helvetica', 'normal');
    doc.text(isFrench ? 'Géolocalisation:' : 'Geolocation:', marginLeft, yPos);
    doc.setFont('helvetica', 'bold');
    const geoText = `${data.geolocation.latitude.toFixed(4)}, ${data.geolocation.longitude.toFixed(4)}`;
    doc.text(geoText, marginLeft + 35, yPos);
    yPos += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'ID de session:' : 'Session ID:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(data.sessionId, marginLeft + 35, yPos);

  yPos += 15;

  // Section: Traçabilité
  doc.setFillColor(249, 250, 251);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 30, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(isFrench ? '📊 TRAÇABILITÉ' : '📊 TRACEABILITY', marginLeft, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  doc.text(isFrench ? 'Document consulté:' : 'Document viewed:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateForLegal(data.documentViewedAt), marginLeft + 45, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Durée de consultation:' : 'Review duration:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  const duration = `${Math.floor(data.documentViewDuration / 60)}m ${data.documentViewDuration % 60}s`;
  doc.text(duration, marginLeft + 45, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Consentement donné:' : 'Consent given:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateForLegal(data.consentTimestamp), marginLeft + 45, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(isFrench ? 'Signature complétée:' : 'Signature completed:', marginLeft, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateForLegal(data.signedAt), marginLeft + 45, yPos);

  yPos += 15;

  // Section: Conformité légale
  doc.setFillColor(220, 252, 231);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 40, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(isFrench ? '✓ CONFORMITÉ LÉGALE' : '✓ LEGAL COMPLIANCE', marginLeft, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const complianceText = isFrench
    ? `✓ Conforme à la LCCJTI (Loi concernant le cadre juridique des technologies de l'information)
✓ Conforme à la LPRPDE (Loi sur la protection des renseignements personnels et les documents électroniques)
✓ Conforme à la Loi sur la protection du consommateur (L.R.Q., c. P-40.1)
✓ Divulgation complète effectuée - Droit de rétractation notifié (10 jours ouvrables)`
    : `✓ Compliant with AECST (Act to establish a legal framework for information technology)
✓ Compliant with PIPEDA (Personal Information Protection and Electronic Documents Act)
✓ Compliant with Consumer Protection Act (R.S.Q., c. P-40.1)
✓ Full disclosure provided - Right of withdrawal notified (10 business days)`;

  const complianceLines = doc.splitTextToSize(complianceText, contentWidth);
  doc.text(complianceLines, marginLeft, yPos);

  yPos += complianceLines.length * 4 + 10;

  // Déclaration finale
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 25, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);

  const declaration = isFrench
    ? `Ce certificat atteste que la signature électronique ci-dessus a été capturée et conservée
conformément aux exigences légales en vigueur au Canada et au Québec. Il constitue une
preuve de l'authenticité et de l'intégrité de la signature électronique.`
    : `This certificate attests that the above electronic signature was captured and retained
in accordance with legal requirements in force in Canada and Quebec. It constitutes
proof of the authenticity and integrity of the electronic signature.`;

  const declarationLines = doc.splitTextToSize(declaration, contentWidth - 10);
  doc.text(declarationLines, marginLeft, yPos);

  yPos += declarationLines.length * 4 + 5;

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(marginLeft, footerY, pageWidth - marginRight, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text(isFrench ? `Émis par: ${data.companyName}` : `Issued by: ${data.companyName}`, marginLeft, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const certId = `CERT-${data.contractNumber}-${data.documentHash.substring(0, 8).toUpperCase()}`;
  doc.text(isFrench ? `ID Certificat: ${certId}` : `Certificate ID: ${certId}`, marginLeft, footerY + 11);

  doc.text(formatDateForLegal(new Date()), pageWidth - marginRight, footerY + 11, { align: 'right' });

  return doc;
}

export async function saveSignatureCertificate(
  data: CertificateData,
  filename?: string
): Promise<Blob> {
  const doc = generateSignatureCertificate(data);
  const pdfBlob = doc.output('blob');

  if (filename) {
    doc.save(filename);
  }

  return pdfBlob;
}
