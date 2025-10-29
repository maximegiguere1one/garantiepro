/**
 * PDF Contract Builder Service
 *
 * Refactored from pdf-generator.ts to follow SOLID principles.
 * Each method has a single, clear responsibility for building
 * specific sections of the PDF contract.
 *
 * This builder pattern makes it easy to:
 * - Test individual sections independently
 * - Reuse sections across different document types
 * - Modify layouts without affecting other sections
 * - Add new sections without modifying existing code
 */

import type { Database } from '../lib/database.types';
import {
  safeToFixed,
  safeNumber,
  safeAdd,
  normalizeWarrantyNumbers,
  safeLocaleString,
} from '../lib/numeric-utils';
import { APP_CONFIG } from '../config/app-config';
import { createLogger } from '../lib/logger';

const logger = createLogger('[PDFContractBuilder]');

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

interface PDFConfig {
  primaryColor: [number, number, number];
  fontSize: {
    title: number;
    heading: number;
    body: number;
    small: number;
  };
  fontFamily: string;
}

/**
 * PDF Contract Builder
 * Builds PDF contracts section by section with consistent styling
 */
export class PDFContractBuilder {
  private doc: any;
  private config: PDFConfig;
  private yPos: number = 20;

  constructor(jsPDFInstance: any, config?: Partial<PDFConfig>) {
    this.doc = jsPDFInstance;
    this.config = {
      primaryColor: config?.primaryColor || APP_CONFIG.pdf.theme.primaryColor,
      fontSize: {
        ...APP_CONFIG.pdf.theme.fontSize,
        ...config?.fontSize,
      },
      fontFamily: config?.fontFamily || APP_CONFIG.pdf.theme.fontFamily,
    };

    // Validate autoTable is available
    if (typeof this.doc.autoTable !== 'function') {
      const error = new Error('autoTable plugin not available on jsPDF instance');
      logger.error('PDF initialization failed', error);
      throw error;
    }

    logger.debug('PDFContractBuilder initialized');
  }

  /**
   * Get current Y position
   */
  getYPos(): number {
    return this.yPos;
  }

  /**
   * Set Y position
   */
  setYPos(y: number): void {
    this.yPos = y;
  }

  /**
   * Add space to Y position
   */
  addSpace(space: number = 10): void {
    this.yPos += space;
  }

  /**
   * Get page width
   */
  getPageWidth(): number {
    return this.doc.internal.pageSize.width;
  }

  /**
   * Add a new page
   */
  addPage(): void {
    this.doc.addPage();
    this.yPos = 20;
  }

  /**
   * Build contract header
   */
  addContractHeader(contractNumber: string, createdAt: string): this {
    logger.debug('Adding contract header');

    const pageWidth = this.getPageWidth();

    // Title
    this.doc.setFontSize(this.config.fontSize.title);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('CONTRAT DE GARANTIE', pageWidth / 2, this.yPos, { align: 'center' });

    this.addSpace(15);

    // Contract info
    this.doc.setFontSize(this.config.fontSize.body);
    this.doc.setFont(this.config.fontFamily, 'normal');
    this.doc.text(`Numéro de contrat: ${contractNumber}`, 20, this.yPos);
    this.doc.text(`Date: ${new Date(createdAt).toLocaleDateString('fr-CA')}`, pageWidth - 20, this.yPos, {
      align: 'right',
    });

    this.addSpace(15);

    return this;
  }

  /**
   * Add company (vendor) section
   */
  addVendorSection(companyInfo: InvoiceData['companyInfo']): this {
    logger.debug('Adding vendor section');

    this.doc.setFontSize(this.config.fontSize.heading);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('ENTRE:', 20, this.yPos);

    this.addSpace(7);

    this.doc.setFontSize(this.config.fontSize.body);
    this.doc.setFont(this.config.fontFamily, 'normal');
    this.doc.text(`Le vendeur: ${companyInfo.name}`, 20, this.yPos);
    this.addSpace(5);

    if (companyInfo.address) {
      this.doc.text(companyInfo.address, 20, this.yPos);
      this.addSpace(5);
    }

    if (companyInfo.businessNumber) {
      this.doc.text(`NEQ: ${companyInfo.businessNumber}`, 20, this.yPos);
      this.addSpace(5);
    }

    this.addSpace(10);

    return this;
  }

  /**
   * Add customer section
   */
  addCustomerSection(customer: Customer): this {
    logger.debug('Adding customer section');

    this.doc.setFontSize(this.config.fontSize.heading);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('ET:', 20, this.yPos);

    this.addSpace(7);

    this.doc.setFontSize(this.config.fontSize.body);
    this.doc.setFont(this.config.fontFamily, 'normal');
    this.doc.text(`Le client: ${customer.first_name} ${customer.last_name}`, 20, this.yPos);
    this.addSpace(5);

    this.doc.text(
      `${customer.address}, ${customer.city}, ${customer.province} ${customer.postal_code}`,
      20,
      this.yPos
    );

    this.addSpace(15);

    return this;
  }

  /**
   * Add custom contract sections (terms, conditions, etc.)
   */
  addCustomSections(sections: Array<{ name: string; content: string }>): this {
    if (!sections || sections.length === 0) return this;

    logger.debug('Adding custom sections', { count: sections.length });

    const maxWidth = this.getPageWidth() - 40;

    sections.forEach((section) => {
      this.doc.setFontSize(this.config.fontSize.heading);
      this.doc.setFont(this.config.fontFamily, 'bold');
      this.doc.text(section.name.toUpperCase(), 20, this.yPos);

      this.addSpace(7);

      this.doc.setFontSize(this.config.fontSize.body);
      this.doc.setFont(this.config.fontFamily, 'normal');
      const splitContent = this.doc.splitTextToSize(section.content, maxWidth);
      this.doc.text(splitContent, 20, this.yPos);
      this.yPos += splitContent.length * 5 + 10;
    });

    return this;
  }

  /**
   * Add coverage information
   */
  addCoverageInfo(data: InvoiceData): this {
    logger.debug('Adding coverage information');

    const normalizedWarranty = {
      ...data.warranty,
      ...normalizeWarrantyNumbers(data.warranty),
    };

    this.addSpace(5);

    this.doc.setFontSize(this.config.fontSize.heading);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('INFORMATIONS DE COUVERTURE', 20, this.yPos);

    this.addSpace(7);

    this.doc.setFontSize(this.config.fontSize.body);
    this.doc.setFont(this.config.fontFamily, 'normal');

    this.doc.text(
      `Remorque: ${data.trailer.year} ${data.trailer.make} ${data.trailer.model} (NIV: ${data.trailer.vin})`,
      20,
      this.yPos
    );
    this.addSpace(5);

    this.doc.text(
      `Durée: ${safeNumber(normalizedWarranty.duration_months, 0)} mois (${new Date(
        normalizedWarranty.start_date
      ).toLocaleDateString('fr-CA')} - ${new Date(normalizedWarranty.end_date).toLocaleDateString('fr-CA')})`,
      20,
      this.yPos
    );
    this.addSpace(5);

    this.doc.text(
      `Franchise: ${safeLocaleString(normalizedWarranty.deductible, 'fr-CA')} $`,
      20,
      this.yPos
    );
    this.addSpace(5);

    this.doc.text(`Province: ${normalizedWarranty.province}`, 20, this.yPos);
    this.addSpace(10);

    return this;
  }

  /**
   * Add total amount section
   */
  addTotalAmount(data: InvoiceData): this {
    logger.debug('Adding total amount');

    const normalizedWarranty = {
      ...data.warranty,
      ...normalizeWarrantyNumbers(data.warranty),
    };

    this.doc.setFontSize(this.config.fontSize.heading);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('MONTANT TOTAL', 20, this.yPos);

    this.addSpace(7);

    this.doc.setFontSize(14);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text(
      `${safeToFixed(normalizedWarranty.total_price, 2)} $ CAD (taxes incluses)`,
      25,
      this.yPos
    );

    this.addSpace(15);

    return this;
  }

  /**
   * Add claim submission page with QR code
   */
  addClaimSubmissionPage(claimSubmissionUrl: string, qrCodeDataUrl: string, companyInfo: InvoiceData['companyInfo']): this {
    if (!claimSubmissionUrl || !qrCodeDataUrl) return this;

    logger.debug('Adding claim submission page');

    this.addPage();

    const pageWidth = this.getPageWidth();

    // Title
    this.doc.setFontSize(18);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.setTextColor(...this.config.primaryColor);
    this.doc.text('SOUMETTRE UNE RÉCLAMATION', pageWidth / 2, this.yPos, { align: 'center' });

    this.addSpace(15);

    // Instructions
    this.doc.setFontSize(11);
    this.doc.setFont(this.config.fontFamily, 'normal');
    this.doc.setTextColor(0, 0, 0);

    const maxWidth = pageWidth - 40;
    const claimText =
      `En cas de problème couvert par votre garantie, vous pouvez soumettre une réclamation facilement en utilisant le lien unique ci-dessous ou en scannant le code QR avec votre téléphone.`;
    const splitClaimText = this.doc.splitTextToSize(claimText, maxWidth);
    this.doc.text(splitClaimText, 20, this.yPos);
    this.yPos += splitClaimText.length * 6 + 10;

    // Highlight box with URL
    this.doc.setFillColor(241, 245, 249);
    this.doc.rect(15, this.yPos, pageWidth - 30, 50, 'F');

    this.addSpace(10);

    this.doc.setFontSize(this.config.fontSize.body);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('Votre lien de réclamation unique:', 20, this.yPos);

    this.addSpace(7);

    this.doc.setFontSize(9);
    this.doc.setFont(this.config.fontFamily, 'normal');
    this.doc.setTextColor(37, 99, 235);
    this.doc.textWithLink(claimSubmissionUrl, 20, this.yPos, { url: claimSubmissionUrl });
    this.doc.setTextColor(0, 0, 0);

    this.addSpace(10);

    this.doc.setFontSize(this.config.fontSize.small);
    this.doc.setFont(this.config.fontFamily, 'italic');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(
      "Ce lien est unique à votre contrat et ne peut être utilisé qu'une seule fois.",
      20,
      this.yPos
    );
    this.doc.setTextColor(0, 0, 0);

    this.addSpace(20);

    // QR Code
    try {
      const qrSize = APP_CONFIG.pdf.qrCodeSize;
      const qrX = (pageWidth - qrSize) / 2;
      this.doc.addImage(qrCodeDataUrl, 'PNG', qrX, this.yPos, qrSize, qrSize);

      this.yPos += qrSize + 8;

      this.doc.setFontSize(9);
      this.doc.setFont(this.config.fontFamily, 'bold');
      this.doc.text('Scannez ce code QR avec votre téléphone', pageWidth / 2, this.yPos, {
        align: 'center',
      });
    } catch (error) {
      logger.error('Error adding QR code to PDF', error as Error);
    }

    this.addSpace(15);

    // Instructions list
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, this.yPos, pageWidth - 20, this.yPos);

    this.addSpace(10);

    this.doc.setFontSize(11);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('Instructions pour soumettre une réclamation:', 20, this.yPos);

    this.addSpace(8);

    const instructions = [
      '1. Cliquez sur le lien ci-dessus ou scannez le code QR',
      "2. Remplissez le formulaire avec les détails de l'incident",
      '3. Téléchargez des photos des dommages et tout document pertinent',
      '4. Soumettez votre réclamation',
      "5. Vous recevrez un numéro de réclamation et des mises à jour par courriel",
    ];

    this.doc.setFontSize(9);
    this.doc.setFont(this.config.fontFamily, 'normal');

    instructions.forEach((instruction) => {
      this.doc.text(instruction, 25, this.yPos);
      this.addSpace(6);
    });

    this.addSpace(10);

    // Important note
    this.doc.setFillColor(254, 243, 199);
    this.doc.rect(15, this.yPos, pageWidth - 30, 25, 'F');

    this.addSpace(8);

    this.doc.setFontSize(9);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.setTextColor(146, 64, 14);
    this.doc.text('⚠ Important:', 20, this.yPos);

    this.addSpace(6);

    this.doc.setFont(this.config.fontFamily, 'normal');
    const importantText = `Votre réclamation sera traitée dans les 48 heures ouvrables. Conservez tous les documents et factures liés à l'incident. En cas de questions, contactez-nous: ${
      companyInfo.phone || 'voir coordonnées sur le contrat'
    }.`;
    const splitImportant = this.doc.splitTextToSize(importantText, maxWidth - 10);
    this.doc.text(splitImportant, 20, this.yPos);
    this.doc.setTextColor(0, 0, 0);

    return this;
  }

  /**
   * Add signature section
   */
  addSignatureSection(
    companyInfo: InvoiceData['companyInfo'],
    customer: Customer,
    signatureDataUrl?: string
  ): this {
    logger.debug('Adding signature section');

    this.addPage();

    const pageWidth = this.getPageWidth();
    const col1Width = (pageWidth - 50) / 2;
    const col2X = 20 + col1Width + 10;

    this.doc.setFontSize(this.config.fontSize.body);
    this.doc.setFont(this.config.fontFamily, 'bold');
    this.doc.text('Signatures:', 20, this.yPos);
    this.addSpace(10);

    this.doc.setFontSize(9);
    this.doc.text('LE VENDEUR', 20, this.yPos);
    this.doc.text('LE CLIENT', col2X, this.yPos);
    this.addSpace(5);

    // Vendor signature
    if (companyInfo.vendorSignatureUrl) {
      try {
        const sigSize = APP_CONFIG.pdf.signatureSize;
        this.doc.addImage(companyInfo.vendorSignatureUrl, 'PNG', 20, this.yPos, sigSize.width, sigSize.height);
      } catch (error) {
        logger.error('Error adding vendor signature', error as Error);
      }
    }

    // Customer signature
    if (signatureDataUrl) {
      try {
        const sigSize = APP_CONFIG.pdf.signatureSize;
        this.doc.addImage(signatureDataUrl, 'PNG', col2X, this.yPos, sigSize.width, sigSize.height);
      } catch (error) {
        logger.error('Error adding customer signature', error as Error);
      }

      this.addSpace(20);

      this.doc.setFont(this.config.fontFamily, 'normal');
      this.doc.setFontSize(this.config.fontSize.small);
      this.doc.text(companyInfo.name, 20, this.yPos);
      this.doc.text(`${customer.first_name} ${customer.last_name}`, col2X, this.yPos);

      this.addSpace(5);

      this.doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, 20, this.yPos);
      this.doc.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, col2X, this.yPos);
    } else {
      this.addSpace(5);
      this.doc.line(col2X, this.yPos, col2X + 50, this.yPos);

      this.addSpace(10);

      this.doc.setFont(this.config.fontFamily, 'normal');
      this.doc.setFontSize(this.config.fontSize.small);
      this.doc.text(companyInfo.name, 20, this.yPos);
      this.doc.text('Date: ___________________', col2X, this.yPos);
    }

    return this;
  }

  /**
   * Add footer
   */
  addFooter(): this {
    const footerY = this.doc.internal.pageSize.height - 20;
    const pageWidth = this.getPageWidth();

    this.doc.setFontSize(this.config.fontSize.small);
    this.doc.setTextColor(128, 128, 128);
    this.doc.text(
      `Document généré le ${new Date().toLocaleString('fr-CA')}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    return this;
  }

  /**
   * Get the PDF document instance
   */
  build(): any {
    logger.info('PDF contract build completed');
    return this.doc;
  }
}

/**
 * High-level function to generate a complete contract PDF
 */
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
  const builder = new PDFContractBuilder(doc);

  // Build contract step by step
  builder
    .addContractHeader(data.warranty.contract_number, data.warranty.created_at)
    .addVendorSection(data.companyInfo)
    .addCustomerSection(data.customer);

  // Add custom sections or default contract text
  if (customSections && customSections.length > 0) {
    builder.addCustomSections(customSections);
  }

  builder
    .addCoverageInfo(data)
    .addTotalAmount(data);

  // Add claim submission page if URL and QR code provided
  if (claimSubmissionUrl && qrCodeDataUrl) {
    builder.addClaimSubmissionPage(claimSubmissionUrl, qrCodeDataUrl, data.companyInfo);
  }

  // Add signature page
  builder
    .addSignatureSection(data.companyInfo, data.customer, signatureDataUrl)
    .addFooter();

  return builder.build();
}

// PDF utility functions
export function downloadPDF(doc: any, filename: string): void {
  doc.save(filename);
}

export function getPDFBlob(doc: any): Blob {
  return doc.output('blob');
}

export function getPDFDataUrl(doc: any): string {
  return doc.output('dataurlstring');
}
