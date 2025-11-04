import { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, X, Save, Eye, EyeOff, DollarSign, Calendar, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';

interface PriceRange {
  min_price: number;
  max_price: number;
  max_claim_amount: number;
}

interface WarrantyPlan {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration_months: number;
  deductible?: number;
  coverage_matrix: any;
  coverage_details: string | null;
  is_active: boolean;
  status: string;
  max_claim_limits: any;
  created_at: string;
  updated_at: string;
  organizations?: {
    name: string;
  };
}

export function WarrantyPlansManagement() {
  const { organization, profile } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<WarrantyPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WarrantyPlan | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    direct_price: '',
    duration_months: '12',
    deductible: '100',
    coverage_details: '',
    max_claim_amount: '',
    is_active: true,
    status: 'published' as 'draft' | 'published',
  });

  // Price ranges for barème
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [useBareme, setUseBareme] = useState(false);

  useEffect(() => {
    if (organization && profile) {
      loadPlans();
    }
  }, [organization, profile]);

  const loadPlans = async () => {
    // Pour les non-masters, on a besoin de l'organization
    if (profile?.role !== 'master' && !organization?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('warranty_plans')
        .select('*, organizations(name)');

      // Si l'utilisateur est MASTER, charger TOUS les plans de TOUTES les organizations
      if (profile?.role !== 'master') {
        query = query.eq('organization_id', organization.id);
      }

      query = query.order('organization_id').order('base_price');

      const { data, error } = await query;

      if (error) throw error;

      console.log('[WarrantyPlans] Profile role:', profile?.role);
      console.log('[WarrantyPlans] Current active org:', organization?.name);
      console.log('[WarrantyPlans] Loaded plans:', data?.length);
      console.log('[WarrantyPlans] Organizations in plans:', [...new Set(data?.map(p => p.organizations?.name))]);

      setPlans(data || []);
    } catch (error) {
      console.error('[WarrantyPlans] Error loading plans:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      base_price: '',
      direct_price: '',
      duration_months: '12',
      deductible: '100',
      coverage_details: '',
      max_claim_amount: '',
      is_active: true,
      status: 'published',
    });
    setPriceRanges([]);
    setUseBareme(false);
    setShowModal(true);
  };

  const openEditModal = (plan: WarrantyPlan) => {
    setEditingPlan(plan);

    // Check if using barème (price ranges)
    const hasBareme = plan.max_claim_limits?.type === 'price_range' && Array.isArray(plan.max_claim_limits?.ranges);
    const maxClaimAmount = !hasBareme ? plan.max_claim_limits?.max_total_amount : null;

    setFormData({
      name: plan.name,
      description: plan.description || '',
      base_price: plan.base_price.toString(),
      direct_price: plan.base_price.toString(),
      duration_months: plan.duration_months.toString(),
      deductible: plan.deductible?.toString() || '100',
      coverage_details: plan.coverage_details || '',
      max_claim_amount: maxClaimAmount !== undefined && maxClaimAmount !== null ? maxClaimAmount.toString() : '',
      is_active: plan.is_active,
      status: plan.status as 'draft' | 'published',
    });

    // Load barème if exists
    if (hasBareme) {
      setPriceRanges(plan.max_claim_limits.ranges);
      setUseBareme(true);
    } else {
      setPriceRanges([]);
      setUseBareme(false);
    }

    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      showToast('Erreur: organisation non trouvée', 'error');
      return;
    }

    const priceToUse = formData.direct_price || formData.base_price;

    if (!formData.name.trim() || !priceToUse) {
      showToast('Veuillez remplir tous les champs requis', 'error');
      return;
    }

    setSaving(true);
    try {
      // Validation du montant max de réclamation ou barème
      let maxClaimLimits = null;

      if (useBareme) {
        // Utiliser le barème par tranches de prix
        if (priceRanges.length === 0) {
          showToast('Veuillez ajouter au moins une tranche de prix pour le barème', 'error');
          setSaving(false);
          return;
        }

        // Valider les tranches
        for (const range of priceRanges) {
          if (range.min_price >= range.max_price) {
            showToast('Le prix minimum doit être inférieur au prix maximum', 'error');
            setSaving(false);
            return;
          }
          if (range.max_claim_amount <= 0) {
            showToast('Le montant de réclamation doit être positif', 'error');
            setSaving(false);
            return;
          }
        }

        maxClaimLimits = {
          type: 'price_range',
          ranges: priceRanges
        };
      } else if (formData.max_claim_amount && formData.max_claim_amount.trim() !== '') {
        // Utiliser un montant fixe
        const maxAmount = parseFloat(formData.max_claim_amount);
        if (isNaN(maxAmount) || maxAmount < 0) {
          showToast('Le montant maximum de réclamation doit être un nombre positif', 'error');
          setSaving(false);
          return;
        }
        maxClaimLimits = {
          max_total_amount: maxAmount,
          max_per_claim: maxAmount,
          max_claims_count: null
        };
      }

      const planData = {
        organization_id: organization.id,
        name: formData.name.trim(),
        name_fr: formData.name.trim(),
        name_en: formData.name.trim(),
        description: formData.description.trim() || null,
        base_price: parseFloat(priceToUse),
        duration_months: parseInt(formData.duration_months),
        deductible: parseFloat(formData.deductible) || 100,
        coverage_details: formData.coverage_details.trim() || null,
        coverage_matrix: { included: [], excluded: [], limits: {} },
        max_claim_limits: maxClaimLimits,
        is_active: formData.is_active,
        status: formData.status,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('warranty_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        showToast('Plan mis à jour avec succès', 'success');
      } else {
        const { error } = await supabase
          .from('warranty_plans')
          .insert(planData);

        if (error) throw error;
        showToast('Plan créé avec succès', 'success');
      }

      setShowModal(false);
      await loadPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Supprimer ce plan de garantie ?')) return;

    try {
      const { error } = await supabase
        .from('warranty_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      showToast('Plan supprimé avec succès', 'success');
      await loadPlans();
    } catch (error: any) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const toggleActive = async (plan: WarrantyPlan) => {
    try {
      console.log('[WarrantyPlans] Toggling plan:', plan.id);
      console.log('[WarrantyPlans] Current is_active:', plan.is_active);
      console.log('[WarrantyPlans] New is_active:', !plan.is_active);
      console.log('[WarrantyPlans] Plan organization:', plan.organizations?.name);
      console.log('[WarrantyPlans] Current user role:', profile?.role);

      const { data, error } = await supabase
        .from('warranty_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)
        .select();

      if (error) {
        console.error('[WarrantyPlans] Toggle error:', error);
        throw error;
      }

      console.log('[WarrantyPlans] ✅ Toggle successful, updated data:', data);

      showToast(`Plan ${!plan.is_active ? 'activé' : 'désactivé'}`, 'success');
      await loadPlans();
    } catch (error: any) {
      console.error('[WarrantyPlans] Toggle failed:', error);
      showToast('Erreur lors de la modification', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Plans de garantie</h3>
            <p className="text-sm text-slate-600">Gérez vos plans de garantie</p>
          </div>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />} size="sm">
          Nouveau plan
        </Button>
      </div>

      {/* Modal Créer/Modifier */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingPlan ? 'Modifier le plan' : 'Nouveau plan de garantie'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {editingPlan ? 'Modifiez les détails du plan' : 'Créez un nouveau plan de garantie'}
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
                  Nom du plan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Garantie Standard 1 an"
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
                  placeholder="Description du plan de garantie"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Prix direct personnalisé <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.direct_price}
                    onChange={(e) => setFormData({ ...formData, direct_price: e.target.value, base_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Le prix que vous voulez afficher pour ce plan
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Durée (mois) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="3">3 mois</option>
                    <option value="6">6 mois</option>
                    <option value="12">12 mois</option>
                    <option value="24">24 mois</option>
                    <option value="36">36 mois</option>
                    <option value="48">48 mois</option>
                    <option value="60">60 mois</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Franchise / Déductible <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductible}
                    onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
                    placeholder="Ex: 100.00"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Montant que le client doit payer avant que la garantie ne couvre les réparations
                  </p>
                </div>
              </div>

              {/* Type de limite de réclamation */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Limite de réclamation
                </label>

                <div className="space-y-3">
                  {/* Toggle between fixed amount and barème */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useBareme}
                        onChange={() => setUseBareme(false)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-slate-700">Montant fixe</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useBareme}
                        onChange={() => setUseBareme(true)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-slate-700">Barème selon valeur remorque</span>
                    </label>
                  </div>

                  {/* Fixed amount input */}
                  {!useBareme && (
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.max_claim_amount}
                        onChange={(e) => setFormData({ ...formData, max_claim_amount: e.target.value })}
                        placeholder="Ex: 5000.00"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Montant maximum total (laissez vide pour illimité)
                      </p>
                    </div>
                  )}

                  {/* Barème interface */}
                  {useBareme && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        Définissez des limites de réclamation selon la valeur d'achat de la remorque
                      </p>

                      {priceRanges.map((range, index) => (
                        <div key={index} className="flex gap-2 items-start bg-white p-3 rounded border border-slate-200">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-slate-600">De</label>
                              <input
                                type="number"
                                value={range.min_price}
                                onChange={(e) => {
                                  const newRanges = [...priceRanges];
                                  newRanges[index].min_price = parseFloat(e.target.value) || 0;
                                  setPriceRanges(newRanges);
                                }}
                                placeholder="0"
                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">À</label>
                              <input
                                type="number"
                                value={range.max_price}
                                onChange={(e) => {
                                  const newRanges = [...priceRanges];
                                  newRanges[index].max_price = parseFloat(e.target.value) || 0;
                                  setPriceRanges(newRanges);
                                }}
                                placeholder="10000"
                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Limite max</label>
                              <input
                                type="number"
                                value={range.max_claim_amount}
                                onChange={(e) => {
                                  const newRanges = [...priceRanges];
                                  newRanges[index].max_claim_amount = parseFloat(e.target.value) || 0;
                                  setPriceRanges(newRanges);
                                }}
                                placeholder="1500"
                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newRanges = priceRanges.filter((_, i) => i !== index);
                              setPriceRanges(newRanges);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setPriceRanges([
                            ...priceRanges,
                            { min_price: 0, max_price: 10000, max_claim_amount: 1500 }
                          ]);
                        }}
                        className="w-full px-3 py-2 text-sm border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Ajouter une tranche
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Détails de couverture
                </label>
                <textarea
                  value={formData.coverage_details}
                  onChange={(e) => setFormData({ ...formData, coverage_details: e.target.value })}
                  placeholder="Décrivez ce qui est couvert par ce plan..."
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
                  <span className="text-sm font-medium text-slate-700">Plan actif</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Statut
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={formData.status === 'draft'}
                      onChange={(e) => setFormData({ ...formData, status: 'draft' })}
                      className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">Brouillon</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={formData.status === 'published'}
                      onChange={(e) => setFormData({ ...formData, status: 'published' })}
                      className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">Publié</span>
                  </label>
                </div>
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
                  {editingPlan ? 'Mettre à jour' : 'Créer le plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Aucun plan de garantie configuré</p>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Créer votre premier plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary-200 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-slate-900">{plan.name}</h4>
                    {profile?.role === 'master' && plan.organizations && (
                      <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
                        {plan.organizations.name}
                      </span>
                    )}
                    {plan.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                        Inactif
                      </span>
                    )}
                    {plan.status === 'draft' && (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">
                        Brouillon
                      </span>
                    )}
                  </div>

                  {plan.description && (
                    <p className="text-slate-600 text-sm mb-3">{plan.description}</p>
                  )}

                  <div className="flex gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg">
                      <DollarSign className="w-4 h-4 text-primary-600" />
                      <span className="text-sm font-semibold text-primary-700">
                        {plan.base_price.toFixed(2)} $
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">
                        {plan.duration_months} mois
                      </span>
                    </div>
                    {plan.deductible != null && plan.deductible > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">
                          Franchise: {plan.deductible.toFixed(2)} $
                        </span>
                      </div>
                    )}
                    {/* Display fixed amount or barème */}
                    {plan.max_claim_limits?.type === 'price_range' && Array.isArray(plan.max_claim_limits.ranges) ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-700">
                          Barème ({plan.max_claim_limits.ranges.length} tranches)
                        </span>
                      </div>
                    ) : (
                      plan.max_claim_limits?.max_total_amount != null && plan.max_claim_limits.max_total_amount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                          <Shield className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-700">
                            Max: {Number(plan.max_claim_limits.max_total_amount).toFixed(2)} $
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {plan.coverage_details && (
                    <p className="text-xs text-slate-500 line-clamp-2">{plan.coverage_details}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(plan)}
                    leftIcon={plan.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  >
                    {plan.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(plan)}
                    leftIcon={<Edit className="w-4 h-4" />}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(plan.id)}
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
