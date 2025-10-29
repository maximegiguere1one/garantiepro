import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Key, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export function AdminPasswordReset() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);

  const sendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour réinitialiser un mot de passe');
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Échec de l\'envoi de l\'email');
      }

      setMessage({
        type: 'success',
        text: `Email de réinitialisation envoyé à ${email}. Vérifiez votre boîte de réception.`,
      });
    } catch (err) {
      const error = err as Error;
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de l\'envoi de l\'email',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePasswordDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Mot de passe mis à jour avec succès! Vous pouvez maintenant vous connecter.',
      });
      setNewPassword('');
    } catch (err) {
      const error = err as Error;
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la mise à jour du mot de passe',
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewAdmin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const adminEmail = 'admin@proremorque.ca';
      const adminPassword = 'Admin123!';

      const { error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: 'Administrateur',
            role: 'admin',
          },
        },
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Compte admin créé!\n\nEmail: ${adminEmail}\nMot de passe: ${adminPassword}\n\nVeuillez noter ces informations et changer le mot de passe après connexion.`,
      });
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        setMessage({
          type: 'error',
          text: 'Ce compte existe déjà. Utilisez la réinitialisation de mot de passe.',
        });
      } else {
        setMessage({
          type: 'error',
          text: err.message || 'Erreur lors de la création du compte',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Réinitialisation Admin</h1>
              <p className="text-slate-600 text-sm">Récupérez l'accès à votre compte</p>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="whitespace-pre-line text-sm">{message.text}</div>
            </div>
          )}

          <div className="space-y-6">
            {/* Option 1: Email Reset */}
            <div className="border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Réinitialisation par Email
                </h2>
              </div>
              <form onSubmit={sendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Comptes disponibles: maxime@agence1.com, maxime@giguere-influence.com, admin@proremorque.ca
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>
            </div>

            {/* Option 2: Direct Password Update (if logged in) */}
            <div className="border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Changement Direct de Mot de Passe
                </h2>
              </div>

              {!showPasswordUpdate ? (
                <button
                  onClick={() => setShowPasswordUpdate(true)}
                  className="w-full py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Afficher le formulaire
                </button>
              ) : (
                <form onSubmit={updatePasswordDirectly} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                      minLength={6}
                      disabled={loading}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Vous devez être connecté pour utiliser cette option
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                  </button>
                </form>
              )}
            </div>

            {/* Option 3: Create New Admin */}
            <div className="border border-primary-200 bg-primary-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-primary-900 mb-2">
                Créer un Nouveau Compte Admin
              </h2>
              <p className="text-sm text-primary-700 mb-4">
                Cette option créera un nouveau compte admin avec des identifiants par défaut.
              </p>
              <button
                onClick={createNewAdmin}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer compte admin@proremorque.ca'}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <a
              href="/"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← Retour à la page de connexion
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
