import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Users, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'customer' | 'warranty' | 'claim';
  title: string;
  subtitle: string;
  metadata?: string;
  status?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = `%${searchQuery}%`;

      const [customersRes, warrantiesRes, claimsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from('warranties')
          .select('id, contract_number, status, customers(first_name, last_name), trailers(make, model, year)')
          .or(`contract_number.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from('claims')
          .select('id, claim_number, status, customers(first_name, last_name), incident_description')
          .or(`claim_number.ilike.${searchTerm}`)
          .limit(5),
      ]);

      const searchResults: SearchResult[] = [];

      if (customersRes.data) {
        customersRes.data.forEach(customer => {
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: `${customer.first_name} ${customer.last_name}`,
            subtitle: customer.email,
            metadata: customer.phone || undefined,
          });
        });
      }

      if (warrantiesRes.data) {
        warrantiesRes.data.forEach(warranty => {
          const customer = warranty.customers as any;
          const trailer = warranty.trailers as any;
          searchResults.push({
            id: warranty.id,
            type: 'warranty',
            title: warranty.contract_number,
            subtitle: customer ? `${customer.first_name} ${customer.last_name}` : 'Client inconnu',
            metadata: trailer ? `${trailer.year} ${trailer.make} ${trailer.model}` : undefined,
            status: warranty.status,
          });
        });
      }

      if (claimsRes.data) {
        claimsRes.data.forEach(claim => {
          const customer = claim.customers as any;
          searchResults.push({
            id: claim.id,
            type: 'claim',
            title: claim.claim_number,
            subtitle: customer ? `${customer.first_name} ${customer.last_name}` : 'Client inconnu',
            metadata: claim.incident_description?.substring(0, 50) + '...',
            status: claim.status,
          });
        });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchAll(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, searchAll]);

  const handleSelect = (result: SearchResult) => {
    onClose();

    switch (result.type) {
      case 'customer':
        navigate('/customers');
        setTimeout(() => {
          const event = new CustomEvent('selectCustomer', { detail: result.id });
          window.dispatchEvent(event);
        }, 100);
        break;
      case 'warranty':
        navigate('/warranties');
        setTimeout(() => {
          const event = new CustomEvent('selectWarranty', { detail: result.id });
          window.dispatchEvent(event);
        }, 100);
        break;
      case 'claim':
        navigate('/claims');
        setTimeout(() => {
          const event = new CustomEvent('selectClaim', { detail: result.id });
          window.dispatchEvent(event);
        }, 100);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <Users className="w-5 h-5 text-primary-500" />;
      case 'warranty':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'claim':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Search className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusColors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800',
      expired: 'bg-slate-100 text-slate-800',
      cancelled: 'bg-red-100 text-red-800',
      submitted: 'bg-primary-100 text-primary-800',
      under_review: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      denied: 'bg-red-100 text-red-800',
      completed: 'bg-slate-100 text-slate-800',
    };

    const statusLabels: Record<string, string> = {
      active: 'Active',
      expired: 'Expirée',
      cancelled: 'Annulée',
      submitted: 'Soumise',
      under_review: 'En révision',
      approved: 'Approuvée',
      denied: 'Refusée',
      completed: 'Complétée',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-slate-100 text-slate-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center px-4 pt-20">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher clients, garanties, réclamations..."
              className="flex-1 text-lg outline-none text-slate-900 placeholder-slate-400"
            />
            {loading && <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />}
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 && (
              <div className="px-6 py-12 text-center">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Tapez au moins 2 caractères pour rechercher</p>
                <p className="text-sm text-slate-400 mt-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">↑</kbd>
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-xs ml-1">↓</kbd>
                  {' '}pour naviguer
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-xs ml-2">Enter</kbd>
                  {' '}pour sélectionner
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-xs ml-2">Esc</kbd>
                  {' '}pour fermer
                </p>
              </div>
            )}

            {query.length >= 2 && results.length === 0 && !loading && (
              <div className="px-6 py-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun résultat trouvé</p>
                <p className="text-sm text-slate-400 mt-1">Essayez avec d'autres mots-clés</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full px-6 py-3 flex items-center gap-4 transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {result.title}
                        </p>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {result.subtitle}
                      </p>
                      {result.metadata && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {result.metadata}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-slate-400 uppercase font-medium">
                      {result.type === 'customer' && 'Client'}
                      {result.type === 'warranty' && 'Garantie'}
                      {result.type === 'claim' && 'Réclamation'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Clients
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Garanties
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Réclamations
                </span>
              </div>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">⌘K</kbd>
                {' '}pour ouvrir
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
