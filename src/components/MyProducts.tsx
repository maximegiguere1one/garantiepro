import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, Plus, CreditCard as Edit2, Trash2, X, Save, Loader2 } from 'lucide-react';

interface CustomerProduct {
  id: string;
  customer_id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  category: 'fermee' | 'ouverte' | 'utilitaire';
  purchase_date: string;
  purchase_price: number;
  manufacturer_warranty_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductForm {
  vin: string;
  make: string;
  model: string;
  year: number;
  category: 'fermee' | 'ouverte' | 'utilitaire';
  purchase_date: string;
  purchase_price: number;
  manufacturer_warranty_end_date: string;
  notes: string;
}

const EMPTY_FORM: ProductForm = {
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  category: 'fermee',
  purchase_date: new Date().toISOString().split('T')[0],
  purchase_price: 0,
  manufacturer_warranty_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: '',
};

export function MyProducts() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [profile]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (!customerData) {
        console.error('No customer found for user');
        return;
      }

      setCustomerId(customerData.id);

      const { data, error } = await supabase
        .from('customer_products')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (product: CustomerProduct) => {
    setEditingId(product.id);
    setForm({
      vin: product.vin,
      make: product.make,
      model: product.model,
      year: product.year,
      category: product.category,
      purchase_date: product.purchase_date,
      purchase_price: product.purchase_price,
      manufacturer_warranty_end_date: product.manufacturer_warranty_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: product.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!customerId) {
      alert('Erreur: Impossible de trouver votre profil client');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from('customer_products')
          .update({
            ...form,
            manufacturer_warranty_end_date: form.manufacturer_warranty_end_date || null,
            notes: form.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_products')
          .insert({
            customer_id: customerId,
            ...form,
            manufacturer_warranty_end_date: form.manufacturer_warranty_end_date || null,
            notes: form.notes || null,
          });

        if (error) throw error;
      }

      await loadProducts();
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;

    try {
      const { error } = await supabase
        .from('customer_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(`Erreur: ${error.message}`);
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
          <h1 className="text-3xl font-bold text-slate-900">Mes Produits</h1>
          <p className="text-slate-600 mt-2">Gérez vos remorques et produits</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ajouter un produit
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun produit</h3>
          <p className="text-slate-600 mb-6">
            Commencez par ajouter vos remorques pour faciliter la création de garanties
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter mon premier produit
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {product.year} {product.make} {product.model}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">NIV: {product.vin}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-500">Type</p>
                      <p className="text-sm font-medium text-slate-900">
                        {product.category === 'fermee' ? 'Remorque Fermée' : product.category === 'ouverte' ? 'Remorque Ouverte' : 'Remorque Utilitaire'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Catégorie</p>
                      <p className="text-sm font-medium text-slate-900 capitalize">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date d'achat</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(product.purchase_date).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Prix d'achat</p>
                      <p className="text-sm font-medium text-slate-900">
                        {product.purchase_price.toLocaleString('fr-CA')} $
                      </p>
                    </div>
                  </div>
                  {product.notes && (
                    <p className="text-sm text-slate-600 mt-3 italic">{product.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingId ? 'Modifier le produit' : 'Ajouter un produit'}
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Marque</label>
                  <input
                    type="text"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
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
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as 'fermee' | 'ouverte' | 'utilitaire' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="fermee">Remorque Fermée</option>
                  <option value="ouverte">Remorque Ouverte</option>
                  <option value="utilitaire">Remorque Utilitaire</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date d'achat</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prix d'achat ($)</label>
                  <input
                    type="number"
                    value={form.purchase_price}
                    onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fin garantie fabricant (optionnel)
                </label>
                <input
                  type="date"
                  value={form.manufacturer_warranty_end_date}
                  onChange={(e) => setForm({ ...form, manufacturer_warranty_end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
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
                  placeholder="Ajoutez des notes sur ce produit..."
                />
              </div>
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
    </div>
  );
}
