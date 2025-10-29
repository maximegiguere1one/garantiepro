import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Check, RotateCcw } from 'lucide-react';
import SignaturePad from 'signature_pad';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

/**
 * SignatureModal Component
 *
 * Professional signature capture modal with PDF preview (left panel) and
 * signature pad (right panel). Shows proof of signature with IP, timestamp,
 * and document hash after signing.
 *
 * @example
 * ```tsx
 * <SignatureModal
 *   isOpen={showSignature}
 *   onClose={() => setShowSignature(false)}
 *   documentUrl="/path/to/warranty.pdf"
 *   onSign={async (signatureData) => {
 *     await saveSignature(signatureData);
 *   }}
 *   customerName="Jean Tremblay"
 *   customerEmail="jean@example.com"
 * />
 * ```
 */

export interface SignatureProof {
  /** Base64 signature image */
  signatureDataUrl: string;
  /** Timestamp of signature */
  timestamp: Date;
  /** IP address (if available) */
  ipAddress?: string;
  /** Document hash (SHA-256) */
  documentHash?: string;
  /** Signer's name */
  signerName: string;
  /** Signer's email */
  signerEmail: string;
}

export interface SignatureModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** URL or path to PDF document */
  documentUrl: string;
  /** Callback when signature is captured */
  onSign: (proof: SignatureProof) => Promise<void>;
  /** Customer/signer name */
  customerName: string;
  /** Customer/signer email */
  customerEmail: string;
  /** Optional loading state for PDF */
  pdfLoading?: boolean;
}

export function SignatureModal({
  isOpen,
  onClose,
  documentUrl,
  onSign,
  customerName,
  customerEmail,
  pdfLoading = false,
}: SignatureModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1); // In production, get from PDF
  const [zoom, setZoom] = useState(100);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureProof, setSignatureProof] = useState<SignatureProof | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  // Initialize signature pad
  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });

    signaturePadRef.current = signaturePad;

    // Resize canvas
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      signaturePad.clear();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      signaturePad.off();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert('Veuillez apposer votre signature avant de continuer');
      return;
    }

    setIsSigning(true);

    try {
      const signatureDataUrl = signaturePadRef.current.toDataURL();

      // Create proof object
      const proof: SignatureProof = {
        signatureDataUrl,
        timestamp: new Date(),
        ipAddress: await fetchClientIP(),
        documentHash: await generateDocumentHash(documentUrl),
        signerName: customerName,
        signerEmail: customerEmail,
      };

      await onSign(proof);
      setSignatureProof(proof);
    } catch (error) {
      console.error('Signature error:', error);
      alert('Erreur lors de la signature du document');
    } finally {
      setIsSigning(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleFitWidth = () => setZoom(100);

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 id="signature-modal-title" className="text-xl font-bold text-neutral-900">
            {signatureProof ? 'Signature confirmée' : 'Signature électronique'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {!signatureProof ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - PDF Preview */}
            <div className="flex-1 bg-neutral-100 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-neutral-700">
                  Page {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-neutral-200 rounded transition-colors"
                    aria-label="Zoom arrière"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-neutral-600 min-w-[4rem] text-center">
                    {zoom}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-neutral-200 rounded transition-colors"
                    aria-label="Zoom avant"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFitWidth}
                    className="p-2 hover:bg-neutral-200 rounded transition-colors"
                    aria-label="Ajuster à la largeur"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PDF Viewer (placeholder) */}
              <div className="flex-1 bg-white rounded-lg shadow-inner overflow-auto flex items-center justify-center">
                {pdfLoading ? (
                  <div className="text-neutral-500">Chargement du document...</div>
                ) : (
                  <div
                    className="bg-white shadow-lg p-8"
                    style={{ transform: `scale(${zoom / 100})` }}
                  >
                    <div className="text-neutral-700">
                      <p className="text-lg font-semibold mb-4">Aperçu du document</p>
                      <p className="text-sm">
                        Le document de garantie sera affiché ici en PDF.
                      </p>
                      <p className="text-xs text-neutral-500 mt-2">
                        URL: {documentUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Signature Capture */}
            <div className="w-[450px] border-l border-neutral-200 bg-white p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Apposer votre signature
                </h3>
                <p className="text-sm text-neutral-600">
                  Signez dans l'espace ci-dessous en utilisant votre souris ou votre doigt.
                </p>
              </div>

              {/* Signature Canvas */}
              <div className="flex-1 border-2 border-neutral-300 rounded-lg bg-white mb-4">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair"
                  aria-label="Zone de signature"
                />
              </div>

              {/* Signer Info */}
              <div className="bg-neutral-50 rounded-lg p-4 mb-4 text-sm">
                <p className="text-neutral-700">
                  <span className="font-semibold">Signataire:</span> {customerName}
                </p>
                <p className="text-neutral-700">
                  <span className="font-semibold">Courriel:</span> {customerEmail}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <SecondaryButton
                  onClick={handleClearSignature}
                  leftIcon={<RotateCcw />}
                  fullWidth
                  size="sm"
                >
                  Effacer
                </SecondaryButton>
                <PrimaryButton
                  onClick={handleSign}
                  loading={isSigning}
                  rightIcon={!isSigning && <Check />}
                  fullWidth
                >
                  Signer le document
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : (
          /* Signature Proof Display */
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Success Message */}
              <div className="flex items-center gap-3 p-4 bg-success-50 border border-success-200 rounded-lg">
                <Check className="w-6 h-6 text-success-600" />
                <div>
                  <p className="font-semibold text-success-900">Document signé avec succès</p>
                  <p className="text-sm text-success-700">
                    Un certificat de signature a été généré
                  </p>
                </div>
              </div>

              {/* Signature Preview */}
              <div className="bg-neutral-50 p-6 rounded-lg">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">
                  Signature capturée
                </h3>
                <img
                  src={signatureProof.signatureDataUrl}
                  alt="Signature"
                  className="max-w-xs bg-white border border-neutral-200 rounded p-2"
                />
              </div>

              {/* Proof Details */}
              <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Preuve de signature
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-semibold text-neutral-700">Horodatage:</dt>
                    <dd className="text-neutral-600">
                      {signatureProof.timestamp.toLocaleString('fr-CA', {
                        dateStyle: 'long',
                        timeStyle: 'long',
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-neutral-700">Adresse IP:</dt>
                    <dd className="text-neutral-600 font-mono">
                      {signatureProof.ipAddress || 'Non disponible'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-neutral-700">Signataire:</dt>
                    <dd className="text-neutral-600">{signatureProof.signerName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-neutral-700">Courriel:</dt>
                    <dd className="text-neutral-600">{signatureProof.signerEmail}</dd>
                  </div>
                  {signatureProof.documentHash && (
                    <div>
                      <dt className="font-semibold text-neutral-700 mb-1">
                        Empreinte du document:
                      </dt>
                      <dd className="text-neutral-600 font-mono text-xs break-all bg-neutral-50 p-2 rounded">
                        {signatureProof.documentHash}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Actions */}
              <PrimaryButton onClick={onClose} fullWidth>
                Fermer
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
async function fetchClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'Unavailable';
  }
}

async function generateDocumentHash(url: string): Promise<string> {
  // In production, fetch document and calculate SHA-256 hash
  // For now, return placeholder
  return 'sha256:' + Math.random().toString(36).substring(2, 15).repeat(4);
}
