import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getFullClaimUrl } from '../lib/qr-code-utils';
import { Copy, Check, Link as LinkIcon, QrCode } from 'lucide-react';
import QRCodeLib from 'qrcode';

interface ClaimLinkDisplayProps {
  warrantyId: string;
}

export function ClaimLinkDisplay({ warrantyId }: ClaimLinkDisplayProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    loadToken();
  }, [warrantyId]);

  useEffect(() => {
    if (token && showQR) {
      generateQRCode();
    }
  }, [token, showQR]);

  const loadToken = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warranty_claim_tokens')
        .select('token, is_used, expires_at')
        .eq('warranty_id', warrantyId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setToken(data.token);
      }
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!token) return;

    try {
      const url = getFullClaimUrl(token);
      const qrDataUrl = await QRCodeLib.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyToClipboard = async () => {
    if (!token) return;

    try {
      const url = getFullClaimUrl(token);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <LinkIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Lien de réclamation non disponible</p>
            <p className="text-xs text-amber-700 mt-1">
              Le lien sera généré automatiquement lorsque la garantie sera active
            </p>
          </div>
        </div>
      </div>
    );
  }

  const claimUrl = getFullClaimUrl(token);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl p-5 border-2 border-primary-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-primary-900 mb-1">Lien de réclamation unique</h4>
            <p className="text-xs text-primary-700">
              Le client peut utiliser ce lien pour soumettre une réclamation
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 mb-3 border border-primary-200">
          <p className="text-xs text-slate-600 mb-1 font-medium">URL de soumission:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-primary-700 flex-1 truncate font-mono bg-primary-50 px-2 py-1 rounded">
              {claimUrl}
            </code>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-primary-100 rounded-lg transition-colors flex-shrink-0"
              title="Copier le lien"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-primary-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            {showQR ? 'Masquer QR Code' : 'Afficher QR Code'}
          </button>
          <button
            onClick={copyToClipboard}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-primary-600 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copié!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier le lien
              </>
            )}
          </button>
        </div>
      </div>

      {showQR && qrCodeUrl && (
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 text-center">
          <p className="text-sm font-semibold text-slate-900 mb-4">
            Scannez ce code QR avec un téléphone
          </p>
          <div className="inline-block p-4 bg-white rounded-lg border-2 border-slate-200">
            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Le client peut scanner ce code pour accéder directement au formulaire de réclamation
          </p>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h5 className="text-xs font-semibold text-slate-900 mb-2">Comment utiliser:</h5>
        <ul className="space-y-1 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">1.</span>
            <span>Copiez le lien et envoyez-le au client par email ou SMS</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">2.</span>
            <span>Le lien est déjà inclus dans le contrat PDF signé</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">3.</span>
            <span>Le lien ne peut être utilisé qu'une seule fois</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
