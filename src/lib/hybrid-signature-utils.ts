import { supabase } from './supabase';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

export type SignatureMethod = 'online' | 'in_person' | 'hybrid';
export type SignatureLocationType = 'remote' | 'dealership' | 'home' | 'other';
export type PhysicalSignatureStatus =
  | 'generated'
  | 'printed'
  | 'awaiting_signature'
  | 'signed'
  | 'scanned'
  | 'verified'
  | 'rejected'
  | 'archived';

// Generate unique physical document number
export function generatePhysicalDocumentNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PHY-${dateStr}-${randomStr}`;
}

// Save signature method selection
export async function saveSignatureMethodSelection(
  warrantyId: string | null,
  organizationId: string,
  method: SignatureMethod,
  userId?: string
): Promise<void> {
  const { error} = await supabase
    .from('signature_methods')
    .insert({
      warranty_id: warrantyId,
      organization_id: organizationId,
      selected_by: userId,
      method_chosen: method,
      selection_reason: method === 'electronic' ? 'Digital signature selected' : 'Physical signature selected',
      selection_context: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      }
    });

  if (error) {
    console.error('Error saving signature method:', error);
    throw error;
  }
}

// Create physical signature tracking record
export async function createPhysicalSignatureTracking(
  warrantyId: string,
  organizationId: string,
  physicalDocumentNumber: string,
  printedBy?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('physical_signature_tracking')
    .insert({
      warranty_id: warrantyId,
      organization_id: organizationId,
      physical_document_number: physicalDocumentNumber,
      status: 'generated',
      printed_by: printedBy,
      document_generated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating physical signature tracking:', error);
    throw error;
  }

  return data.id;
}

// Update physical signature tracking status
export async function updatePhysicalSignatureStatus(
  trackingId: string,
  status: PhysicalSignatureStatus,
  additionalData?: {
    scannedAt?: string;
    verifiedBy?: string;
    notes?: string;
    scanQualityScore?: number;
    ocrConfidenceScore?: number;
  }
): Promise<void> {
  const updateData: any = {
    status,
    status_updated_at: new Date().toISOString()
  };

  if (status === 'printed') {
    updateData.document_printed_at = new Date().toISOString();
  } else if (status === 'signed') {
    updateData.document_signed_at = new Date().toISOString();
  } else if (status === 'scanned') {
    updateData.document_scanned_at = new Date().toISOString();
  } else if (status === 'verified') {
    updateData.document_verified_at = new Date().toISOString();
    updateData.verified_by = additionalData?.verifiedBy;
  } else if (status === 'archived') {
    updateData.document_archived_at = new Date().toISOString();
  }

  if (additionalData?.notes) {
    updateData.notes = additionalData.notes;
  }

  if (additionalData?.scanQualityScore !== undefined) {
    updateData.scan_quality_score = additionalData.scanQualityScore;
  }

  if (additionalData?.ocrConfidenceScore !== undefined) {
    updateData.ocr_confidence_score = additionalData.ocrConfidenceScore;
  }

  const { error } = await supabase
    .from('physical_signature_tracking')
    .update(updateData)
    .eq('id', trackingId);

  if (error) {
    console.error('Error updating physical signature status:', error);
    throw error;
  }
}

// Save identity verification
export async function saveIdentityVerification(
  warrantyId: string | null,
  organizationId: string,
  data: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    documentPhotoFrontUrl: string;
    clientPhotoUrl: string;
    verifiedBy?: string;
  }
): Promise<string> {
  const { data: verification, error } = await supabase
    .from('identity_verifications')
    .insert({
      warranty_id: warrantyId,
      organization_id: organizationId,
      client_name: data.clientName,
      client_email: data.clientEmail,
      client_phone: data.clientPhone,
      document_photo_front_url: data.documentPhotoFrontUrl,
      client_photo_url: data.clientPhotoUrl,
      verified_by: data.verifiedBy,
      verification_method: 'manual',
      verification_status: 'approved'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving identity verification:', error);
    throw error;
  }

  return verification.id;
}

// Save witness signature
export async function saveWitnessSignature(
  warrantyId: string,
  organizationId: string,
  data: {
    witnessName: string;
    witnessSignatureDataUrl: string;
    location?: string;
    geolocation?: any;
  }
): Promise<string> {
  const { data: witness, error } = await supabase
    .from('signature_witnesses')
    .insert({
      warranty_id: warrantyId,
      organization_id: organizationId,
      witness_name: data.witnessName,
      witness_signature_data_url: data.witnessSignatureDataUrl,
      location: data.location,
      geolocation: data.geolocation,
      user_agent: navigator.userAgent,
      identity_verified: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving witness signature:', error);
    throw error;
  }

  return witness.id;
}

// Save scanned document
export async function saveScannedDocument(
  warrantyId: string,
  organizationId: string,
  trackingId: string,
  data: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    scannedBy?: string;
    qualityScore?: number;
  }
): Promise<string> {
  const { data: scanned, error } = await supabase
    .from('scanned_documents')
    .insert({
      warranty_id: warrantyId,
      organization_id: organizationId,
      tracking_id: trackingId,
      file_url: data.fileUrl,
      file_name: data.fileName,
      file_size_bytes: data.fileSize,
      file_type: data.fileType,
      scanned_by: data.scannedBy,
      image_quality_score: data.qualityScore,
      is_verified: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving scanned document:', error);
    throw error;
  }

  return scanned.id;
}

// Generate QR code for physical document
export async function generateDocumentQRCode(
  physicalDocumentNumber: string,
  warrantyId?: string
): Promise<string> {
  const baseUrl = window.location.origin;
  const qrData = warrantyId
    ? `${baseUrl}/verify-signature?contract=${warrantyId}&doc=${physicalDocumentNumber}`
    : `${baseUrl}/physical-signature?doc=${physicalDocumentNumber}`;

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Generate printable PDF document for in-person signature
export async function generatePrintablePDF(
  documentContent: string,
  physicalDocumentNumber: string,
  warrantyId?: string,
  language: 'fr' | 'en' = 'fr'
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Generate QR Code
  const qrCodeDataUrl = await generateDocumentQRCode(physicalDocumentNumber, warrantyId);

  // Header
  pdf.setFillColor(59, 130, 246); // Blue-600
  pdf.rect(0, 0, pageWidth, 30, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(
    language === 'fr' ? 'CONTRAT DE GARANTIE' : 'WARRANTY CONTRACT',
    pageWidth / 2,
    15,
    { align: 'center' }
  );

  pdf.setFontSize(10);
  pdf.text(
    language === 'fr' ? 'À SIGNER EN PRÉSENCE' : 'TO BE SIGNED IN PERSON',
    pageWidth / 2,
    22,
    { align: 'center' }
  );

  // Document Number and QR Code
  let yPos = 40;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(language === 'fr' ? 'Numéro de Document:' : 'Document Number:', margin, yPos);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.setFont('courier', 'bold');
  pdf.text(physicalDocumentNumber, margin, yPos + 7);

  // Add QR Code
  const qrSize = 40;
  pdf.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, yPos - 5, qrSize, qrSize);

  yPos += 50;

  // Instructions box
  pdf.setDrawColor(251, 191, 36); // Amber-400
  pdf.setFillColor(254, 243, 199); // Amber-100
  pdf.setLineWidth(1);
  pdf.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'FD');

  pdf.setTextColor(146, 64, 14); // Amber-900
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  yPos += 7;
  pdf.text(language === 'fr' ? 'INSTRUCTIONS IMPORTANTES' : 'IMPORTANT INSTRUCTIONS', margin + 5, yPos);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  yPos += 5;
  const instructions = language === 'fr'
    ? [
        '1. Lire attentivement tout le contrat ci-dessous',
        '2. Signer dans les zones prévues à la dernière page',
        '3. Un témoin doit également signer',
        '4. Conserver une copie pour vos dossiers'
      ]
    : [
        '1. Read the entire contract below carefully',
        '2. Sign in the designated areas on the last page',
        '3. A witness must also sign',
        '4. Keep a copy for your records'
      ];

  instructions.forEach((instruction) => {
    pdf.text(instruction, margin + 5, yPos);
    yPos += 4;
  });

  yPos += 15;

  // Document content
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const lines = pdf.splitTextToSize(documentContent, contentWidth);
  const lineHeight = 7;

  for (let i = 0; i < lines.length; i++) {
    if (yPos + lineHeight > pageHeight - 80) {
      pdf.addPage();
      yPos = margin;
    }
    pdf.text(lines[i], margin, yPos);
    yPos += lineHeight;
  }

  // New page for signatures
  pdf.addPage();
  yPos = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(language === 'fr' ? 'SIGNATURES' : 'SIGNATURES', pageWidth / 2, yPos, { align: 'center' });

  yPos += 20;

  // Client signature area
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPos += 5;
  pdf.text(language === 'fr' ? 'Signature du client' : 'Client signature', margin, yPos);

  yPos += 10;
  pdf.text(language === 'fr' ? 'Nom (lettres moulées):' : 'Name (print):', margin, yPos);
  pdf.line(margin + 40, yPos + 1, pageWidth - margin, yPos + 1);

  yPos += 10;
  pdf.text(language === 'fr' ? 'Date:' : 'Date:', margin, yPos);
  pdf.line(margin + 15, yPos + 1, margin + 60, yPos + 1);

  yPos += 25;

  // Witness signature area
  pdf.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 5;
  pdf.text(language === 'fr' ? 'Signature du témoin/vendeur' : 'Witness/salesperson signature', margin, yPos);

  yPos += 10;
  pdf.text(language === 'fr' ? 'Nom (lettres moulées):' : 'Name (print):', margin, yPos);
  pdf.line(margin + 40, yPos + 1, pageWidth - margin, yPos + 1);

  yPos += 10;
  pdf.text(language === 'fr' ? 'Date:' : 'Date:', margin, yPos);
  pdf.line(margin + 15, yPos + 1, margin + 60, yPos + 1);

  // Footer with document info
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `${language === 'fr' ? 'Document généré le' : 'Document generated on'} ${new Date().toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}`,
    margin,
    footerY
  );
  pdf.text(physicalDocumentNumber, pageWidth - margin, footerY, { align: 'right' });

  // Add barcode representation of document number
  pdf.setFontSize(10);
  pdf.setFont('courier', 'normal');
  pdf.text(physicalDocumentNumber.replace(/-/g, ''), pageWidth / 2, footerY + 5, { align: 'center' });

  return pdf.output('blob');
}

// Upload file to Supabase Storage
export async function uploadFileToStorage(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Get signature method statistics
export async function getSignatureMethodStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  online: number;
  inPerson: number;
  total: number;
  onlinePercentage: number;
  inPersonPercentage: number;
}> {
  let query = supabase
    .from('warranties')
    .select('signature_method', { count: 'exact' })
    .eq('organization_id', organizationId)
    .not('signature_method', 'is', null);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error getting signature stats:', error);
    throw error;
  }

  const total = count || 0;
  const online = data?.filter(w => w.signature_method === 'online').length || 0;
  const inPerson = data?.filter(w => w.signature_method === 'in_person').length || 0;

  return {
    online,
    inPerson,
    total,
    onlinePercentage: total > 0 ? (online / total) * 100 : 0,
    inPersonPercentage: total > 0 ? (inPerson / total) * 100 : 0
  };
}

// Get pending physical signatures
export async function getPendingPhysicalSignatures(
  organizationId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('physical_signature_tracking')
    .select(`
      *,
      warranties (
        warranty_number,
        customer_first_name,
        customer_last_name
      )
    `)
    .eq('organization_id', organizationId)
    .in('status', ['printed', 'awaiting_signature', 'signed'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting pending physical signatures:', error);
    throw error;
  }

  return data || [];
}

// Validate signature quality
export function validateSignatureQuality(signatureDataUrl: string): {
  isValid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check if data URL is valid
  if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
    issues.push('Invalid signature format');
    score -= 50;
  }

  // Check base64 length (rough estimate of complexity)
  const base64Data = signatureDataUrl.split(',')[1];
  if (base64Data && base64Data.length < 500) {
    issues.push('Signature appears too simple');
    score -= 30;
  }

  return {
    isValid: score >= 50,
    score: Math.max(0, score),
    issues
  };
}

// Export types for use in components
export interface PhysicalSignatureData {
  physicalDocumentNumber: string;
  signerFullName: string;
  signerEmail: string;
  signerPhone: string;
  clientSignatureDataUrl: string;
  witnessName: string;
  witnessSignatureDataUrl: string;
  identityDocumentPhotoUrl: string;
  clientPhotoUrl: string;
  scannedDocumentUrl?: string;
  signatureLocationType: SignatureLocationType;
  geolocation?: any;
  verificationNotes: string;
}

export interface SignatureMethodStats {
  online: number;
  inPerson: number;
  total: number;
  onlinePercentage: number;
  inPersonPercentage: number;
  avgCompletionTimeOnline?: number;
  avgCompletionTimeInPerson?: number;
}
