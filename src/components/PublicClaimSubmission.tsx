import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validateClaimToken, markTokenAsUsed, logClaimAccess, type TokenValidationResult } from '../lib/claim-token-utils';
import { uploadMultipleFiles } from '../lib/file-upload';
import {
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  Upload,
  Loader2,
  Shield,
  XCircle,
  Wrench,
  Image as ImageIcon,
  Mic,
} from 'lucide-react';

export function PublicClaimSubmission() {
  const { token } = useParams<{ token: string }>();
  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState<TokenValidationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [claimNumber, setClaimNumber] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    incident_date: new Date().toISOString().split('T')[0],
    incident_description: '',
    repair_shop_name: '',
    repair_shop_contact: '',
  });
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    setValidating(true);
    const result = await validateClaimToken(token);

    if (!result.valid) {
      await logClaimAccess(token, 'invalid_token', false, result.error);
      setError(result.error || 'Token invalide');
      setValidating(false);
      return;
    }

    await logClaimAccess(token, 'view_form', true);
    console.log('Token validation result:', {
      valid: result.valid,
      hasWarranty: !!result.warranty,
      warrantyData: result.warranty,
    });
    setTokenData(result);
    setValidating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 15) {
        setError('Maximum 15 fichiers autorisés');
        return;
      }
      setFiles([...files, ...newFiles]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !tokenData?.warranty) {
      setError('Token invalide');
      return;
    }

    if (!formData.incident_description.trim()) {
      setError('Veuillez décrire l\'incident');
      return;
    }

    const incidentDate = new Date(formData.incident_date);
    const warrantyStart = new Date(tokenData.warranty.start_date);
    const warrantyEnd = new Date(tokenData.warranty.end_date);

    if (incidentDate < warrantyStart || incidentDate > warrantyEnd) {
      setError('La date de l\'incident doit être pendant la période de garantie');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const claimNum = `CLM-${Date.now()}`;
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + 48);

      const { data: newClaim, error: claimError } = await supabase
        .from('claims')
        .insert({
          claim_number: claimNum,
          warranty_id: tokenData.warranty.id,
          customer_id: tokenData.warranty.customer_id,
          incident_date: formData.incident_date,
          incident_description: formData.incident_description,
          repair_shop_name: formData.repair_shop_name || null,
          repair_shop_contact: formData.repair_shop_contact || null,
          status: 'submitted',
          current_step: 1,
          sla_deadline: slaDeadline.toISOString(),
          submission_method: 'public_link',
          submission_token: token,
          submission_ip: null,
          reported_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (claimError) throw claimError;

      await supabase.from('claim_timeline').insert({
        claim_id: newClaim.id,
        event_type: 'claim_created',
        description: 'Réclamation créée via lien public',
        metadata: { submission_method: 'public_link' },
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
          }));

        if (attachments.length > 0) {
          await supabase.from('claim_attachments').insert(attachments);
        }
      }

      await markTokenAsUsed(token, newClaim.id);
      await logClaimAccess(token, 'submit_claim', true);

      setClaimNumber(claimNum);
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      await logClaimAccess(token!, 'submit_claim', false, error.message);
      setError(error.message || 'Erreur lors de la soumission de la réclamation');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-slate-900 absolute top-0 left-0"></div>
            </div>
            <p className="mt-6 text-slate-600 font-medium">Validation en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Lien invalide</h2>
            <p className="text-slate-600 leading-relaxed">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Réclamation soumise avec succès!</h2>
            <div className="bg-slate-50 rounded-xl p-6 my-6">
              <p className="text-sm text-slate-600 mb-2">Votre numéro de réclamation:</p>
              <p className="text-3xl font-bold text-slate-900 tracking-wider">{claimNumber}</p>
            </div>
            <div className="text-left space-y-4">
              <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6">
                <h3 className="font-bold text-primary-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Prochaines étapes
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Votre réclamation sera traitée dans les <strong>48 heures ouvrables</strong></span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Vous recevrez un email de confirmation sous peu</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Nous vous notifierons à chaque étape du traitement</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-primary-800">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Conservez votre numéro de réclamation pour toute référence future</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have warranty data
  if (!tokenData || !tokenData.warranty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Aucune garantie active</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour soumettre une réclamation, vous devez avoir au moins une garantie active. Contactez votre
              concessionnaire si vous pensez avoir une garantie.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const warranty = tokenData.warranty;
  const customer = warranty.customers;
  const trailer = warranty.trailers;
  const plan = warranty.warranty_plans;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-8 py-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Soumettre une réclamation</h1>
            </div>
            <p className="text-slate-300">Remplissez le formulaire ci-dessous pour déposer votre réclamation</p>
          </div>

          <div className="p-8">
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border-2 border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                Informations de votre garantie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Numéro de contrat:</p>
                  <p className="font-semibold text-slate-900">{warranty.contract_number}</p>
                </div>
                <div>
                  <p className="text-slate-600">Plan:</p>
                  <p className="font-semibold text-slate-900">{plan?.name}</p>
                </div>
                <div>
                  <p className="text-slate-600">Client:</p>
                  <p className="font-semibold text-slate-900">
                    {customer?.first_name} {customer?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Véhicule:</p>
                  <p className="font-semibold text-slate-900">
                    {trailer?.year} {trailer?.make} {trailer?.model}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Période de couverture:</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(warranty.start_date).toLocaleDateString('fr-CA')} au{' '}
                    {new Date(warranty.end_date).toLocaleDateString('fr-CA')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Statut:</p>
                  <p className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
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
                <input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                  min={warranty.start_date}
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
                        Description détaillée de l'incident <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-slate-500">Décrivez ce qui s'est passé en détail</p>
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
                  onChange={(e) => setFormData({ ...formData, incident_description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none text-slate-900"
                  rows={6}
                  placeholder="Décrivez l'incident: quand, où, comment, quels dommages ont été causés..."
                  required
                />
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
                    <p className="text-xs text-slate-500">Si vous avez contacté un garage</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Nom du garage</label>
                    <input
                      type="text"
                      value={formData.repair_shop_name}
                      onChange={(e) => setFormData({ ...formData, repair_shop_name: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Ex: Garage Mechanics Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Contact</label>
                    <input
                      type="text"
                      value={formData.repair_shop_contact}
                      onChange={(e) => setFormData({ ...formData, repair_shop_contact: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Téléphone ou courriel"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900">
                      Photos et documents
                    </label>
                    <p className="text-xs text-slate-500">
                      Ajoutez des photos des dommages, factures, estimations... (max 15 fichiers)
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      Cliquez pour sélectionner des fichiers
                    </p>
                    <p className="text-xs text-slate-500">
                      Images, PDF, ou documents Word (max 10MB par fichier)
                    </p>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <XCircle className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                        <span>Ce lien ne peut être utilisé qu'une seule fois</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Soumission en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Soumettre la réclamation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
