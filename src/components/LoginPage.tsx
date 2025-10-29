import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { microcopy } from '../lib/microcopy';
import { getConnectionErrorMessage } from '../lib/supabase-health-check';

export function LoginPage() {
  const { signIn, profileError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      await signIn(email, password);
    } catch (err: any) {
      const errorMessage = getConnectionErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showConnectionError = profileError && (
    profileError.includes('connexion') ||
    profileError.includes('introuvable') ||
    profileError.includes('404')
  );

  const showPermissionError = profileError && (
    profileError.includes('permission') ||
    profileError.includes('Permission') ||
    profileError.includes('RLS')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary-600/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Location Pro-Remorque</h1>
            <p className="text-slate-600 text-sm mt-2">
              Connectez-vous pour continuer
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {showPermissionError && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-900 mb-2">
                      Règles de sécurité mises à jour
                    </p>
                    <p className="text-xs text-primary-800 mb-3">
                      {profileError}
                    </p>
                    <div className="bg-primary-100 rounded p-2">
                      <p className="text-xs text-primary-900 font-medium mb-1">Pour résoudre ce problème:</p>
                      <ol className="text-xs text-primary-800 space-y-1 list-decimal list-inside">
                        <li>Appuyez sur <kbd className="px-1.5 py-0.5 bg-white rounded text-primary-900 font-mono text-xs">Ctrl+Shift+R</kbd> (Windows/Linux) ou <kbd className="px-1.5 py-0.5 bg-white rounded text-primary-900 font-mono text-xs">Cmd+Shift+R</kbd> (Mac)</li>
                        <li>Reconnectez-vous avec vos identifiants</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showConnectionError && !showPermissionError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-2">
                      Erreur de connexion à la base de données
                    </p>
                    <p className="text-xs text-amber-800 mb-3">
                      {profileError}
                    </p>
                    <p className="text-xs text-amber-700">
                      Consultez le fichier <code className="px-1 py-0.5 bg-amber-100 rounded">SUPABASE_SETUP_GUIDE.md</code> pour configurer votre connexion Supabase.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && !showConnectionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder={microcopy.forms.warranty.customer.email.placeholder}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-700 cursor-pointer">
                Se souvenir de moi
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all shadow-sm shadow-primary-600/30 hover:shadow-md hover:shadow-primary-600/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <a
              href="/admin-reset"
              className="block w-full text-sm text-primary-600 hover:text-primary-800 transition-colors text-center"
            >
              Mot de passe oublié? Réinitialiser →
            </a>
            <p className="text-xs text-slate-500 text-center mt-4">
              Pas de compte? Contactez un administrateur pour recevoir une invitation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
