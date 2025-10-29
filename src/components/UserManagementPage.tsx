import { useState, useEffect } from 'react';
import { Users, UserPlus, Key, Trash2, Edit3, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from './common/Button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export function UserManagementPage() {
  const { organization, profile } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('franchisee_employee');
  const [inviting, setInviting] = useState(false);

  // Edit form
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updating, setUpdating] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      loadUsers();
    }
  }, [organization?.id]);

  const loadUsers = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Loaded users:', data?.length || 0);
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      showToast('Email et nom sont requis', 'error');
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail.toLowerCase().trim(),
          full_name: inviteName.trim(),
          role: inviteRole,
          organization_id: organization?.id
        }
      });

      if (error) throw error;

      showToast('Invitation envoyée avec succès', 'success');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('franchisee_employee');
      await loadUsers();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      showToast(error.message || 'Erreur lors de l\'invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditName(user.full_name || '');
    setEditRole(user.role);
    setEditPhone(user.phone || '');
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setUpdating(true);
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
      setUpdating(false);
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setShowPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !selectedUser.id) {
      showToast('Utilisateur invalide', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }

    setResetting(true);
    try {
      console.log('Resetting password for:', {
        userId: selectedUser.id,
        email: selectedUser.email,
        currentUserRole: profile?.role
      });

      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
          adminReset: true
        }
      });

      console.log('Password reset response:', { data, error });

      if (error) {
        console.error('Function invoke error:', error);
        throw error;
      }

      if (data && !data.success) {
        console.error('Function returned error:', data);
        throw new Error(data.error || 'Échec de la réinitialisation');
      }

      showToast('Mot de passe changé avec succès', 'success');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMessage = error.message || error.error || 'Erreur lors de la réinitialisation';
      showToast(errorMessage, 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!user.id) {
      showToast('Utilisateur invalide', 'error');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.email}?\n\nCette action est irréversible.`)) {
      return;
    }

    setActionLoading(user.id);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id }
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

  const getRoleBadge = (role: string) => {
    const config: Record<string, { color: string; label: string }> = {
      super_admin: { color: 'bg-purple-100 text-purple-700', label: 'Super Admin' },
      admin: { color: 'bg-primary-100 text-primary-700', label: 'Administrateur' },
      master: { color: 'bg-purple-100 text-purple-700', label: 'Master' },
      franchisee_admin: { color: 'bg-blue-100 text-blue-700', label: 'Admin Franchisé' },
      franchisee_employee: { color: 'bg-slate-100 text-slate-700', label: 'Employé' },
      employee: { color: 'bg-slate-100 text-slate-700', label: 'Employé' },
    };

    const { color, label } = config[role] || config.employee;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${color}`}>
        {label}
      </span>
    );
  };

  const canManageUser = (userRole: string) => {
    if (!profile) {
      console.log('No profile found');
      return false;
    }

    console.log('Checking permissions:', {
      currentUserRole: profile.role,
      targetUserRole: userRole,
      canManage: ['super_admin', 'master', 'admin'].includes(profile.role)
    });

    // Super admin, master et admin peuvent tout gérer
    if (['super_admin', 'master', 'admin'].includes(profile.role)) return true;

    // Franchisee admin peut gérer les employés seulement
    if (profile.role === 'franchisee_admin' && !['super_admin', 'admin', 'master'].includes(userRole)) {
      return true;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Gestion des utilisateurs</h1>
                <p className="text-slate-600 mt-1">Gérez les utilisateurs et leurs permissions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={loadUsers} variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>
                Actualiser
              </Button>
              <Button onClick={() => setShowInviteModal(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
                Inviter un utilisateur
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total utilisateurs</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Actifs</p>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.last_sign_in_at).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Administrateurs</p>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => ['admin', 'super_admin', 'master'].includes(u.role)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-slate-600 mt-3">Chargement des utilisateurs...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Téléphone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rôle</th>
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
                        {user.last_sign_in_at
                          ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: fr })
                          : 'Jamais'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canManageUser(user.role) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPasswordModal(user)}
                                title="Changer le mot de passe"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(user)}
                                loading={actionLoading === user.id}
                                title="Supprimer"
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
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
                    {['admin', 'super_admin', 'master'].includes(profile?.role || '') && (
                      <>
                        <option value="admin">Administrateur</option>
                        <option value="super_admin">Super Administrateur</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInviteModal(false);
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
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Inviter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="franchisee_employee">Employé</option>
                    <option value="franchisee_admin">Administrateur Franchisé</option>
                    {['admin', 'super_admin', 'master'].includes(profile?.role || '') && (
                      <>
                        <option value="admin">Administrateur</option>
                        <option value="super_admin">Super Administrateur</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+1 (514) 555-0000"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                    loading={updating}
                    className="flex-1"
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Modal */}
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
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 caractères"
                      className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      autoFocus
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
                    loading={resetting}
                    disabled={!newPassword || newPassword.length < 8}
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
      </div>
    </div>
  );
}
