import { useState, useEffect } from 'react';
import { FileText, Plus, CreditCard as Edit2, Trash2, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface ResponseTemplate {
  id: string;
  name: string;
  category: 'approval' | 'rejection' | 'info_request' | 'general' | 'followup';
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
}

interface ResponseTemplatesManagerProps {
  onSelectTemplate?: (template: ResponseTemplate) => void;
  compactMode?: boolean;
}

const CATEGORY_LABELS = {
  approval: 'Approbation',
  rejection: 'Rejet',
  info_request: 'Demande d\'info',
  general: 'Général',
  followup: 'Suivi'
};

export function ResponseTemplatesManager({ onSelectTemplate, compactMode = false }: ResponseTemplatesManagerProps) {
  const { organization: currentOrganization } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'general' as ResponseTemplate['category'],
    subject: '',
    body: '',
    variables: [] as string[]
  });

  useEffect(() => {
    loadTemplates();
  }, [currentOrganization]);

  const loadTemplates = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('response_templates')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      showToast('Erreur lors du chargement des templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentOrganization) return;

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('response_templates')
          .update({
            name: formData.name,
            category: formData.category,
            subject: formData.subject,
            body: formData.body,
            variables: formData.variables
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        showToast('Template mis à jour avec succès', 'success');
      } else {
        const { error } = await supabase
          .from('response_templates')
          .insert({
            organization_id: currentOrganization.id,
            name: formData.name,
            category: formData.category,
            subject: formData.subject,
            body: formData.body,
            variables: formData.variables
          });

        if (error) throw error;
        showToast('Template créé avec succès', 'success');
      }

      loadTemplates();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving template:', error);
      showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template?')) return;

    try {
      const { error } = await supabase
        .from('response_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      showToast('Template supprimé avec succès', 'success');
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleEdit = (template: ResponseTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
      variables: template.variables
    });
    setShowModal(true);
  };

  const handleUseTemplate = (template: ResponseTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);

      supabase
        .from('response_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id)
        .then();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      subject: '',
      body: '',
      variables: []
    });
    setEditingTemplate(null);
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  const updateVariables = () => {
    const allText = formData.subject + ' ' + formData.body;
    const variables = extractVariables(allText);
    setFormData(prev => ({ ...prev, variables }));
  };

  if (compactMode) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Utiliser un template
        </label>
        <select
          onChange={(e) => {
            const template = templates.find(t => t.id === e.target.value);
            if (template) handleUseTemplate(template);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Sélectionner un template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({CATEGORY_LABELS[template.category]})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-semibold text-slate-900">Templates de Réponses</h2>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Aucun template créé</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Créer votre premier template
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{template.name}</h3>
                  <span className="inline-block mt-1 px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                    {CATEGORY_LABELS[template.category]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Utiliser ce template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-2 font-medium">{template.subject}</p>
              <p className="text-sm text-slate-500 line-clamp-3">{template.body}</p>

              {template.variables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 text-xs text-slate-500">
                Utilisé {template.usage_count} fois
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                {editingTemplate ? 'Modifier le Template' : 'Nouveau Template'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du template
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Approbation Rapide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sujet
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, subject: e.target.value }));
                    updateVariables();
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Réclamation #{{claim_number}} approuvée"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Corps du message
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, body: e.target.value }));
                    updateVariables();
                  }}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  placeholder="Utilisez {{variable}} pour insérer des variables dynamiques"
                />
              </div>

              {formData.variables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Variables détectées
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable) => (
                      <span
                        key={variable}
                        className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-lg font-mono"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-primary-800 font-medium mb-2">Variables disponibles:</p>
                <div className="text-xs text-primary-700 space-y-1">
                  <p><code className="bg-primary-100 px-1 rounded">{'{{customer_name}}'}</code> - Nom du client</p>
                  <p><code className="bg-primary-100 px-1 rounded">{'{{claim_number}}'}</code> - Numéro de réclamation</p>
                  <p><code className="bg-primary-100 px-1 rounded">{'{{warranty_number}}'}</code> - Numéro de garantie</p>
                  <p><code className="bg-primary-100 px-1 rounded">{'{{approved_amount}}'}</code> - Montant approuvé</p>
                  <p><code className="bg-primary-100 px-1 rounded">{'{{company_name}}'}</code> - Nom de votre entreprise</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.subject || !formData.body}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {editingTemplate ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
