import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';
import { format } from 'date-fns';

interface QueuedEmail {
  id: string;
  to_email: string;
  subject: string;
  html_body: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'retry';
  attempts: number;
  max_retries: number;
  error_message: string | null;
  next_retry_at: string;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string;
  metadata: any;
}

export function EmailQueueManager() {
  const { profile } = useAuth();
  const [emails, setEmails] = useState<QueuedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [retrying, setRetrying] = useState<string | null>(null);

  // Désactiver temporairement si pas admin/master pour éviter erreurs CORS
  if (!profile || (profile.role !== 'admin' && profile.role !== 'master')) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Cette fonctionnalité est réservée aux administrateurs et masters.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Only load emails if user has admin or master role
    if (profile?.role === 'admin' || profile?.role === 'master') {
      loadEmails();

      const subscription = supabase
        .channel('email_queue_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'email_queue'
        }, () => {
          loadEmails();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedStatus, profile?.role]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryEmail = async (emailId: string) => {
    try {
      setRetrying(emailId);

      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email.to_email,
          subject: email.subject,
          body: email.html_body
        })
      });

      if (response.ok) {
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: email.attempts + 1
          })
          .eq('id', emailId);

        alert('Email renvoyé avec succès!');
        loadEmails();
      } else {
        const errorData = await response.json();

        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: errorData.userMessage || errorData.error,
            attempts: email.attempts + 1,
            failed_at: new Date().toISOString()
          })
          .eq('id', emailId);

        alert(`Échec de l'envoi: ${errorData.userMessage || errorData.error}`);
        loadEmails();
      }
    } catch (error: any) {
      console.error('Error retrying email:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setRetrying(null);
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet email de la file d\'attente?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_queue')
        .delete()
        .eq('id', emailId);

      if (error) throw error;
      loadEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-primary-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-primary-600" />;
      case 'retry':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'sending':
        return <RefreshCw className="w-5 h-5 text-primary-600 animate-spin" />;
      default:
        return <Mail className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Envoyé';
      case 'failed':
        return 'Échoué';
      case 'queued':
        return 'En attente';
      case 'retry':
        return 'En cours de renvoi';
      case 'sending':
        return 'Envoi en cours';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'queued':
        return 'bg-primary-100 text-primary-800';
      case 'retry':
        return 'bg-amber-100 text-amber-800';
      case 'sending':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">File d'attente d'emails</h2>
          <p className="text-sm text-slate-600 mt-1">
            Gérez les emails en attente et les échecs d'envoi
          </p>
        </div>
        <button
          onClick={loadEmails}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'queued', 'retry', 'failed', 'sent'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status === 'all' ? 'Tous' : getStatusLabel(status)}
            {status !== 'all' && (
              <span className="ml-2 text-xs">
                ({emails.filter(e => e.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Aucun email dans la file d'attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getStatusIcon(email.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(email.status)}`}>
                      {getStatusLabel(email.status)}
                    </span>
                    <span className="text-sm text-slate-500">
                      {format(new Date(email.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{email.subject}</p>
                    <p className="text-sm text-slate-600">À: {email.to_email}</p>

                    {email.metadata?.contract_number && (
                      <p className="text-xs text-slate-500">
                        Contrat: {email.metadata.contract_number}
                      </p>
                    )}

                    {email.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <p className="font-medium">Erreur:</p>
                        <p>{email.error_message}</p>
                      </div>
                    )}

                    {email.status === 'retry' && email.next_retry_at && (
                      <p className="text-xs text-amber-600">
                        Prochain essai: {format(new Date(email.next_retry_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}

                    <p className="text-xs text-slate-500">
                      Tentatives: {email.attempts} / {email.max_retries}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {(email.status === 'failed' || email.status === 'queued' || email.status === 'retry') && (
                    <button
                      onClick={() => retryEmail(email.id)}
                      disabled={retrying === email.id}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Renvoyer
                    </button>
                  )}

                  {(email.status === 'failed' || email.status === 'sent') && (
                    <button
                      onClick={() => deleteEmail(email.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
