import { useState } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, RefreshCw, Phone, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useOrganization } from '../../contexts/OrganizationContext';

interface SMSHistoryItem {
  id: string;
  to_phone: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

export function SMSTestingSettings() {
  const [phoneNumber, setPhoneNumber] = useState('+14185728464');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<SMSHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { showToast } = useToast();
  const { currentOrganization } = useOrganization();

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading SMS history:', error);
      showToast('Erreur lors du chargement de l\'historique', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendTestSMS = async () => {
    if (!phoneNumber.trim()) {
      showToast('Veuillez entrer un numéro de téléphone', 'error');
      return;
    }

    if (!message.trim()) {
      showToast('Veuillez entrer un message', 'error');
      return;
    }

    setIsSending(true);
    let smsQueueId: string | null = null;

    try {
      // Add to SMS queue first
      const { data: smsData, error: smsError } = await supabase
        .from('sms_queue')
        .insert({
          organization_id: currentOrganization?.id,
          to_phone: phoneNumber,
          body: message,
          status: 'sending',
          priority: 'high'
        })
        .select()
        .single();

      if (smsError) throw smsError;
      smsQueueId = smsData.id;

      console.log('SMS added to queue:', smsData);

      // Call Edge Function directly to send SMS
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: phoneNumber,
          body: message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi du SMS');
      }

      // Update SMS status to sent
      await supabase
        .from('sms_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq('id', smsQueueId);

      showToast('SMS envoyé avec succès!', 'success');
      console.log('SMS sent successfully:', result);

      // Clear message and reload history
      setMessage('');
      await loadHistory();
    } catch (error: any) {
      console.error('Error sending SMS:', error);

      // Update SMS status to failed if we have the ID
      if (smsQueueId) {
        try {
          await supabase
            .from('sms_queue')
            .update({
              status: 'failed',
              error_message: error.message,
              failed_at: new Date().toISOString(),
            })
            .eq('id', smsQueueId);
        } catch (updateError) {
          console.error('Error updating failed SMS:', updateError);
        }
      }

      showToast(error.message || 'Erreur lors de l\'envoi du SMS', 'error');
      await loadHistory();
    } finally {
      setIsSending(false);
    }
  };

  const sendQuickTest = async () => {
    const quickMessage = `Test SMS - ${new Date().toLocaleTimeString('fr-CA')} - Système de notifications fonctionne! 🎉`;
    setMessage(quickMessage);

    setTimeout(() => {
      sendTestSMS();
    }, 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-red-600" />
          Test SMS en Direct
        </h2>
        <p className="text-slate-600 mt-2">
          Envoyez des SMS de test pour vérifier que le système fonctionne correctement
        </p>
      </div>

      {/* Quick Test Card */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Test Rapide
            </h3>
            <p className="text-slate-600 mb-4">
              Envoyez un SMS de test pré-configuré instantanément à votre numéro
            </p>
            <button
              onClick={sendQuickTest}
              disabled={isSending}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer Test Rapide
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom SMS Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-red-600" />
          SMS Personnalisé
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 418-572-8464"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <p className="text-sm text-slate-500 mt-1">
              Format: +1XXXXXXXXXX (inclure le code pays)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Entrez votre message de test..."
              rows={4}
              maxLength={160}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-slate-500">
                Maximum 160 caractères
              </p>
              <p className="text-sm text-slate-500">
                {message.length} / 160
              </p>
            </div>
          </div>

          <button
            onClick={sendTestSMS}
            disabled={isSending || !message.trim() || !phoneNumber.trim()}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer SMS
              </>
            )}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            Historique des SMS
          </h3>
          <button
            onClick={loadHistory}
            disabled={isLoadingHistory}
            className="text-red-600 hover:text-red-700 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Aucun SMS dans l'historique</p>
            <p className="text-sm mt-1">Les SMS envoyés apparaîtront ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Téléphone
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Message
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Statut
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Tentatives
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                      {item.to_phone}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                      {item.body}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {item.attempts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-2">
              À propos des SMS
            </h4>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>• Les SMS sont envoyés via Twilio</li>
              <li>• Maximum 160 caractères par SMS</li>
              <li>• Coût: ~$0.0075 USD par SMS (Canada/US)</li>
              <li>• Les SMS en échec sont réessayés automatiquement (max 3 fois)</li>
              <li>• Le système envoie automatiquement un SMS à chaque nouvelle garantie créée</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
