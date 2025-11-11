import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Key, Trash2, Edit3, RefreshCw, Mail, Send, CheckCircle, XCircle, Clock, AlertCircle, Copy, Filter, X, Building2, Eye, EyeOff, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { AccessibleModal } from '../common/AccessibleModal';
import { LoadingButton } from '../common/LoadingButton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getResetPasswordUrl } from '../../config/constants';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  organization_id: string;
  organization?: {
    name: string;
    type: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  display_status: string;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string;
  attempts: number;
  last_error: string | null;
  organization_id: string;
  organization?: {
    name: string;
    type: string;
  };
  invited_by_name: string | null;
  can_resend: boolean;
  hours_until_expiry: number;
}

interface Stats {
  totalUsers: number;
  totalInvitations: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  failedInvitations: number;
}

export function UsersAndInvitationsManagement() {
  const { organization, profile } = useAuth();
  const { showToast } = useToast();

  // Tabs
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationFilter, setInvitationFilter] = useState<string>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalInvitations: 0,
    pendingInvitations: 0,
    acceptedInvitations: 0,
    failedInvitations: 0,
  });

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('franchisee_employee');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [inviteMode, setInviteMode] = useState<'email' | 'manual'>('manual');
  const [manualPassword, setManualPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);

  // Confirmation dialogs
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<User | null>(null);
  const [deleteInvitationConfirm, setDeleteInvitationConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      if (activeTab === 'users') {
        loadUsers();
      } else {
        loadInvitations();
      }
      loadOrganizations();
    }
  }, [organization?.id, activeTab, invitationFilter]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, type')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadUsers = async () => {
    if (!organization?.id) return;
    setUsersLoading(true);
    try {
      const isMasterOrg = organization.type === 'owner' || profile?.role === 'master';

      let query = supabase
        .from('profiles')
        .select(`
          *,
          organization:organizations!profiles_organization_id_fkey(
            name,
            type
          )
        `);

      if (!isMasterOrg) {
        query = query.eq('organization_id', organization.id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
      setStats(prev => ({ ...prev, totalUsers: data?.length || 0 }));
    } catch (error: any) {
      console.error('Error loading users:', error);
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!organization?.id) return;
    setInvitationsLoading(true);
    try {
      const isMasterOrg = organization.type === 'owner' || profile?.role === 'master';

      let query = supabase
        .from('franchisee_invitations')
        .select(`
          *,
          organization:organizations!franchisee_invitations_organization_id_fkey(
            name,
            type
          )
        `);

      if (!isMasterOrg) {
        query = query.eq('organization_id', organization.id);
      }

      if (invitationFilter !== 'all') {
        query = query.eq('status', invitationFilter);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setInvitations(data || []);
      calculateInvitationStats(data || []);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      showToast('Erreur lors du chargement des invitations', 'error');
    } finally {
      setInvitationsLoading(false);
    }
  };

  const calculateInvitationStats = (data: any[]) => {
    setStats(prev => ({
      ...prev,
      totalInvitations: data.length,
      pendingInvitations: data.filter(i => i.status === 'pending' || i.status === 'sent').length,
      acceptedInvitations: data.filter(i => i.status === 'accepted').length,
      failedInvitations: data.filter(i => i.status === 'failed').length,
    }));
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      showToast('Veuillez entrer une adresse email', 'error');
      return;
    }

    if (inviteMode === 'manual') {
      if (!manualPassword || manualPassword.length < 8) {
        showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
        return;
      }
      if (manualPassword !== confirmPassword) {
        showToast('Les mots de passe ne correspondent pas', 'error');
        return;
      }
    }

    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          full_name: inviteEmail.split('@')[0],
          organization_id: selectedOrganizationId || organization?.id,
          manualPassword: inviteMode === 'manual' ? manualPassword : undefined,
          skipEmail: inviteMode === 'manual',
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        const text = await response.text();
        console.error('Response text:', text);
        throw new Error(`Erreur serveur (${response.status}): ${text.substring(0, 200)}`);
      }

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Erreur lors de l\'invitation';
        console.error('Invitation failed:', {
          status: response.status,
          error: errorMessage,
          fullResult: result
        });
        throw new Error(errorMessage);
      }

      showToast(
        inviteMode === 'manual'
          ? 'Utilisateur créé avec succès'
          : 'Invitation envoyée avec succès',
        'success'
      );

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('franchisee_employee');
      setManualPassword('');
      setConfirmPassword('');

      if (activeTab === 'users') {
        loadUsers();
      } else {
        loadInvitations();
      }
    } catch (error: any) {
      console.error('Error inviting user:', error);
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Extraire le code d'erreur si présent
      let displayMessage = error.message || 'Erreur lors de l\'invitation';

      // Rendre les codes d'erreur plus lisibles
      if (displayMessage.includes('INSUFFICIENT_PERMISSIONS')) {
        displayMessage = 'Vous n\'avez pas les permissions nécessaires pour inviter des utilisateurs';
      } else if (displayMessage.includes('ORG_NOT_FOUND')) {
        displayMessage = 'Organisation introuvable. Veuillez recharger la page et réessayer';
      } else if (displayMessage.includes('ORG_MISMATCH')) {
        displayMessage = 'Vous ne pouvez inviter que dans votre propre organisation';
      } else if (displayMessage.includes('INVITATION_CREATE_FAILED')) {
        displayMessage = 'Erreur lors de la création de l\'invitation: ' + displayMessage.split(': ')[1];
      } else if (displayMessage.includes('USER_CREATE_FAILED')) {
        displayMessage = 'Erreur lors de la création de l\'utilisateur: ' + displayMessage.split(': ')[1];
      }

      showToast(displayMessage, 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!newPassword || newPassword.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }

    setResetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      const requestBody = {
        userId: selectedUser.id,
        newPassword: newPassword,
        adminReset: true
      };

      console.log('Sending password reset request:', {
        userId: selectedUser.id,
        userIdType: typeof selectedUser.id,
        email: selectedUser.email,
        hasPassword: !!newPassword,
        passwordLength: newPassword.length,
        adminReset: true
      });

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Erreur lors de la réinitialisation';
        console.error('Password reset failed:', {
          status: response.status,
          error: errorMessage,
          user: selectedUser.email,
          result
        });
        throw new Error(errorMessage);
      }

      showToast('Mot de passe réinitialisé avec succès', 'success');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);

      let errorMsg = error.message || 'Erreur lors de la réinitialisation du mot de passe';

      if (errorMsg.includes('Only administrators')) {
        errorMsg = 'Permissions insuffisantes. Seuls les administrateurs peuvent réinitialiser les mots de passe. Veuillez recharger la page et réessayer.';
      }

      showToast(errorMsg, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendResetLink = async (email: string) => {
    setActionLoading(email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      showToast('Email de réinitialisation envoyé avec succès', 'success');
    } catch (error: any) {
      console.error('Error sending reset link:', error);
      showToast(error.message || 'Erreur lors de l\'envoi de l\'email', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setUpdateLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim() || null,
          role: editRole,
          phone: editPhone.trim() || null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      showToast('Utilisateur mis à jour avec succès', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserConfirm) return;

    setActionLoading(deleteUserConfirm.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: deleteUserConfirm.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      showToast('Utilisateur supprimé avec succès', 'success');
      setDeleteUserConfirm(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showToast(error.message || 'Erreur lors de la suppression de l\'utilisateur', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-invitation`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du renvoi de l\'invitation');
      }

      showToast('Invitation renvoyée avec succès', 'success');
      await loadInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      showToast(error.message || 'Erreur lors du renvoi de l\'invitation', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const confirmDeleteInvitation = async () => {
    if (!deleteInvitationConfirm) return;

    try {
      const { error } = await supabase
        .from('franchisee_invitations')
        .delete()
        .eq('id', deleteInvitationConfirm);

      if (error) throw error;

      showToast('Invitation supprimée avec succès', 'success');
      setDeleteInvitationConfirm(null);
      await loadInvitations();
    } catch (error: any) {
      console.error('Error deleting invitation:', error);
      showToast('Erreur lors de la suppression de l\'invitation', 'error');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditName(user.full_name || '');
    setEditRole(user.role);
    setEditPhone(user.phone || '');
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-700',
      admin: 'bg-red-100 text-red-700',
      franchisee_admin: 'bg-blue-100 text-blue-700',
      franchisee_employee: 'bg-slate-100 text-slate-700',
      employee: 'bg-slate-100 text-slate-700',
    };

    const labels = {
      super_admin: 'Super Admin',
      admin: 'Administrateur',
      franchisee_admin: 'Admin Franchisé',
      franchisee_employee: 'Employé',
      employee: 'Employé',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${colors[role as keyof typeof colors] || colors.employee}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      expired: 'bg-slate-100 text-slate-700',
    };

    const labels = {
      pending: 'En attente',
      sent: 'Envoyé',
      accepted: 'Accepté',
      failed: 'Échoué',
      expired: 'Expiré',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${colors[status as keyof typeof colors] || colors.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const canManageUser = (userRole: string) => {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'master') return true;
    if (profile.role === 'admin' && userRole !== 'super_admin' && userRole !== 'master') return true;
    if (profile.role === 'franchisee_admin' && !['super_admin', 'admin', 'master'].includes(userRole)) return true;
    return false;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-sm shadow-red-600/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Gestion des utilisateurs et invitations</h3>
            <p className="text-sm text-slate-600">Gérez tous les utilisateurs et invitations en un seul endroit</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowInviteModal(true)}
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Inviter
          </Button>
          <Button
            onClick={activeTab === 'users' ? loadUsers : loadInvitations}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
              <p className="text-xs text-slate-600">Utilisateurs actifs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalInvitations}</p>
              <p className="text-xs text-slate-600">Total invitations</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingInvitations}</p>
              <p className="text-xs text-slate-600">En attente</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.acceptedInvitations}</p>
              <p className="text-xs text-slate-600">Acceptées</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.failedInvitations}</p>
              <p className="text-xs text-slate-600">Échouées</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 mb-4">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs actifs ({stats.totalUsers})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Invitations ({stats.totalInvitations})
            </div>
          </button>
        </div>

        {/* Filter for invitations */}
        {activeTab === 'invitations' && (
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filtrer:</span>
              <div className="flex gap-2">
                {['all', 'pending', 'sent', 'accepted', 'failed'].map((filterValue) => (
                  <button
                    key={filterValue}
                    onClick={() => setInvitationFilter(filterValue)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      invitationFilter === filterValue
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterValue === 'all' ? 'Tous' : filterValue === 'pending' ? 'En attente' : filterValue === 'sent' ? 'Envoyés' : filterValue === 'accepted' ? 'Acceptés' : 'Échoués'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <div>
            {usersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-slate-600 mt-3">Chargement des utilisateurs...</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                  {users.map((user) => (
                    <div key={user.id} className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-brand-red hover:shadow-lg transition-all">
                      {/* User Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          <div className="w-14 h-14 bg-gradient-to-br from-brand-red to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{user.full_name || 'Sans nom'}</h4>
                            <p className="text-sm text-slate-600 mb-2 truncate">{user.email}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {getRoleBadge(user.role)}
                              {user.organization?.name && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                                  <Building2 className="w-3 h-3" />
                                  {user.organization.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Last Login Badge */}
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">Dernière connexion</div>
                          <div className="text-sm font-medium text-slate-900">
                            {user.last_sign_in_at
                              ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: fr })
                              : 'Jamais'}
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{user.phone || 'Non renseigné'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {canManageUser(user.role) ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-all hover:shadow-md group"
                          >
                            <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm">Modifier</span>
                          </button>

                          <button
                            onClick={() => openPasswordModal(user)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium transition-all hover:shadow-md group"
                          >
                            <Key className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm">Mot de passe</span>
                          </button>

                          <button
                            onClick={() => handleSendResetLink(user.email)}
                            disabled={actionLoading === user.email}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-all hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === user.email ? (
                              <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-sm">Email reset</span>
                          </button>

                          <button
                            onClick={() => setDeleteUserConfirm(user)}
                            disabled={actionLoading === user.id}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-all hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm">Supprimer</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-500 font-medium">Accès restreint - Permissions insuffisantes</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600">Aucun utilisateur trouvé</p>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab Content */}
        {activeTab === 'invitations' && (
          <div>
            {invitationsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-slate-600 mt-3">Chargement des invitations...</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-brand-red hover:shadow-lg transition-all">
                      {/* Invitation Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Icon */}
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                            <Mail className="w-7 h-7 text-white" />
                          </div>

                          {/* Invitation Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-slate-900 mb-1 truncate">{invitation.email}</h4>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {getRoleBadge(invitation.role)}
                              {getStatusBadge(invitation.status)}
                              {invitation.organization?.name && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                                  <Building2 className="w-3 h-3" />
                                  {invitation.organization.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Créée {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>

                        {/* Expiry Badge */}
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">Expiration</div>
                          <div className={`text-sm font-bold ${
                            invitation.hours_until_expiry > 24
                              ? 'text-green-600'
                              : invitation.hours_until_expiry > 0
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}>
                            {invitation.hours_until_expiry > 0 ? `${invitation.hours_until_expiry}h` : 'Expiré'}
                          </div>
                        </div>
                      </div>

                      {/* Error Message if any */}
                      {invitation.last_error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-red-900">Erreur d'envoi</p>
                              <p className="text-xs text-red-700">{invitation.last_error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        {invitation.can_resend && (
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendingId === invitation.id}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-all hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resendingId === invitation.id ? (
                              <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-sm">Renvoyer</span>
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteInvitationConfirm(invitation.id)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-all hover:shadow-md group"
                        >
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-sm">Supprimer</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {invitations.length === 0 && (
                    <div className="text-center py-12">
                        <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600">Aucune invitation trouvée</p>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Inviter un utilisateur</h3>
                    <p className="text-sm text-slate-600">Ajouter un nouveau membre à l'équipe</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setManualPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="utilisateur@exemple.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rôle
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="franchisee_employee">Employé</option>
                  <option value="franchisee_admin">Administrateur Franchisé</option>
                  {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                    <option value="admin">Administrateur</option>
                  )}
                </select>
              </div>

              {(profile?.role === 'master' || profile?.role === 'admin') && organizations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Franchise
                  </label>
                  <select
                    value={selectedOrganizationId}
                    onChange={(e) => setSelectedOrganizationId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Franchise actuelle ({organization?.name})</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.type === 'owner' ? 'Propriétaire' : 'Franchisé'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 mt-1">
                    Sélectionnez la franchise à laquelle assigner cet utilisateur
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mode d'invitation
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteMode('manual')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inviteMode === 'manual'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Création manuelle
                  </button>
                  <button
                    onClick={() => setInviteMode('email')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inviteMode === 'email'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Par email
                  </button>
                </div>
              </div>

              {inviteMode === 'manual' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        placeholder="Minimum 8 caractères"
                        className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmer le mot de passe"
                        className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    {inviteMode === 'manual'
                      ? 'L\'utilisateur sera créé immédiatement avec ce mot de passe.'
                      : 'Un email d\'invitation sera envoyé à l\'utilisateur avec un lien pour créer son compte.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setManualPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleInviteUser}
                  loading={inviting}
                  className="flex-1"
                  leftIcon={inviteMode === 'manual' ? <UserPlus className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                >
                  {inviteMode === 'manual' ? 'Créer' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Changer le mot de passe</h3>
                  <p className="text-sm text-slate-600">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Le mot de passe sera changé immédiatement. L'utilisateur devra utiliser ce nouveau mot de passe pour se connecter.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUser(null);
                    setNewPassword('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleResetPassword}
                  loading={resetLoading}
                  className="flex-1"
                  leftIcon={<Key className="w-4 h-4" />}
                >
                  Changer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Modifier l'utilisateur</h3>
                  <p className="text-sm text-slate-600">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rôle
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="franchisee_employee">Employé</option>
                  <option value="franchisee_admin">Administrateur Franchisé</option>
                  <option value="admin">Administrateur</option>
                  {profile?.role === 'super_admin' && (
                    <option value="super_admin">Super Administrateur</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (514) 555-0000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  loading={updateLoading}
                  className="flex-1"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteUserConfirm}
        onClose={() => setDeleteUserConfirm(null)}
        onConfirm={confirmDeleteUser}
        title="Supprimer l'utilisateur ?"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteUserConfirm?.email} ? Cette action est irréversible et supprimera toutes les données associées (garanties, réclamations, etc.).`}
        variant="danger"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isLoading={actionLoading === deleteUserConfirm?.id}
      />

      {/* Delete Invitation Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteInvitationConfirm}
        onClose={() => setDeleteInvitationConfirm(null)}
        onConfirm={confirmDeleteInvitation}
        title="Supprimer l'invitation ?"
        message="Êtes-vous sûr de vouloir supprimer cette invitation ? L'utilisateur ne pourra plus créer son compte avec cette invitation."
        variant="danger"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      />
    </div>
  );
}
