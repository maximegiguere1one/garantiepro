import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (error) {
        let errorMessage = 'Une erreur est survenue.';

        if (errorCode === 'otp_expired') {
          errorMessage = 'Ce lien a expiré. Veuillez demander un nouveau lien de réinitialisation à votre administrateur.';
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
        }

        setMessage({
          type: 'error',
          text: errorMessage
        });
        setIsValidSession(false);
        setCheckingSession(false);
        window.history.replaceState({}, document.title, '/reset-password');
        return;
      }

      if (accessToken && refreshToken && type === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error);
          setMessage({
            type: 'error',
            text: 'Session invalide. Veuillez demander un nouveau lien de réinitialisation.'
          });
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        window.history.replaceState({}, document.title, '/reset-password');
        setIsValidSession(true);
        setCheckingSession(false);
      } else {
        checkRecoverySession();
      }
    } catch (error) {
      console.error('Error handling auth callback:', error);
      checkRecoverySession();
    }
  };

  const checkRecoverySession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error checking session:', error);
        setMessage({
          type: 'error',
          text: 'Session invalide. Veuillez demander un nouveau lien de réinitialisation.'
        });
        setIsValidSession(false);
        return;
      }

      if (session) {
        setIsValidSession(true);
      } else {
        setMessage({
          type: 'error',
          text: 'Session expirée. Veuillez demander un nouveau lien de réinitialisation.'
        });
        setIsValidSession(false);
      }
    } catch (error) {
      console.error('Error checking recovery session:', error);
      setMessage({
        type: 'error',
        text: 'Une erreur est survenue. Veuillez réessayer.'
      });
      setIsValidSession(false);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Mot de passe mis à jour avec succès! Redirection...'
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la réinitialisation du mot de passe'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 25, label: 'Faible', color: 'bg-red-500' };
    if (password.length < 8) return { strength: 50, label: 'Moyen', color: 'bg-yellow-500' };
    if (password.length < 12) return { strength: 75, label: 'Bon', color: 'bg-primary-500' };
    return { strength: 100, label: 'Excellent', color: 'bg-primary-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Nouveau mot de passe
            </h1>
            <p className="text-red-100">
              Location Pro-Remorque
            </p>
          </div>

          <div className="p-8">
            {!isValidSession ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-800 font-semibold mb-2">Session expirée</p>
                <p className="text-red-600 text-sm mb-4">
                  {message?.text || 'Votre lien de réinitialisation a expiré ou est invalide.'}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <>
                {message && (
                  <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm font-medium ${
                      message.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                        placeholder="Minimum 6 caractères"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-slate-600">
                            Force du mot de passe
                          </span>
                          <span className={`text-xs font-semibold ${
                            passwordStrength.strength < 50 ? 'text-red-600' :
                            passwordStrength.strength < 75 ? 'text-yellow-600' :
                            passwordStrength.strength < 100 ? 'text-primary-600' :
                            'text-primary-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                        placeholder="Confirmez votre mot de passe"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-2">
                      Conseils pour un mot de passe sécurisé:
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-primary-500' : 'bg-slate-300'}`} />
                        Au moins 8 caractères
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-primary-500' : 'bg-slate-300'}`} />
                        Une lettre majuscule
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-primary-500' : 'bg-slate-300'}`} />
                        Un chiffre
                      </li>
                      <li className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-primary-500' : 'bg-slate-300'}`} />
                        Un caractère spécial
                      </li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Mise à jour...
                      </span>
                    ) : (
                      'Réinitialiser le mot de passe'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full text-slate-600 hover:text-slate-900 text-sm font-medium"
                  >
                    Retour à la connexion
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <a
            href="https://www.garantieproremorque.com"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            www.garantieproremorque.com
          </a>
        </p>
      </div>
    </div>
  );
}
