import { useState } from 'react';
import { z } from 'zod';
import { AccessibleInput } from '../common/AccessibleInput';
import { AccessibleButton } from '../common/AccessibleButton';
import { warrantyCreationSchema } from '../../lib/validation/warranty-schemas';
import { useWarrantyCreation } from '../../hooks/useWarrantyCreation';
import { Mail, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

interface WarrantyFormProps {
  onSuccess?: (warrantyId: string) => void;
  onCancel?: () => void;
}

export function WarrantyForm({ onSuccess, onCancel }: WarrantyFormProps) {
  const [formData, setFormData] = useState({
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: 'QC',
      postalCode: '',
      languagePreference: 'fr' as 'fr' | 'en',
      consentMarketing: false
    },
    trailer: {
      vin: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      trailerType: '',
      category: 'fermee' as 'fermee' | 'ouverte' | 'utilitaire',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      isPromotional: false
    }
  });

  const {
    createWarranty,
    isLoading,
    error,
    validationErrors,
    warrantyId
  } = useWarrantyCreation({
    onSuccess: (id) => {
      onSuccess?.(id);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createWarranty({
        ...formData,
        planId: '123e4567-e89b-12d3-a456-426614174000',
        selectedOptions: [],
        pricing: {
          subtotal: 1000,
          gst: 50,
          pst: 0,
          hst: 0,
          qst: 99.75,
          total: 1149.75
        }
      });
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  const getFieldError = (path: string): string | undefined => {
    if (!validationErrors) return undefined;

    const error = validationErrors.errors.find(
      (err) => err.path.join('.') === path
    );

    return error?.message;
  };

  if (warrantyId) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-primary-600" />
          <h2 className="text-xl font-semibold text-green-900">
            Garantie créée avec succès!
          </h2>
        </div>
        <p className="text-primary-700 mb-4">
          Votre garantie a été enregistrée avec l'identifiant: {warrantyId}
        </p>
        <AccessibleButton
          variant="primary"
          onClick={() => onSuccess?.(warrantyId)}
        >
          Continuer
        </AccessibleButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Informations du client
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AccessibleInput
            label="Prénom"
            value={formData.customer.firstName}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, firstName: e.target.value }
              })
            }
            error={getFieldError('customer.firstName')}
            required
            autoComplete="given-name"
          />

          <AccessibleInput
            label="Nom de famille"
            value={formData.customer.lastName}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, lastName: e.target.value }
              })
            }
            error={getFieldError('customer.lastName')}
            required
            autoComplete="family-name"
          />

          <AccessibleInput
            label="Email"
            type="email"
            value={formData.customer.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, email: e.target.value }
              })
            }
            error={getFieldError('customer.email')}
            leftIcon={<Mail className="w-5 h-5" />}
            required
            autoComplete="email"
          />

          <AccessibleInput
            label="Téléphone"
            type="tel"
            value={formData.customer.phone}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, phone: e.target.value }
              })
            }
            error={getFieldError('customer.phone')}
            leftIcon={<Phone className="w-5 h-5" />}
            hint="Format: (XXX) XXX-XXXX"
            required
            autoComplete="tel"
          />

          <AccessibleInput
            label="Adresse"
            value={formData.customer.address}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, address: e.target.value }
              })
            }
            error={getFieldError('customer.address')}
            leftIcon={<MapPin className="w-5 h-5" />}
            required
            autoComplete="street-address"
            className="md:col-span-2"
          />

          <AccessibleInput
            label="Ville"
            value={formData.customer.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, city: e.target.value }
              })
            }
            error={getFieldError('customer.city')}
            required
            autoComplete="address-level2"
          />

          <div>
            <label
              htmlFor="province"
              className="block font-medium text-slate-700 mb-1.5"
            >
              Province <span className="text-red-500">*</span>
            </label>
            <select
              id="province"
              value={formData.customer.province}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  customer: { ...formData.customer, province: e.target.value }
                })
              }
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
              required
              autoComplete="address-level1"
            >
              <option value="QC">Québec</option>
              <option value="ON">Ontario</option>
              <option value="BC">Colombie-Britannique</option>
              <option value="AB">Alberta</option>
              <option value="MB">Manitoba</option>
              <option value="SK">Saskatchewan</option>
              <option value="NS">Nouvelle-Écosse</option>
              <option value="NB">Nouveau-Brunswick</option>
              <option value="NL">Terre-Neuve-et-Labrador</option>
              <option value="PE">Île-du-Prince-Édouard</option>
            </select>
          </div>

          <AccessibleInput
            label="Code postal"
            value={formData.customer.postalCode}
            onChange={(e) =>
              setFormData({
                ...formData,
                customer: { ...formData.customer, postalCode: e.target.value }
              })
            }
            error={getFieldError('customer.postalCode')}
            hint="Format: A1A 1A1"
            required
            autoComplete="postal-code"
          />
        </div>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              Erreur lors de la création
            </h3>
            <p className="text-red-700">{error.message}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        {onCancel && (
          <AccessibleButton
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </AccessibleButton>
        )}

        <AccessibleButton
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Création en cours...' : 'Créer la garantie'}
        </AccessibleButton>
      </div>
    </form>
  );
}
