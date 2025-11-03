import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { DashboardStatsGrid } from './dashboard/DashboardStatsGrid';
import { ROIImpactSection } from './dashboard/ROIImpactSection';

export function Dashboard() {
  const { profile } = useAuth();
  const t = useTranslation();
  const { stats, loading: statsLoading } = useDashboardStats();
  const [companyName, setCompanyName] = useState<string>('');
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      loadCompanySettings();

      const channel = supabase
        .channel('company_settings_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'company_settings',
          },
          (payload) => {
            if (payload.new && 'company_name' in payload.new) {
              setCompanyName(payload.new.company_name as string);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setSettingsLoading(false);
    }
  }, [profile?.organization_id]);

  const loadCompanySettings = async () => {
    try {
      if (!profile?.organization_id) {
        console.warn('Cannot load company settings: no organization_id in profile');
        return;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (error) throw error;

      if (data?.company_name) {
        setCompanyName(data.company_name);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };


  const loading = statsLoading || settingsLoading;

  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="space-y-3">
          <div className="h-10 w-96 bg-neutral-200 animate-pulse rounded-lg" />
          <div className="h-6 w-80 bg-neutral-100 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-neutral-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Bannière UI V2 Demo */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎨 Nouveau Design System V2 disponible!</h2>
            <p className="text-primary-50 mb-3">
              Découvrez les nouveaux composants UI professionnels: boutons, formulaires, KPI cards et plus encore!
            </p>
            <button
              onClick={() => window.location.hash = '#ui-v2-demo'}
              className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Voir la démo interactive →
            </button>
          </div>
          <div className="hidden md:block text-6xl">
            🚀
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="space-y-2 animate-slideUp">
        <h1 className="text-4xl font-bold text-neutral-900">
          {t('dashboard.welcome', { name: profile?.full_name || 'Utilisateur' })}
          {companyName && <span className="text-primary-600"> - {companyName}</span>}
        </h1>
        <p className="text-lg text-neutral-600">
          Voici un aperçu de vos opérations aujourd'hui
        </p>
      </div>

      {/* KPI Cards Grid */}
      <DashboardStatsGrid stats={stats} />

      {/* ROI Impact Section */}
      <ROIImpactSection totalWarranties={stats.totalWarranties} />
    </div>
  );
}
