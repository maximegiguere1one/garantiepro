import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

interface OrganizationFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  provinceFilter: string;
  onProvinceFilterChange: (province: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags: Array<{ id: string; name: string; color: string }>;
}

export function OrganizationFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  provinceFilter,
  onProvinceFilterChange,
  sortBy,
  onSortByChange,
  selectedTags,
  onTagsChange,
  availableTags,
}: OrganizationFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const provinces = [
    { value: '', label: 'Toutes les provinces' },
    { value: 'QC', label: 'Québec' },
    { value: 'ON', label: 'Ontario' },
    { value: 'BC', label: 'Colombie-Britannique' },
    { value: 'AB', label: 'Alberta' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'NS', label: 'Nouvelle-Écosse' },
    { value: 'NB', label: 'Nouveau-Brunswick' },
  ];

  const activeFiltersCount =
    (statusFilter ? 1 : 0) +
    (provinceFilter ? 1 : 0) +
    selectedTags.length;

  const clearAllFilters = () => {
    onStatusFilterChange('');
    onProvinceFilterChange('');
    onTagsChange([]);
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(t => t !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par nom, email, ville..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
            showFilters || activeFiltersCount > 0
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtres
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white text-slate-900 text-xs font-bold rounded">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
        >
          <option value="created_at_desc">Plus récent</option>
          <option value="created_at_asc">Plus ancien</option>
          <option value="name_asc">Nom (A-Z)</option>
          <option value="name_desc">Nom (Z-A)</option>
          <option value="revenue_desc">Revenus (élevé)</option>
          <option value="revenue_asc">Revenus (faible)</option>
          <option value="warranties_desc">Garanties (élevé)</option>
          <option value="warranties_asc">Garanties (faible)</option>
        </select>
      </div>

      {showFilters && (
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Effacer tout
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
                <option value="pending">En attente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Province
              </label>
              <select
                value={provinceFilter}
                onChange={(e) => onProvinceFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                {provinces.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'text-white shadow-md scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
