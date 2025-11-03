import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Activity,
  Award,
  BarChart3,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface EngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  onboardingCompletion: number;
  avgProgressPercent: number;
  topCompletedSteps: Array<{ step: string; count: number }>;
  recentAchievers: Array<{
    user_email: string;
    completion_percentage: number;
    completed_at: string;
  }>;
  dailyActivity: Array<{ date: string; count: number }>;
}

export function UserEngagementMetrics() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

      const { data: progressData, error: progressError } = await supabase
        .from('user_onboarding_progress')
        .select(`
          *,
          profiles:user_id (
            email
          )
        `);

      if (progressError) throw progressError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      const totalUsers = profilesData.length;
      const activeUsers = progressData.filter(
        (p) => new Date(p.last_activity_at) > dateThreshold
      ).length;

      const completedUsers = progressData.filter((p) => p.completed_at).length;
      const onboardingCompletion =
        progressData.length > 0 ? (completedUsers / progressData.length) * 100 : 0;

      const avgProgressPercent =
        progressData.length > 0
          ? progressData.reduce((sum, p) => sum + p.completion_percentage, 0) /
            progressData.length
          : 0;

      const stepCounts: Record<string, number> = {};
      const steps = [
        'has_completed_profile',
        'has_created_first_warranty',
        'has_viewed_dashboard',
        'has_explored_settings',
        'has_created_customer',
        'has_used_search',
        'has_viewed_analytics',
        'has_completed_tour',
      ];

      steps.forEach((step) => {
        stepCounts[step] = progressData.filter((p) => p[step]).length;
      });

      const topCompletedSteps = Object.entries(stepCounts)
        .map(([step, count]) => ({
          step: step.replace('has_', '').replace(/_/g, ' '),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const recentAchievers = progressData
        .filter((p) => p.completed_at)
        .sort(
          (a, b) =>
            new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        )
        .slice(0, 10)
        .map((p: any) => ({
          user_email: p.profiles?.email || 'Email inconnu',
          completion_percentage: p.completion_percentage,
          completed_at: p.completed_at,
        }));

      const activityByDate: Record<string, number> = {};
      progressData.forEach((p) => {
        const date = new Date(p.last_activity_at).toISOString().split('T')[0];
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });

      const dailyActivity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);

      setMetrics({
        totalUsers,
        activeUsers,
        onboardingCompletion,
        avgProgressPercent,
        topCompletedSteps,
        recentAchievers,
        dailyActivity,
      });
    } catch (error) {
      showToast('Erreur de chargement des métriques', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-8 text-gray-500">
        Aucune donnée disponible
      </div>
    );
  }

  const maxActivityCount = Math.max(...metrics.dailyActivity.map((d) => d.count), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Engagement Utilisateurs</h1>
          <p className="text-gray-600 mt-1">
            Mesurez l'adoption et l'engagement de vos utilisateurs
          </p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
        >
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="90d">90 derniers jours</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Total</span>
          </div>
          <p className="text-4xl font-bold">{metrics.totalUsers}</p>
          <p className="text-sm opacity-80 mt-1">Utilisateurs inscrits</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Actifs</span>
          </div>
          <p className="text-4xl font-bold">{metrics.activeUsers}</p>
          <p className="text-sm opacity-80 mt-1">
            {Math.round((metrics.activeUsers / metrics.totalUsers) * 100)}% du total
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Complétude</span>
          </div>
          <p className="text-4xl font-bold">
            {metrics.onboardingCompletion.toFixed(0)}%
          </p>
          <p className="text-sm opacity-80 mt-1">Onboarding terminé</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Progression</span>
          </div>
          <p className="text-4xl font-bold">
            {metrics.avgProgressPercent.toFixed(0)}%
          </p>
          <p className="text-sm opacity-80 mt-1">Moyenne utilisateurs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#DC2626]" />
            Étapes les Plus Complétées
          </h3>
          <div className="space-y-4">
            {metrics.topCompletedSteps.map((step, index) => {
              const percentage = (step.count / metrics.totalUsers) * 100;
              return (
                <div key={step.step}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {index + 1}. {step.step}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {step.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#DC2626]" />
            Récents Compléteurs
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {metrics.recentAchievers.map((achiever, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {achiever.user_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(achiever.completed_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#DC2626]" />
          Activité des 14 Derniers Jours
        </h3>
        <div className="flex items-end justify-between gap-2 h-64">
          {metrics.dailyActivity.map((day) => {
            const heightPercent = (day.count / maxActivityCount) * 100;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative group flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-[#DC2626] to-[#EF4444] rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {day.count} activité{day.count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500 rotate-45 origin-left whitespace-nowrap mt-4">
                  {new Date(day.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <div className="flex items-start gap-4">
          <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Insights & Recommandations</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {metrics.avgProgressPercent < 50 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  La progression moyenne est faible ({metrics.avgProgressPercent.toFixed(0)}%).
                  Considérez simplifier l'onboarding ou ajouter plus d'incitatifs.
                </li>
              )}
              {metrics.onboardingCompletion < 30 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Seulement {metrics.onboardingCompletion.toFixed(0)}% des utilisateurs complètent
                  l'onboarding. Identifiez les points de friction.
                </li>
              )}
              {(metrics.activeUsers / metrics.totalUsers) * 100 > 70 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Excellent taux d'engagement! {Math.round((metrics.activeUsers / metrics.totalUsers) * 100)}%
                  des utilisateurs sont actifs.
                </li>
              )}
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                L'étape la plus complétée est "{metrics.topCompletedSteps[0]?.step}"
                avec {metrics.topCompletedSteps[0]?.count} utilisateurs.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
