import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Key, Trash2, CreditCard as Edit3, RefreshCw, Lock, Mail, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { profilesAdapter } from '../../lib/supabase-adapter';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getResetPasswordUrl } from '../../config/constants';
import { safeLog } from '../../lib/safe-logger';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface PasswordResetModal {
  show: boolean;
  userId: string;
  email: string;
}

interface EditUserModal {
  show: boolean;
  user: User | null;
}

interface InviteUserModal {
  show: boolean;
}

export function UsersManagement() {
  const { organization, profile } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [passwordModal, setPasswordModal] = useState<PasswordResetModal>({ show: false, userId: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [editModal, setEditModal] = useState<EditUserModal>({ show: false, user: null });
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Invite modal
  const [inviteModal, setInviteModal] = useState<InviteUserModal>({ show: false });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('franchisee_employee');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadUsers();
    }
  }, [organization?.id]);

  const loadUsers = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await profilesAdapter.getByOrganization(organization.id);

      if (error) throw error;

      safeLog.debug('Loaded users count:', data?.length);

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }

    if (!passwordModal.userId) {
      showToast('ID utilisateur manquant', 'error');
      return;
    }

    setResetLoading(true);
    try {
      console.log('Attempting password reset for:', {
        userId: passwordModal.userId,
        email: passwordModal.email,
        passwordLength: newPassword.length
      });

      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          userId: passwordModal.userId,
          newPassword: newPassword,
          adminReset: true
        }
      });

      if (error) {
        console.error('Function invoke error:', error);
        throw error;
      }

      if (data && !data.success) {
        console.error('Function returned error:', data);
        throw new Error(data.error || 'Échec de la réinitialisation');
      }

      console.log('Password reset successful:', data);
      showToast('Mot de passe réinitialisé avec succès', 'success');
      setPasswordModal({ show: false, userId: '', email: '' });
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMessage = error.message || error.error || 'Erreur lors de la réinitialisation';
      showToast(errorMessage, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendResetLink = async (email: string) => {
    setActionLoading(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getResetPasswordUrl()
      });

      if (error) throw error;

      showToast('Email de réinitialisation envoyé', 'success');
    } catch (error: any) {
      console.error('Error sending reset link:', error);
      showToast('Erreur lors de l\'envoi', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUser = async () => {
    if (!editModal.user) return;

    setUpdateLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim() || null,
          role: editRole,
          phone: editPhone.trim() || null
        })
        .eq('id', editModal.user.id);

      if (error) throw error;

      showToast('Utilisateur mis à jour avec succès', 'success');
      setEditModal({ show: false, user: null });
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${email} ?\n\nCette action est irréversible.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      showToast('Utilisateur supprimé avec succès', 'success');
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showToast(error.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (user: User) => {
    setEditModal({ show: true, user });
    setEditName(user.full_name || '');
    setEditRole(user.role);
    setEditPhone(user.phone || '');
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      showToast('Email invalide', 'error');
      return;
    }

    if (!inviteName.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }

    if (!organization?.id) {
      showToast('Organisation non trouvée', 'error');
      return;
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase().trim(),
          full_name: inviteName.trim(),
          role: inviteRole,
          organization_id: organization.id,
          skipEmail: false,
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

      showToast('Invitation envoyée avec succès', 'success');
      setInviteModal({ show: false });
      setInviteEmail('');
      setInviteName('');
      setInviteRole('franchisee_employee');
      await loadUsers();
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

  const getRoleBadge = (role: string) => {
    const colors = {
      master: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-900 border border-amber-300',
      super_admin: 'bg-purple-100 text-purple-700',
      admin: 'bg-primary-100 text-primary-700',
      franchisee_admin: 'bg-blue-100 text-blue-700',
      franchisee_employee: 'bg-slate-100 text-slate-700',
      employee: 'bg-slate-100 text-slate-700',
    };

    const labels = {
      master: 'Master',
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

  const canManageUser = (userRole: string) => {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'master') return true;
    if (profile.role === 'admin' && userRole !== 'super_admin' && userRole !== 'master') return true;
    if (profile.role === 'franchisee_admin' && !['super_admin', 'admin', 'master'].includes(userRole)) return true;
    return false;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Gestion des utilisateurs</h3>
            <p className="text-sm text-slate-600">Contrôle total sur tous les utilisateurs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setInviteModal({ show: true })} variant="default" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
            Inviter un utilisateur
          </Button>
          <Button onClick={loadUsers} variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Invite User Modal */}
      {inviteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Inviter un utilisateur</h3>
                  <p className="text-sm text-slate-600">Envoyer une invitation par email</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="utilisateur@exemple.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="franchisee_employee">Employé</option>
                  <option value="franchisee_admin">Administrateur Franchisé</option>
                  {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'master') && (
                    <option value="admin">Administrateur</option>
                  )}
                  {(profile?.role === 'super_admin' || profile?.role === 'master') && (
                    <option value="super_admin">Super Administrateur</option>
                  )}
                  {profile?.role === 'master' && (
                    <option value="master">Master</option>
                  )}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Définit les permissions de l'utilisateur
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium mb-1">Invitation par email</p>
                    <p className="text-xs text-blue-700">
                      L'utilisateur recevra un email avec un lien pour créer son compte.
                      L'invitation expire après 7 jours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteModal({ show: false });
                    setInviteEmail('');
                    setInviteName('');
                    setInviteRole('franchisee_employee');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleInviteUser}
                  loading={inviting}
                  disabled={!inviteEmail || !inviteName}
                  className="flex-1"
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Envoyer l'invitation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Changer le mot de passe</h3>
                  <p className="text-sm text-slate-600">{passwordModal.email}</p>
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                    setPasswordModal({ show: false, userId: '', email: '' });
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
      {editModal.show && editModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Modifier l'utilisateur</h3>
                  <p className="text-sm text-slate-600">{editModal.user.email}</p>
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rôle
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="franchisee_employee">Employé</option>
                  <option value="franchisee_admin">Administrateur Franchisé</option>
                  {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'master') && (
                    <option value="admin">Administrateur</option>
                  )}
                  {(profile?.role === 'super_admin' || profile?.role === 'master') && (
                    <option value="super_admin">Super Administrateur</option>
                  )}
                  {profile?.role === 'master' && (
                    <option value="master">Master</option>
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditModal({ show: false, user: null })}
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

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-3">Chargement des utilisateurs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Créé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dernière connexion</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{user.full_name || 'Sans nom'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{user.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: fr })}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.last_sign_in_at
                      ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: fr })
                      : 'Jamais'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {canManageUser(user.role) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(user)}
                            title="Modifier l'utilisateur"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPasswordModal({ show: true, userId: user.id, email: user.email })}
                            loading={actionLoading === user.id}
                            title="Changer le mot de passe"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendResetLink(user.email)}
                            loading={actionLoading === user.email}
                            title="Envoyer lien de réinitialisation"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            loading={actionLoading === user.id}
                            title="Supprimer l'utilisateur"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 px-2">Accès restreint</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {users.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Contrôles disponibles</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Modifier</strong> - Changer le nom, rôle et téléphone</li>
                <li><strong>Changer mot de passe</strong> - Définir un nouveau mot de passe immédiatement</li>
                <li><strong>Envoyer lien</strong> - Email avec lien de réinitialisation</li>
                <li><strong>Supprimer</strong> - Supprimer définitivement l'utilisateur</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
