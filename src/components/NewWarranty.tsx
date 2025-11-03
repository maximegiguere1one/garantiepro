import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, AlertTriangle, Shield } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { Breadcrumbs } from './common/Breadcrumbs';
import { ProgressIndicator } from './common/ProgressIndicator';
import { AnimatedButton } from './common/AnimatedButton';
import {
  calculateWarrantyData,
  formatAnnualLimit,
  formatLoyaltyCredit,
} from '../lib/ppr-utils';
import { getTaxRates, getPricingRules, calculateTaxes, type TaxRate, type PricingRule } from '../lib/settings-utils';
import { generateAndStoreDocuments } from '../lib/document-utils';
import { syncInvoiceToQuickBooks } from '../lib/quickbooks-utils';
import { isIntegrationConnected, syncWarrantyToAcomba } from '../lib/integration-utils';
import { LegalSignatureFlow } from './LegalSignatureFlow';
import { SignatureMethodSelector, type SignatureMethod } from './SignatureMethodSelector';
import { WarrantyCreationProgress } from './common/WarrantyCreationProgress';
import { InPersonSignatureFlow } from './InPersonSignatureFlow';
import { logSignatureEvent } from '../lib/legal-signature-utils';
import {
  saveSignatureMethodSelection,
  createPhysicalSignatureTracking,
  saveIdentityVerification,
  saveWitnessSignature,
  saveScannedDocument,
  type PhysicalSignatureData
} from '../lib/hybrid-signature-utils';
import {
  safeNumber,
  safeAdd,
  safeMultiply,
  validateWarrantyNumericFields,
} from '../lib/numeric-utils';
import { warrantyService } from '../lib/warranty-service';

type WarrantyPlan = Database['public']['Tables']['warranty_plans']['Row'];
type WarrantyOption = Database['public']['Tables']['warranty_options']['Row'];

interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  languagePreference: 'fr' | 'en';
  consentMarketing: boolean;
}

interface TrailerForm {
  vin: string;
  make: string;
  model: string;
  year: number;
  trailerType: string;
  category: 'fermee' | 'ouverte' | 'utilitaire';
  purchaseDate: string;
  purchasePrice: number;
  manufacturerWarrantyEndDate: string;
  isPromotional: boolean;
}

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
];

// CONSTANTES PPR (Programme de Protection Remorque)
// Ces valeurs sont FIXES et ne doivent JAMAIS être modifiées
const PPR_DURATION_MONTHS = 72; // 6 ans de garantie
const PPR_DEDUCTIBLE = 100; // Franchise de 100$ par réclamation

export function NewWarranty() {
  const { profile, organization: currentOrganization, activeOrganization } = useAuth();
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<WarrantyPlan[]>([]);
  const [options, setOptions] = useState<WarrantyOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WarrantyPlan | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [taxRates, setTaxRates] = useState<Record<string, TaxRate>>({});
  const [, setPricingRules] = useState<PricingRule[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [pendingWarrantyData, setPendingWarrantyData] = useState<any>(null);

  const [showSignatureMethodSelector, setShowSignatureMethodSelector] = useState(false);
  const [selectedSignatureMethod, setSelectedSignatureMethod] = useState<SignatureMethod | null>(null);
  const [showInPersonSignatureFlow, setShowInPersonSignatureFlow] = useState(false);
  const [customerProducts, setCustomerProducts] = useState<any[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [dealerInventory, setDealerInventory] = useState<any[]>([]);
  const [creationStep, setCreationStep] = useState(0);
  const [showCreationProgress, setShowCreationProgress] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [customer, setCustomer] = useState<CustomerForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: 'QC',
    postalCode: '',
    languagePreference: 'fr',
    consentMarketing: false,
  });

  const [trailer, setTrailer] = useState<TrailerForm>({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    trailerType: '',
    category: 'fermee',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 1000, // Valeur par défaut valide (contrainte: doit être > 0)
    manufacturerWarrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPromotional: false,
  });

  // REMOVED: duration et deductible sont maintenant fixes pour PPR
  // La garantie PPR est TOUJOURS: 72 mois (6 ans) avec franchise de 100$

  useEffect(() => {
    loadPlansAndOptions();
    loadSettings();
    loadCustomerProducts();
    loadDealerInventory();
    loadCustomTemplates();
  }, [customer.email, profile?.id, currentOrganization?.id, activeOrganization?.id]);

  const loadCustomTemplates = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('warranty_templates')
        .select('*')
        .eq('dealer_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomTemplates(data || []);
    } catch (error) {
      console.error('Error loading custom templates:', error);
      setCustomTemplates([]);
    }
  };

  // REMOVED: La franchise est toujours 100$ pour PPR (pas configurable)

  const loadPlansAndOptions = async () => {
    if (!profile?.id) return;

    // Use activeOrganization if available (Master viewing franchise), otherwise currentOrganization
    const orgIdToUse = activeOrganization?.id || currentOrganization?.id;
    if (!orgIdToUse) return;

    try {
      console.log('[NewWarranty] Loading plans for organization:', orgIdToUse);
      console.log('[NewWarranty] activeOrganization:', activeOrganization?.name);
      console.log('[NewWarranty] currentOrganization:', currentOrganization?.name);

      const [plansRes, optionsRes] = await Promise.all([
        supabase
          .from('warranty_plans')
          .select('*')
          .eq('organization_id', orgIdToUse)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('warranty_options')
          .select('*')
          .eq('organization_id', orgIdToUse)
          .eq('is_active', true),
      ]);

      if (plansRes.error) {
        console.error('[NewWarranty] Error loading plans:', plansRes.error);
      } else {
        console.log('[NewWarranty] Loaded', plansRes.data?.length, 'warranty plans');
        if (plansRes.data) setPlans(plansRes.data);
      }

      if (optionsRes.error) {
        console.error('[NewWarranty] Error loading options:', optionsRes.error);
      } else {
        console.log('[NewWarranty] Loaded', optionsRes.data?.length, 'warranty options');
        if (optionsRes.data) setOptions(optionsRes.data);
      }
    } catch (error) {
      console.error('[NewWarranty] Error loading plans and options:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const [rates, rules] = await Promise.all([
        getTaxRates(),
        getPricingRules(),
      ]);
      setTaxRates(rates);
      setPricingRules(rules);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCustomerProducts = async () => {
    if (!customer.email) return;

    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customer.email)
        .maybeSingle();

      if (!customerData) {
        setCustomerProducts([]);
        return;
      }

      const { data: products } = await supabase
        .from('customer_products')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      setCustomerProducts(products || []);
    } catch (error) {
      console.error('Error loading customer products:', error);
      setCustomerProducts([]);
    }
  };

  const loadDealerInventory = async () => {
    if (!profile?.id) return;

    try {
      let query = supabase
        .from('dealer_inventory')
        .select('*')
        .eq('status', 'available');

      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data: inventory } = await query.order('created_at', { ascending: false });

      setDealerInventory(inventory || []);
    } catch (error) {
      console.error('Error loading dealer inventory:', error);
      setDealerInventory([]);
    }
  };

  const handleSelectProduct = (product: any) => {
    setTrailer({
      vin: product.vin,
      make: product.make,
      model: product.model,
      year: product.year,
      trailerType: product.trailer_type,
      category: product.category,
      purchaseDate: product.purchase_date,
      purchasePrice: product.purchase_price,
      manufacturerWarrantyEndDate: product.manufacturer_warranty_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPromotional: false,
    });
    setShowProductPicker(false);
  };

  const handleSelectInventoryItem = (item: any) => {
    const today = new Date().toISOString().split('T')[0];
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    setTrailer({
      vin: item.vin,
      make: item.make,
      model: item.model,
      year: item.year,
      trailerType: item.type || '',
      category: 'fermee',
      purchaseDate: item.purchase_date || today,
      purchasePrice: item.asking_price || item.purchase_price || 0,
      manufacturerWarrantyEndDate: oneYearFromNow.toISOString().split('T')[0],
      isPromotional: false,
    });
    setShowInventoryPicker(false);
  };

  const calculatePrice = () => {
    if (!selectedPlan) {
      return { subtotal: 0, taxes: 0, total: 0 };
    }

    try {
      // CRITIQUE: Utiliser safeNumber pour garantir des valeurs numériques valides
      const basePrice = safeNumber(selectedPlan.base_price, 0);

      // CRITIQUE: Utiliser safeAdd pour additionner les prix d'options de manière sécurisée
      const optionsPrice = options
        .filter((opt) => selectedOptions.includes(opt.id))
        .reduce((sum, opt) => safeAdd(sum, safeNumber(opt.price, 0)), 0);

      const subtotal = safeAdd(basePrice, optionsPrice);
      const taxes = safeNumber(calculateTaxes(subtotal, customer.province, taxRates), 0);
      const total = safeAdd(subtotal, taxes);

      return {
        subtotal,
        taxes,
        total,
      };
    } catch (error) {
      console.error('[NewWarranty] Error calculating price:', error);
      return { subtotal: 0, taxes: 0, total: 0 };
    }
  };

  const validateLegal = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (customer.province === 'QC' && customer.languagePreference !== 'fr') {
      warnings.push('La réglementation québécoise recommande les contrats en français');
    }

    // CRITIQUE: Validation de la date de fin de garantie fabricant
    if (!trailer.manufacturerWarrantyEndDate) {
      errors.push('La date de fin de garantie fabricant est obligatoire');
    }

    // CRITIQUE: Validation du prix d'achat
    if (!trailer.purchasePrice || trailer.purchasePrice <= 0) {
      errors.push('Le prix d\'achat doit être supérieur à 0 $');
    }

    return { errors, warnings, passed: errors.length === 0 };
  };

  const generateDocumentContent = () => {
    const pricing = calculatePrice();
    const pprData = calculateWarrantyData(
      trailer.purchasePrice,
      new Date(trailer.manufacturerWarrantyEndDate),
      trailer.isPromotional
    );

    return `
CONTRAT DE GARANTIE PROLONGÉE

Informations du Client:
Nom: ${customer.firstName} ${customer.lastName}
Email: ${customer.email}
Téléphone: ${customer.phone}
Adresse: ${customer.address}, ${customer.city}, ${customer.province} ${customer.postalCode}

Informations de la Remorque:
VIN: ${trailer.vin}
Marque: ${trailer.make}
Modèle: ${trailer.model}
Année: ${trailer.year}
Type: ${trailer.trailerType}
Prix d'achat: ${trailer.purchasePrice.toFixed(2)} $

Détails de la Garantie:
Plan: ${selectedPlan?.name}
${selectedPlan?.description ? `\nDescription:\n${selectedPlan.description}\n` : ''}${selectedPlan?.coverage_details ? `\nCouverture:\n${selectedPlan.coverage_details}\n` : ''}
Durée: ${PPR_DURATION_MONTHS} mois (${PPR_DURATION_MONTHS / 12} ans)
Franchise: ${PPR_DEDUCTIBLE}.00 $
Limite annuelle: ${formatAnnualLimit(pprData.annualLimit)}
Crédit de fidélité: ${formatLoyaltyCredit(pprData.loyaltyCredit)}

Tarification:
Prix de base: ${selectedPlan?.base_price.toFixed(2)} $
Options: ${(pricing.subtotal - (selectedPlan?.base_price || 0)).toFixed(2)} $
Taxes: ${pricing.taxes.toFixed(2)} $
Total: ${pricing.total.toFixed(2)} $ CAD

Options sélectionnées:
${selectedOptions.map(optId => {
  const opt = options.find(o => o.id === optId);
  return opt ? `- ${opt.name}: ${opt.price.toFixed(2)} $` : '';
}).join('\n')}

Dates de garantie:
Début: ${pprData.pprStartDate.toLocaleDateString('fr-CA')}
Fin: ${pprData.pprEndDate.toLocaleDateString('fr-CA')}
Prochain entretien: ${pprData.nextEntretienDue.toLocaleDateString('fr-CA')}
    `.trim();
  };

  const handleSubmit = async () => {
    // VALIDATION CRITIQUE 1: Vérifier l'organisation AVANT d'ouvrir le pad de signature
    if (!currentOrganization?.id) {
      alert('Erreur: Organisation non définie. Veuillez vous reconnecter.');
      return;
    }

    // VALIDATION CRITIQUE 2: Vérifier que le plan est sélectionné
    if (!selectedPlan?.id) {
      alert('Erreur: Vous devez sélectionner un plan de garantie pour continuer.');
      return;
    }

    // VALIDATION CRITIQUE 3: Vérifier que le prix d\'achat est valide
    if (!trailer.purchasePrice || trailer.purchasePrice <= 0) {
      alert('Erreur: Le prix d\'achat de la remorque doit être supérieur à 0 $.');
      return;
    }

    // VALIDATION CRITIQUE 4: Valider les règles légales
    const validation = validateLegal();
    if (!validation.passed) {
      alert(`Impossible de continuer:\n${validation.errors.join('\n')}`);
      return;
    }

    // VALIDATION CRITIQUE 5: Calculer et valider les valeurs numériques
    try {
      console.log('[NewWarranty] Step 5 - Starting numeric validation');
      console.log('[NewWarranty] Selected plan:', {
        id: selectedPlan?.id,
        name: selectedPlan?.name,
        base_price: selectedPlan?.base_price
      });

      // Vérifier que selectedPlan existe
      if (!selectedPlan) {
        alert('Erreur: Vous devez sélectionner un plan de garantie pour continuer.');
        return;
      }

      // Vérifier que base_price est défini
      if (selectedPlan.base_price === null || selectedPlan.base_price === undefined) {
        alert('Erreur: Le prix du plan sélectionné est invalide.');
        return;
      }

      const pricing = calculatePrice();
      console.log('[NewWarranty] Pricing calculated:', pricing);

      // Vérifier que pricing retourne des valeurs valides
      if (pricing.subtotal === undefined || pricing.taxes === undefined || pricing.total === undefined) {
        alert('Erreur: Impossible de calculer le prix. Veuillez réessayer.');
        return;
      }

      // CRITIQUE: Normaliser TOUTES les valeurs avant validation
      const basePrice = safeNumber(selectedPlan.base_price, 0);
      const optionsPrice = safeNumber(pricing.subtotal, 0) - basePrice;
      const taxes = safeNumber(pricing.taxes, 0);
      const totalPrice = safeNumber(pricing.total, 0);
      const margin = safeMultiply(totalPrice, 0.3);

      // Vérification supplémentaire: s'assurer que toutes les valeurs sont des nombres
      if (isNaN(basePrice) || isNaN(optionsPrice) || isNaN(taxes) || isNaN(totalPrice) || isNaN(margin)) {
        console.error('[NewWarranty] NaN detected in numeric fields:', {
          basePrice, optionsPrice, taxes, totalPrice, margin
        });
        alert('Erreur: Certaines valeurs numériques sont invalides. Veuillez recharger la page et réessayer.');
        return;
      }

      // Créer un objet normalisé avec toutes les valeurs numériques
      const numericFields = {
        base_price: basePrice,
        options_price: optionsPrice,
        taxes: taxes,
        total_price: totalPrice,
        margin: margin,
        deductible: PPR_DEDUCTIBLE
      };

      console.log('[NewWarranty] Pre-validation numeric fields:', numericFields);

      // Valider les champs numériques AVANT de continuer
      const numericValidation = validateWarrantyNumericFields(numericFields);

      if (!numericValidation.isValid) {
        console.error('[NewWarranty] Numeric validation failed:', numericValidation.errors);
        alert(
          'Erreur de validation des données numériques:\n\n' +
          numericValidation.errors.join('\n') +
          '\n\nVeuillez vérifier les montants et réessayer.'
        );
        return;
      }

      if (numericValidation.warnings.length > 0) {
        console.warn('[NewWarranty] Numeric validation warnings:', numericValidation.warnings);
      }

      console.log('[NewWarranty] All validations passed, opening signature pad');
    } catch (error) {
      console.error('[NewWarranty] Error during validation:', error);
      alert('Erreur lors de la validation des données. Veuillez réessayer.');
      return;
    }

    setPendingWarrantyData({ validation });
    setShowSignatureMethodSelector(true);
  };

  const handleSignatureMethodSelected = async (method: SignatureMethod) => {
    setSelectedSignatureMethod(method);
    setShowSignatureMethodSelector(false);

    // Save the signature method selection
    try {
      await saveSignatureMethodSelection(
        null, // warrantyId will be null for new warranty
        currentOrganization!.id,
        method,
        profile?.id
      );
    } catch (error) {
      console.error('[NewWarranty] Error saving signature method:', error);
      // Non-blocking error, continue with signature flow
    }

    // Open the appropriate flow
    if (method === 'online') {
      setShowSignaturePad(true);
    } else {
      setShowInPersonSignatureFlow(true);
    }
  };

  const handleInPersonSignatureComplete = async (physicalSignatureData: PhysicalSignatureData) => {
    try {
      setLoading(true);
      setShowCreationProgress(true);
      setCreationStep(1);
      const validation = pendingWarrantyData.validation;

      if (!currentOrganization?.id) {
        alert('Erreur: Organisation non définie. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      console.log('[NewWarranty] Processing in-person signature completion');
      console.log('[NewWarranty] Physical signature data received:', {
        signerFullName: physicalSignatureData.signerFullName,
        signerEmail: physicalSignatureData.signerEmail,
        clientSignatureDataUrl: physicalSignatureData.clientSignatureDataUrl ? `${physicalSignatureData.clientSignatureDataUrl.substring(0, 50)}... (${physicalSignatureData.clientSignatureDataUrl.length} chars)` : 'EMPTY',
        witnessName: physicalSignatureData.witnessName,
        witnessSignatureDataUrl: physicalSignatureData.witnessSignatureDataUrl ? `${physicalSignatureData.witnessSignatureDataUrl.substring(0, 50)}... (${physicalSignatureData.witnessSignatureDataUrl.length} chars)` : 'EMPTY'
      });

      // VALIDATION CRITIQUE: Vérifier que clientSignatureDataUrl n'est pas vide
      if (!physicalSignatureData.clientSignatureDataUrl) {
        console.error('[NewWarranty] ERREUR CRITIQUE: clientSignatureDataUrl est vide!');
        alert('Erreur: La signature du client est manquante. Veuillez réessayer.');
        setLoading(false);
        return;
      }

      // Prepare signature data in the same format as online signature
      const signatureData = {
        signerFullName: physicalSignatureData.signerFullName,
        signerEmail: physicalSignatureData.signerEmail,
        signerPhone: physicalSignatureData.signerPhone,
        signatureDataUrl: physicalSignatureData.clientSignatureDataUrl,
        documentHash: '', // Will be calculated
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
        termsDisclosed: true,
        withdrawalNoticeShown: true,
        documentViewedAt: new Date().toISOString(),
        documentViewDuration: 0,
        userAgent: navigator.userAgent,
        ipAddress: undefined,
        geolocation: physicalSignatureData.geolocation,
        interfaceLanguage: customer.languagePreference,
        signatureSessionId: physicalSignatureData.physicalDocumentNumber
      };

      console.log('[NewWarranty] Signature data prepared for finalizeWarranty:', {
        signatureDataUrl: signatureData.signatureDataUrl ? `${signatureData.signatureDataUrl.substring(0, 50)}... (${signatureData.signatureDataUrl.length} chars)` : 'EMPTY'
      });

      // Create warranty with the signature data, but will add physical signature specific fields
      await finalizeWarranty(signatureData, {
        isInPerson: true,
        physicalData: physicalSignatureData
      });

      setShowInPersonSignatureFlow(false);
    } catch (error) {
      console.error('[NewWarranty] Error completing in-person signature:', error);
      alert('Erreur lors de la finalisation de la signature en personne');
      setLoading(false);
    }
  };

  const finalizeWarranty = async (
    signatureData: {
      signerFullName: string;
      signerEmail: string;
      signerPhone: string;
      signatureDataUrl: string;
      documentHash: string;
      consentGiven: boolean;
      consentTimestamp: string;
      termsDisclosed: boolean;
      withdrawalNoticeShown: boolean;
      documentViewedAt: string;
      documentViewDuration: number;
      userAgent: string;
      ipAddress?: string;
      geolocation?: any;
      interfaceLanguage: string;
      signatureSessionId: string;
    },
    options?: {
      isInPerson?: boolean;
      physicalData?: PhysicalSignatureData;
    }
  ) => {
    const validation = pendingWarrantyData.validation;
    setLoading(true);
    setShowCreationProgress(true);
    setCreationStep(1);

    // CRITICAL: Verify organization context before proceeding
    if (!currentOrganization?.id) {
      alert('Erreur: Organisation non définie. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }

    // VALIDATION CRITIQUE: Vérifier tous les champs obligatoires
    // Note: documentHash peut être vide pour signature en personne (sera calculé plus tard)
    if (!signatureData.signatureDataUrl) {
      alert('Erreur: Données de signature invalides. Veuillez réessayer.');
      setLoading(false);
      return;
    }

    if (!signatureData.consentGiven) {
      alert('Erreur: Le consentement doit être donné pour finaliser la vente.');
      setLoading(false);
      return;
    }

    if (!selectedPlan?.id) {
      alert('Erreur: Vous devez sélectionner un plan de garantie avant de finaliser la vente.');
      setLoading(false);
      return;
    }

    console.log('='.repeat(80));
    console.log('[NewWarranty] 🚀 STARTING WARRANTY CREATION PROCESS');
    console.log('='.repeat(80));
    console.log('[NewWarranty] Organization ID:', currentOrganization.id);
    console.log('[NewWarranty] User Profile ID:', profile?.id);
    console.log('[NewWarranty] Selected Plan:', selectedPlan?.name);
    console.log('[NewWarranty] Customer:', `${customer.firstName} ${customer.lastName}`);
    console.log('[NewWarranty] Trailer:', `${trailer.year} ${trailer.make} ${trailer.model}`);
    console.log('='.repeat(80));
    console.log('[NewWarranty] Step 1/6: Calculating pricing and preparing data');

    try {
      const pricing = calculatePrice();
      const saleDuration = Math.round((Date.now() - startTime) / 1000);

      console.log('[NewWarranty] Step 2/6: Checking if customer exists with email:', customer.email);
      setCreationStep(2);

      // Check if customer already exists with this email in this organization
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', customer.email)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      let customerData;

      if (existingCustomer) {
        console.log('[NewWarranty] Step 2/6: Customer exists, using existing customer:', existingCustomer.id);

        // Update customer info if needed (keep most recent data)
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            province: customer.province,
            postal_code: customer.postalCode,
            language_preference: customer.languagePreference,
            consent_marketing: customer.consentMarketing,
            consent_date: customer.consentMarketing ? new Date().toISOString() : existingCustomer.consent_date,
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (updateError) {
          console.warn('[NewWarranty] Warning: Could not update customer info:', updateError);
          // Use existing customer with updated fields manually if update fails
          customerData = {
            ...existingCustomer,
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            province: customer.province,
            postal_code: customer.postalCode,
            language_preference: customer.languagePreference,
            consent_marketing: customer.consentMarketing,
          };
        } else {
          // Use the updated customer data from the database
          customerData = updatedCustomer;
        }
      } else {
        console.log('[NewWarranty] Step 2/6: Creating new customer');
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            organization_id: currentOrganization.id,
            dealer_id: profile?.id,
            user_id: profile?.id, // Link customer to current user
            first_name: customer.firstName,
            last_name: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            province: customer.province,
            postal_code: customer.postalCode,
            language_preference: customer.languagePreference,
            consent_marketing: customer.consentMarketing,
            consent_date: customer.consentMarketing ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (customerError) {
          console.error('[NewWarranty] Error creating customer:', customerError);
          throw new Error(`Étape 2/6 échouée - Erreur lors de la création du client: ${customerError.message}`);
        }

        customerData = newCustomer;
      }

      console.log('[NewWarranty] Step 2/6: Customer ready - ID:', customerData.id);

      console.log('[NewWarranty] Step 3/6: Checking if trailer exists with VIN:', trailer.vin);
      setCreationStep(3);

      // Check if trailer already exists with this VIN
      const { data: existingTrailer } = await supabase
        .from('trailers')
        .select('*')
        .eq('vin', trailer.vin)
        .maybeSingle();

      let trailerData;

      if (existingTrailer) {
        console.log('[NewWarranty] Step 3/6: Trailer exists, using existing trailer:', existingTrailer.id);
        trailerData = existingTrailer;
      } else {
        console.log('[NewWarranty] Step 3/6: Creating new trailer');
        const { data: newTrailer, error: trailerError } = await supabase
          .from('trailers')
          .insert({
            organization_id: currentOrganization.id,
            dealer_id: profile?.id,
            customer_id: customerData.id,
            vin: trailer.vin,
            make: trailer.make,
            model: trailer.model,
            year: trailer.year,
            trailer_type: trailer.trailerType,
            category: trailer.category,
            purchase_date: trailer.purchaseDate,
            purchase_price: trailer.purchasePrice,
            manufacturer_warranty_end_date: trailer.manufacturerWarrantyEndDate,
            ppr_warranty_start_date: trailer.manufacturerWarrantyEndDate,
          })
          .select()
          .single();

        if (trailerError) {
          console.error('[NewWarranty] Error creating trailer:', trailerError);
          throw new Error(`Étape 3/6 échouée - Erreur lors de la création de la remorque: ${trailerError.message}`);
        }

        trailerData = newTrailer;
        console.log('[NewWarranty] Step 3/6: Trailer created successfully - ID:', trailerData.id);
      }

      const contractNumber = `PPR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // CRITIQUE: Calculer pprData pour obtenir la durée correcte (72 mois)
      const pprData = calculateWarrantyData(
        trailer.purchasePrice,
        new Date(trailer.manufacturerWarrantyEndDate),
        trailer.isPromotional
      );
      const startDate = pprData.pprStartDate;
      const endDate = pprData.pprEndDate;

      console.log('-'.repeat(80));
      console.log('[NewWarranty] Step 4/6: Creating warranty with organization_id:', currentOrganization.id);
      setCreationStep(4);
      console.log('[NewWarranty] PPR Data Calculated:', {
        startDate: pprData.pprStartDate.toISOString().split('T')[0],
        endDate: pprData.pprEndDate.toISOString().split('T')[0],
        durationMonths: pprData.durationMonths,
        annualLimit: pprData.annualLimit,
        loyaltyCredit: pprData.loyaltyCredit,
        warrantyYear: pprData.warrantyYear
      });
      console.log('-'.repeat(80));

      // CRITIQUE: Normaliser TOUTES les valeurs numériques avant insertion
      const basePrice = safeNumber(selectedPlan!.base_price, 0);
      const optionsPrice = safeNumber(pricing.subtotal, 0) - basePrice;
      const taxes = safeNumber(pricing.taxes, 0);
      const totalPrice = safeNumber(pricing.total, 0);
      const margin = safeMultiply(totalPrice, 0.3);
      const normalizedDeductible = PPR_DEDUCTIBLE; // Constante PPR
      const normalizedDuration = pprData.durationMonths; // Devrait être PPR_DURATION_MONTHS (72 mois)

      // Log détaillé des valeurs avant insertion
      console.log('[NewWarranty] CRITICAL - Numeric values before DB insert:', {
        base_price: { value: basePrice, type: typeof basePrice, isValid: !isNaN(basePrice) },
        options_price: { value: optionsPrice, type: typeof optionsPrice, isValid: !isNaN(optionsPrice) },
        taxes: { value: taxes, type: typeof taxes, isValid: !isNaN(taxes) },
        total_price: { value: totalPrice, type: typeof totalPrice, isValid: !isNaN(totalPrice) },
        margin: { value: margin, type: typeof margin, isValid: !isNaN(margin) },
        deductible: { value: normalizedDeductible, type: typeof normalizedDeductible, isValid: !isNaN(normalizedDeductible) },
        duration_months: { value: normalizedDuration, type: typeof normalizedDuration, isValid: !isNaN(normalizedDuration) },
        start_date: pprData.pprStartDate.toISOString().split('T')[0],
        end_date: pprData.pprEndDate.toISOString().split('T')[0]
      });

      // VALIDATION FINALE avant insertion (inclut validation des dates)
      const finalValidation = validateWarrantyNumericFields({
        base_price: basePrice,
        options_price: optionsPrice,
        taxes: taxes,
        total_price: totalPrice,
        margin: margin,
        deductible: normalizedDeductible,
        duration_months: normalizedDuration,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (!finalValidation.isValid) {
        console.error('[NewWarranty] CRITICAL: Final numeric validation failed:', finalValidation.errors);
        throw new Error(`Étape 4/6 échouée - Validation numérique: ${finalValidation.errors.join(', ')}`);
      }

      // Log des warnings (non-bloquants)
      if (finalValidation.warnings.length > 0) {
        console.warn('[NewWarranty] Numeric validation warnings:', finalValidation.warnings);
      }

      const { data: warrantyData, error: warrantyError } = await supabase
        .from('warranties')
        .insert({
          organization_id: currentOrganization.id,
          contract_number: contractNumber,
          customer_id: customerData.id,
          trailer_id: trailerData.id,
          plan_id: selectedPlan!.id,
          language: customer.languagePreference,
          province: customer.province,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          duration_months: normalizedDuration,
          base_price: basePrice,
          options_price: optionsPrice,
          taxes: taxes,
          total_price: totalPrice,
          margin: margin,
          deductible: normalizedDeductible,
          selected_options: selectedOptions,
          status: 'active',
          franchise_amount: normalizedDeductible,
          annual_claim_limit: pprData.annualLimit,
          total_claimed_current_year: 0,
          warranty_year: 1,
          is_promotional_purchase: trailer.isPromotional,
          entretien_annuel_completed_years: [],
          next_entretien_due: pprData.nextEntretienDue.toISOString().split('T')[0],
          legal_validation_passed: validation.passed,
          legal_validation_errors: validation.errors,
          legal_validation_warnings: validation.warnings,
          sale_duration_seconds: saleDuration,
          created_by: profile?.id,
          custom_template_id: selectedTemplate?.id || null,
          template_pdf_url: selectedTemplate?.pdf_content_base64 || null,
          signer_full_name: signatureData.signerFullName,
          signer_email: signatureData.signerEmail,
          signer_phone: signatureData.signerPhone,
          signed_at: new Date().toISOString(),
          signature_session_id: signatureData.signatureSessionId,
          consent_given: signatureData.consentGiven,
          consent_timestamp: signatureData.consentTimestamp,
          terms_disclosed: signatureData.termsDisclosed,
          withdrawal_notice_shown: signatureData.withdrawalNoticeShown,
          interface_language: signatureData.interfaceLanguage,
          user_agent: signatureData.userAgent,
          document_hash: signatureData.documentHash,
          document_viewed_at: signatureData.documentViewedAt,
          document_view_duration: signatureData.documentViewDuration,
          geolocation: signatureData.geolocation,
          signature_ip: signatureData.ipAddress,
        })
        .select('id, contract_number, organization_id')
        .single();

      if (warrantyError) {
        console.error('[NewWarranty] Error creating warranty:', warrantyError);

        // Analyser l'erreur pour fournir un message plus précis
        let errorMessage = `Étape 4/6 échouée - Erreur lors de la création de la garantie: ${warrantyError.message}`;

        if (warrantyError.message.includes('duration_months')) {
          errorMessage += `\n\nDétails: duration_months=${normalizedDuration}, start_date=${startDate.toISOString().split('T')[0]}, end_date=${endDate.toISOString().split('T')[0]}`;
          errorMessage += '\n\nCette erreur indique une incohérence entre la durée (72 mois) et les dates de début/fin.';
        } else if (warrantyError.message.includes('organization_id')) {
          errorMessage += '\n\nVeuillez vous reconnecter et réessayer.';
        } else if (warrantyError.code === 'PGRST116' || warrantyError.message.includes('RLS')) {
          errorMessage += '\n\nErreur de permission: vérifiez que vous avez les droits nécessaires.';
        }

        throw new Error(errorMessage);
      }

      console.log('-'.repeat(80));
      console.log('[NewWarranty] ✅ Step 4/6: Warranty created successfully - ID:', warrantyData.id);
      console.log('[NewWarranty] Contract Number:', warrantyData.contract_number);
      console.log('-'.repeat(80));
      console.log('[NewWarranty] Step 5/6: Creating claim token and generating documents');
      setCreationStep(5);

      // CRITIQUE: Vérifier que le token de réclamation existe avant de générer les documents
      const { data: tokenCheckData } = await supabase
        .from('warranty_claim_tokens')
        .select('token')
        .eq('warranty_id', warrantyData.id)
        .maybeSingle();

      if (!tokenCheckData?.token) {
        console.warn('[NewWarranty] Claim token not auto-created, creating manually');
        const claimToken = crypto.randomUUID();
        const { error: tokenError } = await supabase
          .from('warranty_claim_tokens')
          .insert({
            warranty_id: warrantyData.id,
            organization_id: currentOrganization.id,
            token: claimToken,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (tokenError) {
          console.error('[NewWarranty] Error creating claim token:', tokenError);
          // Non-bloquant: continuer sans le token
        } else {
          console.log('[NewWarranty] Claim token created successfully:', claimToken);
        }
      } else {
        console.log('[NewWarranty] Claim token already exists:', tokenCheckData.token);
      }

      // Log signature audit trail
      try {
        await logSignatureEvent(
          warrantyData.id,
          warrantyData.organization_id,
          'document_opened',
          { duration: signatureData.documentViewDuration },
          signatureData.signatureSessionId
        );

        await logSignatureEvent(
          warrantyData.id,
          warrantyData.organization_id,
          'identity_verified',
          {
            name: signatureData.signerFullName,
            email: signatureData.signerEmail,
            phone: signatureData.signerPhone
          },
          signatureData.signatureSessionId
        );

        await logSignatureEvent(
          warrantyData.id,
          warrantyData.organization_id,
          'signature_completed',
          {
            contract_number: contractNumber,
            customer_name: signatureData.signerFullName
          },
          signatureData.signatureSessionId
        );
      } catch (auditError) {
        console.error('Error logging signature audit:', auditError);
      }

      // Handle physical signature data if this is an in-person signature
      if (options?.isInPerson && options?.physicalData) {
        try {
          console.log('[NewWarranty] Processing in-person signature data...');
          const physicalData = options.physicalData;

          // Create physical signature tracking record
          const trackingResult = await createPhysicalSignatureTracking(
            warrantyData.id,
            currentOrganization.id,
            physicalData.physicalDocumentNumber,
            physicalData.signatureLocation,
            physicalData.geolocation
          );

          if (!trackingResult.success) {
            console.error('Failed to create physical signature tracking:', trackingResult.error);
          } else {
            console.log('[NewWarranty] Physical signature tracking created successfully');
          }

          // Save identity verification
          if (physicalData.identityVerification) {
            const idResult = await saveIdentityVerification(
              warrantyData.id,
              currentOrganization.id,
              physicalData.identityVerification.documentType,
              physicalData.identityVerification.documentNumber,
              physicalData.identityVerification.issuingAuthority,
              physicalData.identityVerification.expiryDate,
              physicalData.identityVerification.photoUrl,
              physicalData.identityVerification.verifiedBy
            );

            if (!idResult.success) {
              console.error('Failed to save identity verification:', idResult.error);
            }
          }

          // Save witness signatures
          if (physicalData.witnessSignatures && physicalData.witnessSignatures.length > 0) {
            for (const witness of physicalData.witnessSignatures) {
              const witnessResult = await saveWitnessSignature(
                warrantyData.id,
                currentOrganization.id,
                witness.fullName,
                witness.email,
                witness.phone,
                witness.role,
                witness.signatureUrl
              );

              if (!witnessResult.success) {
                console.error('Failed to save witness signature:', witnessResult.error);
              }
            }
          }

          // Save scanned documents
          if (physicalData.scannedDocuments && physicalData.scannedDocuments.length > 0) {
            for (const doc of physicalData.scannedDocuments) {
              const docResult = await saveScannedDocument(
                warrantyData.id,
                currentOrganization.id,
                doc.documentType,
                doc.fileUrl,
                doc.fileName,
                doc.fileSize,
                doc.scanQuality,
                doc.notes
              );

              if (!docResult.success) {
                console.error('Failed to save scanned document:', docResult.error);
              }
            }
          }

          // Update warranty with physical signature fields
          const { error: updateError } = await supabase
            .from('warranties')
            .update({
              physical_document_number: physicalData.physicalDocumentNumber,
              signature_location: physicalData.signatureLocation,
              signature_method: 'in_person',
              physical_signature_date: new Date().toISOString(),
              physical_signature_completed: true
            })
            .eq('id', warrantyData.id);

          if (updateError) {
            console.error('Failed to update warranty with physical signature fields:', updateError);
          } else {
            console.log('[NewWarranty] Warranty updated with physical signature fields successfully');
          }

        } catch (physicalError) {
          console.error('Error processing physical signature data:', physicalError);
        }
      }

      if (pprData.loyaltyCredit > 0) {
        await supabase.from('loyalty_credits').insert({
          customer_id: customerData.id,
          warranty_id: warrantyData.id,
          credit_amount: pprData.loyaltyCredit,
          is_eligible: true,
        });
      }

      // CRITIQUE: Construire un objet warranty complet avec TOUTES les valeurs numériques
      // car le .select() ci-dessus ne retourne que quelques champs
      const completeWarrantyData = {
        ...warrantyData,
        base_price: basePrice,
        options_price: optionsPrice,
        taxes: taxes,
        total_price: totalPrice,
        margin: margin,
        deductible: normalizedDeductible,
        duration_months: normalizedDuration,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        plan_id: selectedPlan!.id,
        customer_id: customerData.id,
        trailer_id: trailerData.id
      };

      console.log('[NewWarranty] Complete warranty data for document generation:', {
        id: completeWarrantyData.id,
        base_price: completeWarrantyData.base_price,
        options_price: completeWarrantyData.options_price,
        taxes: completeWarrantyData.taxes,
        total_price: completeWarrantyData.total_price,
        margin: completeWarrantyData.margin,
        deductible: completeWarrantyData.deductible
      });

      const docResult = await generateAndStoreDocuments(
        warrantyData.id,
        {
          warranty: completeWarrantyData,
          customer: customerData,
          trailer: trailerData,
          plan: selectedPlan!,
        },
        signatureData.signatureDataUrl,
        selectedTemplate
      );

      console.log('[NewWarranty] Step 5/6: Documents generation result:', docResult.success ? 'SUCCESS' : 'FAILED');

      if (!docResult.success) {
        console.error('[NewWarranty] Document generation failed:', docResult.error);
        // Non-bloquant mais on informe l'utilisateur
      }

      // CRITICAL: Fetch the updated warranty data to get the PDF URLs that were just generated
      console.log('[NewWarranty] Fetching updated warranty data with PDF URLs...');
      const { data: updatedWarrantyData, error: fetchError } = await supabase
        .from('warranties')
        .select('id, contract_number, organization_id, customer_id, contract_pdf_url, customer_invoice_pdf_url, merchant_invoice_pdf_url, created_at')
        .eq('id', warrantyData.id)
        .single();

      if (fetchError) {
        console.error('[NewWarranty] Error fetching updated warranty data:', fetchError);
      } else if (updatedWarrantyData) {
        console.log('[NewWarranty] Updated warranty data fetched successfully:', {
          id: updatedWarrantyData.id,
          hasContractPdf: !!updatedWarrantyData.contract_pdf_url,
          hasCustomerInvoicePdf: !!updatedWarrantyData.customer_invoice_pdf_url,
          hasMerchantInvoicePdf: !!updatedWarrantyData.merchant_invoice_pdf_url,
          contractPdfLength: updatedWarrantyData.contract_pdf_url?.length || 0,
          customerInvoicePdfLength: updatedWarrantyData.customer_invoice_pdf_url?.length || 0
        });
      }

      console.log('[NewWarranty] Step 6/6: Sending confirmation email and finalizing');
      setCreationStep(6);

      // IMPORTANT: Invalidate cache and refresh materialized view
      // This ensures the new warranty appears immediately in the warranties list
      try {
        console.log('[NewWarranty] Invalidating warranty cache...');
        warrantyService.invalidateCache();

        console.log('[NewWarranty] Refreshing materialized view...');
        await warrantyService.refreshMaterializedView();

        console.log('[NewWarranty] ✓ Cache invalidated and view refreshed successfully');
      } catch (cacheError) {
        console.warn('[NewWarranty] Warning: Failed to refresh cache/view:', cacheError);
        // Don't block success - the database trigger should handle the refresh
      }

      let successMessage = `Garantie créée avec succès!\n\nContrat: ${contractNumber}\nVente complétée en ${Math.floor(saleDuration / 60)}m ${saleDuration % 60}s\n\n✓ Client créé\n✓ Remorque enregistrée\n✓ Garantie activée\n✓ Documents générés\n✓ Contrat signé`;

      // Email notification is handled automatically by the database trigger
      // The trigger (notify_new_warranty) sends a professional email with a secure download link
      // This allows customers to download their warranty contract and invoice at any time
      console.log('[NewWarranty] Email will be sent automatically by database trigger with download link');

      const quickbooksConnected = await isIntegrationConnected('quickbooks');
      if (quickbooksConnected) {
        const qbResult = await syncInvoiceToQuickBooks({
          id: warrantyData.id,
          contract_number: contractNumber,
          customer_name: `${customerData.first_name} ${customerData.last_name}`,
          customer_email: customerData.email,
          total_price: pricing.total,
          taxes: pricing.taxes,
          qb_customer_id: null,
        });

        if (qbResult.success) {
          successMessage += '\n✓ Synchronisé avec QuickBooks';
        } else {
          successMessage += `\n⚠️ QuickBooks: ${qbResult.error || 'Erreur de synchronisation'}`;
        }
      }

      const acombaConnected = await isIntegrationConnected('acomba');
      if (acombaConnected) {
        const subtotal = pricing.subtotal;
        const tps = subtotal * 0.05;
        const tvq = subtotal * 0.09975;

        const acombaResult = await syncWarrantyToAcomba({
          contract_number: contractNumber,
          customer_name: `${customerData.first_name} ${customerData.last_name}`,
          customer_email: customerData.email,
          description: `Garantie prolongée - ${trailerData.year} ${trailerData.make} ${trailerData.model}`,
          subtotal: subtotal,
          tps: tps,
          tvq: tvq,
          total: pricing.total,
          created_at: warrantyData.created_at,
        });

        if (acombaResult.success) {
          successMessage += '\n✓ Synchronisé avec Acomba';
        } else {
          successMessage += `\n⚠️ Acomba: ${acombaResult.error || 'Erreur de synchronisation'}`;
        }
      }

      // Show final success message with progress modal
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (docResult.success) {
        alert(successMessage);
      } else {
        alert(`Garantie créée avec succès!\n\nContrat: ${contractNumber}\n\nNote: Erreur lors de la génération des documents: ${docResult.error}`);
      }

      setShowCreationProgress(false);
      setShowSignaturePad(false);
      setPendingWarrantyData(null);
      setStep(1);
      setSelectedPlan(null);
      setSelectedOptions([]);
      setCustomer({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        province: 'QC',
        postalCode: '',
        languagePreference: 'fr',
        consentMarketing: false,
      });
      setTrailer({
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        trailerType: '',
        category: 'fermee',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 1000,
        manufacturerWarrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isPromotional: false,
      });
    } catch (error: any) {
      console.error('[NewWarranty] CRITICAL ERROR during warranty creation:', error);
      setShowCreationProgress(false);

      // Provide detailed error messages with step information
      let errorMessage = 'Erreur lors de la création de la garantie';
      let errorStep = 'Étape inconnue';

      if (error.message) {
        // Extract step number from error message if present
        const stepMatch = error.message.match(/Étape (\d+\/\d+)/);
        if (stepMatch) {
          errorStep = stepMatch[1];
        }

        if (error.message.includes('organization_id')) {
          errorMessage = 'Erreur: Organisation non définie. Veuillez vous reconnecter et réessayer.';
        } else if (error.message.includes('token')) {
          errorMessage = 'Erreur: Impossible de créer le lien de réclamation. La garantie a été créée mais sans lien de réclamation.';
        } else if (error.message.includes('RLS') || error.message.includes('permission')) {
          errorMessage = 'Erreur de permission: Vous n\'avez pas les droits nécessaires pour créer une garantie.';
        } else if (error.message.includes('foreign key') || error.message.includes('violates')) {
          errorMessage = 'Erreur de données: Une référence invalide a été détectée. Veuillez vérifier toutes les informations.';
        } else if (error.message.includes('trailers_vin_key') || error.message.includes('duplicate key')) {
          errorMessage = 'Erreur: Ce numéro VIN existe déjà dans le système.';
        } else if (error.message.includes('email_queue')) {
          errorMessage = 'La garantie a été créée mais l\'email de confirmation n\'a pas pu être envoyé.';
        } else if (error.message.startsWith('Étape')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }

      console.error('[NewWarranty] Error details:', {
        step: errorStep,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
      });

      const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      console.error('[NewWarranty] Error ID for support:', errorId);

      alert(
        errorMessage +
        '\n\n' + errorStep +
        '\n\nID de référence: ' + errorId +
        '\nCode technique: ' + (error.code || 'N/A') +
        '\n\nVeuillez contacter le support avec cet ID si le problème persiste.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pricing = calculatePrice();
  const validation = validateLegal();

  const workflowSteps = [
    { label: 'Client', completed: step > 1 },
    { label: 'Remorque', completed: step > 2 },
    { label: 'Garantie', completed: step > 3 },
    { label: 'Confirmation', completed: step > 4 }
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <Breadcrumbs items={[
        { label: 'Garanties', path: '/warranties' },
        { label: 'Nouvelle Garantie' }
      ]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Nouvelle vente de garantie</h1>
        <p className="text-slate-600 mt-2">Complétez la vente en moins de 5 minutes</p>
      </div>

      <div className="mb-8">
        <ProgressIndicator steps={workflowSteps} currentStep={step - 1} />
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Informations du client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prénom</label>
              <input
                type="text"
                value={customer.firstName}
                onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
              <input
                type="text"
                value={customer.lastName}
                onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Courriel</label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
              <input
                type="text"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
              <input
                type="text"
                value={customer.city}
                onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Province</label>
              <select
                value={customer.province}
                onChange={(e) => setCustomer({ ...customer, province: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                {CANADIAN_PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Code postal</label>
              <input
                type="text"
                value={customer.postalCode}
                onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Langue</label>
              <select
                value={customer.languagePreference}
                onChange={(e) => setCustomer({ ...customer, languagePreference: e.target.value as 'fr' | 'en' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customer.consentMarketing}
                  onChange={(e) => setCustomer({ ...customer, consentMarketing: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">J'accepte de recevoir des communications marketing (conforme LCAP)</span>
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <AnimatedButton
              variant="primary"
              onClick={() => setStep(2)}
              disabled={!customer.firstName || !customer.email}
            >
              Suivant: Info remorque
            </AnimatedButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Informations de la remorque</h2>
            <div className="flex gap-2">
              {dealerInventory.length > 0 && (
                <button
                  onClick={() => setShowInventoryPicker(true)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                >
                  Choisir depuis mon inventaire
                </button>
              )}
              {customerProducts.length > 0 && (
                <button
                  onClick={() => setShowProductPicker(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  Choisir un produit existant
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">VIN</label>
              <input
                type="text"
                value={trailer.vin}
                onChange={(e) => setTrailer({ ...trailer, vin: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Make</label>
              <input
                type="text"
                value={trailer.make}
                onChange={(e) => setTrailer({ ...trailer, make: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Model</label>
              <input
                type="text"
                value={trailer.model}
                onChange={(e) => setTrailer({ ...trailer, model: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <input
                type="number"
                value={trailer.year}
                onChange={(e) => setTrailer({ ...trailer, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <input
                type="text"
                value={trailer.trailerType}
                onChange={(e) => setTrailer({ ...trailer, trailerType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                placeholder="e.g., Utility, Enclosed, Flatbed"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Purchase Date</label>
              <input
                type="date"
                value={trailer.purchaseDate}
                onChange={(e) => setTrailer({ ...trailer, purchaseDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valeur d'achat <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={trailer.purchasePrice}
                onChange={(e) => setTrailer({ ...trailer, purchasePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                min="0.01"
                step="0.01"
                required
              />
              {trailer.purchasePrice <= 0 && (
                <p className="text-xs text-red-600 mt-1">Le prix d'achat doit être supérieur à 0$</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Catégorie</label>
              <select
                value={trailer.category}
                onChange={(e) => setTrailer({ ...trailer, category: e.target.value as 'fermee' | 'ouverte' | 'utilitaire' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="fermee">Remorque Fermée</option>
                <option value="ouverte">Remorque Ouverte</option>
                <option value="utilitaire">Remorque Utilitaire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fin garantie fabricant <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={trailer.manufacturerWarrantyEndDate}
                onChange={(e) => setTrailer({ ...trailer, manufacturerWarrantyEndDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
                min={trailer.purchaseDate}
              />
              <p className="text-xs text-slate-500 mt-1">La garantie PPR débute après cette date</p>
              {!trailer.manufacturerWarrantyEndDate && (
                <p className="text-xs text-red-600 mt-1">Ce champ est obligatoire</p>
              )}
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trailer.isPromotional}
                  onChange={(e) => setTrailer({ ...trailer, isPromotional: e.target.checked })}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">Achat promotionnel (affecte crédit fidélité)</span>
              </label>
            </div>
          </div>
          {trailer.purchasePrice > 0 && trailer.manufacturerWarrantyEndDate && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200/60">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">ℹ️ Calculs Garantie PPR</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Limite annuelle réclamation:</span>
                  <p className="font-semibold text-slate-900">{formatAnnualLimit(trailer.purchasePrice)}</p>
                </div>
                <div>
                  <span className="text-slate-600">Crédit fidélité:</span>
                  <p className="font-semibold text-slate-900">{formatLoyaltyCredit(trailer.purchasePrice, trailer.isPromotional)}</p>
                </div>
                <div>
                  <span className="text-slate-600">Franchise par réclamation:</span>
                  <p className="font-semibold text-slate-900">{PPR_DEDUCTIBLE} $</p>
                </div>
                <div>
                  <span className="text-slate-600">Durée garantie PPR:</span>
                  <p className="font-semibold text-slate-900">{PPR_DURATION_MONTHS / 12} ans</p>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <AnimatedButton
              variant="ghost"
              onClick={() => setStep(1)}
            >
              Retour
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onClick={() => setStep(3)}
              disabled={!trailer.vin || !trailer.make || !trailer.manufacturerWarrantyEndDate || trailer.purchasePrice <= 0}
            >
              Suivant: Sélectionner un plan
            </AnimatedButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sélectionnez une offre commerciale</h2>
            <p className="text-slate-600">Choisissez le plan de garantie adapté aux besoins du client</p>
          </div>

          {plans.length === 0 ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center mb-8">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="w-16 h-16 text-amber-600" />
                <div>
                  <h3 className="text-xl font-bold text-amber-900 mb-2">
                    Aucun plan de garantie actif
                  </h3>
                  <p className="text-amber-800 mb-4">
                    Vous devez créer au moins un plan de garantie actif avant de pouvoir vendre des garanties.
                  </p>
                  <p className="text-sm text-amber-700 mb-6">
                    Les plans de garantie définissent les prix, la couverture et les conditions de vos offres commerciales.
                  </p>
                  <a
                    href="/settings?tab=warranty-plans"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    Créer un plan de garantie
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const isFree = plan.base_price === 0;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`bg-white rounded-2xl shadow-sm border-2 p-6 cursor-pointer transition-all relative ${
                    isSelected ? 'border-slate-900 shadow-lg scale-105' : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  }`}
                >
                  {isFree && (
                    <div className="absolute -top-3 -right-3">
                      <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                        GRATUIT
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-slate-600 mb-4 min-h-[40px]">{plan.description}</p>
                  )}
                  <div className="mb-4">
                    <div className={`text-4xl font-black mb-1 ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isFree ? (
                        'Gratuit'
                      ) : (
                        <>
                          {plan.base_price.toFixed(2)} $
                        </>
                      )}
                    </div>
                    {!isFree && (
                      <p className="text-xs text-slate-500">+ taxes applicables</p>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mb-4">
                    <p>📅 Durée: {plan.duration_months} mois</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium py-2 rounded-lg">
                      <Check className="w-4 h-4" />
                      Sélectionné
                    </div>
                  )}
                  {!isSelected && (
                    <div className="text-center text-sm text-slate-500 py-2">
                      Cliquez pour sélectionner
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}

          {selectedPlan && (
            <div className="space-y-6 mb-6">
              {customTemplates.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Format du document contractuel</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Choisissez le format de présentation du contrat (n'affecte pas le prix ni la couverture)
                      </p>
                      <p className="text-xs text-slate-500 mt-1">💡 Personnalisez votre logo, sections légales et apparence</p>
                    </div>
                    {customTemplates.length > 3 && (
                      <button
                        onClick={() => setShowTemplatePicker(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        Voir tous les modèles
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      onClick={() => setSelectedTemplate(null)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        !selectedTemplate
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {!selectedTemplate && <Check className="w-5 h-5 text-emerald-600" />}
                        <h4 className="font-semibold text-slate-900">Modèle standard</h4>
                      </div>
                      <p className="text-xs text-slate-600">Contrat de garantie généré automatiquement</p>
                    </div>

                    {customTemplates.slice(0, 2).map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {selectedTemplate?.id === template.id && (
                            <Check className="w-5 h-5 text-emerald-600" />
                          )}
                          <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                        </div>
                        <p className="text-xs text-slate-600">
                          {template.template_type === 'uploaded_pdf' ? 'PDF personnalisé' : 'Construit manuellement'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Options supplémentaires</h3>
                  <p className="text-sm text-slate-600 mt-1">Ajoutez des protections additionnelles (affecte le prix total)</p>
                </div>
                <div className="space-y-3">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center justify-between p-4 border border-slate-200/60 rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedOptions.includes(option.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOptions([...selectedOptions, option.id]);
                            } else {
                              setSelectedOptions(selectedOptions.filter((id) => id !== option.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <div>
                          <div className="font-medium text-slate-900">{option.name_en}</div>
                          <div className="text-sm text-slate-600">{option.description}</div>
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">+${option.price.toFixed(2)}</div>
                    </label>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-primary-900 mb-2">ℹ️ Caractéristiques de la garantie PPR</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Durée:</span>
                      <p className="font-semibold text-slate-900">{PPR_DURATION_MONTHS} mois ({PPR_DURATION_MONTHS / 12} ans)</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Franchise:</span>
                      <p className="font-semibold text-slate-900">{PPR_DEDUCTIBLE} $ par réclamation</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Ces valeurs sont fixes pour tous les contrats PPR</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <AnimatedButton
              variant="ghost"
              onClick={() => setStep(2)}
            >
              Retour
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onClick={() => setStep(4)}
              disabled={!selectedPlan}
            >
              Suivant: Révision
            </AnimatedButton>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Révision et finalisation</h2>

            {!validation.passed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">Legal Validation Failed</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-2">Warnings</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Customer</h3>
                <p className="text-slate-600">
                  {customer.firstName} {customer.lastName} - {customer.email}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Trailer</h3>
                <p className="text-slate-600">
                  {trailer.year} {trailer.make} {trailer.model} - VIN: {trailer.vin}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Coverage</h3>
                <p className="text-slate-600">
                  {selectedPlan?.name_en} - {PPR_DURATION_MONTHS} mois ({PPR_DURATION_MONTHS / 12} ans) - {PPR_DEDUCTIBLE}$ franchise
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Plan Price</span>
                  <span className="font-medium text-slate-900">${selectedPlan?.base_price.toFixed(2)}</span>
                </div>
                {selectedOptions.length > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Options</span>
                    <span className="font-medium text-slate-900">
                      ${(pricing.subtotal - (selectedPlan?.base_price || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Taxes</span>
                  <span className="font-medium text-slate-900">${pricing.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>${pricing.total.toFixed(2)} CAD</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-900 mb-1">Loyalty Program Included</h4>
                    <p className="text-sm text-emerald-700">
                      $2,000 CAD credit automatically applied if no claims filed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <AnimatedButton
              variant="ghost"
              onClick={() => setStep(3)}
            >
              Retour
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!validation.passed}
              loading={loading}
            >
              Compléter la vente
            </AnimatedButton>
          </div>
        </div>
      )}

      {showSignatureMethodSelector && currentOrganization && (
        <SignatureMethodSelector
          onSelect={handleSignatureMethodSelected}
          onCancel={() => {
            setShowSignatureMethodSelector(false);
            setPendingWarrantyData(null);
          }}
          language={customer.languagePreference}
        />
      )}

      {showSignaturePad && currentOrganization && (
        <LegalSignatureFlow
          organizationId={currentOrganization.id}
          documentContent={generateDocumentContent()}
          onComplete={(signatureData) => {
            finalizeWarranty(signatureData);
          }}
          onCancel={() => {
            setShowSignaturePad(false);
            setPendingWarrantyData(null);
          }}
          language={customer.languagePreference}
        />
      )}

      {showInPersonSignatureFlow && currentOrganization && pendingWarrantyData && (
        <InPersonSignatureFlow
          organizationId={currentOrganization.id}
          documentContent={generateDocumentContent()}
          onComplete={handleInPersonSignatureComplete}
          onCancel={() => {
            setShowInPersonSignatureFlow(false);
            setPendingWarrantyData(null);
          }}
          language={customer.languagePreference}
        />
      )}

      {showCreationProgress && (
        <WarrantyCreationProgress
          currentStep={creationStep}
          totalSteps={6}
        />
      )}

      {showProductPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Sélectionner un produit</h2>
              <button
                onClick={() => setShowProductPicker(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {customerProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="border-2 border-slate-200 rounded-lg p-4 hover:border-primary-600 hover:bg-primary-50 cursor-pointer transition-all"
                >
                  <h3 className="text-lg font-bold text-slate-900">
                    {product.year} {product.make} {product.model}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">NIV: {product.vin}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-slate-500">Type</p>
                      <p className="text-sm font-medium text-slate-900">{product.trailer_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Prix d'achat</p>
                      <p className="text-sm font-medium text-slate-900">
                        {product.purchase_price.toLocaleString('fr-CA')} $
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date d'achat</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(product.purchase_date).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowProductPicker(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Sélectionner un modèle</h2>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                onClick={() => {
                  setSelectedTemplate(null);
                  setShowTemplatePicker(false);
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  !selectedTemplate
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {!selectedTemplate && <Check className="w-5 h-5 text-emerald-600" />}
                  <h4 className="font-semibold text-slate-900">Modèle standard</h4>
                </div>
                <p className="text-sm text-slate-600">Contrat de garantie généré automatiquement avec les informations de la vente</p>
              </div>

              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowTemplatePicker(false);
                  }}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {selectedTemplate?.id === template.id && <Check className="w-5 h-5 text-emerald-600" />}
                    <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs uppercase">
                      {template.language}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {template.template_type === 'uploaded_pdf'
                      ? 'PDF personnalisé téléchargé'
                      : 'Modèle construit avec sections personnalisées'}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Créé le {new Date(template.created_at).toLocaleDateString('fr-CA')}
                  </p>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showInventoryPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Sélectionner depuis votre inventaire</h2>
                <p className="text-sm text-slate-600 mt-1">{dealerInventory.length} remorques disponibles</p>
              </div>
              <button
                onClick={() => setShowInventoryPicker(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {dealerInventory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectInventoryItem(item)}
                  className="border-2 border-slate-200 rounded-lg p-5 hover:border-slate-900 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {item.year} {item.make} {item.model}
                        </h3>
                        {item.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {item.status === 'available' ? 'Disponible' : item.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">NIV: {item.vin}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Type</p>
                          <p className="text-sm font-medium text-slate-900">{item.type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Couleur</p>
                          <p className="text-sm font-medium text-slate-900 capitalize">{item.color || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Prix d'achat</p>
                          <p className="text-sm font-medium text-slate-600">
                            {(item.purchase_price || 0).toLocaleString('fr-CA')} $
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Prix demandé</p>
                          <p className="text-sm font-medium text-emerald-600">
                            {(item.asking_price || 0).toLocaleString('fr-CA')} $
                          </p>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-sm text-slate-600 mt-3 italic">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {dealerInventory.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune remorque disponible</h3>
                  <p className="text-slate-600">
                    Ajoutez des remorques à votre inventaire pour les sélectionner ici
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowInventoryPicker(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
