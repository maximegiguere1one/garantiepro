import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle, DollarSign, Mail, Phone, MapPin, Loader2, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CustomerHistoryProps {
  customerId: string;
  onClose: () => void;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  created_at: string;
  consent_marketing: boolean;
  language_preference: string;
}

interface Warranty {
  id: string;
  contract_number: string;
  status: string;
  total_price: number;
  created_at: string;
  start_date: string;
  end_date: string;
  trailers?: {
    make: string;
    model: string;
    year: number;
    vin: string;
  };
  warranty_plans?: {
    name: string;
  };
}

interface Claim {
  id: string;
  claim_number: string;
  status: string;
  incident_date: string;
  incident_description: string;
  approved_amount: number | null;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  type: 'warranty' | 'claim';
  date: string;
  title: string;
  subtitle: string;
  status: string;
  amount?: number;
  metadata?: any;
}

export function CustomerHistory({ customerId, onClose }: CustomerHistoryProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'warranties' | 'claims'>('timeline');

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);

      const [customerRes, warrantiesRes, claimsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .maybeSingle(),
        supabase
          .from('warranties')
          .select('*, trailers(*), warranty_plans(name)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('claims')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
      ]);

      if (customerRes.error) throw customerRes.error;
      if (warrantiesRes.error) throw warrantiesRes.error;
      if (claimsRes.error) throw claimsRes.error;

      setCustomer(customerRes.data);
      setWarranties(warrantiesRes.data || []);
      setClaims(claimsRes.data || []);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    warranties.forEach(w => {
      events.push({
        id: w.id,
        type: 'warranty',
        date: w.created_at,
        title: w.contract_number,
        subtitle: (w.warranty_plans as any)?.name || 'Plan de garantie',
        status: w.status,
        amount: w.total_price,
        metadata: w,
      });
    });

    claims.forEach(c => {
      events.push({
        id: c.id,
        type: 'claim',
        date: c.created_at,
        title: c.claim_number,
        subtitle: c.incident_description?.substring(0, 80) + '...',
        status: c.status,
        amount: c.approved_amount || undefined,
        metadata: c,
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800',
      expired: 'bg-slate-100 text-slate-800',
      cancelled: 'bg-red-100 text-red-800',
      submitted: 'bg-primary-100 text-primary-800',
      under_review: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      denied: 'bg-red-100 text-red-800',
      completed: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Active',
      expired: 'Expirée',
      cancelled: 'Annulée',
      submitted: 'Soumise',
      under_review: 'En révision',
      approved: 'Approuvée',
      denied: 'Refusée',
      completed: 'Complétée',
    };
    return labels[status] || status;
  };

  const getTotalSpent = () => {
    return warranties.reduce((sum, w) => sum + w.total_price, 0);
  };

  const getActiveWarranties = () => {
    return warranties.filter(w => w.status === 'active').length;
  };

  const getTotalClaims = () => {
    return claims.length;
  };

  const getApprovedClaimsAmount = () => {
    return claims
      .filter(c => c.status === 'approved' || c.status === 'completed')
      .reduce((sum, c) => sum + (c.approved_amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const timeline = getTimeline();

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center p-4 pt-10">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-slate-200 rounded-t-2xl z-10">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {customer.first_name} {customer.last_name}
                  </h2>
                  <p className="text-slate-500">Client depuis {format(new Date(customer.created_at), 'MMMM yyyy', { locale: fr })}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 px-6 pb-6">
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Total dépensé</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{getTotalSpent().toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-primary-600 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-medium">Garanties actives</span>
                </div>
                <p className="text-2xl font-bold text-primary-900">{getActiveWarranties()}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Réclamations</span>
                </div>
                <p className="text-2xl font-bold text-amber-900">{getTotalClaims()}</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-primary-600 mb-1">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-medium">Remboursements</span>
                </div>
                <p className="text-2xl font-bold text-primary-900">{getApprovedClaimsAmount().toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 px-6 pb-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{customer.city}, {customer.province}</span>
              </div>
            </div>

            <div className="flex gap-1 px-6">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'timeline'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Chronologie
              </button>
              <button
                onClick={() => setActiveTab('warranties')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'warranties'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Garanties ({warranties.length})
              </button>
              <button
                onClick={() => setActiveTab('claims')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'claims'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Réclamations ({claims.length})
              </button>
            </div>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={`${event.type}-${event.id}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.type === 'warranty' ? 'bg-primary-100' : 'bg-amber-100'
                      }`}>
                        {event.type === 'warranty' && <ShieldCheck className="w-5 h-5 text-primary-600" />}
                        {event.type === 'claim' && <AlertCircle className="w-5 h-5 text-amber-600" />}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-200 my-2" style={{ minHeight: '30px' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{event.title}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{event.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">
                            {format(new Date(event.date), 'dd MMM yyyy', { locale: fr })}
                          </p>
                          {event.amount && (
                            <p className="text-sm font-medium text-slate-900 mt-0.5">
                              {event.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                        {getStatusLabel(event.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'warranties' && (
              <div className="space-y-4">
                {warranties.map(warranty => (
                  <div key={warranty.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{warranty.contract_number}</p>
                        <p className="text-sm text-slate-600">{(warranty.warranty_plans as any)?.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(warranty.status)}`}>
                        {getStatusLabel(warranty.status)}
                      </span>
                    </div>
                    {warranty.trailers && (
                      <p className="text-sm text-slate-600 mb-2">
                        {(warranty.trailers as any).year} {(warranty.trailers as any).make} {(warranty.trailers as any).model}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        {format(new Date(warranty.start_date), 'dd MMM yyyy', { locale: fr })} - {format(new Date(warranty.end_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      <span className="font-medium text-slate-900">
                        {warranty.total_price.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'claims' && (
              <div className="space-y-4">
                {claims.map(claim => (
                  <div key={claim.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{claim.claim_number}</p>
                        <p className="text-sm text-slate-600 mt-1">{claim.incident_description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                        {getStatusLabel(claim.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-slate-500">
                        {format(new Date(claim.incident_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      {claim.approved_amount && (
                        <span className="font-medium text-emerald-600">
                          Approuvé: {claim.approved_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
