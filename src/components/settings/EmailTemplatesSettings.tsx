import { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Trash2, X, Save, Eye, EyeOff, Code, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';

interface EmailTemplate {
  id: string;
  organization_id: string;
  template_name: string;
  template_type: 'warranty_created' | 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'custom';
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'warranty_created', label: 'Garantie créée', icon: '✅' },
  { value: 'claim_submitted', label: 'Réclamation soumise', icon: '📝' },
  { value: 'claim_approved', label: 'Réclamation approuvée', icon: '✔️' },
  { value: 'claim_rejected', label: 'Réclamation rejetée', icon: '❌' },
  { value: 'custom', label: 'Personnalisé', icon: '✉️' },
];

const DEFAULT_VARIABLES = {
  warranty_created: ['customer_name', 'warranty_number', 'vehicle_info', 'start_date', 'end_date', 'company_name'],
  claim_submitted: ['customer_name', 'claim_number', 'warranty_number', 'submission_date', 'company_name'],
  claim_approved: ['customer_name', 'claim_number', 'approval_date', 'amount', 'company_name'],
  claim_rejected: ['customer_name', 'claim_number', 'rejection_date', 'reason', 'company_name'],
  custom: ['customer_name', 'company_name'],
};

export function EmailTemplatesSettings() {
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    template_name: '',
    template_type: 'warranty_created' as EmailTemplate['template_type'],
    subject: '',
    body: '',
    is_active: true,
  });

  useEffect(() => {
    if (organization) {
      loadTemplates();
    }
  }, [organization]);

  const loadTemplates = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      template_type: 'warranty_created',
      subject: '',
      body: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      showToast('Erreur: organisation non trouvée', 'error');
      return;
    }

    if (!formData.template_name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      showToast('Veuillez remplir tous les champs requis', 'error');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        organization_id: organization.id,
        template_name: formData.template_name.trim(),
        template_type: formData.template_type,
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        variables: DEFAULT_VARIABLES[formData.template_type] || [],
        is_active: formData.is_active,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        showToast('Template mis à jour avec succès', 'success');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert(templateData);

        if (error) throw error;
        showToast('Template créé avec succès', 'success');
      }

      setShowModal(false);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Supprimer ce template ?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      showToast('Template supprimé avec succès', 'success');
      await loadTemplates();
    } catch (error: any) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const toggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      showToast(`Template ${!template.is_active ? 'activé' : 'désactivé'}`, 'success');
      await loadTemplates();
    } catch (error: any) {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.icon || '✉️';
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[name="body"]') as HTMLTextAreaElement;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = formData.body.substring(0, cursorPos);
      const textAfter = formData.body.substring(cursorPos);
      const newBody = textBefore + `{{${variable}}}` + textAfter;
      setFormData({ ...formData, body: newBody });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Chargement des templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Templates d'email</h3>
            <p className="text-sm text-slate-600">Personnalisez vos emails automatiques</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTemplates}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Rafraîchir
          </Button>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />} size="sm">
            Nouveau template
          </Button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingTemplate ? 'Modifier le template' : 'Nouveau template d\'email'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {editingTemplate ? 'Modifiez votre template' : 'Créez un nouveau template d\'email'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom du template <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    placeholder="Ex: Email de confirmation de garantie"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type de template <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.template_type}
                    onChange={(e) => setFormData({ ...formData, template_type: e.target.value as EmailTemplate['template_type'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {TEMPLATE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sujet de l'email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Votre garantie {{warranty_number}} a été créée"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Corps de l'email <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Bonjour {{customer_name}},&#10;&#10;Votre garantie a été créée avec succès.&#10;&#10;Cordialement,&#10;{{company_name}}"
                  rows={10}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Variables disponibles</p>
                    <p className="text-xs text-blue-700 mt-1">Cliquez pour insérer dans le template</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(DEFAULT_VARIABLES[formData.template_type] || []).map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="px-3 py-1.5 bg-white border border-blue-300 rounded-md text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {`{{${variable}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Template actif</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  className="flex-1"
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  {editingTemplate ? 'Mettre à jour' : 'Créer le template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
          <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Aucun template d'email configuré</p>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Créer votre premier template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary-200 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(template.template_type)}</span>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{template.template_name}</h4>
                      <p className="text-xs text-slate-500">{getTypeLabel(template.template_type)}</p>
                    </div>
                    {template.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                        Inactif
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 mt-3 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Sujet:</p>
                    <p className="text-sm text-slate-900 font-medium">{template.subject}</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 mt-2 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Aperçu:</p>
                    <p className="text-xs text-slate-600 line-clamp-2 font-mono">{template.body}</p>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 text-xs font-mono bg-blue-50 text-blue-700 rounded border border-blue-200"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(template)}
                    leftIcon={template.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  >
                    {template.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(template)}
                    leftIcon={<Edit className="w-4 h-4" />}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
