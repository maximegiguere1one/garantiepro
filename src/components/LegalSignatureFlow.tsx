import { useState, useEffect } from 'react';
import { Check, AlertTriangle, FileText, Shield, Clock, MapPin } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import {
  LEGAL_TEXTS,
  getSignatureContext,
  getBrowserInfo,
  formatDateForLegal,
  getWithdrawalDeadline,
  generateSessionId,
  calculateDocumentHash,
  logSignatureEvent,
  type SignatureContext
} from '../lib/legal-signature-utils';

interface LegalSignatureFlowProps {
  warrantyId?: string;
  organizationId: string;
  documentContent: string;
  onComplete: (signatureData: {
    signerFullName: string;
    signerEmail: string;
    signerPhone: string;
    signatureDataUrl: string;
    documentHash: string;
    consentGiven: boolean;
    consentTimestamp: string;
    termsDisclosed: boolean;
    withdrawalNoticeShown: boolean;
    documentViewedAt: string;
    documentViewDuration: number;
    userAgent: string;
    ipAddress?: string;
    geolocation?: any;
    interfaceLanguage: string;
    signatureSessionId: string;
  }) => void;
  onCancel: () => void;
  language?: 'fr' | 'en';
}

type Step = 'preview' | 'disclosure' | 'identity' | 'signature' | 'complete';

export function LegalSignatureFlow({
  warrantyId,
  organizationId,
  documentContent,
  onComplete,
  onCancel,
  language = 'fr'
}: LegalSignatureFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('preview');
  const [sessionId] = useState(() => generateSessionId());
  const [context, setContext] = useState<SignatureContext>({});

  const [documentViewedAt] = useState(new Date());
  const [viewDuration, setViewDuration] = useState(0);
  const [documentRead, setDocumentRead] = useState(false);

  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<Date | null>(null);

  const [signerFullName, setSignerFullName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [documentHash, setDocumentHash] = useState('');

  const texts = LEGAL_TEXTS[language];

  useEffect(() => {
    getSignatureContext().then(setContext);

    // Only log event if warrantyId exists in database (not for new warranties)
    // For new warranties, warrantyId will be null and logging will happen after creation
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setViewDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    calculateDocumentHash(documentContent).then(setDocumentHash);
  }, [documentContent]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinueFromPreview = () => {
    // Log event only if warrantyId exists (not for new warranties)
    if (warrantyId) {
      logSignatureEvent(warrantyId, organizationId, 'terms_accepted', {
        duration: viewDuration
      }, sessionId).catch(err => {
        console.warn('Failed to log signature event:', err);
      });
    }
    setCurrentStep('disclosure');
  };

  const handleAcceptDisclosure = () => {
    const now = new Date();
    setConsentGiven(true);
    setConsentTimestamp(now);

    // Log event only if warrantyId exists
    if (warrantyId) {
      logSignatureEvent(warrantyId, organizationId, 'consent_given', {
        timestamp: now.toISOString()
      }, sessionId).catch(err => {
        console.warn('Failed to log signature event:', err);
      });
    }

    setCurrentStep('identity');
  };

  const handleIdentityConfirmed = () => {
    // Log event only if warrantyId exists
    if (warrantyId) {
      logSignatureEvent(warrantyId, organizationId, 'identity_verified', {
        name: signerFullName,
        email: signerEmail,
        phone: signerPhone
      }, sessionId).catch(err => {
        console.warn('Failed to log signature event:', err);
      });
    }
    setCurrentStep('signature');
  };

  const handleSignatureComplete = (dataUrl: string) => {
    console.log('[LegalSignatureFlow] Signature completed, validating...');

    if (!dataUrl || typeof dataUrl !== 'string') {
      console.error('[LegalSignatureFlow] Invalid signature data URL received');
      alert(language === 'fr'
        ? 'Erreur: signature invalide. Veuillez réessayer.'
        : 'Error: invalid signature. Please try again.');
      return;
    }

    if (!dataUrl.startsWith('data:image/png;base64,')) {
      console.error('[LegalSignatureFlow] Signature data URL has invalid format');
      alert(language === 'fr'
        ? 'Erreur: format de signature invalide. Veuillez réessayer.'
        : 'Error: invalid signature format. Please try again.');
      return;
    }

    try {
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data || base64Data.length < 100) {
        console.error('[LegalSignatureFlow] Signature data is too short');
        alert(language === 'fr'
          ? 'Erreur: signature trop courte ou vide. Veuillez réessayer.'
          : 'Error: signature too short or empty. Please try again.');
        return;
      }

      atob(base64Data);
    } catch (error) {
      console.error('[LegalSignatureFlow] Invalid base64 signature data:', error);
      alert(language === 'fr'
        ? 'Erreur: données de signature corrompues. Veuillez réessayer.'
        : 'Error: corrupted signature data. Please try again.');
      return;
    }

    console.log('[LegalSignatureFlow] Signature validated successfully');
    setSignatureDataUrl(dataUrl);

    // Log event only if warrantyId exists
    if (warrantyId) {
      logSignatureEvent(warrantyId, organizationId, 'signature_completed', {}, sessionId).catch(err => {
        console.warn('[LegalSignatureFlow] Failed to log signature event:', err);
      });
    }

    console.log('[LegalSignatureFlow] Completing signature flow with validated data');
    onComplete({
      signerFullName,
      signerEmail,
      signerPhone,
      signatureDataUrl: dataUrl,
      documentHash,
      consentGiven: true,
      consentTimestamp: consentTimestamp?.toISOString() || new Date().toISOString(),
      termsDisclosed: true,
      withdrawalNoticeShown: true,
      documentViewedAt: documentViewedAt.toISOString(),
      documentViewDuration: viewDuration,
      userAgent: context.userAgent || navigator.userAgent,
      ipAddress: context.ipAddress,
      geolocation: context.geolocation,
      interfaceLanguage: language,
      signatureSessionId: sessionId
    });
  };

  if (currentStep === 'preview') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          <div className="border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {language === 'fr' ? 'Contrat de Garantie' : 'Warranty Contract'}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{language === 'fr' ? 'Temps de consultation' : 'Review time'}: {formatDuration(viewDuration)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">
                    {language === 'fr' ? 'Veuillez lire attentivement' : 'Please read carefully'}
                  </p>
                  <p className="text-sm text-amber-800">
                    {language === 'fr'
                      ? 'Vous devez lire et comprendre l\'intégralité de ce contrat avant de pouvoir le signer. Prenez le temps nécessaire.'
                      : 'You must read and understand this entire contract before you can sign it. Take the time you need.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {documentContent}
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentRead}
                  onChange={(e) => setDocumentRead(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  {language === 'fr'
                    ? 'J\'ai lu et compris l\'intégralité de ce contrat'
                    : 'I have read and understood this entire contract'}
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              onClick={handleContinueFromPreview}
              disabled={!documentRead || viewDuration < 30}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
            >
              {language === 'fr' ? 'Continuer vers la signature' : 'Continue to signature'}
              <Check className="w-5 h-5" />
            </button>
          </div>

          {viewDuration < 30 && documentRead && (
            <div className="px-6 pb-4">
              <p className="text-xs text-amber-600 text-center">
                {language === 'fr'
                  ? 'Veuillez prendre au moins 30 secondes pour lire le contrat'
                  : 'Please take at least 30 seconds to review the contract'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'disclosure') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          <div className="border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4 flex items-center gap-3 bg-gradient-to-r from-primary-50 to-primary-100">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {language === 'fr' ? 'Divulgation Légale' : 'Legal Disclosure'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="space-y-4">
              <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
                <h3 className="font-bold text-primary-900 text-lg mb-3">
                  {language === 'fr' ? 'SIGNATURE ÉLECTRONIQUE' : 'ELECTRONIC SIGNATURE'}
                </h3>
                <div className="prose prose-blue text-sm whitespace-pre-line">
                  {texts.electronicSignatureDisclosure}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-900 font-medium">
                    {texts.consentCheckbox}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('preview')}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {language === 'fr' ? 'Retour' : 'Back'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                {language === 'fr' ? 'Refuser' : 'Decline'}
              </button>
              <button
                onClick={handleAcceptDisclosure}
                disabled={!consentGiven}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
              >
                {language === 'fr' ? 'Accepter et Signer' : 'Accept and Sign'}
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'identity') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {language === 'fr' ? 'Vérification d\'Identité' : 'Identity Verification'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {texts.identityVerification}
            </p>
          </div>

          <div className="p-3 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === 'fr' ? 'Nom complet' : 'Full name'} *
              </label>
              <input
                type="text"
                value={signerFullName}
                onChange={(e) => setSignerFullName(e.target.value)}
                placeholder={language === 'fr' ? 'Jean Tremblay' : 'John Smith'}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === 'fr' ? 'Adresse courriel' : 'Email address'} *
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="jean.tremblay@email.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === 'fr' ? 'Téléphone' : 'Phone'} {language === 'fr' ? '(optionnel)' : '(optional)'}
              </label>
              <input
                type="tel"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                placeholder="(514) 555-1234"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={identityConfirmed}
                  onChange={(e) => setIdentityConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  {texts.identityConfirmation}
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => setCurrentStep('disclosure')}
              className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {language === 'fr' ? 'Retour' : 'Back'}
            </button>
            <button
              onClick={handleIdentityConfirmed}
              disabled={!signerFullName || !signerEmail || !identityConfirmed}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
            >
              {language === 'fr' ? 'Continuer' : 'Continue'}
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'signature') {
    const withdrawalDeadline = getWithdrawalDeadline(new Date());

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {language === 'fr' ? 'Signature Électronique' : 'Electronic Signature'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {texts.signatureInstructions}
            </p>
          </div>

          <div className="p-3 sm:p-6">
            <SignaturePad
              onSave={handleSignatureComplete}
              onCancel={() => setCurrentStep('identity')}
              embedded={true}
            />

            <div className="mt-6 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">
                    {language === 'fr' ? 'Date et heure' : 'Date and time'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateForLegal(new Date())}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">
                    {language === 'fr' ? 'Navigateur' : 'Browser'}
                  </p>
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {getBrowserInfo()}
                  </p>
                </div>

                {context.ipAddress && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">
                      {language === 'fr' ? 'Adresse IP' : 'IP Address'}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {context.ipAddress}
                    </p>
                  </div>
                )}

                {context.geolocation && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-600 mb-1">
                        {language === 'fr' ? 'Emplacement' : 'Location'}
                      </p>
                      <p className="text-xs font-medium text-slate-900">
                        {context.geolocation.latitude.toFixed(4)}, {context.geolocation.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
                <p className="text-sm text-primary-900 font-medium mb-2">
                  {language === 'fr' ? '⚠️ Rappel - Droit de rétractation' : '⚠️ Reminder - Right of withdrawal'}
                </p>
                <p className="text-xs text-primary-800">
                  {language === 'fr'
                    ? `Vous disposez de 10 jours ouvrables pour annuler ce contrat. Date limite: ${new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(withdrawalDeadline)}`
                    : `You have 10 business days to cancel this contract. Deadline: ${new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(withdrawalDeadline)}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
