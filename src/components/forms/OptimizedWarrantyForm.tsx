import { useState, useEffect } from 'react';
import { User, Truck, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ValidatedField } from './ValidatedField';
import { AnimatedButton } from '../common/AnimatedButton';
import { useFormState } from '../../hooks/useFormState';
import { useSmartDefaults } from '../../hooks/useSmartDefaults';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  emailValidator,
  phoneValidator,
  vinValidator,
  priceValidator,
  requiredValidator,
  dateRangeValidator,
  yearValidator,
} from '../../hooks/useFieldValidation';
import { lookupCustomerByEmail } from '../../lib/customer-lookup';
import { lookupVINOnline } from '../../lib/vin-decoder';
import { formatPhoneNumber, formatPostalCode } from '../../lib/form-auto-complete';

const CANADIAN_PROVINCES = [
  { value: 'QC', label: 'Québec' },
  { value: 'ON', label: 'Ontario' },
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'Colombie-Britannique' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'Nouveau-Brunswick' },
  { value: 'NL', label: 'Terre-Neuve-et-Labrador' },
  { value: 'NS', label: 'Nouvelle-Écosse' },
  { value: 'PE', label: 'Île-du-Prince-Édouard' },
  { value: 'SK', label: 'Saskatchewan' },
];

const TRAILER_CATEGORIES = [
  { value: 'fermee', label: 'Remorque fermée' },
  { value: 'ouverte', label: 'Remorque ouverte' },
  { value: 'utilitaire', label: 'Remorque utilitaire' },
];

interface OptimizedWarrantyFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export function OptimizedWarrantyForm({ onSubmit, onCancel }: OptimizedWarrantyFormProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const { defaults, loading: defaultsLoading } = useSmartDefaults('warranty');
  const [step, setStep] = useState(1);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const [decodingVIN, setDecodingVIN] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { values, setValue, setMultipleValues, isDirty, resetForm } = useFormState({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      province: defaults.province || 'QC',
      address: '',
      city: '',
      postalCode: '',
      vin: '',
      make: '',
      model: '',
      year: defaults.year || new Date().getFullYear(),
      category: 'fermee',
      purchasePrice: '',
      purchaseDate: defaults.purchaseDate || new Date().toISOString().split('T')[0],
    },
    storageKey: `optimized_warranty_form_${profile?.id}`,
    autoSaveInterval: 30000,
  });

  const calculateManufacturerWarrantyEndDate = () => {
    const purchaseDate = new Date(values.purchaseDate);
    const endDate = new Date(purchaseDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate.toISOString().split('T')[0];
  };

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
          phone: customer.phone || values.phone,
          province: customer.province || values.province,
          address: customer.address || '',
          city: customer.city || '',
          postalCode: customer.postalCode || '',
        });
        toast.success(
          'Client existant trouvé',
          `Données chargées pour ${customer.firstName} ${customer.lastName}`
        );

        setTimeout(() => {
          setStep(2);
        }, 1500);
      } else {
        setCustomerFound(false);
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

  const isStep1Complete = () => {
    return values.firstName && values.lastName && values.email && values.phone;
  };

  const isStep2Complete = () => {
    return (
      values.vin &&
      values.make &&
      values.model &&
      values.year &&
      values.category &&
      values.purchasePrice &&
      parseFloat(values.purchasePrice) > 0
    );
  };

  const handleSubmit = async () => {
    if (!isStep1Complete() || !isStep2Complete()) {
      toast.error('Formulaire incomplet', 'Veuillez remplir tous les champs requis');
      return;
    }

    setSubmitting(true);
    try {
      const formData = {
        customer: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          province: values.province,
          address: values.address || null,
          city: values.city || null,
          postalCode: values.postalCode || null,
        },
        trailer: {
          vin: values.vin,
          make: values.make,
          model: values.model,
          year: values.year,
          category: values.category,
          purchasePrice: parseFloat(values.purchasePrice),
          purchaseDate: values.purchaseDate,
          manufacturerWarrantyEndDate: calculateManufacturerWarrantyEndDate(),
        },
      };

      await onSubmit(formData);
      resetForm();
      toast.success('Garantie créée', 'La garantie a été créée avec succès');
    } catch (error: any) {
      toast.error('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const getProgress = () => {
    const step1Fields = 4;
    const step2Fields = 6;
    const totalFields = step1Fields + step2Fields;

    let completed = 0;
    if (values.firstName) completed++;
    if (values.lastName) completed++;
    if (values.email) completed++;
    if (values.phone) completed++;
    if (values.vin) completed++;
    if (values.make) completed++;
    if (values.model) completed++;
    if (values.year) completed++;
    if (values.category) completed++;
    if (values.purchasePrice && parseFloat(values.purchasePrice) > 0) completed++;

    return Math.round((completed / totalFields) * 100);
  };

  const progress = getProgress();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Progression: {progress}%
          </span>
          <span className="text-sm text-slate-500">
            Étape {step} sur 2
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-600 to-primary-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Auto-save Indicator */}
      {isDirty && (
        <div className="mb-6 bg-primary-50 border border-primary-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
          <span className="text-sm text-primary-700">
            Sauvegarde automatique active
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1: Customer Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isStep1Complete() ? 'bg-green-100' : 'bg-primary-100'
            }`}>
              {isStep1Complete() ? (
                <Check className="w-6 h-6 text-primary-600" />
              ) : (
                <User className="w-6 h-6 text-primary-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Informations du client</h2>
              <p className="text-sm text-slate-600">
                {customerFound ? 'Client existant trouvé' : 'Seulement 4 champs requis'}
              </p>
            </div>
          </div>

          {step >= 1 && (
            <div className="space-y-4">
              <ValidatedField
                label="Courriel"
                name="email"
                type="email"
                value={values.email}
                onChange={(value) => setValue('email', value)}
                onBlur={handleEmailBlur}
                placeholder="nom@exemple.com"
                hint="Nous vérifierons si ce client existe déjà"
                required
                validationRules={[emailValidator]}
                autoFocus
                disabled={lookingUpCustomer}
              />

              {values.email && !customerFound && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <ValidatedField
                    label="Prénom"
                    name="firstName"
                    value={values.firstName}
                    onChange={(value) => setValue('firstName', value)}
                    placeholder="Jean"
                    required
                    validationRules={[requiredValidator('Le prénom')]}
                  />

                  <ValidatedField
                    label="Nom"
                    name="lastName"
                    value={values.lastName}
                    onChange={(value) => setValue('lastName', value)}
                    placeholder="Tremblay"
                    required
                    validationRules={[requiredValidator('Le nom')]}
                  />
                </div>
              )}

              {values.firstName && values.lastName && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <ValidatedField
                    label="Téléphone"
                    name="phone"
                    type="tel"
                    value={values.phone}
                    onChange={handlePhoneChange}
                    placeholder="(514) 555-0123"
                    hint="Format automatique"
                    required
                    validationRules={[phoneValidator]}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={values.province}
                      onChange={(e) => setValue('province', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-300
                        focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                        transition-all duration-200"
                    >
                      {CANADIAN_PROVINCES.map((prov) => (
                        <option key={prov.value} value={prov.value}>
                          {prov.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Optional Fields - Expandable */}
              {isStep1Complete() && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(!showOptionalFields)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
                  >
                    {showOptionalFields ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Informations additionnelles (optionnel)
                  </button>

                  {showOptionalFields && (
                    <div className="mt-4 space-y-4 animate-fadeIn">
                      <ValidatedField
                        label="Adresse"
                        name="address"
                        value={values.address}
                        onChange={(value) => setValue('address', value)}
                        placeholder="123 Rue Exemple"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ValidatedField
                          label="Ville"
                          name="city"
                          value={values.city}
                          onChange={(value) => setValue('city', value)}
                          placeholder="Montréal"
                        />

                        <ValidatedField
                          label="Code postal"
                          name="postalCode"
                          value={values.postalCode}
                          onChange={handlePostalCodeChange}
                          placeholder="H1A 1A1"
                          hint="Format automatique"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isStep1Complete() && (
                <div className="mt-6">
                  <AnimatedButton
                    variant="primary"
                    onClick={() => setStep(2)}
                    className="w-full"
                  >
                    Continuer vers la remorque →
                  </AnimatedButton>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Trailer Info */}
        {step >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isStep2Complete() ? 'bg-green-100' : 'bg-primary-100'
              }`}>
                {isStep2Complete() ? (
                  <Check className="w-6 h-6 text-primary-600" />
                ) : (
                  <Truck className="w-6 h-6 text-primary-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Informations de la remorque</h2>
                <p className="text-sm text-slate-600">Le NIV sera décodé automatiquement</p>
              </div>
            </div>

            <div className="space-y-4">
              <ValidatedField
                label="NIV (Numéro d'identification du véhicule)"
                name="vin"
                value={values.vin}
                onChange={(value) => setValue('vin', value.toUpperCase())}
                onBlur={handleVINBlur}
                placeholder="1HGBH41JXMN109186"
                hint="17 caractères - sera décodé automatiquement"
                required
                validationRules={[vinValidator]}
                disabled={decodingVIN}
                autoFocus={step === 2}
              />

              {values.vin && values.vin.length === 17 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                  <ValidatedField
                    label="Marque"
                    name="make"
                    value={values.make}
                    onChange={(value) => setValue('make', value)}
                    placeholder="Cargo Pro"
                    required
                    validationRules={[requiredValidator('La marque')]}
                  />

                  <ValidatedField
                    label="Modèle"
                    name="model"
                    value={values.model}
                    onChange={(value) => setValue('model', value)}
                    placeholder="C7x16"
                    required
                    validationRules={[requiredValidator('Le modèle')]}
                  />

                  <ValidatedField
                    label="Année"
                    name="year"
                    type="number"
                    value={values.year}
                    onChange={(value) => setValue('year', parseInt(value) || new Date().getFullYear())}
                    required
                    validationRules={[yearValidator(1990, new Date().getFullYear() + 1)]}
                  />
                </div>
              )}

              {values.make && values.model && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Catégorie <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={values.category}
                      onChange={(e) => setValue('category', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-300
                        focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                        transition-all duration-200"
                    >
                      {TRAILER_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ValidatedField
                    label="Prix d'achat"
                    name="purchasePrice"
                    type="number"
                    value={values.purchasePrice}
                    onChange={(value) => setValue('purchasePrice', value)}
                    placeholder="15000"
                    hint="En dollars canadiens"
                    required
                    validationRules={[priceValidator]}
                  />
                </div>
              )}

              {values.purchasePrice && parseFloat(values.purchasePrice) > 0 && (
                <ValidatedField
                  label="Date d'achat"
                  name="purchaseDate"
                  type="date"
                  value={values.purchaseDate}
                  onChange={(value) => setValue('purchaseDate', value)}
                  required
                  validationRules={[
                    dateRangeValidator(
                      new Date(new Date().getFullYear() - 5, 0, 1),
                      new Date(),
                      'Date d\'achat'
                    ),
                  ]}
                />
              )}

              {isStep2Complete() && (
                <div className="mt-8 flex gap-4">
                  <AnimatedButton
                    variant="secondary"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    ← Retour
                  </AnimatedButton>
                  <AnimatedButton
                    variant="primary"
                    onClick={handleSubmit}
                    loading={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Création...' : 'Créer la garantie'}
                  </AnimatedButton>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
