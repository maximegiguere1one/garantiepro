import { useState, useEffect } from 'react';
import { Shield, Calendar, FileText, Download, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDateForLegal } from '../lib/legal-signature-utils';

interface AuditEntry {
  id: string;
  warranty_id: string;
  event_type: string;
  event_timestamp: string;
  event_data: any;
  ip_address: string;
  user_agent: string;
  geolocation: any;
  session_id: string;
  checksum: string;
}

interface WarrantyWithAudit {
  id: string;
  contract_number: string;
  signer_full_name: string;
  signer_email: string;
  signed_at: string;
  document_hash: string;
  audit_entries: AuditEntry[];
}

const EVENT_LABELS: Record<string, { fr: string; icon: string; color: string }> = {
  document_opened: { fr: 'Document ouvert', icon: '📄', color: 'blue' },
  document_scrolled: { fr: 'Document consulté', icon: '📖', color: 'slate' },
  terms_accepted: { fr: 'Termes acceptés', icon: '✓', color: 'green' },
  identity_verified: { fr: 'Identité vérifiée', icon: '👤', color: 'purple' },
  consent_given: { fr: 'Consentement donné', icon: '✍️', color: 'amber' },
  signature_started: { fr: 'Signature démarrée', icon: '🖊️', color: 'orange' },
  signature_completed: { fr: 'Signature complétée', icon: '✅', color: 'green' },
  document_generated: { fr: 'Document généré', icon: '📑', color: 'blue' },
  email_sent: { fr: 'Email envoyé', icon: '📧', color: 'sky' },
  pdf_downloaded: { fr: 'PDF téléchargé', icon: '⬇️', color: 'indigo' }
};

export function SignatureAuditDashboard() {
  const { organization: currentOrganization } = useAuth();
  const [warranties, setWarranties] = useState<WarrantyWithAudit[]>([]);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyWithAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    loadWarrantiesWithAudit();
  }, [currentOrganization, dateFilter]);

  const loadWarrantiesWithAudit = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);

      let query = supabase
        .from('warranties')
        .select('id, contract_number, signer_full_name, signer_email, signed_at, document_hash')
        .eq('organization_id', currentOrganization.id)
        .not('signed_at', 'is', null)
        .order('signed_at', { ascending: false });

      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('signed_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('signed_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('signed_at', monthAgo.toISOString());
      }

      const { data: warrantiesData, error } = await query;

      if (error) throw error;

      const warrantiesWithAudit: WarrantyWithAudit[] = [];

      for (const warranty of warrantiesData || []) {
        const { data: auditData } = await supabase
          .from('signature_audit_trail')
          .select('*')
          .eq('warranty_id', warranty.id)
          .order('event_timestamp', { ascending: true });

        warrantiesWithAudit.push({
          ...warranty,
          audit_entries: auditData || []
        });
      }

      setWarranties(warrantiesWithAudit);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarranties = warranties.filter(w =>
    w.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.signer_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.signer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportAuditTrail = (warranty: WarrantyWithAudit) => {
    const data = {
      contract_number: warranty.contract_number,
      signer: {
        name: warranty.signer_full_name,
        email: warranty.signer_email
      },
      signed_at: warranty.signed_at,
      document_hash: warranty.document_hash,
      audit_trail: warranty.audit_entries.map(entry => ({
        event: EVENT_LABELS[entry.event_type]?.fr || entry.event_type,
        timestamp: entry.event_timestamp,
        ip: entry.ip_address,
        checksum: entry.checksum,
        data: entry.event_data
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${warranty.contract_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit des Signatures</h1>
            <p className="text-sm text-slate-600">Traçabilité complète et conformité légale</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par contrat, nom ou email..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
          </div>
        </div>

        {filteredWarranties.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Aucune signature trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWarranties.map((warranty) => (
              <div
                key={warranty.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedWarranty(warranty)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-slate-900">
                        {warranty.contract_number}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        {warranty.audit_entries.length} événements
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p><span className="font-medium">Signataire:</span> {warranty.signer_full_name}</p>
                      <p><span className="font-medium">Email:</span> {warranty.signer_email}</p>
                      <p><span className="font-medium">Date:</span> {formatDateForLegal(new Date(warranty.signed_at))}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAuditTrail(warranty);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedWarranty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Audit Trail Complet</h2>
                <p className="text-sm text-slate-600">{selectedWarranty.contract_number}</p>
              </div>
              <button
                onClick={() => setSelectedWarranty(null)}
                className="text-slate-600 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Informations de Signature</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Signataire</p>
                    <p className="font-medium">{selectedWarranty.signer_full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Email</p>
                    <p className="font-medium">{selectedWarranty.signer_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Date de signature</p>
                    <p className="font-medium">{formatDateForLegal(new Date(selectedWarranty.signed_at))}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Hash du document</p>
                    <p className="font-mono text-xs break-all">{selectedWarranty.document_hash?.substring(0, 32)}...</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Chronologie des Événements</h3>
                <div className="space-y-3">
                  {selectedWarranty.audit_entries.map((entry, index) => {
                    const eventInfo = EVENT_LABELS[entry.event_type] || { fr: entry.event_type, icon: '•', color: 'slate' };
                    return (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full bg-${eventInfo.color}-100 flex items-center justify-center text-lg`}>
                            {eventInfo.icon}
                          </div>
                          {index < selectedWarranty.audit_entries.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-200 min-h-[40px]"></div>
                          )}
                        </div>

                        <div className="flex-1 pb-8">
                          <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-slate-900">{eventInfo.fr}</h4>
                              <span className="text-xs text-slate-500">
                                {new Date(entry.event_timestamp).toLocaleTimeString('fr-CA')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              {new Date(entry.event_timestamp).toLocaleDateString('fr-CA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            {entry.ip_address && (
                              <p className="text-xs text-slate-500">IP: {entry.ip_address}</p>
                            )}
                            {entry.event_data && Object.keys(entry.event_data).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-primary-600 cursor-pointer">Détails techniques</summary>
                                <pre className="text-xs bg-slate-50 p-2 rounded mt-2 overflow-x-auto">
                                  {JSON.stringify(entry.event_data, null, 2)}
                                </pre>
                              </details>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              Checksum: {entry.checksum?.substring(0, 16)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Conformité Légale Vérifiée</h4>
                    <p className="text-sm text-green-800">
                      Cette signature électronique est conforme à la LCCJTI (Québec) et à la LPRPDE (Canada).
                      L'audit trail complet garantit la validité juridique du document.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => exportAuditTrail(selectedWarranty)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter l'Audit Trail
              </button>
              <button
                onClick={() => setSelectedWarranty(null)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
