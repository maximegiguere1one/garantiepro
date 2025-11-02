import { useState, useEffect } from 'react';
import { User, Truck, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { SmartFormField } from './common/SmartFormField';
import { ProgressiveSection } from './common/ProgressiveSection';
import { useFormState } from '../hooks/useFormState';
import { useSmartDefaults } from '../hooks/useSmartDefaults';
import { lookupCustomerByEmail, checkDuplicateCustomer } from '../lib/customer-lookup';
import { decodeVIN, lookupVINOnline } from '../lib/vin-decoder';
import { getRecentValues, saveRecentValue, formatPhoneNumber, formatPostalCode } from '../lib/form-auto-complete';
import { calculateFormCompleteness } from '../lib/form-validation-enhanced';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'Colombie-Britannique' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'Nouveau-Brunswick' },
  { value: 'NL', label: 'Terre-Neuve-et-Labrador' },
  { value: 'NS', label: 'Nouvelle-Écosse' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Île-du-Prince-Édouard' },
  { value: 'QC', label: 'Québec' },
  { value: 'SK', label: 'Saskatchewan' },
];

export function SmartNewWarranty() {
  const { profile } = useAuth();
  const toast = useToast();
  const { defaults, loading: defaultsLoading } = useSmartDefaults('warranty');
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const [decodingVIN, setDecodingVIN] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  const { values, setValue, setMultipleValues, isDirty, clearStorage } = useFormState({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: defaults.province || 'QC',
      postalCode: '',
      languagePreference: defaults.languagePreference || 'fr',
      consentMarketing: false,
      vin: '',
      make: '',
      model: '',
      year: defaults.year || new Date().getFullYear(),
      trailerType: '',
      category: 'fermee',
      purchaseDate: defaults.purchaseDate || new Date().toISOString().split('T')[0],
      purchasePrice: 1000,
      manufacturerWarrantyEndDate: defaults.manufacturerWarrantyEndDate || '',
      isPromotional: false,
    },
    storageKey: `warranty_form_${profile?.id}`,
    autoSaveInterval: 30000,
  });

  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'vin', 'make', 'purchasePrice', 'manufacturerWarrantyEndDate'];
  const completeness = calculateFormCompleteness(values, requiredFields);

  const handleEmailBlur = async () => {
    if (!values.email || values.email.length < 5) return;

    setLookingUpCustomer(true);
    try {
      const customer = await lookupCustomerByEmail(values.email);
      if (customer) {
        setCustomerFound(true);
        setMultipleValues({
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          province: customer.province,
          postalCode: customer.postalCode,
          languagePreference: customer.languagePreference,
          consentMarketing: customer.consentMarketing,
        });
        toast.success('Client trouvé', `Données chargées pour ${customer.firstName} ${customer.lastName}`);
      } else {
        setCustomerFound(false);

        const duplicate = await checkDuplicateCustomer(values.email, values.phone);
        if (duplicate.hasDuplicate && duplicate.confidence === 'high') {
          toast.warning(
            'Client similaire trouvé',
            'Un client avec ce courriel ou téléphone existe déjà. Vérifiez avant de continuer.'
          );
        }
      }
    } catch (error) {
      console.error('Error looking up customer:', error);
    } finally {
      setLookingUpCustomer(false);
    }
  };

  const handleVINBlur = async () => {
    if (!values.vin || values.vin.length !== 17) return;

    setDecodingVIN(true);
    try {
      const decoded = await lookupVINOnline(values.vin);
      if (decoded.valid) {
        setMultipleValues({
          make: decoded.make || values.make,
          model: decoded.model || values.model,
          year: decoded.year || values.year,
        });
        toast.success('NIV décodé', 'Informations de la remorque chargées automatiquement');
      } else {
        toast.error('NIV invalide', decoded.error || 'Impossible de décoder le NIV');
      }
    } catch (error) {
      console.error('Error decoding VIN:', error);
    } finally {
      setDecodingVIN(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setValue('phone', formatted);
  };

  const handlePostalCodeChange = (value: string) => {
    const formatted = formatPostalCode(value);
    setValue('postalCode', formatted);
  };

  const customerComplete = values.firstName && values.lastName && values.email && values.phone;
  const trailerComplete = values.vin && values.make && values.purchasePrice > 0 && values.manufacturerWarrantyEndDate;

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Nouvelle Garantie</h1>
        <p className="text-slate-600 mt-2">Remplissez les informations pour créer une garantie</p>
      </div>

      {isDirty && (
        <div className="mb-6 bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-primary-900">Sauvegarde automatique activée</p>
              <p className="text-xs text-primary-700">Vos données sont sauvegardées toutes les 30 secondes</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-900">{completeness.percentage}%</p>
            <p className="text-xs text-primary-700">Complété</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <ProgressiveSection
          title="Informations du Client"
          description="Rechercher ou créer un profil client"
          icon={<User className="w-5 h-5" />}
          defaultOpen={true}
          required={true}
          completed={!!customerComplete}
        >
          <div className="space-y-4">
            <SmartFormField
              label="Courriel"
              name="email"
              type="email"
              value={values.email}
              onChange={(v) => setValue('email', v)}
              onBlur={handleEmailBlur}
              required
              placeholder="client@exemple.com"
              hint="Nous rechercherons automatiquement ce client dans la base de données"
              autoComplete="email"
              icon={lookingUpCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              success={customerFound}
              recentValues={getRecentValues('customer_email')}
            />

            {customerFound && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-green-800">Client existant trouvé - données chargées</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SmartFormField
                label="Prénom"
                name="firstName"
                value={values.firstName}
                onChange={(v) => setValue('firstName', v)}
                required
                placeholder="Jean"
                autoComplete="given-name"
              />

              <SmartFormField
                label="Nom"
                name="lastName"
                value={values.lastName}
                onChange={(v) => setValue('lastName', v)}
                required
                placeholder="Tremblay"
                autoComplete="family-name"
              />
            </div>

            <SmartFormField
              label="Téléphone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={handlePhoneChange}
              required
              placeholder="(514) 555-0123"
              autoComplete="tel"
            />

            <SmartFormField
              label="Adresse"
              name="address"
              value={values.address}
              onChange={(v) => setValue('address', v)}
              placeholder="123 Rue Principale"
              autoComplete="street-address"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SmartFormField
                label="Ville"
                name="city"
                value={values.city}
                onChange={(v) => setValue('city', v)}
                placeholder="Montréal"
                autoComplete="address-level2"
              />

              <SmartFormField
                label="Province"
                name="province"
                type="select"
                value={values.province}
                onChange={(v) => setValue('province', v)}
                options={CANADIAN_PROVINCES}
                autoComplete="address-level1"
              />

              <SmartFormField
                label="Code Postal"
                name="postalCode"
                value={values.postalCode}
                onChange={handlePostalCodeChange}
                placeholder="H1A 1A1"
                autoComplete="postal-code"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SmartFormField
                label="Langue préférée"
                name="languagePreference"
                type="select"
                value={values.languagePreference}
                onChange={(v) => setValue('languagePreference', v)}
                options={[
                  { value: 'fr', label: 'Français' },
                  { value: 'en', label: 'English' },
                ]}
              />

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values.consentMarketing}
                    onChange={(e) => setValue('consentMarketing', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Consentement marketing</span>
                </label>
              </div>
            </div>
          </div>
        </ProgressiveSection>

        <ProgressiveSection
          title="Informations de la Remorque"
          description="Entrez le NIV pour auto-complétion"
          icon={<Truck className="w-5 h-5" />}
          defaultOpen={!!customerComplete}
          required={true}
          completed={!!trailerComplete}
        >
          <div className="space-y-4">
            <SmartFormField
              label="NIV (Numéro d'Identification du Véhicule)"
              name="vin"
              value={values.vin}
              onChange={(v) => setValue('vin', v.toUpperCase())}
              onBlur={handleVINBlur}
              required
              placeholder="1HGBH41JXMN109186"
              hint="17 caractères - Nous décoderons automatiquement le NIV"
              icon={decodingVIN ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SmartFormField
                label="Marque"
                name="make"
                value={values.make}
                onChange={(v) => setValue('make', v)}
                required
                placeholder="Honda"
                recentValues={getRecentValues('trailer_make')}
              />

              <SmartFormField
                label="Modèle"
                name="model"
                value={values.model}
                onChange={(v) => setValue('model', v)}
                placeholder="Cargo"
                recentValues={getRecentValues('trailer_model')}
              />

              <SmartFormField
                label="Année"
                name="year"
                type="number"
                value={values.year}
                onChange={(v) => setValue('year', parseInt(v))}
                required
                min={1990}
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SmartFormField
                label="Type de remorque"
                name="trailerType"
                value={values.trailerType}
                onChange={(v) => setValue('trailerType', v)}
                placeholder="Cargo, Utilitaire, etc."
              />

              <SmartFormField
                label="Catégorie"
                name="category"
                type="select"
                value={values.category}
                onChange={(v) => setValue('category', v)}
                options={[
                  { value: 'fermee', label: 'Remorque Fermée' },
                  { value: 'ouverte', label: 'Remorque Ouverte' },
                  { value: 'utilitaire', label: 'Remorque Utilitaire' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SmartFormField
                label="Date d'achat"
                name="purchaseDate"
                type="date"
                value={values.purchaseDate}
                onChange={(v) => setValue('purchaseDate', v)}
                required
                max={new Date().toISOString().split('T')[0]}
              />

              <SmartFormField
                label="Prix d'achat"
                name="purchasePrice"
                type="number"
                value={values.purchasePrice}
                onChange={(v) => setValue('purchasePrice', parseFloat(v))}
                required
                min={1}
                placeholder="1000.00"
              />

              <SmartFormField
                label="Fin garantie fabricant"
                name="manufacturerWarrantyEndDate"
                type="date"
                value={values.manufacturerWarrantyEndDate}
                onChange={(v) => setValue('manufacturerWarrantyEndDate', v)}
                required
                min={values.purchaseDate}
                hint="La garantie PPR débute après cette date"
              />
            </div>

            {values.isPromotional && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Achat promotionnel détecté - le crédit de fidélité sera ajusté
                </p>
              </div>
            )}
          </div>
        </ProgressiveSection>

        <ProgressiveSection
          title="Sélection du Plan"
          description="Choisissez le plan de garantie"
          icon={<Shield className="w-5 h-5" />}
          defaultOpen={!!trailerComplete}
          required={true}
        >
          <div className="text-center text-slate-600 py-8">
            <p>La sélection du plan sera chargée ici</p>
          </div>
        </ProgressiveSection>
      </div>

      <div className="mt-8 flex items-center justify-between p-6 bg-white border-2 border-slate-200 rounded-xl">
        <div>
          <p className="text-sm text-slate-600">Progression</p>
          <p className="text-2xl font-bold text-slate-900">{completeness.percentage}%</p>
          <p className="text-xs text-slate-500">
            {completeness.completed} / {completeness.total} champs obligatoires
          </p>
        </div>
        <button
          type="button"
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
          disabled={completeness.percentage < 100}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
