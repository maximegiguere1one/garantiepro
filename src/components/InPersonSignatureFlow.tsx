import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Printer,
  Camera,
  CheckCircle,
  Upload,
  AlertTriangle,
  User,
  Shield,
  MapPin,
  Clock,
  QrCode,
  UserCheck,
  PenTool,
  Info
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { supabase } from '../lib/supabase';
import { generateInPersonSignatureDocument, openPDFInNewTab } from '../lib/in-person-document-generator';
import { loadPDFLibraries } from '../lib/pdf-lazy-loader';

type Step =
  | 'instructions'
  | 'generate_document'
  | 'identity_capture'
  | 'identity_verification'
  | 'client_signature'
  | 'witness_signature'
  | 'scan_document'
  | 'review'
  | 'complete';

interface InPersonSignatureFlowProps {
  warrantyId?: string;
  organizationId?: string;
  documentContent?: string;
  customPdfBase64?: string; // NOUVEAU: PDF custom en base64
  warrantyData?: any; // NOUVEAU: Données de garantie pour génération
  onComplete: (data: {
    signatureMethod: 'in_person';
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
    signatureLocationType: 'dealership' | 'home' | 'other';
    geolocation?: any;
    verificationNotes: string;
  }) => void;
  onCancel: () => void;
  language?: 'fr' | 'en';
}

export function InPersonSignatureFlow({
  warrantyId,
  organizationId,
  documentContent,
  customPdfBase64,
  warrantyData,
  onComplete,
  onCancel,
  language = 'fr'
}: InPersonSignatureFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('instructions');
  const [physicalDocumentNumber, setPhysicalDocumentNumber] = useState('');
  const [documentGenerated, setDocumentGenerated] = useState(false);
  const [documentPrinted, setDocumentPrinted] = useState(false);

  // Identity capture
  const [identityPhotoFile, setIdentityPhotoFile] = useState<File | null>(null);
  const [identityPhotoPreview, setIdentityPhotoPreview] = useState<string>('');
  const [clientPhotoFile, setClientPhotoFile] = useState<File | null>(null);
  const [clientPhotoPreview, setClientPhotoPreview] = useState<string>('');

  // Client information
  const [signerFullName, setSignerFullName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);

  // Signatures
  const [clientSignatureDataUrl, setClientSignatureDataUrl] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessSignatureDataUrl, setWitnessSignatureDataUrl] = useState('');

  // Document scan
  const [scannedDocFile, setScannedDocFile] = useState<File | null>(null);
  const [scannedDocPreview, setScannedDocPreview] = useState<string>('');

  // Location
  const [locationType, setLocationType] = useState<'dealership' | 'home' | 'other'>('dealership');
  const [geolocation, setGeolocation] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const identityInputRef = useRef<HTMLInputElement>(null);
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
  const scannedDocInputRef = useRef<HTMLInputElement>(null);

  const texts = {
    fr: {
      instructions: {
        title: 'Signature en Personne - Instructions',
        intro: 'Voici les étapes pour compléter une signature physique:',
        steps: [
          'Générer et imprimer le document',
          'Capturer la pièce d\'identité du client',
          'Vérifier les informations du client',
          'Faire signer le client sur tablette',
          'Obtenir la signature du témoin',
          'Scanner le document signé (optionnel)',
          'Finaliser et enregistrer'
        ],
        duration: 'Durée estimée: 15-20 minutes',
        start: 'Commencer le processus'
      },
      generateDoc: {
        title: 'Génération du Document',
        description: 'Document prêt pour impression avec code QR unique',
        docNumber: 'Numéro de document',
        printBtn: 'Imprimer le document',
        printed: 'Document imprimé',
        markPrinted: 'Marquer comme imprimé',
        continue: 'Continuer'
      },
      identity: {
        title: 'Capture de Pièce d\'Identité',
        description: 'Prenez une photo claire de la pièce d\'identité du client',
        idPhoto: 'Photo de la pièce d\'identité',
        clientPhoto: 'Photo du client',
        takePhoto: 'Prendre une photo',
        uploadPhoto: 'Téléverser une photo',
        retake: 'Reprendre',
        tips: 'Assurez-vous que:',
        tip1: 'La photo est nette et bien éclairée',
        tip2: 'Toutes les informations sont lisibles',
        tip3: 'Le document est entièrement visible',
        continue: 'Continuer vers vérification'
      },
      verification: {
        title: 'Vérification d\'Identité',
        description: 'Confirmez les informations du client',
        fullName: 'Nom complet',
        email: 'Adresse courriel',
        phone: 'Téléphone',
        verify: 'Je certifie avoir vérifié l\'identité',
        continue: 'Identité vérifiée - Continuer'
      },
      clientSign: {
        title: 'Signature du Client',
        description: 'Demandez au client de signer sur la tablette',
        instructions: 'Le client doit signer dans la zone ci-dessous',
        continue: 'Signature enregistrée - Continuer'
      },
      witnessSign: {
        title: 'Signature du Témoin',
        description: 'Signature du vendeur ou témoin présent',
        witnessName: 'Nom du témoin',
        witnessRole: 'Rôle: Vendeur/Témoin',
        instructions: 'Le témoin doit signer pour confirmer la présence',
        continue: 'Continuer'
      },
      scan: {
        title: 'Scanner le Document Signé',
        description: 'Optionnel: Numérisez le document papier signé',
        scanBtn: 'Scanner ou Téléverser',
        skip: 'Passer cette étape',
        scanned: 'Document scanné',
        quality: 'Vérifiez la qualité du scan',
        continue: 'Continuer vers révision'
      },
      review: {
        title: 'Révision Finale',
        description: 'Vérifiez que toutes les informations sont correctes',
        docNumber: 'Document #',
        clientInfo: 'Information Client',
        identityDoc: 'Pièce d\'identité',
        clientPhoto: 'Photo client',
        clientSig: 'Signature client',
        witnessSig: 'Signature témoin',
        scannedDoc: 'Document scanné',
        location: 'Lieu de signature',
        dealership: 'Concession',
        home: 'Domicile',
        other: 'Autre',
        notes: 'Notes de vérification',
        notesPlaceholder: 'Ajoutez des notes si nécessaire...',
        complete: 'Finaliser la Signature'
      },
      cancel: 'Annuler',
      back: 'Retour',
      loading: 'Traitement en cours...'
    },
    en: {
      instructions: {
        title: 'In-Person Signature - Instructions',
        intro: 'Here are the steps to complete a physical signature:',
        steps: [
          'Generate and print the document',
          'Capture client\'s ID document',
          'Verify client information',
          'Have client sign on tablet',
          'Obtain witness signature',
          'Scan signed document (optional)',
          'Finalize and save'
        ],
        duration: 'Estimated duration: 15-20 minutes',
        start: 'Start Process'
      },
      generateDoc: {
        title: 'Document Generation',
        description: 'Document ready for printing with unique QR code',
        docNumber: 'Document number',
        printBtn: 'Print Document',
        printed: 'Document printed',
        markPrinted: 'Mark as printed',
        continue: 'Continue'
      },
      identity: {
        title: 'ID Document Capture',
        description: 'Take a clear photo of the client\'s ID document',
        idPhoto: 'ID document photo',
        clientPhoto: 'Client photo',
        takePhoto: 'Take photo',
        uploadPhoto: 'Upload photo',
        retake: 'Retake',
        tips: 'Make sure:',
        tip1: 'Photo is sharp and well-lit',
        tip2: 'All information is readable',
        tip3: 'Document is fully visible',
        continue: 'Continue to verification'
      },
      verification: {
        title: 'Identity Verification',
        description: 'Confirm client information',
        fullName: 'Full name',
        email: 'Email address',
        phone: 'Phone',
        verify: 'I certify having verified identity',
        continue: 'Identity verified - Continue'
      },
      clientSign: {
        title: 'Client Signature',
        description: 'Ask client to sign on tablet',
        instructions: 'Client must sign in the area below',
        continue: 'Signature saved - Continue'
      },
      witnessSign: {
        title: 'Witness Signature',
        description: 'Salesperson or witness signature',
        witnessName: 'Witness name',
        witnessRole: 'Role: Salesperson/Witness',
        instructions: 'Witness must sign to confirm presence',
        continue: 'Continue'
      },
      scan: {
        title: 'Scan Signed Document',
        description: 'Optional: Digitize the signed paper document',
        scanBtn: 'Scan or Upload',
        skip: 'Skip this step',
        scanned: 'Document scanned',
        quality: 'Check scan quality',
        continue: 'Continue to review'
      },
      review: {
        title: 'Final Review',
        description: 'Verify all information is correct',
        docNumber: 'Document #',
        clientInfo: 'Client Information',
        identityDoc: 'ID document',
        clientPhoto: 'Client photo',
        clientSig: 'Client signature',
        witnessSig: 'Witness signature',
        scannedDoc: 'Scanned document',
        location: 'Signature location',
        dealership: 'Dealership',
        home: 'Home',
        other: 'Other',
        notes: 'Verification notes',
        notesPlaceholder: 'Add notes if needed...',
        complete: 'Finalize Signature'
      },
      cancel: 'Cancel',
      back: 'Back',
      loading: 'Processing...'
    }
  };

  const t = texts[language];

  useEffect(() => {
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }

    // Fetch company info
    const fetchCompanyInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('company_name, company_address, company_phone, company_email')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCompanyInfo({
            name: data.company_name || 'Location Pro-Remorque',
            address: data.company_address,
            phone: data.company_phone,
            email: data.company_email
          });
        } else {
          setCompanyInfo({
            name: 'Location Pro-Remorque',
            address: null,
            phone: null,
            email: null
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
        setCompanyInfo({
          name: 'Location Pro-Remorque',
          address: null,
          phone: null,
          email: null
        });
      }
    };

    fetchCompanyInfo();
  }, [organizationId]);

  const generatePhysicalDocumentNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PHY-${dateStr}-${randomStr}`;
  };

  const handleGenerateDocument = () => {
    const docNumber = generatePhysicalDocumentNumber();
    setPhysicalDocumentNumber(docNumber);
    setDocumentGenerated(true);
  };

  const handlePrint = async () => {
    if (!companyInfo) {
      alert(language === 'fr'
        ? 'Chargement des informations de l\'entreprise...'
        : 'Loading company information...');
      return;
    }

    setGeneratingPDF(true);

    try {
      await loadPDFLibraries();

      // SI un PDF custom est fourni (template), l'utiliser directement
      if (customPdfBase64) {
        console.log('[InPersonSignatureFlow] Using custom PDF from template');

        // Ouvrir le PDF custom tel quel (signature électronique déjà capturée)
        const pdfBlob = base64ToBlob(customPdfBase64, 'application/pdf');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

        console.log('[InPersonSignatureFlow] Custom PDF opened successfully');
      } else {
        // SINON générer le PDF comme avant
        let warrantyDetails = undefined;

        if (documentContent) {
          warrantyDetails = extractAllWarrantyDetails(documentContent, signerFullName);
        } else if (warrantyData) {
          // Utiliser warrantyData si fourni
          warrantyDetails = {
            customerName: `${warrantyData.customer.firstName} ${warrantyData.customer.lastName}`,
            customerEmail: warrantyData.customer.email,
            customerPhone: warrantyData.customer.phone,
            vinNumber: warrantyData.trailer.vin,
            trailerMake: warrantyData.trailer.make,
            trailerModel: warrantyData.trailer.model,
            trailerYear: warrantyData.trailer.year,
            contractNumber: warrantyData.contractNumber,
            totalPrice: warrantyData.pricing.total,
          };
        }

        const documentData = {
          physicalDocumentNumber,
          companyInfo,
          warrantyDetails,
          generatedBy: companyInfo?.name || 'System'
        };

        const doc = await generateInPersonSignatureDocument(documentData);
        openPDFInNewTab(doc);

        console.log('[InPersonSignatureFlow] PDF generated and opened successfully');
      }
    } catch (error) {
      console.error('[InPersonSignatureFlow] Error with PDF:', error);
      alert(language === 'fr'
        ? 'Erreur lors de la génération du PDF. Veuillez réessayer.'
        : 'Error generating PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const extractAllWarrantyDetails = (content: string, overrideCustomerName?: string) => {
    try {
      const extract = (pattern: RegExp, fallback: string = 'N/A'): string => {
        const match = content.match(pattern);
        return match ? match[1].trim() : fallback;
      };

      const customerName = overrideCustomerName || extract(/Nom:\s*([^\n]+)/, 'À compléter');
      const customerEmail = extract(/Email:\s*([^\n]+)/);
      const customerPhone = extract(/Téléphone:\s*([^\n]+)/);
      const address = extract(/Adresse:\s*([^\n]+)/);
      const city = extract(/,\s*([^,]+),/);
      const province = extract(/,\s*([A-Z]{2})\s+[A-Z0-9]/);
      const postalCode = extract(/[A-Z]{2}\s+([A-Z0-9]{3}\s*[A-Z0-9]{3})/);
      const customerAddress = `${address}, ${city}, ${province} ${postalCode}`;

      const trailerVin = extract(/VIN:\s*([^\n]+)/);
      const trailerMake = extract(/Marque:\s*([^\n]+)/);
      const trailerModel = extract(/Modèle:\s*([^\n]+)/);
      const trailerYear = extract(/Année:\s*([^\n]+)/);
      const trailerType = extract(/Type:\s*([^\n]+)/);
      const trailerPurchasePrice = extract(/Prix d'achat:\s*([^\n]+)/);

      const planName = extract(/Plan:\s*([^\n]+)/);
      const duration = extract(/Durée:\s*([^\n]+)/);
      const deductible = extract(/Franchise:\s*([^\n]+)/);
      const annualLimit = extract(/Limite annuelle:\s*([^\n]+)/);
      const loyaltyCredit = extract(/Crédit de fidélité:\s*([^\n]+)/);

      const basePrice = extract(/Prix de base:\s*([^\n]+)/);
      const optionsPrice = extract(/Options:\s*([^\n]+)/);
      const taxes = extract(/Taxes:\s*([^\n]+)/);
      const totalPrice = extract(/Total:\s*([^\n]+)/);

      const optionsSection = content.match(/Options sélectionnées:\s*\n([\s\S]*?)(?=\n\n|Dates de garantie:)/);
      const selectedOptions: string[] = [];
      if (optionsSection && optionsSection[1]) {
        const optionLines = optionsSection[1].split('\n').filter(line => line.trim().startsWith('-'));
        optionLines.forEach(line => {
          selectedOptions.push(line.trim().substring(2));
        });
      }

      const startDate = extract(/Début:\s*([^\n]+)/);
      const endDate = extract(/Fin:\s*([^\n]+)/);
      const nextMaintenance = extract(/Prochain entretien:\s*([^\n]+)/);

      return {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        trailerVin,
        trailerMake,
        trailerModel,
        trailerYear,
        trailerType,
        trailerPurchasePrice,
        planName,
        duration,
        deductible,
        annualLimit,
        loyaltyCredit,
        basePrice,
        optionsPrice,
        taxes,
        totalPrice,
        selectedOptions,
        startDate,
        endDate,
        nextMaintenance
      };
    } catch (error) {
      console.error('[InPersonSignatureFlow] Error extracting warranty details:', error);
      return undefined;
    }
  };

  const handleFileSelect = (
    file: File,
    setFile: (file: File) => void,
    setPreview: (url: string) => void
  ) => {
    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('warranty-documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('warranty-documents')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleComplete = async () => {
    console.log('[InPersonSignatureFlow] handleComplete called');
    console.log('[InPersonSignatureFlow] clientSignatureDataUrl length:', clientSignatureDataUrl?.length || 0);
    console.log('[InPersonSignatureFlow] witnessSignatureDataUrl length:', witnessSignatureDataUrl?.length || 0);
    console.log('[InPersonSignatureFlow] identityPhotoFile:', !!identityPhotoFile);
    console.log('[InPersonSignatureFlow] clientPhotoFile:', !!clientPhotoFile);

    if (!clientSignatureDataUrl || !witnessSignatureDataUrl || !identityPhotoFile || !clientPhotoFile) {
      const missing = [];
      if (!clientSignatureDataUrl) missing.push('Signature du client');
      if (!witnessSignatureDataUrl) missing.push('Signature du témoin');
      if (!identityPhotoFile) missing.push('Photo du document d\'identité');
      if (!clientPhotoFile) missing.push('Photo du client');

      const message = language === 'fr'
        ? `Veuillez compléter toutes les étapes requises:\n\n${missing.join('\n')}`
        : `Please complete all required steps:\n\n${missing.join('\n')}`;

      alert(message);
      return;
    }

    setUploading(true);

    try {
      console.log('[InPersonSignatureFlow] Uploading identity document photo...');
      // Upload identity document photo
      const identityPhotoUrl = await uploadFile(
        identityPhotoFile,
        `${organizationId}/identity/${physicalDocumentNumber}-id.jpg`
      );
      console.log('[InPersonSignatureFlow] Identity photo uploaded:', identityPhotoUrl);

      console.log('[InPersonSignatureFlow] Uploading client photo...');
      // Upload client photo
      const clientPhotoUrl = await uploadFile(
        clientPhotoFile,
        `${organizationId}/identity/${physicalDocumentNumber}-client.jpg`
      );
      console.log('[InPersonSignatureFlow] Client photo uploaded:', clientPhotoUrl);

      // Upload scanned document if provided
      let scannedDocUrl: string | undefined;
      if (scannedDocFile) {
        console.log('[InPersonSignatureFlow] Uploading scanned document...');
        scannedDocUrl = await uploadFile(
          scannedDocFile,
          `${organizationId}/scanned/${physicalDocumentNumber}-scan.pdf`
        );
        console.log('[InPersonSignatureFlow] Scanned document uploaded:', scannedDocUrl);
      }

      console.log('[InPersonSignatureFlow] Calling onComplete with data');
      const completionData = {
        signatureMethod: 'in_person' as const,
        physicalDocumentNumber,
        signerFullName,
        signerEmail,
        signerPhone,
        clientSignatureDataUrl,
        witnessName,
        witnessSignatureDataUrl,
        identityDocumentPhotoUrl: identityPhotoUrl,
        clientPhotoUrl,
        scannedDocumentUrl: scannedDocUrl,
        signatureLocationType: locationType,
        geolocation,
        verificationNotes
      };

      console.log('[InPersonSignatureFlow] Completion data:', {
        ...completionData,
        clientSignatureDataUrl: `${completionData.clientSignatureDataUrl?.substring(0, 50)}... (${completionData.clientSignatureDataUrl?.length} chars)`,
        witnessSignatureDataUrl: `${completionData.witnessSignatureDataUrl?.substring(0, 50)}... (${completionData.witnessSignatureDataUrl?.length} chars)`
      });

      onComplete(completionData);
    } catch (error) {
      console.error('[InPersonSignatureFlow] Error uploading files:', error);
      alert(language === 'fr'
        ? `Erreur lors du téléversement des fichiers: ${error.message}`
        : `Error uploading files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Instructions Step
  if (currentStep === 'instructions') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <PenTool className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-slate-900">{t.instructions.title}</h2>
            </div>
          </div>

          <div className="p-6">
            <p className="text-slate-700 mb-4">{t.instructions.intro}</p>

            <ol className="space-y-3 mb-6">
              {t.instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <span className="text-slate-700 pt-1">{step}</span>
                </li>
              ))}
            </ol>

            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <span className="text-sm text-primary-900 font-medium">{t.instructions.duration}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => {
                handleGenerateDocument();
                setCurrentStep('generate_document');
              }}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-lg"
            >
              {t.instructions.start}
              <CheckCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generate Document Step
  if (currentStep === 'generate_document') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.generateDoc.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.generateDoc.description}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-6 text-center">
              <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-2">{t.generateDoc.docNumber}</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{physicalDocumentNumber}</p>
            </div>

            <button
              onClick={handlePrint}
              disabled={!documentGenerated || generatingPDF}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-lg shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {generatingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  {language === 'fr' ? 'Génération du PDF...' : 'Generating PDF...'}
                </>
              ) : (
                <>
                  <Printer className="w-6 h-6" />
                  {t.generateDoc.printBtn}
                </>
              )}
            </button>

            {!documentPrinted && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-2">
                      {t.generateDoc.markPrinted}
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={documentPrinted}
                        onChange={(e) => setDocumentPrinted(e.target.checked)}
                        className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">{t.generateDoc.printed}</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('instructions')}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.back}
            </button>
            <button
              onClick={() => setCurrentStep('identity_capture')}
              disabled={!documentPrinted}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {t.generateDoc.continue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Identity Capture Step
  if (currentStep === 'identity_capture') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.identity.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.identity.description}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* ID Document Photo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.identity.idPhoto} *
              </label>
              {identityPhotoPreview ? (
                <div className="relative">
                  <img
                    src={identityPhotoPreview}
                    alt="Identity document"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg border-2 border-slate-300"
                  />
                  <button
                    onClick={() => {
                      setIdentityPhotoFile(null);
                      setIdentityPhotoPreview('');
                    }}
                    className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    {t.identity.retake}
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <input
                    ref={identityInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, setIdentityPhotoFile, setIdentityPhotoPreview);
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => identityInputRef.current?.click()}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    {t.identity.takePhoto}
                  </button>
                </div>
              )}
            </div>

            {/* Client Photo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.identity.clientPhoto} *
              </label>
              {clientPhotoPreview ? (
                <div className="relative">
                  <img
                    src={clientPhotoPreview}
                    alt="Client"
                    className="w-full h-64 object-contain bg-slate-100 rounded-lg border-2 border-slate-300"
                  />
                  <button
                    onClick={() => {
                      setClientPhotoFile(null);
                      setClientPhotoPreview('');
                    }}
                    className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    {t.identity.retake}
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <input
                    ref={clientPhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, setClientPhotoFile, setClientPhotoPreview);
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => clientPhotoInputRef.current?.click()}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    {t.identity.takePhoto}
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
              <p className="font-medium text-primary-900 mb-2">{t.identity.tips}</p>
              <ul className="space-y-1 text-sm text-primary-800">
                <li>• {t.identity.tip1}</li>
                <li>• {t.identity.tip2}</li>
                <li>• {t.identity.tip3}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('generate_document')}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.back}
            </button>
            <button
              onClick={() => setCurrentStep('identity_verification')}
              disabled={!identityPhotoFile || !clientPhotoFile}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {t.identity.continue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Identity Verification Step
  if (currentStep === 'identity_verification') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.verification.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.verification.description}</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.verification.fullName} *
              </label>
              <input
                type="text"
                value={signerFullName}
                onChange={(e) => setSignerFullName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.verification.email} *
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.verification.phone} *
              </label>
              <input
                type="tel"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={identityVerified}
                  onChange={(e) => setIdentityVerified(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium">
                    {t.verification.verify}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('identity_capture')}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.back}
            </button>
            <button
              onClick={() => setCurrentStep('client_signature')}
              disabled={!signerFullName || !signerEmail || !signerPhone || !identityVerified}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {t.verification.continue}
              <UserCheck className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Client Signature Step
  if (currentStep === 'client_signature') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.clientSign.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.clientSign.description}</p>
          </div>

          <div className="p-6">
            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary-900 font-medium">
                {t.clientSign.instructions}
              </p>
            </div>

            <SignaturePad
              onSave={(dataUrl) => {
                setClientSignatureDataUrl(dataUrl);
                setCurrentStep('witness_signature');
              }}
              onCancel={() => setCurrentStep('identity_verification')}
              embedded={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // Witness Signature Step
  if (currentStep === 'witness_signature') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.witnessSign.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.witnessSign.description}</p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.witnessSign.witnessName} *
              </label>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Jean Vendeur"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-slate-600 mt-1">{t.witnessSign.witnessRole}</p>
            </div>

            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
              <p className="text-sm text-primary-900 font-medium">
                {t.witnessSign.instructions}
              </p>
            </div>

            <SignaturePad
              onSave={(dataUrl) => {
                setWitnessSignatureDataUrl(dataUrl);
                setCurrentStep('scan_document');
              }}
              onCancel={() => setCurrentStep('client_signature')}
              embedded={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // Scan Document Step
  if (currentStep === 'scan_document') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.scan.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.scan.description}</p>
          </div>

          <div className="p-6 space-y-6">
            {scannedDocPreview ? (
              <div className="relative">
                <div className="bg-slate-100 rounded-lg p-4 border-2 border-slate-300">
                  <div className="flex items-center gap-3 text-primary-700">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">{t.scan.scanned}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    {scannedDocFile?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setScannedDocFile(null);
                    setScannedDocPreview('');
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  {t.identity.retake}
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <input
                  ref={scannedDocInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, setScannedDocFile, setScannedDocPreview);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => scannedDocInputRef.current?.click()}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  {t.scan.scanBtn}
                </button>
              </div>
            )}

            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  {language === 'fr'
                    ? 'Cette étape est optionnelle. Vous pouvez passer si vous n\'avez pas de scanner disponible.'
                    : 'This step is optional. You can skip if you don\'t have a scanner available.'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('witness_signature')}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t.back}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('review')}
                className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                {t.scan.skip}
              </button>
              <button
                onClick={() => setCurrentStep('review')}
                disabled={!scannedDocFile}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {t.scan.continue}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Review Step
  if (currentStep === 'review') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <h2 className="text-2xl font-bold text-slate-900">{t.review.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{t.review.description}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Document Number */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">{t.review.docNumber}</p>
              <p className="text-xl font-bold text-slate-900 font-mono">{physicalDocumentNumber}</p>
            </div>

            {/* Client Information */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3">{t.review.clientInfo}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600">{t.verification.fullName}</p>
                  <p className="font-medium text-slate-900">{signerFullName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">{t.verification.email}</p>
                  <p className="font-medium text-slate-900">{signerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">{t.verification.phone}</p>
                  <p className="font-medium text-slate-900">{signerPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">{t.witnessSign.witnessName}</p>
                  <p className="font-medium text-slate-900">{witnessName}</p>
                </div>
              </div>
            </div>

            {/* Visual Confirmation */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                  {t.review.identityDoc}
                </p>
                <div className="h-32 bg-slate-100 rounded-lg border-2 border-slate-300 overflow-hidden">
                  {identityPhotoPreview && (
                    <img src={identityPhotoPreview} alt="ID" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                  {t.review.clientPhoto}
                </p>
                <div className="h-32 bg-slate-100 rounded-lg border-2 border-slate-300 overflow-hidden">
                  {clientPhotoPreview && (
                    <img src={clientPhotoPreview} alt="Client" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                  {t.review.clientSig}
                </p>
                <div className="h-32 bg-white rounded-lg border-2 border-slate-300 overflow-hidden">
                  {clientSignatureDataUrl && (
                    <img src={clientSignatureDataUrl} alt="Client signature" className="w-full h-full object-contain" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                  {t.review.witnessSig}
                </p>
                <div className="h-32 bg-white rounded-lg border-2 border-slate-300 overflow-hidden">
                  {witnessSignatureDataUrl && (
                    <img src={witnessSignatureDataUrl} alt="Witness signature" className="w-full h-full object-contain" />
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.review.location} *
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="dealership">{t.review.dealership}</option>
                <option value="home">{t.review.home}</option>
                <option value="other">{t.review.other}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.review.notes}
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder={t.review.notesPlaceholder}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {geolocation && (
              <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-primary-900 font-medium mb-1">
                      {language === 'fr' ? 'Géolocalisation enregistrée' : 'Geolocation recorded'}
                    </p>
                    <p className="text-xs text-primary-800">
                      {geolocation.latitude.toFixed(4)}, {geolocation.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('scan_document')}
              disabled={uploading}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
            >
              {t.back}
            </button>
            <button
              onClick={handleComplete}
              disabled={uploading}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-lg disabled:bg-slate-400"
            >
              {uploading ? t.loading : t.review.complete}
              {!uploading && <CheckCircle className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
