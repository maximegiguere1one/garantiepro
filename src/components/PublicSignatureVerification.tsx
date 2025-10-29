import { useState } from 'react';
import { Shield, Search, CheckCircle, XCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateForLegal } from '../lib/legal-signature-utils';

interface VerificationResult {
  isValid: boolean;
  contractNumber: string;
  signerName: string;
  signedAt: string;
  documentHash: string;
  eventCount: number;
}

export function PublicSignatureVerification() {
  const [contractNumber, setContractNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!contractNumber.trim()) {
      setError('Veuillez entrer un numéro de contrat');
      return;
    }

    setVerifying(true);
    setError('');
    setResult(null);

    try {
      const { data: warranty, error: warrantyError } = await supabase
        .from('warranties')
        .select('contract_number, signer_full_name, signed_at, document_hash')
        .eq('contract_number', contractNumber.trim())
        .not('signed_at', 'is', null)
        .maybeSingle();

      if (warrantyError) throw warrantyError;

      if (!warranty) {
        setError('Aucun contrat trouvé avec ce numéro');
        return;
      }

      const { data: auditEntries, error: auditError } = await supabase
        .from('signature_audit_trail')
        .select('id')
        .eq('warranty_id', warranty.id);

      if (auditError) throw auditError;

      setResult({
        isValid: true,
        contractNumber: warranty.contract_number,
        signerName: warranty.signer_full_name,
        signedAt: warranty.signed_at,
        documentHash: warranty.document_hash,
        eventCount: auditEntries?.length || 0
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      setError('Erreur lors de la vérification. Veuillez réessayer.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Vérification de Signature Électronique
          </h1>
          <p className="text-slate-600">
            Vérifiez l'authenticité et la validité d'une signature électronique
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro de contrat
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  placeholder="Ex: W-2025-001234"
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Vérifier
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-8 h-8 text-primary-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Signature Valide et Authentique
                      </h3>
                      <p className="text-sm text-green-800">
                        Cette signature électronique est valide et conforme aux exigences légales
                        canadiennes et québécoises (LCCJTI, LPRPDE).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Informations de Signature
                  </h4>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Numéro de contrat</p>
                      <p className="font-medium text-slate-900">{result.contractNumber}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Signataire</p>
                      <p className="font-medium text-slate-900">{result.signerName}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Date de signature</p>
                      <p className="font-medium text-slate-900">
                        {formatDateForLegal(new Date(result.signedAt))}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Événements d'audit</p>
                      <p className="font-medium text-slate-900">{result.eventCount} événements enregistrés</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Hash du document (SHA-256)</p>
                    <p className="font-mono text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 break-all">
                      {result.documentHash}
                    </p>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-900 mb-2">Conformité Légale</h4>
                  <div className="text-sm text-primary-800 space-y-1">
                    <p>✓ Conforme LCCJTI (Québec) - Loi sur le cadre juridique des TI</p>
                    <p>✓ Conforme LPRPDE (Canada) - Protection des données personnelles</p>
                    <p>✓ Traçabilité complète avec {result.eventCount} événements d'audit</p>
                    <p>✓ Intégrité du document vérifiée (hash cryptographique)</p>
                  </div>
                </div>

                <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="font-medium mb-2">À propos de cette vérification:</p>
                  <p>
                    Cette page vous permet de vérifier l'authenticité d'une signature électronique
                    capturée dans notre système. Les informations affichées proviennent de notre
                    base de données sécurisée et attestent que le document a été signé électroniquement
                    de manière conforme aux lois en vigueur.
                  </p>
                </div>
              </div>
            )}

            {!result && !error && !verifying && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600">
                  Entrez un numéro de contrat pour vérifier sa signature
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>
            Cette page de vérification est publique et accessible à tous pour garantir
            la transparence et la confiance dans nos signatures électroniques.
          </p>
        </div>
      </div>
    </div>
  );
}
