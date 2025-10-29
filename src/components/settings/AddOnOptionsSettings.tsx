import { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, X, Save, Eye, EyeOff, DollarSign, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';

interface WarrantyOption {
  id: string;
  organization_id?: string;
  name: string;
  name_fr: string;
  name_en: string;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function AddOnOptionsSettings() {
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [options, setOptions] = useState<WarrantyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOption, setEditingOption] = useState<WarrantyOption | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    name_fr: '',
    name_en: '',
    price: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (organization) {
      loadOptions();
    }
  }, [organization]);

  const loadOptions = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warranty_options')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error && error.code !== 'PGRST116') throw error;
      setOptions(data || []);
    } catch (error: any) {
      console.error('Error loading options:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingOption(null);
    setFormData({
      name: '',
      name_fr: '',
      name_en: '',
      price: '',
      description: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (option: WarrantyOption) => {
    setEditingOption(option);
    setFormData({
      name: option.name,
      name_fr: option.name_fr,
      name_en: option.name_en,
      price: option.price.toString(),
      description: option.description || '',
      is_active: option.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      showToast('Erreur: organisation non trouvée', 'error');
      return;
    }

    if (!formData.name.trim() || !formData.price) {
      showToast('Veuillez remplir tous les champs requis', 'error');
      return;
    }

    setSaving(true);
    try {
      const optionData = {
        organization_id: organization.id,
        name: formData.name.trim(),
        name_fr: formData.name_fr.trim() || formData.name.trim(),
        name_en: formData.name_en.trim() || formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (editingOption) {
        const { error } = await supabase
          .from('warranty_options')
          .update(optionData)
          .eq('id', editingOption.id);

        if (error) throw error;
        showToast('Option mise à jour avec succès', 'success');
      } else {
        const { error } = await supabase
          .from('warranty_options')
          .insert(optionData);

        if (error) throw error;
        showToast('Option créée avec succès', 'success');
      }

      setShowModal(false);
      await loadOptions();
    } catch (error: any) {
      console.error('Error saving option:', error);
      showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (optionId: string) => {
    if (!confirm('Supprimer cette option ?')) return;

    try {
      const { error } = await supabase
        .from('warranty_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;

      showToast('Option supprimée avec succès', 'success');
      await loadOptions();
    } catch (error: any) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const toggleActive = async (option: WarrantyOption) => {
    try {
      const { error } = await supabase
        .from('warranty_options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);

      if (error) throw error;

      showToast(`Option ${!option.is_active ? 'activée' : 'désactivée'}`, 'success');
      await loadOptions();
    } catch (error: any) {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Chargement des options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Options Add-on</h3>
            <p className="text-sm text-slate-600">Gérez les options supplémentaires pour vos garanties</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOptions}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Rafraîchir
          </Button>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />} size="sm">
            Nouvelle option
          </Button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingOption ? 'Modifier l\'option' : 'Nouvelle option add-on'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {editingOption ? 'Modifiez l\'option' : 'Créez une nouvelle option'}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de l'option <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Protection complète"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom français
                  </label>
                  <input
                    type="text"
                    value={formData.name_fr}
                    onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                    placeholder="Protection complète"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Laisser vide pour utiliser le nom principal</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom anglais
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Complete protection"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Laisser vide pour utiliser le nom principal</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Prix de l'option <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez ce que cette option comprend..."
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Option active</span>
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
                  {editingOption ? 'Mettre à jour' : 'Créer l\'option'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {options.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Aucune option add-on configurée</p>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Créer votre première option
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {options.map((option) => (
            <div key={option.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary-200 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-6 h-6 text-primary-600" />
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-900">{option.name}</h4>
                      {(option.name_fr !== option.name || option.name_en !== option.name) && (
                        <div className="flex gap-2 mt-1">
                          {option.name_fr !== option.name && (
                            <span className="text-xs text-slate-500">FR: {option.name_fr}</span>
                          )}
                          {option.name_en !== option.name && (
                            <span className="text-xs text-slate-500">EN: {option.name_en}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {option.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                        Inactif
                      </span>
                    )}
                  </div>

                  {option.description && (
                    <p className="text-sm text-slate-600 mb-3 ml-9">{option.description}</p>
                  )}

                  <div className="flex items-center gap-2 ml-9">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg">
                      <DollarSign className="w-4 h-4 text-primary-600" />
                      <span className="text-sm font-semibold text-primary-700">
                        {option.price.toFixed(2)} $
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(option)}
                    leftIcon={option.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  >
                    {option.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(option)}
                    leftIcon={<Edit className="w-4 h-4" />}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(option.id)}
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
