import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileText, Receipt, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { validateDownloadToken, getDownloadApiUrl } from '../lib/warranty-download-utils';

interface WarrantyDocuments {
  contractUrl: string | null;
  customerInvoiceUrl: string | null;
  warrantyDetails: {
    contractNumber: string;
    customerName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  };
}

export function WarrantyDownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<WarrantyDocuments | null>(null);
  const [downloadsRemaining, setDownloadsRemaining] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setValidating(false);
      setLoading(false);
      setErrorMessage('Aucun token de téléchargement fourni');
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    try {
      setValidating(true);
      const validation = await validateDownloadToken(token);

      if (!validation.isValid) {
        setIsValid(false);
        setErrorMessage(validation.errorMessage || 'Token invalide');
      } else {
        setIsValid(true);
        setDownloadsRemaining(validation.downloadsRemaining);
      }
    } catch (error) {
      setIsValid(false);
      setErrorMessage('Erreur lors de la validation du token');
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!token || !isValid) return;

    try {
      setLoading(true);
      const apiUrl = getDownloadApiUrl(token, 'all');

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success && data.documents) {
        setDocuments(data.documents);
        setDownloadsRemaining(data.downloadsRemaining);
      } else {
        setErrorMessage(data.error || 'Erreur lors du chargement des documents');
        setIsValid(false);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setErrorMessage('Erreur lors du chargement des documents');
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isValid && !validating && !documents) {
      loadDocuments();
    }
  }, [isValid, validating]);

  const downloadDocument = async (documentType: 'contract' | 'customer_invoice') => {
    if (!token || !documents) return;

    try {
      setDownloading(documentType);

      const url = documentType === 'contract' ? documents.contractUrl : documents.customerInvoiceUrl;
      if (!url) {
        throw new Error('URL de document non disponible');
      }

      // Open in new tab for direct download
      window.open(url, '_blank');

      // Refresh documents to get updated download count
      await loadDocuments();
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Erreur lors du téléchargement du document');
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    if (!documents) return;

    if (documents.contractUrl) {
      await downloadDocument('contract');
    }

    // Wait a bit to avoid issues
    setTimeout(async () => {
      if (documents.customerInvoiceUrl) {
        await downloadDocument('customer_invoice');
      }
    }, 500);
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Validation de votre lien de téléchargement...</p>
        </div>
      </div>
    );
  }

  if (!isValid || errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Lien Invalide</h1>
          <p className="text-gray-600 text-center mb-6">{errorMessage}</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Si vous avez besoin d'accéder à vos documents, veuillez contacter notre équipe de support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !documents) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement de vos documents...</p>
        </div>
      </div>
    );
  }

  if (!documents) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Aucun document disponible</p>
        </div>
      </div>
    );
  }

  const { warrantyDetails } = documents;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-10 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <Shield className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">Vos Documents de Garantie</h1>
            <p className="text-green-100 text-center text-lg">Téléchargez vos documents en toute sécurité</p>
          </div>

          <div className="px-8 py-6">
            {/* Warranty Details */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-primary-600 mr-2" />
                Détails de Votre Garantie
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Numéro de contrat</p>
                  <p className="font-semibold text-gray-900">{warrantyDetails.contractNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-semibold text-gray-900">{warrantyDetails.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date de début</p>
                  <p className="font-semibold text-gray-900">{new Date(warrantyDetails.startDate).toLocaleDateString('fr-CA')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date de fin</p>
                  <p className="font-semibold text-gray-900">{new Date(warrantyDetails.endDate).toLocaleDateString('fr-CA')}</p>
                </div>
              </div>
            </div>

            {/* Downloads Remaining */}
            {downloadsRemaining !== null && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-primary-600 mr-2" />
                  <p className="text-sm text-primary-900">
                    {downloadsRemaining === null
                      ? 'Téléchargements illimités'
                      : `${downloadsRemaining} téléchargements restants`}
                  </p>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Documents Disponibles</h2>

              {/* Contract */}
              {documents.contractUrl && (
                <button
                  onClick={() => downloadDocument('contract')}
                  disabled={downloading !== null}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl p-6 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-lg">Contrat de Garantie Signé</h3>
                        <p className="text-primary-100 text-sm">Document officiel avec signature électronique</p>
                      </div>
                    </div>
                    {downloading === 'contract' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <Download className="w-6 h-6" />
                    )}
                  </div>
                </button>
              )}

              {/* Invoice */}
              {documents.customerInvoiceUrl && (
                <button
                  onClick={() => downloadDocument('customer_invoice')}
                  disabled={downloading !== null}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl p-6 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-lg">Facture Détaillée</h3>
                        <p className="text-primary-100 text-sm">Montant: {warrantyDetails.totalPrice.toFixed(2)} $ CAD</p>
                      </div>
                    </div>
                    {downloading === 'customer_invoice' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <Download className="w-6 h-6" />
                    )}
                  </div>
                </button>
              )}

              {/* Download All Button */}
              {documents.contractUrl && documents.customerInvoiceUrl && (
                <button
                  onClick={downloadAll}
                  disabled={downloading !== null}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl p-6 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <Download className="w-6 h-6" />
                    <span className="font-bold text-lg">Tout Télécharger</span>
                  </div>
                </button>
              )}
            </div>

            {/* Help Section */}
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-900">Besoin d'aide?</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Conservez ces documents en lieu sûr. En cas de problème, contactez notre équipe de support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p className="mb-2">
            <strong>Location Pro-Remorque</strong>
          </p>
          <p>Plateforme professionnelle de gestion de garanties</p>
        </div>
      </div>
    </div>
  );
}
