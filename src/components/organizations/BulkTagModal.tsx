import { useState, useEffect } from 'react';
import { X, Tag, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface BulkTagModalProps {
  selectedOrganizations: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkTagModal({ selectedOrganizations, onClose, onSuccess }: BulkTagModalProps) {
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const { data } = await supabase
        .from('organization_tags')
        .select('*')
        .order('name');
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('organization_tags')
        .insert({ name: newTagName, color: newTagColor })
        .select()
        .single();

      if (error) throw error;

      setTags([...tags, data]);
      setNewTagName('');
      showToast('Tag créé avec succès', 'success');
    } catch (error: any) {
      console.error('Error creating tag:', error);
      showToast(error.message || 'Erreur lors de la création du tag', 'error');
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(t => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleApply = async () => {
    if (selectedTags.length === 0) {
      showToast('Veuillez sélectionner au moins un tag', 'error');
      return;
    }

    setLoading(true);
    try {
      const assignments = [];
      for (const orgId of selectedOrganizations.map(o => o.id)) {
        for (const tagId of selectedTags) {
          assignments.push({ organization_id: orgId, tag_id: tagId });
        }
      }

      const { error } = await supabase
        .from('organization_tag_assignments')
        .upsert(assignments, { onConflict: 'organization_id,tag_id' });

      if (error) throw error;

      showToast(`Tags appliqués à ${selectedOrganizations.length} organisation(s)`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error applying tags:', error);
      showToast('Erreur lors de l\'application des tags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const predefinedColors = [
    '#ef4444', // red
    '#f59e0b', // orange
    '#10b981', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Tag className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Gestion des tags</h2>
              <p className="text-sm text-slate-600 mt-1">
                {selectedOrganizations.length} organisation(s) sélectionnée(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <h3 className="font-medium text-slate-900">Créer un nouveau tag</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nom du tag"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />
              <div className="flex gap-2">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      newTagColor === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                onClick={createTag}
                disabled={!newTagName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Créer
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-slate-900 mb-3">Sélectionner les tags à appliquer</h3>
            {tags.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                Aucun tag disponible. Créez-en un ci-dessus.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'border-slate-900 bg-slate-50 scale-105'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-medium text-slate-900">{tag.name}</span>
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: tag.color }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
            <h3 className="font-medium text-slate-900 mb-2">
              Les tags seront appliqués à:
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedOrganizations.map(org => (
                <span key={org.id} className="px-3 py-1 bg-white border border-primary-200 rounded-lg text-sm">
                  {org.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleApply}
            disabled={loading || selectedTags.length === 0}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Application...' : `Appliquer (${selectedTags.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
