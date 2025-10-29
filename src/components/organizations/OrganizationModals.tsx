import { useState } from 'react';
import { X, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

interface InvitationLinkModalProps {
  invitationLink: string;
  onClose: () => void;
}

export function InvitationLinkModal({ invitationLink, onClose }: InvitationLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Lien d'Invitation Manuel
        </h2>
        <p className="text-slate-600 mb-4">
          L'email n'a pas pu être envoyé automatiquement. Partagez ce lien manuellement avec le franchisé:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <code className="text-sm break-all text-slate-800">{invitationLink}</code>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copié!
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                Copier le lien
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateOrganizationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrganizationModal({ onClose, onSuccess }: CreateOrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    billing_email: '',
    billing_phone: '',
    address: '',
    city: '',
    province: 'QC',
    postal_code: '',
    percentage_rate: '50',
    admin_name: '',
    admin_email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { organization: currentOrganization } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          type: 'franchisee',
          owner_organization_id: currentOrganization?.id,
          billing_email: formData.billing_email,
          billing_phone: formData.billing_phone,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
          status: 'active',
        })
        .select()
        .single();

      if (orgError) throw orgError;

      const { error: billingError } = await supabase
        .from('organization_billing_config')
        .insert({
          organization_id: newOrg.id,
          billing_type: 'percentage_of_warranty',
          percentage_rate: parseFloat(formData.percentage_rate),
          is_active: true,
        });

      if (billingError) throw billingError;

      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboard-franchisee`;

      const onboardRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          franchiseeId: newOrg.id,
          email: formData.admin_email,
          name: formData.admin_name,
          organizationName: formData.name,
          phone: formData.billing_phone,
        }),
      });

      const onboardData = await onboardRes.json();

      if (!onboardRes.ok) {
        const errorMessage = onboardData.userMessage || onboardData.error || 'Échec de la création du franchisé';
        if (onboardData.errorCode === 'CONFIG_MISSING' || onboardData.errorCode === 'DOMAIN_NOT_VERIFIED') {
          throw new Error(`Configuration email requise: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      }

      if (onboardData.success) {
        if (onboardData.emailSent) {
          showToast('Franchisé créé avec succès! Email d\'intégration envoyé.', 'success');
        } else {
          showToast(
            onboardData.userMessage || 'Franchisé créé mais email non envoyé. Utilisez le lien manuel.',
            'warning'
          );
        }
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating organization:', error);
      showToast(error.message || 'Erreur lors de la création du franchisé', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Nouveau Franchisé</h2>
            <p className="text-slate-600 mt-1">
              Ajoutez un nouveau franchisé à votre réseau
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom de l'Organisation *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Ex: Remorques ABC Inc."
            />
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Administrateur du Franchisé</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom Complet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Jean Tremblay"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email de Connexion *
                </label>
                <input
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="jean@remorques-abc.com"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Un email avec les instructions de connexion sera envoyé à cette adresse
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email de Facturation *
              </label>
              <input
                type="email"
                required
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="facturation@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.billing_phone}
                onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="(514) 555-1234"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="123 rue Principale"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Montréal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Province
              </label>
              <select
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                <option value="QC">Québec</option>
                <option value="ON">Ontario</option>
                <option value="BC">Colombie-Britannique</option>
                <option value="AB">Alberta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Code Postal
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="H2X 1Y4"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Taux de Commission (%) *
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={formData.percentage_rate}
              onChange={(e) => setFormData({ ...formData, percentage_rate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            <p className="text-sm text-slate-600 mt-2">
              Ce franchisé paiera {formData.percentage_rate}% du prix total de chaque garantie vendue.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Création...' : 'Créer le Franchisé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditOrganizationModalProps {
  organization: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditOrganizationModal({ organization, onClose, onSuccess }: EditOrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: organization.name,
    billing_email: organization.billing_email || '',
    billing_phone: organization.billing_phone || '',
    address: organization.address || '',
    city: organization.city || '',
    province: organization.province || 'QC',
    postal_code: organization.postal_code || '',
    percentage_rate: organization.billingConfig?.percentage_rate?.toString() || '50',
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          billing_email: formData.billing_email,
          billing_phone: formData.billing_phone,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
        })
        .eq('id', organization.id);

      if (orgError) throw orgError;

      if (organization.billingConfig) {
        const { error: billingError } = await supabase
          .from('organization_billing_config')
          .update({
            percentage_rate: parseFloat(formData.percentage_rate),
          })
          .eq('organization_id', organization.id);

        if (billingError) throw billingError;
      }

      showToast('Franchisé mis à jour avec succès', 'success');
      onSuccess();
    } catch (error) {
      console.error('Error updating organization:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Modifier le Franchisé</h2>
            <p className="text-slate-600 mt-1">{organization.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom de l'Organisation *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email de Facturation *
              </label>
              <input
                type="email"
                required
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.billing_phone}
                onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Province
              </label>
              <select
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                <option value="QC">Québec</option>
                <option value="ON">Ontario</option>
                <option value="BC">Colombie-Britannique</option>
                <option value="AB">Alberta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Code Postal
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Taux de Commission (%) *
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={formData.percentage_rate}
              onChange={(e) => setFormData({ ...formData, percentage_rate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            <p className="text-sm text-slate-600 mt-2">
              Ce franchisé paiera {formData.percentage_rate}% du prix total de chaque garantie vendue.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Mise à jour...' : 'Mettre à Jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
