import { useState, useEffect } from 'react';
import { X, Building2, ShieldCheck, DollarSign, Users, MessageSquare, Activity, AlertCircle, Phone, Mail as MailIcon, Tag as TagIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface Organization {
  id: string;
  name: string;
  status: string;
  billing_email: string;
  billing_phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  created_at: string;
}

interface OrganizationDetailModalProps {
  organization: Organization;
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = 'overview' | 'warranties' | 'transactions' | 'users' | 'communications' | 'notes' | 'alerts';

export function OrganizationDetailModal({ organization, onClose, onUpdate }: OrganizationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const { data } = await supabase.rpc('get_organization_full_stats', {
          org_id: organization.id
        });
        setStats(data);
      } else if (activeTab === 'warranties') {
        const { data } = await supabase
          .from('warranties')
          .select('*, customers(first_name, last_name, email)')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setWarranties(data || []);
      } else if (activeTab === 'transactions') {
        const { data } = await supabase
          .from('warranty_transactions')
          .select('*, warranties(contract_number)')
          .eq('organization_id', organization.id)
          .order('transaction_date', { ascending: false })
          .limit(20);
        setTransactions(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });
        setUsers(data || []);
      } else if (activeTab === 'communications') {
        const { data } = await supabase
          .from('organization_communications')
          .select('*, profiles(full_name)')
          .eq('organization_id', organization.id)
          .order('sent_at', { ascending: false })
          .limit(50);
        setCommunications(data || []);
      } else if (activeTab === 'notes') {
        const { data } = await supabase
          .from('organization_notes')
          .select('*, profiles(full_name)')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });
        setNotes(data || []);
      } else if (activeTab === 'alerts') {
        const { data } = await supabase
          .from('organization_alerts')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setAlerts(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('organization_notes')
        .insert({
          organization_id: organization.id,
          content: newNote,
          created_by: user?.id,
        });

      if (error) throw error;

      setNewNote('');
      loadData();
      showToast('Note ajoutée avec succès', 'success');
    } catch (error) {
      console.error('Error adding note:', error);
      showToast('Erreur lors de l\'ajout de la note', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: Building2 },
    { id: 'warranties', label: 'Garanties', icon: ShieldCheck },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'communications', label: 'Communications', icon: MessageSquare },
    { id: 'notes', label: 'Notes', icon: TagIcon },
    { id: 'alerts', label: 'Alertes', icon: AlertCircle },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{organization.name}</h2>
            <p className="text-slate-600 text-sm mt-1">
              {organization.city}, {organization.province}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex gap-1 px-6 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && stats && (
                <OverviewTab organization={organization} stats={stats} />
              )}
              {activeTab === 'warranties' && (
                <WarrantiesTab warranties={warranties} />
              )}
              {activeTab === 'transactions' && (
                <TransactionsTab transactions={transactions} />
              )}
              {activeTab === 'users' && (
                <UsersTab users={users} />
              )}
              {activeTab === 'communications' && (
                <CommunicationsTab communications={communications} />
              )}
              {activeTab === 'notes' && (
                <NotesTab
                  notes={notes}
                  newNote={newNote}
                  onNewNoteChange={setNewNote}
                  onAddNote={addNote}
                />
              )}
              {activeTab === 'alerts' && (
                <AlertsTab alerts={alerts} onUpdate={loadData} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ organization, stats }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200">
          <div className="text-sm text-primary-700 font-medium">Garanties</div>
          <div className="text-3xl font-bold text-primary-900 mt-2">{stats.warranty_count || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <div className="text-sm text-emerald-700 font-medium">Revenus Total</div>
          <div className="text-3xl font-bold text-emerald-900 mt-2">
            {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(stats.total_revenue || 0)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border border-purple-200">
          <div className="text-sm text-primary-700 font-medium">Utilisateurs</div>
          <div className="text-3xl font-bold text-primary-900 mt-2">{stats.user_count || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="text-sm text-orange-700 font-medium">Réclamations Actives</div>
          <div className="text-3xl font-bold text-orange-900 mt-2">{stats.active_claims || 0}</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Informations de Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <MailIcon className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="text-sm font-medium text-slate-900">{organization.billing_email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Téléphone</div>
              <div className="text-sm font-medium text-slate-900">{organization.billing_phone || 'N/A'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Adresse</div>
              <div className="text-sm font-medium text-slate-900">
                {organization.address || 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">Ville / Province</div>
              <div className="text-sm font-medium text-slate-900">
                {organization.city}, {organization.province}
              </div>
            </div>
          </div>
        </div>
      </div>

      {stats.tags && stats.tags.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {stats.tags.map((tag: any) => (
              <span
                key={tag.id}
                className="px-3 py-1 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WarrantiesTab({ warranties }: any) {
  return (
    <div className="space-y-3">
      {warranties.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          Aucune garantie pour le moment
        </div>
      ) : (
        warranties.map((warranty: any) => (
          <div key={warranty.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{warranty.contract_number}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {warranty.customers?.first_name} {warranty.customers?.last_name} • {warranty.customers?.email}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(warranty.total_price)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(warranty.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TransactionsTab({ transactions }: any) {
  return (
    <div className="space-y-3">
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          Aucune transaction pour le moment
        </div>
      ) : (
        transactions.map((transaction: any) => (
          <div key={transaction.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{transaction.warranties?.contract_number}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {new Date(transaction.transaction_date).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transaction.total_amount)}
                </div>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                  transaction.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function UsersTab({ users }: any) {
  return (
    <div className="space-y-3">
      {users.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          Aucun utilisateur pour le moment
        </div>
      ) : (
        users.map((user: any) => (
          <div key={user.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-700">
                    {user.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-slate-900">{user.full_name}</div>
                  <div className="text-sm text-slate-600">{user.email}</div>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-lg capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CommunicationsTab({ communications }: any) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <MailIcon className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {communications.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          Aucune communication pour le moment
        </div>
      ) : (
        communications.map((comm: any) => (
          <div key={comm.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                {getTypeIcon(comm.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{comm.subject || comm.type}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(comm.sent_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {comm.content && (
                  <p className="text-sm text-slate-600 line-clamp-2">{comm.content}</p>
                )}
                <div className="text-xs text-slate-500 mt-2">
                  Par {comm.profiles?.full_name || 'Système'}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function NotesTab({ notes, newNote, onNewNoteChange, onAddNote }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <textarea
          value={newNote}
          onChange={(e) => onNewNoteChange(e.target.value)}
          placeholder="Ajouter une note privée..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
          rows={3}
        />
        <button
          onClick={onAddNote}
          disabled={!newNote.trim()}
          className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Ajouter la note
        </button>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            Aucune note pour le moment
          </div>
        ) : (
          notes.map((note: any) => (
            <div key={note.id} className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-slate-700">{note.content}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Par {note.profiles?.full_name || 'Inconnu'}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(note.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AlertsTab({ alerts, onUpdate }: any) {
  const { showToast } = useToast();

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('organization_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      onUpdate();
      showToast('Alerte marquée comme lue', 'success');
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-primary-100 text-primary-700 border-primary-200';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          Aucune alerte pour le moment
        </div>
      ) : (
        alerts.map((alert: any) => (
          <div
            key={alert.id}
            className={`rounded-lg p-4 border ${getSeverityColor(alert.severity)} ${
              !alert.is_read ? 'ring-2 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium mb-1">{alert.title}</div>
                <p className="text-sm opacity-90">{alert.message}</p>
                <div className="text-xs opacity-75 mt-2">
                  {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              {!alert.is_read && (
                <button
                  onClick={() => markAsRead(alert.id)}
                  className="ml-4 px-3 py-1 bg-white/50 hover:bg-white rounded text-xs font-medium"
                >
                  Marquer lu
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
