import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Users, DollarSign, AlertCircle, CheckCircle, CreditCard as Edit, Ban, PlayCircle, Mail, Key, MoreVertical, RefreshCw, Link as LinkIcon, TestTube, Clock, CheckCircle2, XCircle, Download, Eye, Zap } from 'lucide-react';
import type { Database } from '../lib/database.types';
import {
  OrganizationFilters,
  BulkActionsBar,
  BulkEmailModal,
  BulkTagModal,
  OrganizationDetailModal,
  ViewToggle,
  CreateOrganizationModal,
  EditOrganizationModal,
  InvitationLinkModal,
  type ViewMode
} from './organizations';
import { exportToCSV, exportToJSON, generateSummaryReport } from '../lib/organization-export';
import { getSetupUrl } from '../config/constants';

type Organization = Database['public']['Tables']['organizations']['Row'];
type BillingConfig = Database['public']['Tables']['organization_billing_config']['Row'];

interface OrganizationWithStats extends Organization {
  warrantyCount?: number;
  monthlyRevenue?: number;
  unpaidInvoices?: number;
  userCount?: number;
  billingConfig?: BillingConfig;
  lastInvitation?: {
    status: string;
    sent_at: string | null;
    attempts: number;
  };
  tags?: Array<{ id: string; name: string; color: string }>;
  unreadAlerts?: number;
}

interface EmailConfigStatus {
  configured: boolean;
  testing: boolean;
  lastTest: any;
}

export function OrganizationsManagementV2() {
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);
  const [detailOrg, setDetailOrg] = useState<OrganizationWithStats | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showInvitationLink, setShowInvitationLink] = useState<string | null>(null);
  const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // Bulk Actions
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [emailConfigStatus, setEmailConfigStatus] = useState<EmailConfigStatus>({
    configured: false,
    testing: false,
    lastTest: null,
  });

  const { showToast } = useToast();
  const { isOwner, organization: currentOrganization } = useAuth();

  useEffect(() => {
    if (isOwner) {
      loadOrganizations();
      loadTags();
    }
  }, [isOwner]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.actions-menu')) {
        setShowActionsMenu(null);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionsMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreateModal(true);
      }
      if (e.key === 'Escape') {
        setSelectedOrgs([]);
        setShowCreateModal(false);
        setShowBulkEmailModal(false);
        setShowBulkTagModal(false);
        setDetailOrg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTags = async () => {
    try {
      const { data } = await supabase
        .from('organization_tags')
        .select('*')
        .order('name');
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          const [warrantyCount, billingConfig, userCount, lastInvitation, tags, unreadAlerts] = await Promise.all([
            supabase
              .from('warranties')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id),
            supabase
              .from('organization_billing_config')
              .select('*')
              .eq('organization_id', org.id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id),
            supabase
              .from('franchisee_invitations')
              .select('status, sent_at, attempts')
              .eq('organization_id', org.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('organization_tag_assignments')
              .select('tag_id, organization_tags(id, name, color)')
              .eq('organization_id', org.id),
            supabase
              .from('organization_alerts')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id)
              .eq('is_read', false)
          ]);

          return {
            ...org,
            warrantyCount: warrantyCount.count || 0,
            userCount: userCount.count || 0,
            billingConfig: billingConfig.data || undefined,
            lastInvitation: lastInvitation.data || undefined,
            tags: tags.data?.map((t: any) => t.organization_tags).filter(Boolean) || [],
            unreadAlerts: unreadAlerts.count || 0,
          };
        })
      );

      setOrganizations(orgsWithStats);
    } catch (error) {
      console.error('Error loading organizations:', error);
      showToast('Erreur lors du chargement des organisations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const testEmailConfig = async () => {
    setEmailConfigStatus(prev => ({ ...prev, testing: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-email-config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      setEmailConfigStatus({
        configured: result.success && result.resendApiTest?.success,
        testing: false,
        lastTest: result,
      });

      if (result.success && result.resendApiTest?.success) {
        showToast('Configuration email validée avec succès!', 'success');
      } else {
        const criticalRecs = result.recommendations?.filter((r: any) => r.level === 'critical') || [];
        if (criticalRecs.length > 0) {
          showToast(`${criticalRecs[0].message}`, 'error');
        } else {
          showToast('Configuration email incomplète', 'error');
        }
      }
    } catch (error: any) {
      console.error('Error testing email config:', error);
      setEmailConfigStatus(prev => ({ ...prev, testing: false }));
      showToast('Erreur lors du test de configuration', 'error');
    }
  };

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', orgId);

      if (error) throw error;

      showToast(
        newStatus === 'active' ? 'Organisation activée' : 'Organisation suspendue',
        'success'
      );
      loadOrganizations();
    } catch (error) {
      console.error('Error toggling organization status:', error);
      showToast('Erreur lors de la modification du statut', 'error');
    }
  };

  const handleResendInvitation = async (org: OrganizationWithStats) => {
    setSendingInvitation(org.id);
    setShowActionsMenu(null);

    try {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminProfile) {
        showToast('Aucun administrateur trouvé pour cette organisation', 'error');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboard-franchisee`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          franchiseeId: org.id,
          email: adminProfile.email,
          name: adminProfile.full_name,
          organizationName: org.name,
          phone: org.billing_phone,
          resendInvitation: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.userMessage || result.error || 'Erreur inconnue';
        showToast(errorMessage, 'error');

        if (result.errorCode === 'EMAIL_NOT_SENT' || result.warning === 'EMAIL_NOT_SENT') {
          if (result.setupLink) {
            setShowInvitationLink(result.setupLink);
          }
        }
        return;
      }

      if (result.success) {
        if (result.emailSent) {
          showToast('Invitation renvoyée avec succès!', 'success');
        } else {
          showToast(
            result.userMessage || 'Compte mis à jour mais email non envoyé.',
            'warning'
          );
          if (result.setupLink) {
            setShowInvitationLink(result.setupLink);
          }
        }
        loadOrganizations();
      }
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      showToast(
        error.message || 'Erreur lors de l\'envoi de l\'invitation',
        'error'
      );
    } finally {
      setSendingInvitation(null);
    }
  };

  const handleCopyInvitationLink = async (org: OrganizationWithStats) => {
    try {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminProfile) {
        showToast('Aucun administrateur trouvé', 'error');
        return;
      }

      const invitationLink = getSetupUrl(adminProfile.id);
      await navigator.clipboard.writeText(invitationLink);
      showToast('Lien d\'invitation copié!', 'success');
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error copying link:', error);
      showToast('Erreur lors de la copie du lien', 'error');
    }
  };

  const handleResetPassword = async (org: OrganizationWithStats) => {
    try {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminProfile?.email) {
        showToast('Aucun administrateur trouvé', 'error');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expirée', 'error');
        return;
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: adminProfile.email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send password reset email');
      }

      showToast(`Email de réinitialisation envoyé à ${adminProfile.email}!`, 'success');
      setShowActionsMenu(null);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showToast(
        error instanceof Error ? error.message : 'Erreur lors de la réinitialisation',
        'error'
      );
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: 'active' })
        .in('id', selectedOrgs);

      if (error) throw error;

      showToast(`${selectedOrgs.length} organisation(s) activée(s)`, 'success');
      setSelectedOrgs([]);
      loadOrganizations();
    } catch (error) {
      console.error('Error activating organizations:', error);
      showToast('Erreur lors de l\'activation', 'error');
    }
  };

  const handleBulkSuspend = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: 'suspended' })
        .in('id', selectedOrgs);

      if (error) throw error;

      showToast(`${selectedOrgs.length} organisation(s) suspendue(s)`, 'success');
      setSelectedOrgs([]);
      loadOrganizations();
    } catch (error) {
      console.error('Error suspending organizations:', error);
      showToast('Erreur lors de la suspension', 'error');
    }
  };

  const handleBulkExport = () => {
    const selectedOrgData = organizations.filter(o => selectedOrgs.includes(o.id));
    exportToCSV(selectedOrgData);
    showToast('Export terminé', 'success');
  };

  const handleExportAll = () => {
    const franchisees = organizations.filter(o => o.type === 'franchisee');
    exportToCSV(franchisees, `organisations_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Export terminé', 'success');
  };

  const toggleOrgSelection = (orgId: string) => {
    if (selectedOrgs.includes(orgId)) {
      setSelectedOrgs(selectedOrgs.filter(id => id !== orgId));
    } else {
      setSelectedOrgs([...selectedOrgs, orgId]);
    }
  };

  const toggleSelectAll = () => {
    const franchiseeIds = filteredOrganizations.map(o => o.id);
    if (selectedOrgs.length === franchiseeIds.length) {
      setSelectedOrgs([]);
    } else {
      setSelectedOrgs(franchiseeIds);
    }
  };

  // Filtered & sorted organizations
  const filteredOrganizations = useMemo(() => {
    let filtered = organizations.filter(o => o.type === 'franchisee');

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.billing_email?.toLowerCase().includes(query) ||
        o.city?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Province filter
    if (provinceFilter) {
      filtered = filtered.filter(o => o.province === provinceFilter);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(o =>
        o.tags?.some(tag => selectedTags.includes(tag.id))
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'revenue_desc':
          return (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0);
        case 'revenue_asc':
          return (a.monthlyRevenue || 0) - (b.monthlyRevenue || 0);
        case 'warranties_desc':
          return (b.warrantyCount || 0) - (a.warrantyCount || 0);
        case 'warranties_asc':
          return (a.warrantyCount || 0) - (b.warrantyCount || 0);
        case 'created_at_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_at_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [organizations, searchQuery, statusFilter, provinceFilter, selectedTags, sortBy]);

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600">
          Cette page est réservée aux administrateurs propriétaires.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const ownerOrg = organizations.find(o => o.type === 'owner');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Organisations</h1>
          <p className="text-slate-600 mt-2">
            {filteredOrganizations.length} franchisé{filteredOrganizations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {emailConfigStatus.configured && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Email OK
              </div>
            )}
            {emailConfigStatus.lastTest && !emailConfigStatus.configured && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <XCircle className="w-3 h-3" />
                Config requise
              </div>
            )}
          </div>
          <button
            onClick={testEmailConfig}
            disabled={emailConfigStatus.testing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Tester la configuration email"
          >
            {emailConfigStatus.testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            Test Email
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            title="Exporter toutes les données"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau Franchisé
          </button>
        </div>
      </div>

      {/* Owner Organization Card */}
      {ownerOrg && (
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-emerald-500/5" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{ownerOrg.name}</h2>
                  <p className="text-slate-300">Organisation Principale</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                Propriétaire
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-slate-300 text-sm">Garanties Vendues</div>
                <div className="text-3xl font-bold mt-1">{ownerOrg.warrantyCount || 0}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-slate-300 text-sm">Utilisateurs</div>
                <div className="text-3xl font-bold mt-1">{ownerOrg.userCount || 0}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-slate-300 text-sm">Franchisés Actifs</div>
                <div className="text-3xl font-bold mt-1">
                  {filteredOrganizations.filter(f => f.status === 'active').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <OrganizationFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            provinceFilter={provinceFilter}
            onProvinceFilterChange={setProvinceFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            availableTags={availableTags}
          />
        </div>
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Franchisees List/Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Franchisés ({filteredOrganizations.length})
          </h2>
          {filteredOrganizations.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedOrgs.length === filteredOrganizations.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300"
              />
              Tout sélectionner
            </label>
          )}
        </div>

        {filteredOrganizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucun franchisé trouvé
            </h3>
            <p className="text-slate-600 mb-6">
              Ajustez vos filtres ou ajoutez votre premier franchisé.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Ajouter un Franchisé
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {filteredOrganizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                isSelected={selectedOrgs.includes(org.id)}
                onToggleSelect={toggleOrgSelection}
                onViewDetails={() => setDetailOrg(org)}
                onEdit={() => setSelectedOrg(org)}
                onToggleStatus={handleToggleStatus}
                onResendInvitation={handleResendInvitation}
                onCopyLink={handleCopyInvitationLink}
                onResetPassword={handleResetPassword}
                showActionsMenu={showActionsMenu}
                setShowActionsMenu={setShowActionsMenu}
                sendingInvitation={sendingInvitation}
              />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-slate-200">
            {filteredOrganizations.map((org) => (
              <OrganizationListItem
                key={org.id}
                organization={org}
                isSelected={selectedOrgs.includes(org.id)}
                onToggleSelect={toggleOrgSelection}
                onViewDetails={() => setDetailOrg(org)}
                onEdit={() => setSelectedOrg(org)}
                onToggleStatus={handleToggleStatus}
                onResendInvitation={handleResendInvitation}
                onCopyLink={handleCopyInvitationLink}
                onResetPassword={handleResetPassword}
                showActionsMenu={showActionsMenu}
                setShowActionsMenu={setShowActionsMenu}
                sendingInvitation={sendingInvitation}
              />
            ))}
          </div>
        ) : (
          <KanbanView
            organizations={filteredOrganizations}
            onViewDetails={setDetailOrg}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedOrgs.length}
        onClearSelection={() => setSelectedOrgs([])}
        onBulkEmail={() => setShowBulkEmailModal(true)}
        onBulkExport={handleBulkExport}
        onBulkActivate={handleBulkActivate}
        onBulkSuspend={handleBulkSuspend}
        onBulkTag={() => setShowBulkTagModal(true)}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOrganizations();
          }}
        />
      )}

      {selectedOrg && (
        <EditOrganizationModal
          organization={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onSuccess={() => {
            setSelectedOrg(null);
            loadOrganizations();
          }}
        />
      )}

      {showInvitationLink && (
        <InvitationLinkModal
          invitationLink={showInvitationLink}
          onClose={() => setShowInvitationLink(null)}
        />
      )}

      {detailOrg && (
        <OrganizationDetailModal
          organization={detailOrg}
          onClose={() => setDetailOrg(null)}
          onUpdate={loadOrganizations}
        />
      )}

      {showBulkEmailModal && (
        <BulkEmailModal
          selectedOrganizations={organizations.filter(o => selectedOrgs.includes(o.id)).map(o => ({
            id: o.id,
            name: o.name,
            billing_email: o.billing_email || ''
          }))}
          onClose={() => setShowBulkEmailModal(false)}
          onSuccess={() => {
            setShowBulkEmailModal(false);
            setSelectedOrgs([]);
          }}
        />
      )}

      {showBulkTagModal && (
        <BulkTagModal
          selectedOrganizations={organizations.filter(o => selectedOrgs.includes(o.id)).map(o => ({
            id: o.id,
            name: o.name
          }))}
          onClose={() => setShowBulkTagModal(false)}
          onSuccess={() => {
            setShowBulkTagModal(false);
            setSelectedOrgs([]);
            loadOrganizations();
          }}
        />
      )}
    </div>
  );
}

// Organization Card Component
function OrganizationCard({ organization, isSelected, onToggleSelect, onViewDetails, onEdit, onToggleStatus, onResendInvitation, onCopyLink, onResetPassword, showActionsMenu, setShowActionsMenu, sendingInvitation }: any) {
  return (
    <div className={`bg-slate-50 rounded-xl p-5 border-2 transition-all hover:shadow-md ${
      isSelected ? 'border-slate-900 bg-slate-100' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(organization.id)}
          className="mt-1 w-4 h-4 rounded border-slate-300"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{organization.name}</h3>
              <div className="flex items-center gap-2">
                {organization.status === 'active' ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                    Actif
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                    Suspendu
                  </span>
                )}
                {organization.unreadAlerts > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {organization.unreadAlerts}
                  </span>
                )}
              </div>
            </div>
            <div className="relative actions-menu">
              <button
                onClick={() => setShowActionsMenu(showActionsMenu === organization.id ? null : organization.id)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showActionsMenu === organization.id && (
                <ActionsMenu
                  org={organization}
                  onResendInvitation={onResendInvitation}
                  onCopyLink={onCopyLink}
                  onResetPassword={onResetPassword}
                  onEdit={onEdit}
                  sendingInvitation={sendingInvitation}
                />
              )}
            </div>
          </div>

          {organization.tags && organization.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {organization.tags.map((tag: any) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-xs font-medium text-white rounded"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Commission:</span>
              <span className="font-semibold text-slate-900">
                {organization.billingConfig?.percentage_rate || 50}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Garanties:</span>
              <span className="font-semibold text-slate-900">
                {organization.warrantyCount || 0}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Utilisateurs:</span>
              <span className="font-semibold text-slate-900">
                {organization.userCount || 0}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 truncate">{organization.billing_email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => onViewDetails()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              Détails
            </button>
            <button
              onClick={() => onToggleStatus(organization.id, organization.status)}
              className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                organization.status === 'active'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {organization.status === 'active' ? (
                <Ban className="w-4 h-4" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Organization List Item
function OrganizationListItem({ organization, isSelected, onToggleSelect, onViewDetails, onEdit, onToggleStatus, onResendInvitation, onCopyLink, onResetPassword, showActionsMenu, setShowActionsMenu, sendingInvitation }: any) {
  return (
    <div className={`px-6 py-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-100' : ''}`}>
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(organization.id)}
          className="w-4 h-4 rounded border-slate-300"
        />
        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
          <div className="col-span-2">
            <div className="font-semibold text-slate-900">{organization.name}</div>
            <div className="text-sm text-slate-600">{organization.city}, {organization.province}</div>
          </div>
          <div className="text-sm">
            {organization.status === 'active' ? (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                Actif
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                Suspendu
              </span>
            )}
          </div>
          <div className="text-sm text-slate-900 font-semibold">{organization.warrantyCount || 0} garanties</div>
          <div className="text-sm text-slate-900 font-semibold">{organization.billingConfig?.percentage_rate || 50}%</div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onViewDetails}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              title="Voir les détails"
            >
              <Eye className="w-4 h-4" />
            </button>
            <div className="relative actions-menu">
              <button
                onClick={() => setShowActionsMenu(showActionsMenu === organization.id ? null : organization.id)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showActionsMenu === organization.id && (
                <ActionsMenu
                  org={organization}
                  onResendInvitation={onResendInvitation}
                  onCopyLink={onCopyLink}
                  onResetPassword={onResetPassword}
                  onEdit={onEdit}
                  sendingInvitation={sendingInvitation}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Kanban View
function KanbanView({ organizations, onViewDetails, onToggleStatus }: any) {
  const columns = [
    { status: 'active', label: 'Actif', color: 'bg-emerald-50 border-emerald-200' },
    { status: 'pending', label: 'En attente', color: 'bg-yellow-50 border-yellow-200' },
    { status: 'suspended', label: 'Suspendu', color: 'bg-red-50 border-red-200' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {columns.map(column => {
        const orgs = organizations.filter((o: any) => o.status === column.status);
        return (
          <div key={column.status} className={`rounded-xl border-2 ${column.color} p-4`}>
            <h3 className="font-semibold text-slate-900 mb-4">
              {column.label} ({orgs.length})
            </h3>
            <div className="space-y-3">
              {orgs.map((org: any) => (
                <div
                  key={org.id}
                  className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onViewDetails(org)}
                >
                  <div className="font-medium text-slate-900 mb-2">{org.name}</div>
                  <div className="text-sm text-slate-600 mb-3">
                    {org.city}, {org.province}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{org.warrantyCount || 0} garanties</span>
                    <span className="font-semibold text-slate-900">{org.billingConfig?.percentage_rate || 50}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Actions Menu Component
function ActionsMenu({ org, onResendInvitation, onCopyLink, onResetPassword, onEdit, sendingInvitation }: any) {
  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
      <button
        onClick={() => onResendInvitation(org)}
        disabled={sendingInvitation === org.id}
        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
      >
        <Mail className="w-4 h-4" />
        Renvoyer l'invitation
      </button>
      <button
        onClick={() => onCopyLink(org)}
        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
      >
        <LinkIcon className="w-4 h-4" />
        Copier le lien d'invitation
      </button>
      <button
        onClick={() => onResetPassword(org)}
        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
      >
        <Key className="w-4 h-4" />
        Réinitialiser le mot de passe
      </button>
      <button
        onClick={() => onEdit(org)}
        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
      >
        <Edit className="w-4 h-4" />
        Modifier les détails
      </button>
    </div>
  );
}

// Keep the existing modals (InvitationLinkModal, CreateOrganizationModal, EditOrganizationModal)
// ... (copy from the backup file)
