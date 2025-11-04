import { loadPDFLibraries } from './pdf-lazy-loader';
import { generateInvoicePDF as generateBasicInvoicePDF } from './pdf-generator';

interface WarrantyWithRelations {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  base_price: number;
  options_price: number;
  taxes: number;
  total_price: number;
  deductible: number;
  selected_options: any;
  province: string;
  language: 'fr' | 'en';
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
  };
  trailer: {
    vin: string;
    year: number;
    make: string;
    model: string;
    length: number;
    weight: number;
    type: string;
  };
  plan: {
    name_fr: string;
    name_en: string;
    description_fr: string;
    description_en: string;
    price: number;
    max_claim_amount: number;
  };
}

/**
 * Génère une facture PDF pour client ou marchand
 * @param warranty - Données de la garantie avec relations
 * @param invoiceType - 'customer' ou 'merchant'
 * @returns Promise<Blob> - Le PDF généré en tant que Blob
 */
export async function createInvoicePDF(
  warranty: WarrantyWithRelations,
  invoiceType: 'customer' | 'merchant'
): Promise<Blob> {
  // Charger les librairies PDF
  await loadPDFLibraries();

  // Pour la facture marchand, calculer 50% des montants
  let warrantyData = warranty;
  if (invoiceType === 'merchant') {
    // Le marchand reçoit 50% du montant total
    const merchantPercentage = 0.5;

    warrantyData = {
      ...warranty,
      base_price: warranty.base_price * merchantPercentage,
      options_price: warranty.options_price * merchantPercentage,
      taxes: warranty.taxes * merchantPercentage,
      total_price: warranty.total_price * merchantPercentage,
      // Ajuster aussi les options si elles existent
      selected_options: warranty.selected_options ?
        (Array.isArray(warranty.selected_options) ?
          warranty.selected_options.map((opt: any) => ({
            ...opt,
            price: (opt.price || 0) * merchantPercentage
          })) :
          warranty.selected_options
        ) :
        warranty.selected_options
    };
  }

  // Préparer les données pour le générateur
  const invoiceData = {
    warranty: warrantyData as any,
    customer: warranty.customer as any,
    trailer: warranty.trailer as any,
    plan: warranty.plan as any,
    companyInfo: {
      name: 'Location Pro Remorque',
      address: null,
      phone: null,
      email: 'info@locationproremorque.com',
      businessNumber: null,
      vendorSignatureUrl: null
    }
  };

  // Générer le PDF
  const pdfDoc = generateBasicInvoicePDF(invoiceData);

  // Ajouter en-tête selon le type
  if (invoiceType === 'merchant') {
    // Ajouter watermark pour facture marchand
    const pageHeight = pdfDoc.internal.pageSize.height;
    pdfDoc.setFontSize(10);
    pdfDoc.setTextColor(100, 100, 100);
    pdfDoc.text('COPIE MARCHAND - 50% DU TOTAL', pdfDoc.internal.pageSize.width / 2, pageHeight - 10, {
      align: 'center'
    });
  }

  // Convertir en Blob
  const pdfBlob = pdfDoc.output('blob');
  return pdfBlob;
}

/**
 * Génère et télécharge une facture
 * @param warranty - Données de la garantie
 * @param invoiceType - Type de facture
 */
export async function downloadInvoice(
  warranty: WarrantyWithRelations,
  invoiceType: 'customer' | 'merchant'
): Promise<void> {
  const blob = await createInvoicePDF(warranty, invoiceType);

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `facture_${invoiceType}_${warranty.contract_number}.pdf`;
  link.click();

  URL.revokeObjectURL(link.href);
}

/**
 * Génère les deux factures (client + marchand) pour une garantie
 * @param warranty - Données de la garantie
 * @returns Promise avec les deux blobs
 */
export async function generateBothInvoices(
  warranty: WarrantyWithRelations
): Promise<{
  customerInvoice: Blob;
  merchantInvoice: Blob;
}> {
  const [customerInvoice, merchantInvoice] = await Promise.all([
    createInvoicePDF(warranty, 'customer'),
    createInvoicePDF(warranty, 'merchant')
  ]);

  return {
    customerInvoice,
    merchantInvoice
  };
}
