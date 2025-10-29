import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface Customer {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
}

interface Claim {
  claim_number: string;
  incident_date: string;
  incident_description: string;
  approved_amount?: number | null;
  denied_reason?: string | null;
  status: string;
}

interface Warranty {
  contract_number: string;
}

interface DecisionLetterData {
  claim: Claim;
  customer: Customer;
  warranty: Warranty;
  companyInfo: CompanyInfo;
  decision: 'approved' | 'partially_approved' | 'denied';
  decisionDate: string;
  additionalNotes?: string;
}

export function generateApprovalLetter(data: DecisionLetterData): jsPDF {
  const doc = new jsPDF();
  const { claim, customer, warranty, companyInfo, decisionDate, additionalNotes } = data;

  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

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

  yPos += 10;
  doc.text(`Date: ${new Date(decisionDate).toLocaleDateString('fr-CA')}`, 20, yPos);

  yPos += 15;
  doc.text(`${customer.first_name} ${customer.last_name}`, 20, yPos);
  yPos += 5;
  doc.text(customer.address, 20, yPos);
  yPos += 5;
  doc.text(`${customer.city}, ${customer.province} ${customer.postal_code}`, 20, yPos);

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OBJET: APPROBATION DE RÉCLAMATION', 20, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const greeting = `Madame, Monsieur ${customer.last_name},`;
  doc.text(greeting, 20, yPos);

  yPos += 10;
  const maxWidth = pageWidth - 40;

  let introText = `Nous accusons réception de votre réclamation ${claim.claim_number} concernant votre contrat de garantie ${warranty.contract_number}, relative à un incident survenu le ${new Date(claim.incident_date).toLocaleDateString('fr-CA')}.`;
  let splitIntro = doc.splitTextToSize(introText, maxWidth);
  doc.text(splitIntro, 20, yPos);
  yPos += splitIntro.length * 5 + 10;

  if (data.decision === 'approved') {
    let approvalText = `Nous avons le plaisir de vous informer que votre réclamation a été APPROUVÉE dans son intégralité.`;
    let splitApproval = doc.splitTextToSize(approvalText, maxWidth);
    doc.text(splitApproval, 20, yPos);
    yPos += splitApproval.length * 5 + 10;

    if (claim.approved_amount) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Montant approuvé: ${claim.approved_amount.toFixed(2)} $ CAD`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 10;
    }
  } else if (data.decision === 'partially_approved') {
    let partialText = `Après examen approfondi de votre dossier, nous avons le regret de vous informer que votre réclamation a été PARTIELLEMENT APPROUVÉE.`;
    let splitPartial = doc.splitTextToSize(partialText, maxWidth);
    doc.text(splitPartial, 20, yPos);
    yPos += splitPartial.length * 5 + 10;

    if (claim.approved_amount) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Montant approuvé: ${claim.approved_amount.toFixed(2)} $ CAD`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 10;
    }
  }

  let nextStepsText = `Les prochaines étapes:\n\n1. Un bon de commande (PO) sera émis sous 2-3 jours ouvrables\n2. Vous recevrez le numéro de PO par courriel\n3. Présentez ce numéro à votre garage de réparation autorisé\n4. Le paiement sera effectué directement au garage après réparation`;
  let splitNextSteps = doc.splitTextToSize(nextStepsText, maxWidth);
  doc.text(splitNextSteps, 20, yPos);
  yPos += splitNextSteps.length * 5 + 10;

  if (additionalNotes) {
    let notesText = `Notes additionnelles: ${additionalNotes}`;
    let splitNotes = doc.splitTextToSize(notesText, maxWidth);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5 + 10;
  }

  let closingText = `Nous vous remercions de votre confiance et restons à votre disposition pour toute question.`;
  let splitClosing = doc.splitTextToSize(closingText, maxWidth);
  doc.text(splitClosing, 20, yPos);
  yPos += splitClosing.length * 5 + 10;

  doc.text('Cordialement,', 20, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text('Service des réclamations', 20, yPos);

  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${new Date().toLocaleString('fr-CA')}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Réclamation: ${claim.claim_number}`, pageWidth / 2, footerY + 4, { align: 'center' });

  return doc;
}

export function generateDenialLetter(data: DecisionLetterData): jsPDF {
  const doc = new jsPDF();
  const { claim, customer, warranty, companyInfo, decisionDate, additionalNotes } = data;

  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

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

  yPos += 10;
  doc.text(`Date: ${new Date(decisionDate).toLocaleDateString('fr-CA')}`, 20, yPos);

  yPos += 15;
  doc.text(`${customer.first_name} ${customer.last_name}`, 20, yPos);
  yPos += 5;
  doc.text(customer.address, 20, yPos);
  yPos += 5;
  doc.text(`${customer.city}, ${customer.province} ${customer.postal_code}`, 20, yPos);

  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OBJET: REFUS DE RÉCLAMATION', 20, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const greeting = `Madame, Monsieur ${customer.last_name},`;
  doc.text(greeting, 20, yPos);

  yPos += 10;
  const maxWidth = pageWidth - 40;

  let introText = `Nous accusons réception de votre réclamation ${claim.claim_number} concernant votre contrat de garantie ${warranty.contract_number}, relative à un incident survenu le ${new Date(claim.incident_date).toLocaleDateString('fr-CA')}.`;
  let splitIntro = doc.splitTextToSize(introText, maxWidth);
  doc.text(splitIntro, 20, yPos);
  yPos += splitIntro.length * 5 + 10;

  let denialText = `Après examen approfondi de votre dossier, nous avons le regret de vous informer que votre réclamation a été REFUSÉE pour la raison suivante:`;
  let splitDenial = doc.splitTextToSize(denialText, maxWidth);
  doc.text(splitDenial, 20, yPos);
  yPos += splitDenial.length * 5 + 10;

  if (claim.denied_reason) {
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 2, maxWidth, 20, 'F');

    doc.setFont('helvetica', 'bold');
    let splitReason = doc.splitTextToSize(claim.denied_reason, maxWidth - 10);
    doc.text(splitReason, 25, yPos + 3);
    doc.setFont('helvetica', 'normal');
    yPos += 25;
  }

  let appealText = `Si vous estimez que cette décision ne reflète pas correctement la situation, vous avez le droit de faire appel. Pour ce faire, veuillez nous contacter dans les 30 jours suivant la réception de cette lettre avec tout document additionnel à l'appui de votre réclamation.`;
  let splitAppeal = doc.splitTextToSize(appealText, maxWidth);
  doc.text(splitAppeal, 20, yPos);
  yPos += splitAppeal.length * 5 + 10;

  if (additionalNotes) {
    let notesText = `Notes additionnelles: ${additionalNotes}`;
    let splitNotes = doc.splitTextToSize(notesText, maxWidth);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5 + 10;
  }

  let closingText = `Nous vous remercions de votre compréhension et restons à votre disposition pour toute question.`;
  let splitClosing = doc.splitTextToSize(closingText, maxWidth);
  doc.text(splitClosing, 20, yPos);
  yPos += splitClosing.length * 5 + 10;

  doc.text('Cordialement,', 20, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text('Service des réclamations', 20, yPos);

  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${new Date().toLocaleString('fr-CA')}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Réclamation: ${claim.claim_number}`, pageWidth / 2, footerY + 4, { align: 'center' });

  return doc;
}

export function generateDecisionLetter(data: DecisionLetterData): jsPDF {
  if (data.decision === 'denied') {
    return generateDenialLetter(data);
  } else {
    return generateApprovalLetter(data);
  }
}

export function downloadDecisionLetter(doc: jsPDF, claimNumber: string, decision: string) {
  const filename = `Lettre-Decision-${decision}-${claimNumber}.pdf`;
  doc.save(filename);
}

export function getDecisionLetterBase64(doc: jsPDF): string {
  return doc.output('dataurlstring');
}
