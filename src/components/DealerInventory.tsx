import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Package, Plus, CreditCard as Edit2, Trash2, X, Save, Loader2, Search, DollarSign, TrendingUp, Archive, Upload, Download } from 'lucide-react';
import { BulkInventoryImport } from './BulkInventoryImport';
import { exportInventoryToExcel, fetchBrands, type TrailerBrand } from '../lib/inventory-import-utils';
import { safeNumber } from '../lib/numeric-utils';

interface InventoryItem {
  id: string;
  organization_id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: string;
  color: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  asking_price: number | null;
  status: string | null;
  location: string | null;
  notes: string | null;
  sold_date: string | null;
  sold_price: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface InventoryForm {
  vin: string;
  make: string;
  model: string;
  year: number;
  type: string;
  color: string;
  purchase_date: string;
  purchase_price: number;
  asking_price: number;
  status: string;
  location: string;
  notes: string;
}

const EMPTY_FORM: InventoryForm = {
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  type: '',
  color: '',
  purchase_date: new Date().toISOString().split('T')[0],
  purchase_price: 0,
  asking_price: 0,
  status: 'available',
  location: '',
  notes: '',
};

export function DealerInventory() {
  const { profile } = useAuth();
  const { currentOrganization } = useOrganization();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brands, setBrands] = useState<TrailerBrand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<TrailerBrand[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  useEffect(() => {
    loadInventory();
    loadBrands();
  }, [profile, currentOrganization]);

  useEffect(() => {
    if (form.make) {
      const filtered = brands.filter((b) =>
        b.name.toLowerCase().includes(form.make.toLowerCase())
      );
      setFilteredBrands(filtered);
    } else {
      setFilteredBrands(brands);
    }
  }, [form.make, brands]);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, statusFilter, categoryFilter]);

  const loadInventory = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('dealer_inventory')
        .select('*');

      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    if (!currentOrganization?.id) return;
    try {
      const brandsData = await fetchBrands(currentOrganization.id);
      setBrands(brandsData);
      setFilteredBrands(brandsData);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const handleExport = () => {
    exportInventoryToExcel(filteredInventory, 'inventaire_remorques.xlsx');
  };

  const filterInventory = () => {
    let filtered = [...inventory];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.vin.toLowerCase().includes(search) ||
          item.make.toLowerCase().includes(search) ||
          item.model.toLowerCase().includes(search) ||
          (item.type && item.type.toLowerCase().includes(search))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.type === categoryFilter);
    }

    setFilteredInventory(filtered);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      vin: item.vin,
      make: item.make,
      model: item.model,
      year: item.year,
      type: item.type,
      color: item.color || '',
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      purchase_price: item.purchase_price || 0,
      asking_price: item.asking_price || 0,
      status: item.status || 'available',
      location: item.location || '',
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!profile?.id) {
      alert('Erreur: Impossible de trouver votre profil');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from('dealer_inventory')
          .update({
            ...form,
            notes: form.notes || null,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        if (!currentOrganization?.id) {
          alert('Erreur: Organisation non trouvée');
          return;
        }

        const { error } = await supabase
          .from('dealer_inventory')
          .insert({
            organization_id: currentOrganization.id,
            ...form,
            notes: form.notes || null,
            color: form.color || null,
            purchase_date: form.purchase_date || null,
            purchase_price: form.purchase_price || null,
            asking_price: form.asking_price || null,
            location: form.location || null,
          });

        if (error) throw error;
      }

      await loadInventory();
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (error: any) {
      console.error('Error saving inventory item:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit de l\'inventaire?')) return;

    try {
      const { error } = await supabase
        .from('dealer_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInventory();
    } catch (error: any) {
      console.error('Error deleting inventory item:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  const calculateStats = () => {
    const available = inventory.filter((item) => item.status === 'available');
    const sold = inventory.filter((item) => item.status === 'sold');
    const totalValue = available.reduce((sum, item) => sum + (item.asking_price || 0), 0);
    const totalProfit = sold.reduce((sum, item) => sum + ((item.sold_price || 0) - (item.purchase_price || 0)), 0);

    return {
      totalItems: inventory.length,
      availableItems: available.length,
      soldItems: sold.length,
      totalValue,
      totalProfit,
    };
  };

  const stats = calculateStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800';
      case 'sold':
        return 'bg-slate-100 text-slate-600';
      case 'reserved':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'sold':
        return 'Vendu';
      case 'reserved':
        return 'Réservé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon Inventaire</h1>
          <p className="text-slate-600 mt-2">Gérez vos remorques en stock</p>
        </div>
        <div className="flex items-center gap-3">
          {inventory.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              Exporter
            </button>
          )}
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Importation en masse
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter une remorque
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Inventaire</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalItems}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.availableItems} unités disponibles</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Valeur Totale</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalValue.toLocaleString('fr-CA')} $
          </p>
          <p className="text-xs text-slate-500 mt-1">Stock disponible</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Profit Total</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalProfit.toLocaleString('fr-CA')} $
          </p>
          <p className="text-xs text-slate-500 mt-1">Remorques vendues</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <Archive className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Vendues ce Mois</p>
          <p className="text-2xl font-bold text-slate-900">{stats.soldItems}</p>
          <p className="text-xs text-slate-500 mt-1">Depuis le début du mois</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par VIN, marque, modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="reserved">Réservé</option>
              <option value="sold">Vendu</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">Toutes catégories</option>
              <option value="fermee">Fermée</option>
              <option value="ouverte">Ouverte</option>
              <option value="utilitaire">Utilitaire</option>
            </select>
          </div>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {inventory.length === 0 ? 'Aucune remorque en inventaire' : 'Aucun résultat'}
          </h3>
          <p className="text-slate-600 mb-6">
            {inventory.length === 0
              ? 'Commencez par ajouter des remorques à votre inventaire'
              : 'Essayez de modifier vos filtres de recherche'}
          </p>
          {inventory.length === 0 && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter ma première remorque
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {item.year} {item.make} {item.model}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">NIV: {item.vin}</p>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Type</p>
                          <p className="text-sm font-medium text-slate-900">{item.trailer_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Catégorie</p>
                          <p className="text-sm font-medium text-slate-900 capitalize">{item.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Prix d'achat</p>
                          <p className="text-sm font-medium text-slate-900">
                            {item.purchase_price.toLocaleString('fr-CA')} $
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Prix demandé</p>
                          <p className="text-sm font-medium text-emerald-600">
                            {(item.asking_price || 0).toLocaleString('fr-CA')} $
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Emplacement</p>
                          <p className="text-sm font-medium text-slate-900">{item.location || 'N/A'}</p>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-sm text-slate-600 mt-3 italic">{item.notes}</p>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          Ajouté le {new Date(item.created_at).toLocaleDateString('fr-CA')}
                          {item.updated_at !== item.created_at &&
                            ` • Modifié le ${new Date(item.updated_at).toLocaleDateString('fr-CA')}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingId ? 'Modifier la remorque' : 'Ajouter une remorque'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">NIV</label>
                <input
                  type="text"
                  value={form.vin}
                  onChange={(e) => setForm({ ...form, vin: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Marque</label>
                  <input
                    type="text"
                    value={form.make}
                    onChange={(e) => {
                      setForm({ ...form, make: e.target.value });
                      setShowBrandDropdown(true);
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    placeholder="Commencez à taper ou sélectionnez..."
                    required
                  />
                  {showBrandDropdown && filteredBrands.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredBrands.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm({ ...form, make: brand.name });
                            setShowBrandDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-100 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-slate-900">{brand.name}</span>
                          {brand.usage_count > 0 && (
                            <span className="text-xs text-slate-500">
                              {brand.usage_count} utilisations
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Modèle</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Année</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => {
                      const value = safeNumber(e.target.value, new Date().getFullYear());
                      setForm({ ...form, year: Math.max(1900, Math.min(new Date().getFullYear() + 1, value)) });
                    }}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <input
                    type="text"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    placeholder="ex: Cargo, Utilitaire, Plateforme"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Couleur</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    placeholder="ex: Blanc, Noir, Gris"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date d'achat</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prix d'achat ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.purchase_price}
                    onChange={(e) => {
                      const value = safeNumber(e.target.value, 0);
                      setForm({ ...form, purchase_price: Math.max(0, value) });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prix demandé ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.asking_price}
                    onChange={(e) => {
                      const value = safeNumber(e.target.value, 0);
                      setForm({ ...form, asking_price: Math.max(0, value) });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Emplacement</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    placeholder="Ex: Cour A-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="available">Disponible</option>
                    <option value="reserved">Réservé</option>
                    <option value="sold">Vendu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                  placeholder="Ajoutez des notes sur cette remorque..."
                />
              </div>

              {form.selling_price > 0 && form.purchase_price > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-emerald-900 font-medium mb-1">
                    Profit potentiel par unité
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {(form.selling_price - form.purchase_price).toLocaleString('fr-CA')} $
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Marge: {(((form.selling_price - form.purchase_price) / form.selling_price) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.vin || !form.make || !form.model}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkImport && (
        <BulkInventoryImport
          onClose={() => setShowBulkImport(false)}
          onImportComplete={() => {
            loadInventory();
            loadBrands();
            setShowBulkImport(false);
          }}
        />
      )}
    </div>
  );
}
