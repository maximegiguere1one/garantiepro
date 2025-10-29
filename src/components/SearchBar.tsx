import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Filter } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showFilters?: boolean;
  onFilterClick?: () => void;
  activeFiltersCount?: number;
  autoFocus?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = 'Rechercher...',
  debounceMs = 300,
  showFilters = false,
  onFilterClick,
  activeFiltersCount = 0,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim() === '') {
      onSearch('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimer.current = setTimeout(() => {
      onSearch(query);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, debounceMs, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 placeholder-slate-400"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-slate-700"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {showFilters && onFilterClick && (
        <button
          onClick={onFilterClick}
          className={`
            relative px-4 py-2.5 border rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors
            ${activeFiltersCount > 0 ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-700'}
          `}
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filtres</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
