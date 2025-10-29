import { useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { NewClaimForm } from './NewClaimForm';
import { UploadedFilesList } from './FileUpload';
import { ClaimDecisionModal } from './ClaimDecisionModal';
import { ClaimStatusTracker } from './ClaimStatusTracker';
import { exportClaimsToCSV } from '../lib/data-export';
import { Breadcrumbs } from './common/Breadcrumbs';
import { AnimatedButton } from './common/AnimatedButton';
import { ProgressIndicator } from './common/ProgressIndicator';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  ChevronRight,
  FileDown,
  Gavel,
  Link as LinkIcon,
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Claim = Database['public']['Tables']['claims']['Row'] & {
  customers?: Database['public']['Tables']['customers']['Row'];
  warranties?: Database['public']['Tables']['warranties']['Row'] & {
    warranty_plans?: Database['public']['Tables']['warranty_plans']['Row'];
  };
};

export const ClaimsCenter = memo(() => {
  const { profile } = useAuth();
  const toast = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimTimeline, setClaimTimeline] = useState<any[]>([]);
  const [claimAttachments, setClaimAttachments] = useState<any[]>([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [claimForDecision, setClaimForDecision] = useState<Claim | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      let query = supabase
        .from('claims')
        .select(`
          *,
          customers(*),
          warranties(*, warranty_plans(*))
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'client') {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (customer) {
          query = query.eq('customer_id', customer.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      console.error('Error loading claims:', error);
      toast.error('Erreur', 'Impossible de charger les réclamations');
    } finally {
      setLoading(false);
    }
  };

  const loadClaimDetails = async (claimId: string) => {
    try {
      const [timelineResult, attachmentsResult] = await Promise.all([
        supabase
          .from('claim_timeline')
          .select('*')
          .eq('claim_id', claimId)
          .order('created_at', { ascending: false }),
        supabase
          .from('claim_attachments')
          .select('*')
          .eq('claim_id', claimId)
          .order('created_at', { ascending: false }),
      ]);

      if (timelineResult.error) throw timelineResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;

      setClaimTimeline(timelineResult.data || []);
      setClaimAttachments(attachmentsResult.data || []);
    } catch (error: any) {
      console.error('Error loading claim details:', error);
      toast.error('Erreur', 'Impossible de charger les détails');
    }
  };

  const handleViewClaim = async (claim: Claim) => {
    setSelectedClaim(claim);
    await loadClaimDetails(claim.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-primary-100 text-primary-700';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'partially_approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'denied':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <FileText className="w-5 h-5" />;
      case 'under_review':
        return <Clock className="w-5 h-5" />;
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'partially_approved':
        return <AlertCircle className="w-5 h-5" />;
      case 'denied':
        return <XCircle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStepProgress = (currentStep: number) => {
    return [
      { label: 'Incident Report', completed: currentStep > 1 },
      { label: 'Documentation', completed: currentStep > 2 },
      { label: 'Review', completed: currentStep > 3 },
      { label: 'Decision', completed: currentStep > 4 },
      { label: 'Resolution', completed: currentStep > 5 },
    ];
  };

  const groupedClaims = {
    active: claims.filter((c) => ['submitted', 'under_review'].includes(c.status)),
    decided: claims.filter((c) => ['approved', 'partially_approved', 'denied'].includes(c.status)),
    completed: claims.filter((c) => c.status === 'completed'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      exportClaimsToCSV(claims);
      toast.success('Export réussi', 'Les réclamations ont été exportées');
    } catch (error: any) {
      toast.error('Erreur', 'Impossible d\'exporter les réclamations');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Réclamations' }]} />

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Centre de réclamations</h1>
            <p className="text-slate-600 mt-2">Suivez et gérez les réclamations de garantie</p>
          </div>
          <div className="flex items-center gap-3">
            {claims.length > 0 && (
              <AnimatedButton
                variant="secondary"
                onClick={handleExport}
                loading={exporting}
                icon={<FileDown className="w-5 h-5" />}
              >
                Exporter
              </AnimatedButton>
            )}
            <AnimatedButton
              variant="primary"
              onClick={() => setShowNewClaim(true)}
              icon={<Plus className="w-5 h-5" />}
            >
              Nouvelle réclamation
            </AnimatedButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Réclamations actives</h3>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{groupedClaims.active.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Décidées</h3>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{groupedClaims.decided.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Complétées</h3>
            <CheckCircle className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{groupedClaims.completed.length}</p>
        </div>
      </div>

      <div className="space-y-6">
        {['active', 'decided', 'completed'].map((group) => {
          const groupClaims = groupedClaims[group as keyof typeof groupedClaims];
          if (groupClaims.length === 0) return null;

          return (
            <div key={group}>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 capitalize">{group} Claims</h2>
              <div className="grid gap-4">
                {groupClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => handleViewClaim(claim)}>
                        <div className={`p-2 rounded-lg ${getStatusColor(claim.status)}`}>
                          {getStatusIcon(claim.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{claim.claim_number}</h3>
                            {claim.submission_method === 'public_link' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                                <LinkIcon className="w-3 h-3" />
                                Public
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {claim.customers?.first_name} {claim.customers?.last_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Warranty: {claim.warranties?.contract_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(profile?.role === 'admin' || profile?.role === 'f_and_i') &&
                          claim.status === 'submitted' && (
                            <AnimatedButton
                              variant="primary"
                              onClick={() => {
                                setClaimForDecision(claim);
                                setShowDecisionModal(true);
                              }}
                              icon={<Gavel className="w-4 h-4" />}
                            >
                              Décider
                            </AnimatedButton>
                          )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            claim.status
                          )}`}
                        >
                          {claim.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-400 cursor-pointer" onClick={() => handleViewClaim(claim)} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Incident Date:</span>{' '}
                        {new Date(claim.incident_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 line-clamp-2">{claim.incident_description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Step</p>
                          <p className="text-sm font-medium text-slate-900">
                            {claim.current_step} of 5
                          </p>
                        </div>
                        {claim.approved_amount && (
                          <div>
                            <p className="text-xs text-slate-500">Approved Amount</p>
                            <p className="text-sm font-medium text-slate-900">
                              ${claim.approved_amount.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {claim.sla_deadline && (
                          <div>
                            <p className="text-xs text-slate-500">SLA Deadline</p>
                            <p className="text-sm font-medium text-slate-900">
                              {new Date(claim.sla_deadline).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium ${
                              step <= claim.current_step
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {claims.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune réclamation</h3>
          <p className="text-slate-600 mb-4">Déposez votre première réclamation pour commencer</p>
          <button
            onClick={() => setShowNewClaim(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
          >
            Déposer une réclamation
          </button>
        </div>
      )}

      {showNewClaim && (
        <NewClaimForm
          onClose={() => setShowNewClaim(false)}
          onSuccess={loadClaims}
        />
      )}

      {selectedClaim && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedClaim(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">{selectedClaim.claim_number}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    selectedClaim.status
                  )}`}
                >
                  {selectedClaim.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <ProgressIndicator
                steps={getStepProgress(selectedClaim.current_step)}
                currentStep={selectedClaim.current_step - 1}
              />
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Customer Information</h3>
                  <p className="text-slate-600">
                    {selectedClaim.customers?.first_name} {selectedClaim.customers?.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{selectedClaim.customers?.email}</p>
                  <p className="text-sm text-slate-500">{selectedClaim.customers?.phone}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Incident Details</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500">Incident Date</p>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(selectedClaim.incident_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Reported Date</p>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(selectedClaim.reported_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{selectedClaim.incident_description}</p>
                  </div>
                </div>

                {selectedClaim.repair_shop_name && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Repair Shop</h3>
                    <p className="text-slate-600">{selectedClaim.repair_shop_name}</p>
                    <p className="text-sm text-slate-500">{selectedClaim.repair_shop_contact}</p>
                    {selectedClaim.po_number && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">PO #:</span>
                        <span className="text-sm text-slate-600">{selectedClaim.po_number}</span>
                        {selectedClaim.po_amount && (
                          <span className="text-sm text-slate-600">
                            - ${selectedClaim.po_amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(selectedClaim.approved_amount || selectedClaim.denied_reason) && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Decision</h3>
                    {selectedClaim.approved_amount && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-2">
                        <p className="text-sm font-medium text-emerald-900">Approved Amount</p>
                        <p className="text-2xl font-bold text-emerald-900">
                          ${selectedClaim.approved_amount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedClaim.denied_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-900 mb-1">Denial Reason</p>
                        <p className="text-sm text-red-700">{selectedClaim.denied_reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {claimAttachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Pièces jointes</h3>
                    <UploadedFilesList
                      files={claimAttachments.map(att => ({
                        name: att.file_name,
                        url: att.file_url,
                        size: att.file_size,
                        type: att.file_type
                      }))}
                      showDelete={false}
                    />
                  </div>
                )}

                {claimTimeline.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Chronologie</h3>
                    <div className="space-y-3">
                      {claimTimeline.map((event, index) => (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-slate-900" />
                            {index < claimTimeline.length - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-300 mt-1" style={{ minHeight: '40px' }} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm font-medium text-slate-900">{event.description}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(event.created_at).toLocaleString('fr-CA')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6">
                <ClaimStatusTracker
                  claimId={selectedClaim.id}
                  claimNumber={selectedClaim.claim_number}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-between">
              <div>
                {(profile?.role === 'admin' || profile?.role === 'f_and_i') &&
                  selectedClaim.status === 'submitted' && (
                    <button
                      onClick={() => {
                        setClaimForDecision(selectedClaim);
                        setShowDecisionModal(true);
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <Gavel className="w-5 h-5" />
                      Prendre une décision
                    </button>
                  )}
              </div>
              <button
                onClick={() => {
                  setSelectedClaim(null);
                  setClaimTimeline([]);
                  setClaimAttachments([]);
                }}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showDecisionModal && claimForDecision && (
        <ClaimDecisionModal
          claim={claimForDecision}
          onClose={() => {
            setShowDecisionModal(false);
            setClaimForDecision(null);
          }}
          onSuccess={() => {
            loadClaims();
            if (selectedClaim?.id === claimForDecision.id) {
              loadClaimDetails(claimForDecision.id);
            }
          }}
        />
      )}
    </div>
  );
});

ClaimsCenter.displayName = 'ClaimsCenter';
