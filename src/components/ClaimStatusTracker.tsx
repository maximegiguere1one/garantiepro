import { useState, useEffect } from 'react';
import {
  Clock, CheckCircle2, XCircle, AlertTriangle,
  FileText, Bell, User, Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  getClaimStatusUpdates,
  subscribeToClaimUpdates,
  type ClaimStatusUpdate,
} from '../lib/realtime-chat-utils';

interface ClaimStatusTrackerProps {
  claimId: string;
  claimNumber: string;
}

export function ClaimStatusTracker({ claimId, claimNumber }: ClaimStatusTrackerProps) {
  const [updates, setUpdates] = useState<ClaimStatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<ClaimStatusUpdate | null>(null);

  useEffect(() => {
    loadUpdates();

    const channel = subscribeToClaimUpdates(claimId, (update) => {
      setUpdates(prev => [update, ...prev]);
      setLatestUpdate(update);
      setShowNotification(true);

      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [claimId]);

  const loadUpdates = async () => {
    try {
      const data = await getClaimStatusUpdates(claimId);
      setUpdates(data);
    } catch (error) {
      console.error('Error loading status updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'en attente':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'approved':
      case 'approuvé':
        return <CheckCircle2 className="w-5 h-5 text-primary-600" />;
      case 'rejected':
      case 'rejeté':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'under review':
      case 'en cours d\'évaluation':
        return <FileText className="w-5 h-5 text-primary-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'en attente':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approved':
      case 'approuvé':
        return 'bg-green-50 text-primary-700 border-green-200';
      case 'rejected':
      case 'rejeté':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'under review':
      case 'en cours d\'évaluation':
        return 'bg-primary-50 text-primary-700 border-primary-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'approved': 'Approuvé',
      'rejected': 'Rejeté',
      'under review': 'En cours d\'évaluation',
      'en attente': 'En attente',
      'approuvé': 'Approuvé',
      'rejeté': 'Rejeté',
      'en cours d\'évaluation': 'En cours d\'évaluation',
    };
    return labels[status.toLowerCase()] || status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Notification en temps réel */}
      {showNotification && latestUpdate && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-primary-500 p-4 max-w-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  Mise à jour de votre réclamation
                </h4>
                <p className="text-sm text-slate-600 mb-2">
                  Réclamation #{claimNumber}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(latestUpdate.old_status || '')}`}>
                    {getStatusLabel(latestUpdate.old_status || 'Nouveau')}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(latestUpdate.new_status)}`}>
                    {getStatusLabel(latestUpdate.new_status)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline des statuts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          Historique de la réclamation #{claimNumber}
        </h3>

        {updates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Aucune mise à jour pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update, index) => (
              <div
                key={update.id}
                className={`relative pl-8 pb-6 ${
                  index !== updates.length - 1 ? 'border-l-2 border-slate-200' : ''
                }`}
              >
                {/* Icône de statut */}
                <div className="absolute left-0 -translate-x-1/2 top-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-blue-500/30 animate-pulse'
                      : 'bg-white border-2 border-slate-200'
                  }`}>
                    {getStatusIcon(update.new_status)}
                  </div>
                </div>

                {/* Contenu */}
                <div className={`ml-4 ${index === 0 ? 'bg-primary-50 border border-primary-100 rounded-lg p-4' : ''}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${getStatusColor(update.new_status)}`}>
                          {getStatusLabel(update.new_status)}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                            Nouveau
                          </span>
                        )}
                      </div>

                      {update.old_status && (
                        <p className="text-sm text-slate-600">
                          Précédent: <span className="font-medium">{getStatusLabel(update.old_status)}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(update.created_at), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Informations détaillées */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Modifié par: <span className="font-medium">{update.changed_by_name}</span></span>
                    </div>

                    {update.reason && (
                      <div className="text-sm">
                        <p className="text-slate-600 font-medium mb-1">Raison:</p>
                        <p className="text-slate-700 bg-white rounded p-2 border border-slate-200">
                          {update.reason}
                        </p>
                      </div>
                    )}

                    {update.notes && (
                      <div className="text-sm">
                        <p className="text-slate-600 font-medium mb-1">Notes:</p>
                        <p className="text-slate-700 bg-white rounded p-2 border border-slate-200">
                          {update.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notification envoyée */}
                  {update.notification_sent && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-primary-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Notification envoyée au client</span>
                      {update.notification_sent_at && (
                        <span className="text-slate-500">
                          ({formatDistanceToNow(new Date(update.notification_sent_at), {
                            addSuffix: true,
                            locale: fr
                          })})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
