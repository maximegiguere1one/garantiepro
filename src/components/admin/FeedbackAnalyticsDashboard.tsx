import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface FeedbackStats {
  total: number;
  byType: Record<string, number>;
  bySentiment: Record<string, number>;
  byStatus: Record<string, number>;
  avgResponseTime: number;
  resolutionRate: number;
  trendingIssues: Array<{ category: string; count: number }>;
}

interface FeedbackItem {
  id: string;
  user_id: string;
  feedback_type: string;
  sentiment: string | null;
  category: string | null;
  subject: string;
  message: string;
  status: string;
  page_url: string | null;
  created_at: string;
  responded_at: string | null;
  admin_response: string | null;
  user_email?: string;
}

export function FeedbackAnalyticsDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    loadData();
  }, [filterStatus, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadFeedbacks()]);
    } catch (error) {
      showToast('Erreur de chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*');

    if (error) throw error;

    const total = data.length;
    const byType: Record<string, number> = {};
    const bySentiment: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    let totalResponseTime = 0;
    let respondedCount = 0;
    let resolvedCount = 0;

    data.forEach((item) => {
      byType[item.feedback_type] = (byType[item.feedback_type] || 0) + 1;

      if (item.sentiment) {
        bySentiment[item.sentiment] = (bySentiment[item.sentiment] || 0) + 1;
      }

      byStatus[item.status] = (byStatus[item.status] || 0) + 1;

      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }

      if (item.responded_at) {
        respondedCount++;
        const responseTime =
          new Date(item.responded_at).getTime() -
          new Date(item.created_at).getTime();
        totalResponseTime += responseTime;
      }

      if (item.status === 'resolved' || item.status === 'closed') {
        resolvedCount++;
      }
    });

    const avgResponseTime =
      respondedCount > 0 ? totalResponseTime / respondedCount / (1000 * 60 * 60) : 0;
    const resolutionRate = total > 0 ? (resolvedCount / total) * 100 : 0;

    const trendingIssues = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      total,
      byType,
      bySentiment,
      byStatus,
      avgResponseTime,
      resolutionRate,
      trendingIssues,
    });
  };

  const loadFeedbacks = async () => {
    let query = supabase
      .from('user_feedback')
      .select(`
        *,
        profiles:user_id (
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterType !== 'all') {
      query = query.eq('feedback_type', filterType);
    }

    const { data, error } = await query;

    if (error) throw error;

    const feedbacksWithEmail = data.map((item: any) => ({
      ...item,
      user_email: item.profiles?.email || 'Email inconnu',
    }));

    setFeedbacks(feedbacksWithEmail);
  };

  const handleRespond = async () => {
    if (!selectedFeedback || !responseText.trim()) {
      showToast('Veuillez entrer une réponse', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({
          admin_response: responseText,
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
          status: 'responded',
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      showToast('Réponse envoyée avec succès', 'success');
      setSelectedFeedback(null);
      setResponseText('');
      await loadData();
    } catch (error) {
      showToast('Erreur lors de l\'envoi de la réponse', 'error');
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) throw error;

      showToast('Statut mis à jour', 'success');
      await loadData();
    } catch (error) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Type', 'Sentiment', 'Sujet', 'Message', 'Statut', 'Email'].join(','),
      ...feedbacks.map((f) =>
        [
          new Date(f.created_at).toLocaleDateString(),
          f.feedback_type,
          f.sentiment || '',
          `"${f.subject}"`,
          `"${f.message.substring(0, 100)}"`,
          f.status,
          f.user_email,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedbacks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      bug: 'bg-red-100 text-red-800',
      feature_request: 'bg-blue-100 text-blue-800',
      improvement: 'bg-purple-100 text-purple-800',
      question: 'bg-yellow-100 text-yellow-800',
      praise: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  const getSentimentIcon = (sentiment: string | null) => {
    if (sentiment === 'positive') return <ThumbsUp className="w-4 h-4 text-green-600" />;
    if (sentiment === 'negative') return <ThumbsDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Feedback</h1>
          <p className="text-gray-600 mt-1">
            Analysez et répondez aux retours utilisateurs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Feedbacks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-[#DC2626]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Temps de Réponse Moy.</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.avgResponseTime.toFixed(1)}h
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taux de Résolution</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.resolutionRate.toFixed(0)}%
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Attente</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.byStatus['new'] || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Par Type
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Par Sentiment</h3>
              <div className="space-y-3">
                {Object.entries(stats.bySentiment).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{sentiment}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Catégories Tendances
              </h3>
              <div className="space-y-3">
                {stats.trendingIssues.map((issue) => (
                  <div key={issue.category} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{issue.category}</span>
                    <span className="font-semibold text-gray-900">{issue.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4 items-center">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouveaux</option>
              <option value="in_review">En révision</option>
              <option value="responded">Répondus</option>
              <option value="resolved">Résolus</option>
              <option value="closed">Fermés</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            >
              <option value="all">Tous les types</option>
              <option value="bug">Bugs</option>
              <option value="feature_request">Feature Requests</option>
              <option value="improvement">Améliorations</option>
              <option value="question">Questions</option>
              <option value="praise">Compliments</option>
              <option value="other">Autres</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {feedbacks.map((feedback) => (
            <div key={feedback.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(feedback.feedback_type)}`}>
                    {feedback.feedback_type.replace('_', ' ')}
                  </span>
                  {feedback.sentiment && getSentimentIcon(feedback.sentiment)}
                  <span className="text-sm text-gray-500">{feedback.user_email}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(feedback.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <h4 className="font-semibold text-gray-900 mb-2">{feedback.subject}</h4>
              <p className="text-gray-600 text-sm mb-3">{feedback.message}</p>

              {feedback.page_url && (
                <p className="text-xs text-gray-400 mb-3">Page: {feedback.page_url}</p>
              )}

              {feedback.admin_response && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                  <p className="text-sm font-medium text-blue-900 mb-1">Réponse admin:</p>
                  <p className="text-sm text-blue-800">{feedback.admin_response}</p>
                  {feedback.responded_at && (
                    <p className="text-xs text-blue-600 mt-2">
                      Répondu le{' '}
                      {new Date(feedback.responded_at).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {!feedback.admin_response && (
                  <button
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setResponseText('');
                    }}
                    className="px-3 py-1 bg-[#DC2626] text-white text-sm rounded-lg hover:bg-[#B91C1C]"
                  >
                    Répondre
                  </button>
                )}

                {feedback.status === 'new' && (
                  <button
                    onClick={() => handleStatusChange(feedback.id, 'in_review')}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Marquer en révision
                  </button>
                )}

                {(feedback.status === 'responded' || feedback.status === 'in_review') && (
                  <button
                    onClick={() => handleStatusChange(feedback.id, 'resolved')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    Marquer résolu
                  </button>
                )}

                {feedback.status === 'resolved' && (
                  <button
                    onClick={() => handleStatusChange(feedback.id, 'closed')}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {feedbacks.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun feedback trouvé avec ces filtres</p>
          </div>
        )}
      </div>

      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Répondre au feedback
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-900">{selectedFeedback.subject}</p>
              <p className="text-sm text-gray-600 mt-2">{selectedFeedback.message}</p>
            </div>

            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Votre réponse..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] resize-none"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setSelectedFeedback(null);
                  setResponseText('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleRespond}
                className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
              >
                Envoyer la réponse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
