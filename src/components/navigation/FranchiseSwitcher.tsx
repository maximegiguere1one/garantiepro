import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Organization {
  id: string;
  name: string;
  type: string;
}

export function FranchiseSwitcher() {
  const { activeOrganization, canSwitchOrganization, switchOrganization } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canSwitchOrganization) {
      loadOrganizations();
    }
  }, [canSwitchOrganization]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, type')
        .order('type', { ascending: false })
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const handleSwitch = async (orgId: string) => {
    setLoading(true);
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
      // Refresh the page to reload data with new organization context
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canSwitchOrganization || !activeOrganization) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-sm font-medium w-full"
      >
        <Building2 className="w-4 h-4 text-red-600" />
        <div className="flex-1 text-left truncate">
          <div className="text-xs text-slate-500">Franchise active:</div>
          <div className="font-semibold truncate">{activeOrganization.name}</div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-20 max-h-[400px] overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                Changer de franchise
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={loading}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    org.id === activeOrganization.id
                      ? 'bg-red-50 text-red-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Building2 className={`w-4 h-4 ${
                    org.id === activeOrganization.id ? 'text-red-600' : 'text-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{org.name}</div>
                    <div className="text-xs text-slate-500">
                      {org.type === 'owner' ? 'Propriétaire' : 'Franchisé'}
                    </div>
                  </div>
                  {org.id === activeOrganization.id && (
                    <Check className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
