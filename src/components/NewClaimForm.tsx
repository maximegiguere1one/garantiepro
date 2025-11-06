import { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, FileText, Calendar, User, Wrench, Mic } from 'lucide-react';
import { microcopy } from '../lib/microcopy';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FileUpload } from './FileUpload';
import { uploadMultipleFiles } from '../lib/file-upload';
import { getRecentValues, saveRecentValue } from '../lib/form-auto-complete';

interface NewClaimFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Warranty {
  id: string;
  contract_number: string;
  status: string;
  customer_id: string;
  trailers?: {
    make: string;
    model: string;
    year: number;
  };
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function NewClaimForm({ onClose, onSuccess }: NewClaimFormProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isDealer, setIsDealer] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    warranty_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_description: '',
    repair_shop_name: '',
    repair_shop_contact: '',
  });
  const [listening, setListening] = useState(false);
  const [recentShops, setRecentShops] = useState<string[]>([]);

  useEffect(() => {
    loadCustomerWarranties();
    setRecentShops(getRecentValues('repair_shop_name', 5));
  }, [profile]);

  const loadCustomerWarranties = async () => {
    try {
      setLoading(true);

      const isDealerUser = profile?.role === 'dealer' || profile?.role === 'admin';
      setIsDealer(isDealerUser);

      if (isDealerUser) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .order('first_name', { ascending: true });

        if (customersError) throw customersError;
        setCustomers(customersData || []);
      } else {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', profile?.id)
          .maybeSingle();

        if (customerError) throw customerError;

        if (!customerData) {
          toast.error('Erreur', 'Aucun profil client trouvé. Veuillez contacter le support.');
          setLoading(false);
          return;
        }

        setCustomerId(customerData.id);
        await loadWarrantiesForCustomer(customerData.id);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadWarrantiesForCustomer = async (custId: string) => {
    try {
      const { data: warrantiesData, error: warrantiesError } = await supabase
        .from('warranties')
        .select(`
          id,
          contract_number,
          status,
          customer_id,
          end_date,
          trailers(make, model, year)
        `)
        .eq('customer_id', custId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (warrantiesError) throw warrantiesError;

      console.log('[NewClaimForm] Loaded warranties for customer:', custId, '- Count:', warrantiesData?.length || 0);
      setWarranties(warrantiesData || []);
    } catch (error: any) {
      console.error('Error loading warranties:', error);
      toast.error('Erreur', 'Impossible de charger les garanties');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDealer && !formData.customer_id) {
      toast.warning('Informations requises', 'Veuillez sélectionner le client concerné par cette réclamation');
      return;
    }

    if (!formData.warranty_id) {
      toast.warning('Informations requises', 'Veuillez sélectionner la garantie concernée par cette réclamation');
      return;
    }

    if (!formData.incident_description.trim()) {
      toast.warning('Description requise', 'Veuillez décrire l\'incident en détail pour permettre un traitement rapide de votre réclamation');
      return;
    }

    const targetCustomerId = isDealer ? formData.customer_id : customerId;
    if (!targetCustomerId) {
      toast.error('Erreur', 'Impossible de créer la réclamation');
      return;
    }

    try {
      setSubmitting(true);

      const claimNumber = `CLM-${Date.now()}`;
      const slaHours = 48;
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + slaHours);

      const { data: newClaim, error: claimError } = await supabase
        .from('claims')
        .insert({
          claim_number: claimNumber,
          warranty_id: formData.warranty_id,
          customer_id: targetCustomerId,
          incident_date: formData.incident_date,
          incident_description: formData.incident_description,
          repair_shop_name: formData.repair_shop_name || null,
          repair_shop_contact: formData.repair_shop_contact || null,
          status: 'submitted',
          current_step: 1,
          sla_deadline: slaDeadline.toISOString(),
        })
        .select()
        .single();

      if (claimError) throw claimError;

      await supabase.from('claim_timeline').insert({
        claim_id: newClaim.id,
        event_type: 'claim_created',
        description: 'Réclamation créée par le client',
        created_by: profile?.id,
        metadata: { initial_status: 'submitted' },
      });

      if (files.length > 0) {
        const uploadResults = await uploadMultipleFiles(
          files,
          'claim-attachments',
          `${newClaim.id}`
        );

        const attachments = uploadResults
          .filter((result) => result.success && result.url)
          .map((result, index) => ({
            claim_id: newClaim.id,
            file_url: result.url!,
            file_name: files[index].name,
            file_type: files[index].type,
            file_size: files[index].size,
            uploaded_by: profile?.id,
          }));

        if (attachments.length > 0) {
          await supabase.from('claim_attachments').insert(attachments);
        }
      }

      if (formData.repair_shop_name) {
        saveRecentValue('repair_shop_name', formData.repair_shop_name);
      }

      toast.success(
        microcopy.success.claim.submitted.title,
        microcopy.success.claim.submitted.message(claimNumber) + ' ' + microcopy.success.claim.submitted.nextSteps
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating claim:', error);
      toast.error('Erreur', error.message || 'Impossible de créer la réclamation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-slate-900 absolute top-0 left-0"></div>
            </div>
            <p className="mt-6 text-slate-600 font-medium">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isDealer && warranties.length === 0 && !loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              {microcopy.errors.claim.noWarranties.title}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {microcopy.errors.claim.noWarranties.message}
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{microcopy.forms.claim.title}</h2>
              <p className="text-slate-300 text-sm">{microcopy.forms.claim.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-8 space-y-8">
            {isDealer && (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      Sélectionner le client
                    </label>
                    <p className="text-xs text-slate-500">Choisissez le client pour cette réclamation</p>
                  </div>
                </div>
                <select
                  value={formData.customer_id}
                  onChange={(e) => {
                    const selectedCustomerId = e.target.value;
                    setFormData({ ...formData, customer_id: selectedCustomerId, warranty_id: '' });
                    setCustomerId(selectedCustomerId);
                    if (selectedCustomerId) {
                      loadWarrantiesForCustomer(selectedCustomerId);
                    } else {
                      setWarranties([]);
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-white text-slate-900 font-medium"
                  required
                >
                  <option value="">Sélectionnez un client</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} - {customer.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Garantie concernée <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Sélectionnez la garantie liée à cette réclamation</p>
                </div>
              </div>
              <select
                value={formData.warranty_id}
                onChange={(e) => setFormData({ ...formData, warranty_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white text-slate-900 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
                disabled={isDealer && !formData.customer_id}
              >
                <option value="">
                  {isDealer && !formData.customer_id
                    ? microcopy.forms.claim.selectWarranty.selectCustomerFirst
                    : microcopy.forms.claim.selectWarranty.placeholder}
                </option>
                {warranties.map((warranty) => (
                  <option key={warranty.id} value={warranty.id}>
                    {warranty.contract_number} - {warranty.trailers?.year} {warranty.trailers?.make} {warranty.trailers?.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      Date de l'incident <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">Quand l'incident s'est-il produit?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setFormData({ ...formData, incident_date: today });
                    }}
                    className="px-3 py-1 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg text-xs hover:bg-primary-100 transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setFormData({ ...formData, incident_date: yesterday.toISOString().split('T')[0] });
                    }}
                    className="px-3 py-1 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg text-xs hover:bg-primary-100 transition-colors"
                  >
                    Hier
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-900 font-medium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      Description de l'incident <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">Décrivez en détail ce qui s'est passé</p>
                  </div>
                </div>
                {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (listening) return;
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      const recognition = new SpeechRecognition();
                      recognition.lang = 'fr-CA';
                      recognition.continuous = false;
                      recognition.interimResults = false;
                      recognition.onstart = () => setListening(true);
                      recognition.onend = () => setListening(false);
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        setFormData({ ...formData, incident_description: formData.incident_description + ' ' + transcript });
                      };
                      recognition.onerror = () => setListening(false);
                      recognition.start();
                    }}
                    disabled={listening}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      listening
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    {listening ? 'En écoute...' : 'Voix'}
                  </button>
                )}
              </div>
              <textarea
                value={formData.incident_description}
                onChange={(e) =>
                  setFormData({ ...formData, incident_description: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none text-slate-900"
                rows={5}
                placeholder={microcopy.forms.claim.incidentDescription.placeholder}
                required
              />
              <div className="mt-2 flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p>{microcopy.forms.claim.incidentDescription.examples}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Informations du garage (optionnel)
                  </label>
                  <p className="text-xs text-slate-500">Si vous avez déjà contacté un garage de réparation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Nom du garage
                  </label>
                  <input
                    type="text"
                    value={formData.repair_shop_name}
                    onChange={(e) =>
                      setFormData({ ...formData, repair_shop_name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    placeholder={microcopy.forms.claim.repairShop.name.placeholder}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Contact du garage
                  </label>
                  <input
                    type="text"
                    value={formData.repair_shop_contact}
                    onChange={(e) =>
                      setFormData({ ...formData, repair_shop_contact: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    placeholder={microcopy.forms.claim.repairShop.contact.placeholder}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Pièces jointes
                  </label>
                  <p className="text-xs text-slate-500">Photos de dommages, estimations, factures...</p>
                </div>
              </div>
              <FileUpload onFilesSelected={setFiles} maxFiles={10} />
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-cyan-50 border-2 border-primary-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary-900 mb-3">Informations importantes</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-primary-800">
                      <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Votre réclamation sera traitée dans les <strong>48 heures ouvrables</strong></span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-primary-800">
                      <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Vous recevrez des notifications par courriel à chaque étape</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-primary-800">
                      <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Conservez tous les documents et factures liés à l'incident</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="bg-slate-50 border-t-2 border-slate-200 px-8 py-5 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-medium"
            disabled={submitting}
          >
            {microcopy.buttons.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {microcopy.loading.processing}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {microcopy.buttons.claim.create}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
