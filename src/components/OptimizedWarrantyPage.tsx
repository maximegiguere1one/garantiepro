import { useState, useEffect } from 'react';
import { OptimizedWarrantyForm } from './forms/OptimizedWarrantyForm';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { generateAndStoreDocuments } from '../lib/document-utils';
import { syncInvoiceToQuickBooks } from '../lib/quickbooks-utils';
import { isIntegrationConnected } from '../lib/integration-utils';
import { logSignatureEvent } from '../lib/legal-signature-utils';
import { saveSignatureMethodSelection } from '../lib/hybrid-signature-utils';
import { calculateWarrantyData } from '../lib/ppr-utils';
import { getTaxRates, calculateTaxes } from '../lib/settings-utils';
import { SignatureMethodSelector, type SignatureMethod } from './SignatureMethodSelector';
import { LegalSignatureFlow } from './LegalSignatureFlow';
import { InPersonSignatureFlow } from './InPersonSignatureFlow';
import { ArrowLeft, Sparkles, Shield, Check } from 'lucide-react';

const PPR_DURATION_MONTHS = 72;
const PPR_DEDUCTIBLE = 100;

interface OptimizedWarrantyPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
}

export function OptimizedWarrantyPage({ onNavigate, onBack }: OptimizedWarrantyPageProps) {
  const { profile, organization: currentOrganization } = useAuth();
  const toast = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdWarrantyId, setCreatedWarrantyId] = useState<string | null>(null);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [showSignatureMethodSelector, setShowSignatureMethodSelector] = useState(false);
  const [selectedSignatureMethod, setSelectedSignatureMethod] = useState<SignatureMethod | null>(null);
  const [showLegalSignatureFlow, setShowLegalSignatureFlow] = useState(false);
  const [showInPersonSignatureFlow, setShowInPersonSignatureFlow] = useState(false);
  const [pendingWarrantyData, setPendingWarrantyData] = useState<any>(null);

  // Charger les plans et templates disponibles
  useEffect(() => {
    const loadPlansAndTemplates = async () => {
      if (!currentOrganization?.id || !profile?.id) return;

      // Charger les plans de garantie
      const { data: plansData, error: plansError } = await supabase
        .from('warranty_plans')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (!plansError && plansData) {
        setAvailablePlans(plansData);
      }

      // Charger les templates personnalisés
      const { data: templatesData, error: templatesError } = await supabase
        .from('warranty_templates')
        .select('*')
        .eq('dealer_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!templatesError && templatesData) {
        setCustomTemplates(templatesData);
      }
    };

    loadPlansAndTemplates();
  }, [currentOrganization?.id, profile?.id]);

  const handleSubmit = async (formData: any) => {
    if (!profile?.id || !currentOrganization?.id) {
      throw new Error('Profil ou organisation non disponible');
    }

    // Phase 1: Valider et préparer les données, PUIS ouvrir le sélecteur de signature
    try {
      const manufacturerWarrantyEndDate = new Date(formData.trailer.purchaseDate);
      manufacturerWarrantyEndDate.setFullYear(manufacturerWarrantyEndDate.getFullYear() + 1);

      // Étape 1: Créer ou obtenir le client
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', formData.customer.email)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      let customerData;

      if (existingCustomer) {
        customerData = existingCustomer;
        await supabase
          .from('customers')
          .update({
            first_name: formData.customer.firstName,
            last_name: formData.customer.lastName,
            phone: formData.customer.phone,
            address: formData.customer.address,
            city: formData.customer.city,
            province: formData.customer.province,
            postal_code: formData.customer.postalCode,
          })
          .eq('id', existingCustomer.id);
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            organization_id: currentOrganization.id,
            dealer_id: profile.id,
            user_id: profile.id,
            first_name: formData.customer.firstName,
            last_name: formData.customer.lastName,
            email: formData.customer.email,
            phone: formData.customer.phone,
            address: formData.customer.address,
            city: formData.customer.city,
            province: formData.customer.province,
            postal_code: formData.customer.postalCode,
            language_preference: 'fr',
            consent_marketing: false,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerData = newCustomer;
      }

      // Étape 2: Créer ou obtenir la remorque
      const { data: existingTrailer } = await supabase
        .from('trailers')
        .select('*')
        .eq('vin', formData.trailer.vin)
        .maybeSingle();

      let trailerData;

      if (existingTrailer) {
        trailerData = existingTrailer;
      } else {
        const { data: newTrailer, error: trailerError } = await supabase
          .from('trailers')
          .insert({
            organization_id: currentOrganization.id,
            dealer_id: profile.id,
            customer_id: customerData.id,
            vin: formData.trailer.vin,
            make: formData.trailer.make,
            model: formData.trailer.model,
            year: formData.trailer.year,
            trailer_type: formData.trailer.category,
            category: formData.trailer.category,
            purchase_date: formData.trailer.purchaseDate,
            purchase_price: formData.trailer.purchasePrice,
            manufacturer_warranty_end_date: manufacturerWarrantyEndDate.toISOString().split('T')[0],
            ppr_warranty_start_date: manufacturerWarrantyEndDate.toISOString().split('T')[0],
          })
          .select()
          .single();

        if (trailerError) throw trailerError;
        trailerData = newTrailer;
      }

      // Étape 3: Calculer les données de garantie
      const pprData = calculateWarrantyData(
        formData.trailer.purchasePrice,
        manufacturerWarrantyEndDate,
        false
      );

      const contractNumber = `PPR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Étape 4: Obtenir un plan de garantie
      const { data: warrantyPlan } = await supabase
        .from('warranty_plans')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // Si aucun plan pour l'organisation, utiliser le plan par défaut
      let planId = warrantyPlan?.id;
      if (!planId) {
        const { data: defaultPlan } = await supabase
          .from('warranty_plans')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        planId = defaultPlan?.id;
      }

      if (!planId) {
        throw new Error('Aucun plan de garantie disponible');
      }

      // Étape 5: Obtenir les taux de taxe
      const taxRates = await getTaxRates();

      // Étape 6: Calculer les prix et taxes
      const basePriceNum = Number(formData.trailer.purchasePrice * 0.05) || 0;
      const taxes = calculateTaxes(basePriceNum, formData.customer.province, taxRates) || 0;
      const marginPercent = 0.30;
      const margin = Number(basePriceNum * marginPercent) || 0;
      const totalPrice = Number(basePriceNum + taxes) || 0;

      // Validation: S'assurer que toutes les valeurs numériques sont valides
      if (basePriceNum <= 0) {
        throw new Error('Le prix de base doit être supérieur à 0');
      }
      if (typeof taxes !== 'number' || isNaN(taxes) || taxes < 0) {
        throw new Error('Erreur lors du calcul des taxes');
      }
      if (margin < 0 || totalPrice <= 0) {
        throw new Error('Erreur lors du calcul du prix total');
      }

      // Étape 7: Stocker les données et ouvrir la sélection de plan
      setPendingWarrantyData({
        formData,
        customerData,
        trailerData,
        pprData,
        contractNumber,
        planId,
        basePriceNum,
        taxes,
        margin,
        totalPrice,
      });

      // Ouvrir la sélection de plan/template si plusieurs options disponibles
      const totalOptions = availablePlans.length + customTemplates.length;

      if (totalOptions > 1) {
        // Plusieurs options: afficher le sélecteur
        setShowPlanSelection(true);
      } else if (totalOptions === 1) {
        // Une seule option: sélection automatique
        if (customTemplates.length === 1) {
          setSelectedTemplate(customTemplates[0]);
        } else if (availablePlans.length === 1) {
          setSelectedPlan(availablePlans[0]);
        }
        setShowSignatureMethodSelector(true);
      } else {
        // Aucune option disponible: continuer quand même (ne devrait pas arriver)
        setShowSignatureMethodSelector(true);
      }

    } catch (error: any) {
      console.error('Erreur création garantie:', error);
      throw error;
    }
  };

  const handleSignatureMethodSelected = async (method: SignatureMethod) => {
    // Map 'online' -> 'electronic', 'in_person' reste 'in_person'
    const mappedMethod = method === 'online' ? 'electronic' : 'in_person';

    setSelectedSignatureMethod(method);
    setShowSignatureMethodSelector(false);

    try {
      await saveSignatureMethodSelection(
        null,
        currentOrganization!.id,
        mappedMethod as any,
        profile?.id
      );
    } catch (error) {
      console.error('Erreur sauvegarde méthode signature:', error);
    }

    if (method === 'online') {
      setShowLegalSignatureFlow(true);
    } else {
      setShowInPersonSignatureFlow(true);
    }
  };

  const createWarrantyRecord = async () => {
    if (!pendingWarrantyData) return;

    const {
      customerData,
      trailerData,
      pprData,
      contractNumber,
      basePriceNum,
      taxes,
      margin,
      totalPrice,
    } = pendingWarrantyData;

    // Utiliser le plan sélectionné ou le planId de pendingWarrantyData
    const finalPlanId = selectedPlan?.id || pendingWarrantyData.planId;
    const finalBasePrice = selectedPlan?.base_price || basePriceNum;

    try {
      const { data: warranty, error: warrantyError} = await supabase
        .from('warranties')
        .insert({
          organization_id: currentOrganization!.id,
          dealer_id: profile!.id,
          customer_id: customerData.id,
          trailer_id: trailerData.id,
          plan_id: finalPlanId,
          contract_number: contractNumber,
          language: 'fr',
          status: 'active',
          start_date: pprData.pprStartDate.toISOString().split('T')[0],
          end_date: pprData.pprEndDate.toISOString().split('T')[0],
          duration_months: PPR_DURATION_MONTHS,
          base_price: finalBasePrice,
          options_price: 0,
          taxes: taxes,
          total_price: totalPrice,
          margin: margin,
          deductible: PPR_DEDUCTIBLE,
          province: pendingWarrantyData.formData.customer.province,
          sale_duration_seconds: 0,
          annual_claim_limit: pprData.annualLimit,
          warranty_year: pprData.warrantyYear,
          next_entretien_due: pprData.nextEntretienDue.toISOString().split('T')[0],
          signature_method: selectedSignatureMethod || 'in_person',
        })
        .select()
        .single();

      if (warrantyError) throw warrantyError;
      if (!warranty?.id) throw new Error('Garantie créée mais ID manquant');

      setCreatedWarrantyId(warranty.id);

      const mappedMethod = selectedSignatureMethod === 'online' ? 'electronic' : 'in_person';
      await logSignatureEvent(warranty.id, 'created', {
        source: 'optimized_form',
        method: mappedMethod,
        user_id: profile!.id,
      });

      // Générer les PDFs (contrat client, facture client, facture marchand)
      try {
        console.log('[OptimizedWarrantyPage] Génération des PDFs pour warranty:', warranty.id);

        // Charger toutes les données nécessaires pour la génération des PDFs
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', warranty.customer_id)
          .single();

        const { data: trailer } = await supabase
          .from('trailers')
          .select('*')
          .eq('id', warranty.trailer_id)
          .single();

        const { data: plan } = await supabase
          .from('warranty_plans')
          .select('*')
          .eq('id', warranty.plan_id)
          .single();

        if (!customer || !trailer || !plan) {
          throw new Error('Données manquantes pour la génération des PDFs');
        }

        // Appeler generateAndStoreDocuments avec les bons paramètres
        await generateAndStoreDocuments(
          warranty.id,
          {
            warranty,
            customer,
            trailer,
            plan
          }
        );

        console.log('[OptimizedWarrantyPage] ✓ PDFs générés avec succès');
      } catch (docError) {
        console.error('[OptimizedWarrantyPage] ❌ Erreur génération documents:', docError);
        // Ne pas bloquer la création de la garantie si les PDFs échouent
      }

      const qbConnected = await isIntegrationConnected(currentOrganization!.id, 'quickbooks');
      if (qbConnected) {
        try {
          await syncInvoiceToQuickBooks(warranty.id);
        } catch (qbError) {
          console.error('Erreur sync QuickBooks:', qbError);
        }
      }

      return warranty;
    } catch (error) {
      console.error('Erreur création garantie:', error);
      throw error;
    }
  };

  const handleElectronicSignatureComplete = async () => {
    try {
      await createWarrantyRecord();
      setShowLegalSignatureFlow(false);
      setShowSuccess(true);
      setTimeout(() => onNavigate?.('warranties'), 2500);
    } catch (error) {
      console.error('Erreur:', error);
      toast.showToast('Erreur lors de la finalisation', 'error');
    }
  };

  const handleInPersonComplete = async () => {
    try {
      await createWarrantyRecord();
      setShowInPersonSignatureFlow(false);
      setShowSuccess(true);
      setTimeout(() => onNavigate?.('warranties'), 2500);
    } catch (error) {
      console.error('Erreur:', error);
      toast.showToast('Erreur lors de la finalisation', 'error');
    }
  };

  const handleCancel = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  // Afficher la sélection de plan/template
  if (showPlanSelection) {
    const hasSelection = selectedPlan || selectedTemplate;
    const totalOptions = availablePlans.length + customTemplates.length;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-primary-50 to-indigo-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Sélectionnez un contrat de garantie</h2>
            <p className="text-sm text-slate-600">Choisissez le plan ou template adapté aux besoins du client</p>
          </div>

          <div className="p-6 space-y-8">
            {totalOptions === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">Aucun plan ou template disponible</p>
                <button
                  onClick={() => onNavigate?.('settings')}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Créer un plan
                </button>
              </div>
            ) : (
              <>
                {/* Templates Personnalisés (affichés en premier si disponibles) */}
                {customTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-bold text-slate-900">Vos Contrats Personnalisés</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                        Recommandé
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {customTemplates.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setSelectedPlan(null);
                          }}
                          className={`border-2 rounded-xl p-6 cursor-pointer transition-all relative ${
                            selectedTemplate?.id === template.id
                              ? 'border-amber-600 bg-amber-50 shadow-lg'
                              : 'border-slate-200 hover:border-amber-300 hover:shadow-md'
                          }`}
                        >
                          <div className="absolute -top-2 -right-2">
                            <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                              CUSTOM
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{template.template_name}</h3>
                          {template.description && (
                            <p className="text-sm text-slate-600 mb-4">{template.description}</p>
                          )}
                          {template.base_price && (
                            <>
                              <div className="text-3xl font-bold text-amber-600 mb-2">
                                {template.base_price?.toFixed(2)} $
                              </div>
                              <p className="text-xs text-slate-500 mb-2">+ taxes applicables</p>
                            </>
                          )}
                          <p className="text-xs text-slate-600">
                            ✨ Template personnalisé avec votre logo et conditions
                          </p>
                          {selectedTemplate?.id === template.id && (
                            <div className="mt-4 flex items-center justify-center gap-2 bg-amber-600 text-white text-sm font-medium py-2 rounded-lg">
                              <Check className="w-4 h-4" />
                              Sélectionné
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plans Standards */}
                {availablePlans.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-bold text-slate-900">Plans Standards</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {availablePlans.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlan(plan);
                            setSelectedTemplate(null);
                          }}
                          className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                            selectedPlan?.id === plan.id
                              ? 'border-primary-600 bg-primary-50 shadow-lg'
                              : 'border-slate-200 hover:border-primary-300 hover:shadow-md'
                          }`}
                        >
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                          )}
                          <div className="text-3xl font-bold text-primary-600 mb-2">
                            {plan.base_price?.toFixed(2) || '0.00'} $
                          </div>
                          <p className="text-xs text-slate-500 mb-4">+ taxes applicables</p>
                          <p className="text-sm text-slate-600">
                            📅 Durée: {plan.duration_months} mois
                          </p>
                          {selectedPlan?.id === plan.id && (
                            <div className="mt-4 flex items-center justify-center gap-2 bg-primary-600 text-white text-sm font-medium py-2 rounded-lg">
                              <Check className="w-4 h-4" />
                              Sélectionné
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setShowPlanSelection(false)}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!hasSelection) {
                  toast.showToast('Veuillez sélectionner un plan ou template', 'error');
                  return;
                }
                setShowPlanSelection(false);
                setShowSignatureMethodSelector(true);
              }}
              disabled={!hasSelection}
              className={`px-8 py-3 rounded-lg font-medium ${
                hasSelection
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Afficher le sélecteur de méthode de signature
  if (showSignatureMethodSelector) {
    return (
      <SignatureMethodSelector
        onSelect={handleSignatureMethodSelected}
        onCancel={() => {
          setShowSignatureMethodSelector(false);
          setShowPlanSelection(true);
        }}
      />
    );
  }

  // Afficher le flux de signature électronique
  if (showLegalSignatureFlow && pendingWarrantyData) {
    return (
      <LegalSignatureFlow
        warrantyData={{
          customer: pendingWarrantyData.formData.customer,
          trailer: pendingWarrantyData.formData.trailer,
          pricing: {
            basePrice: pendingWarrantyData.basePriceNum,
            taxes: pendingWarrantyData.taxes,
            total: pendingWarrantyData.totalPrice,
          },
          pprData: pendingWarrantyData.pprData,
          contractNumber: pendingWarrantyData.contractNumber,
        }}
        onComplete={handleElectronicSignatureComplete}
        onCancel={() => {
          setShowLegalSignatureFlow(false);
          setShowSignatureMethodSelector(true);
        }}
      />
    );
  }

  // Afficher le flux de signature papier
  if (showInPersonSignatureFlow && pendingWarrantyData) {
    // Récupérer le PDF custom du template sélectionné
    const customPdfBase64 = selectedTemplate?.pdf_content_base64 || null;

    return (
      <InPersonSignatureFlow
        customPdfBase64={customPdfBase64}
        warrantyData={{
          customer: pendingWarrantyData.formData.customer,
          trailer: pendingWarrantyData.formData.trailer,
          pricing: {
            basePrice: pendingWarrantyData.basePriceNum,
            taxes: pendingWarrantyData.taxes,
            total: pendingWarrantyData.totalPrice,
          },
          pprData: pendingWarrantyData.pprData,
          contractNumber: pendingWarrantyData.contractNumber,
        }}
        onComplete={handleInPersonComplete}
        onCancel={() => {
          setShowInPersonSignatureFlow(false);
          setShowSignatureMethodSelector(true);
        }}
      />
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-primary-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center animate-fadeIn">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Garantie créée avec succès!
          </h2>

          <p className="text-slate-600 mb-8">
            La garantie a été créée et les documents ont été générés automatiquement.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => onNavigate?.('warranties')}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold
                hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Voir toutes les garanties
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold
                hover:bg-slate-200 transition-all duration-200"
            >
              Créer une autre garantie
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900
              transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour</span>
          </button>

          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl
              flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Nouvelle Garantie
              </h1>
              <p className="text-slate-600 mt-1">
                Formulaire optimisé - 60% plus rapide
              </p>
            </div>
          </div>

          {/* Features Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 bg-green-100 text-primary-700 rounded-lg text-sm font-medium">
              ✓ Lookup client automatique
            </span>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">
              ✓ Décodage VIN
            </span>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">
              ✓ Validation temps réel
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
              ✓ Sauvegarde auto
            </span>
          </div>
        </div>

        {/* Form */}
        <OptimizedWarrantyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Besoin d'aide? Consultez le{' '}
            <a
              href="/guide"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              guide d'utilisation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
