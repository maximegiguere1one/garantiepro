import { useState, useEffect } from 'react';
import { Check, Mail, Phone, MapPin, User } from 'lucide-react';
import { FormField } from '../common/FormField';

interface CustomerData {
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

interface Step1Props {
  data: Partial<CustomerData>;
  onChange: (data: Partial<CustomerData>) => void;
}

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'Colombie-Britannique' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'Nouveau-Brunswick' },
  { code: 'NL', name: 'Terre-Neuve-et-Labrador' },
  { code: 'NS', name: 'Nouvelle-Écosse' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Île-du-Prince-Édouard' },
  { code: 'QC', name: 'Québec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NT', name: 'Territoires du Nord-Ouest' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
];

export function Step1_CustomerInfo({ data, onChange }: Step1Props) {
  const [formData, setFormData] = useState<Partial<CustomerData>>({
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
    ...data,
  });

  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email requis');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Format email invalide');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phone) {
      setPhoneError('Téléphone requis');
      return false;
    }
    if (!phoneRegex.test(phone)) {
      setPhoneError('Format invalide. Ex: (514) 555-1234');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleChange = (field: keyof CustomerData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Inline validation
    if (field === 'email') {
      validateEmail(value);
    } else if (field === 'phone') {
      validatePhone(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-primary-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Informations du client</h3>
          <p className="text-sm text-slate-600">
            Toutes les informations sont requises
          </p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Prénom"
          required
          error={!formData.firstName && formData.firstName !== undefined ? 'Prénom requis' : undefined}
        >
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-base"
            placeholder="Jean"
            aria-required="true"
            aria-label="Prénom du client"
          />
        </FormField>

        <FormField
          label="Nom"
          required
          error={!formData.lastName && formData.lastName !== undefined ? 'Nom requis' : undefined}
        >
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-base"
            placeholder="Dupont"
            aria-required="true"
            aria-label="Nom du client"
          />
        </FormField>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Email"
          required
          error={emailError || undefined}
          hint="Utilisé pour envoyer la garantie"
        >
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={(e) => validateEmail(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg transition-all text-base ${
                emailError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : formData.email && !emailError
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                  : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
              }`}
              placeholder="jean.dupont@example.com"
              aria-required="true"
              aria-label="Adresse email du client"
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {formData.email && !emailError && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" aria-hidden="true" />
            )}
          </div>
        </FormField>

        <FormField
          label="Téléphone"
          required
          error={phoneError || undefined}
          hint="Format: (514) 555-1234"
        >
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={(e) => validatePhone(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg transition-all text-base ${
                phoneError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : formData.phone && !phoneError
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                  : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
              }`}
              placeholder="(514) 555-1234"
              aria-required="true"
              aria-label="Numéro de téléphone"
              aria-invalid={phoneError ? 'true' : 'false'}
              aria-describedby={phoneError ? 'phone-error' : undefined}
            />
            {formData.phone && !phoneError && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" aria-hidden="true" />
            )}
          </div>
        </FormField>
      </div>

      {/* Address */}
      <FormField label="Adresse complète" required>
        <div className="relative">
          <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-base"
            placeholder="123 Rue Example"
            aria-required="true"
            aria-label="Adresse du client"
          />
        </div>
      </FormField>

      {/* City, Province, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Ville" required>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-base"
            placeholder="Montréal"
            aria-required="true"
            aria-label="Ville"
          />
        </FormField>

        <FormField label="Province" required>
          <select
            value={formData.province}
            onChange={(e) => handleChange('province', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-base bg-white"
            aria-required="true"
            aria-label="Province"
          >
            {CANADIAN_PROVINCES.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Code postal" required>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value.toUpperCase())}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-base uppercase"
            placeholder="H1A 1A1"
            maxLength={7}
            aria-required="true"
            aria-label="Code postal"
          />
        </FormField>
      </div>

      {/* Preferences */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <FormField label="Langue de communication" required>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="language"
                value="fr"
                checked={formData.languagePreference === 'fr'}
                onChange={(e) => handleChange('languagePreference', e.target.value)}
                className="w-5 h-5 text-primary-600 focus:ring-2 focus:ring-primary-500"
                aria-label="Français"
              />
              <span className="text-slate-700">Français</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="language"
                value="en"
                checked={formData.languagePreference === 'en'}
                onChange={(e) => handleChange('languagePreference', e.target.value)}
                className="w-5 h-5 text-primary-600 focus:ring-2 focus:ring-primary-500"
                aria-label="English"
              />
              <span className="text-slate-700">English</span>
            </label>
          </div>
        </FormField>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.consentMarketing}
            onChange={(e) => handleChange('consentMarketing', e.target.checked)}
            className="mt-1 w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-2 focus:ring-primary-500"
            aria-label="Consentement marketing"
          />
          <span className="text-sm text-slate-700 group-hover:text-slate-900">
            J'accepte de recevoir des communications marketing et des offres promotionnelles
          </span>
        </label>
      </div>
    </div>
  );
}
