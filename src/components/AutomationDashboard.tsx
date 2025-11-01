import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  Play,
  Pause,
  Plus,
  Settings,
  Clock,
  Mail,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  actions: Array<{
    type: string;
    [key: string]: any;
  }>;
}

interface Execution {
  id: string;
  workflow_id: string;
  status: string;
  actions_executed: Array<any>;
  actions_failed: Array<any>;
  duration_ms: number;
  created_at: string;
  automation_workflows?: {
    name: string;
  };
}

interface Stats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  success_rate: number;
  total_actions: number;
}

export function AutomationDashboard() {
  const { profile } = useAuth();
  const { currentOrganization } = useOrganization();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'workflows' | 'executions' | 'stats'>('workflows');

  const isAdmin = profile?.role && ['master', 'admin', 'franchisee_admin'].includes(profile.role);

  useEffect(() => {
    if (currentOrganization?.id && isAdmin) {
      loadData();
    }
  }, [currentOrganization?.id, isAdmin]);

  const loadData = async () => {
    setLoading(true);

    try {
      // Load workflows
      const { data: workflowData, error: workflowError } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false });

      if (workflowError) throw workflowError;
      setWorkflows(workflowData || []);

      // Load recent executions
      const { data: executionData, error: executionError } = await supabase
        .from('automation_executions')
        .select('*, automation_workflows(name)')
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (executionError) throw executionError;
      setExecutions(executionData || []);

      // Calculate stats
      const totalWorkflows = workflowData?.length || 0;
      const activeWorkflows = workflowData?.filter(w => w.is_active).length || 0;
      const totalExecutions = executionData?.length || 0;
      const successfulExecutions = executionData?.filter(e => e.status === 'completed').length || 0;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      const totalActions = workflowData?.reduce((sum, w) => sum + w.execution_count, 0) || 0;

      setStats({
        total_workflows: totalWorkflows,
        active_workflows: activeWorkflows,
        total_executions: totalExecutions,
        success_rate: successRate,
        total_actions: totalActions,
      });
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_workflows')
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq('id', workflowId);

      if (error) throw error;

      setWorkflows(workflows.map(w =>
        w.id === workflowId ? { ...w, is_active: !currentState } : w
      ));
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const triggerWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/automation-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          trigger_type: 'manual',
          trigger_data: {
            organization_id: currentOrganization!.id,
            triggered_by: profile!.id,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger workflow');
      }

      await loadData();
    } catch (error) {
      console.error('Error triggering workflow:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Vous devez être administrateur pour accéder aux automatisations.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-8 w-8 text-red-600" />
            Automatisation & Workflows
          </h1>
          <p className="text-slate-600 mt-1">
            Gérez vos workflows automatisés et notifications intelligentes
          </p>
        </div>
        <button
          onClick={() => console.log('Create workflow')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nouveau Workflow
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Workflows</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_workflows}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Actifs</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.active_workflows}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Exécutions</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_executions}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Taux de Succès</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.success_rate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Actions Totales</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.total_actions.toLocaleString()}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedTab('workflows')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'workflows'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Workflows
            </button>
            <button
              onClick={() => setSelectedTab('executions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'executions'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Historique
            </button>
            <button
              onClick={() => setSelectedTab('stats')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'stats'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Statistiques
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Workflows Tab */}
          {selectedTab === 'workflows' && (
            <div className="space-y-4">
              {workflows.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Aucun workflow configuré</p>
                </div>
              ) : (
                workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-red-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {workflow.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              workflow.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {workflow.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{workflow.description}</p>

                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Exécuté {workflow.execution_count} fois
                            </span>
                          </div>
                          {workflow.last_executed_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Dernier: {new Date(workflow.last_executed_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Bell className="h-4 w-4" />
                            <span>{workflow.actions.length} actions</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => triggerWorkflow(workflow.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Exécuter maintenant"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => toggleWorkflow(workflow.id, workflow.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            workflow.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={workflow.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {workflow.is_active ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => console.log('Edit workflow', workflow.id)}
                          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Settings className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Executions Tab */}
          {selectedTab === 'executions' && (
            <div className="space-y-4">
              {executions.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Aucune exécution récente</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                          Workflow
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                          Actions
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                          Durée
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {executions.map((execution) => (
                        <tr key={execution.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {execution.automation_workflows?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {execution.status === 'completed' && (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-600">Succès</span>
                                </>
                              )}
                              {execution.status === 'failed' && (
                                <>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-sm text-red-600">Échec</span>
                                </>
                              )}
                              {execution.status === 'running' && (
                                <>
                                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-sm text-blue-600">En cours</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {execution.actions_executed?.length || 0} succès
                            {execution.actions_failed && execution.actions_failed.length > 0 && (
                              <span className="text-red-600 ml-2">
                                , {execution.actions_failed.length} échecs
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {execution.duration_ms ? `${execution.duration_ms}ms` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(execution.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {selectedTab === 'stats' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">
                  Statistiques détaillées à venir...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
