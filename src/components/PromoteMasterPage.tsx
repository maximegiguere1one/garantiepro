import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PromoteMasterPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const promoteToMaster = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🚀 Starting promotion process...');

      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'maxime@giguere-influence.com');

      console.log('Search result:', profiles, searchError);

      if (searchError) {
        throw new Error('Erreur de recherche: ' + searchError.message);
      }

      if (!profiles || profiles.length === 0) {
        throw new Error('Utilisateur maxime@giguere-influence.com non trouvé');
      }

      const profile = profiles[0];
      console.log('✅ User found:', profile);

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'master' })
        .eq('id', profile.id)
        .select();

      console.log('Update result:', updated, updateError);

      if (updateError) {
        throw new Error('Erreur de mise à jour: ' + updateError.message);
      }

      console.log('✅ Successfully promoted to master role!');

      // Clear session cache to force profile reload
      sessionStorage.removeItem(`user_data_${profile.id}`);

      setResult({
        success: true,
        message: 'Maxime a été promu au rôle Master avec succès! Veuillez vous déconnecter et vous reconnecter pour appliquer les changements.',
        details: {
          email: profile.email,
          old_role: profile.role,
          new_role: 'master',
          user_id: profile.id,
        },
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-8 text-center">
          <h1 className="text-3xl font-bold mb-2">👑 Promotion Master</h1>
          <p className="text-red-100">Interface React Intégrée</p>
        </div>

        <div className="p-8">
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg mb-6">
            <div className="flex items-start">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <p className="font-bold text-green-900 mb-2">Vous êtes sur la bonne page!</p>
                <p className="text-green-800 text-sm">
                  Cette page utilise le client Supabase React.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200 mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Email
            </label>
            <div className="text-xl font-bold text-gray-900 mb-3">
              maxime@giguere-influence.com
            </div>
            <span className="inline-block bg-yellow-200 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold">
              → Rôle Master
            </span>
          </div>

          <button
            onClick={promoteToMaster}
            disabled={loading || result?.success}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg ${
              result?.success
                ? 'bg-green-500 text-white cursor-not-allowed'
                : loading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-xl'
            }`}
          >
            {loading ? '⏳ En cours...' : result?.success ? '✅ Réussi' : 'Promouvoir au rôle Master'}
          </button>

          {result && (
            <div
              className={`mt-6 p-6 rounded-xl border-l-4 ${
                result.success
                  ? 'bg-green-50 border-green-500'
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <p className={`font-bold mb-3 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? '✅ Succès!' : '❌ Erreur'}
              </p>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>

              {result.success && result.details && (
                <div className="mt-4 bg-white/50 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
