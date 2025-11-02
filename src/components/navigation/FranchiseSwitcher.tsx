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
  const { activeOrganization, canSwitchOrganization, switchOrganization, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debug log
  useEffect(() => {
    console.log('FranchiseSwitcher Debug:', {
      canSwitchOrganization,
      activeOrganization,
      profileRole: profile?.role,
      organizationsCount: organizations.length,
    });
  }, [canSwitchOrganization, activeOrganization, profile, organizations]);

  // Load organizations whenever component mounts or profile changes
  useEffect(() => {
    if (profile && (profile.role === 'master' || profile.role === 'admin')) {
      console.log('FranchiseSwitcher: Profile detected as master/admin, loading orgs');
      loadOrganizations();
    }
  }, [profile]);

  const loadOrganizations = async () => {
    try {
      console.log('FranchiseSwitcher: Loading organizations...');
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, type')
        .order('type', { ascending: false })
        .order('name');

      if (error) {
        console.error('FranchiseSwitcher: Error loading organizations:', error);
        throw error;
      }

      console.log('FranchiseSwitcher: Loaded organizations:', data?.length || 0);
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrganization?.id) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      console.log('FranchiseSwitcher: Switching to organization:', orgId);
      await switchOrganization(orgId);
      setIsOpen(false);

      // Force a small delay then reload to ensure sessionStorage is written
      setTimeout(() => {
        console.log('FranchiseSwitcher: Reloading page...');
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error switching organization:', error);
      setLoading(false);
    }
  };

  // Check if user is master/admin directly from profile
  const isMasterOrAdmin = profile?.role === 'master' || profile?.role === 'admin';

  // Hide if user definitely cannot switch
  if (profile && !isMasterOrAdmin) {
    return null;
  }

  // Show loading if no active organization yet
  if (!activeOrganization) {
    console.log('FranchiseSwitcher: No active organization yet');
    return isMasterOrAdmin ? (
      <div className="px-3 py-2 text-xs text-slate-500">
        Chargement de la franchise...
      </div>
    ) : null;
  }

  // Hide if no organizations loaded yet and still loading profile
  if (!profile || organizations.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-slate-500">
        Chargement des franchises...
      </div>
    );
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
