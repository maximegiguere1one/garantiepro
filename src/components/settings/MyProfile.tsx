import { useState } from 'react';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';

export function MyProfile() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile info state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Email invalide', 'error');
      return;
    }

    if (newEmail === user?.email) {
      showToast('Le nouvel email est identique à l\'actuel', 'error');
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      showToast('Un email de confirmation a été envoyé à la nouvelle adresse', 'success');
      setNewEmail('');
    } catch (error: any) {
      console.error('Error updating email:', error);
      showToast(error.message || 'Erreur lors du changement d\'email', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      showToast('Mot de passe actuel requis', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      showToast('Le nouveau mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('Le nouveau mot de passe doit être différent de l\'actuel', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      // First verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // If verification succeeded, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      showToast('Mot de passe changé avec succès', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      showToast(error.message || 'Erreur lors du changement de mot de passe', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }

    if (!user?.id || !profile?.id) {
      showToast('Session invalide. Veuillez vous reconnecter.', 'error');
      return;
    }

    setProfileLoading(true);
    try {
      console.log('[MyProfile] Updating profile:', {
        userId: user.id,
        profileId: profile.id,
        updates: {
          full_name: fullName.trim(),
          phone: phone.trim() || null
        }
      });

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null
        })
        .eq('id', profile.id)
        .select();

      if (error) {
        console.error('[MyProfile] Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('[MyProfile] Profile updated successfully:', data);

      // Invalidate cache to force fresh data load
      if (user.id) {
        sessionStorage.removeItem(`user_data_${user.id}`);
      }

      showToast('Profil mis à jour avec succès', 'success');

      // Reload profile to get fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('[MyProfile] Error updating profile:', error);

      let errorMessage = 'Erreur lors de la mise à jour';

      if (error.message) {
        if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Erreur de permission. Vos droits ont peut-être changé. Essayez de vous reconnecter.';
        } else if (error.code === 'PGRST116') {
          errorMessage = 'Conflit de données. Veuillez rafraîchir la page et réessayer.';
        } else if (error.code === 'PGRST204') {
          errorMessage = 'Erreur de configuration de la base de données. Veuillez contacter le support technique.';
          console.error('[MyProfile] PGRST204 - Column not found. Database schema may need migration.');
        } else if (error.code === '42703') {
          errorMessage = 'Une colonne requise est manquante. Les migrations de base de données doivent être appliquées.';
          console.error('[MyProfile] 42703 - Undefined column error.');
        } else {
          errorMessage = error.message;
        }
      }

      showToast(errorMessage, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm shadow-primary-600/30">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Mon Profil</h3>
          <p className="text-sm text-slate-600">Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h4 className="text-base font-semibold text-slate-900">Informations personnelles</h4>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (514) 555-0000"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email actuel
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Pour changer votre email, utilisez la section ci-dessous
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rôle
            </label>
            <input
              type="text"
              value={profile?.role || 'Non défini'}
              disabled
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Votre rôle est géré par un administrateur
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpdateProfile}
              loading={profileLoading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </div>

      {/* Change Email */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-600" />
            <h4 className="text-base font-semibold text-slate-900">Changer l'email</h4>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nouvel email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nouveau@exemple.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Un email de confirmation sera envoyé à votre nouvelle adresse.
                Vous devrez cliquer sur le lien de confirmation pour finaliser le changement.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpdateEmail}
              loading={emailLoading}
              disabled={!newEmail}
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Envoyer email de confirmation
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <h4 className="text-base font-semibold text-slate-900">Changer le mot de passe</h4>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mot de passe actuel <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Votre mot de passe actuel"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-500 mt-1">
              Le mot de passe doit contenir au moins 8 caractères
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le nouveau mot de passe"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Les mots de passe ne correspondent pas
              </p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Le changement de mot de passe prendra effet immédiatement.
                Vous devrez utiliser le nouveau mot de passe lors de votre prochaine connexion.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpdatePassword}
              loading={passwordLoading}
              disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Changer le mot de passe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
