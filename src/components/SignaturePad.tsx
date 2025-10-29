import { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'signature_pad';
import { RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  embedded?: boolean;
}

export function SignaturePad({ onSave, onCancel, embedded = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signaturePad, setSignaturePad] = useState<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);

      const pad = new SignatureCanvas(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });

      pad.addEventListener('beginStroke', () => setIsEmpty(false));

      setSignaturePad(pad);

      return () => {
        pad.off();
      };
    }
  }, []);

  const handleClear = () => {
    if (signaturePad) {
      signaturePad.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (!signaturePad) {
      console.error('[SignaturePad] Signature pad not initialized');
      return;
    }

    if (signaturePad.isEmpty()) {
      console.warn('[SignaturePad] Signature pad is empty');
      return;
    }

    try {
      console.log('[SignaturePad] Generating signature data URL');
      const dataUrl = signaturePad.toDataURL('image/png');

      if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
        console.error('[SignaturePad] Invalid signature data URL format');
        alert('Erreur lors de la capture de la signature. Veuillez réessayer.');
        return;
      }

      const base64Data = dataUrl.split(',')[1];
      if (!base64Data || base64Data.length < 100) {
        console.error('[SignaturePad] Signature data is too short or empty');
        alert('La signature semble invalide. Veuillez réessayer.');
        return;
      }

      console.log('[SignaturePad] Signature captured successfully, length:', dataUrl.length);
      onSave(dataUrl);
    } catch (error) {
      console.error('[SignaturePad] Error generating signature:', error);
      alert('Erreur lors de la capture de la signature. Veuillez réessayer.');
    }
  };

  if (embedded) {
    const isMobile = window.innerWidth < 640;

    return (
      <div className="space-y-4">
        {isMobile && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-sm text-primary-800">
            💡 Utilisez votre doigt pour signer directement sur l'écran
          </div>
        )}
        <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full touch-none"
            style={{ height: isMobile ? '250px' : '300px' }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors touch-manipulation"
          >
            <RotateCcw className="w-4 h-4" />
            Effacer
          </button>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors touch-manipulation"
            >
              Retour
            </button>
            <button
              onClick={handleSave}
              disabled={isEmpty}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed touch-manipulation"
            >
              <Check className="w-4 h-4" />
              Signer le contrat
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-600">
            En signant ce document, vous reconnaissez avoir lu et accepté les termes et conditions
            du contrat de garantie. Votre signature électronique a la même valeur juridique qu'une
            signature manuscrite conformément à la LCCJTI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900">Signature électronique</h2>
          <p className="text-sm text-slate-600 mt-1">
            Veuillez signer dans la zone ci-dessous pour accepter le contrat de garantie
          </p>
        </div>

        <div className="p-6">
          <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden mb-4">
            <canvas
              ref={canvasRef}
              className="w-full touch-none"
              style={{ height: '300px' }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Effacer
            </button>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isEmpty}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Confirmer la signature
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-600">
            En signant ce document, vous reconnaissez avoir lu et accepté les termes et conditions
            du contrat de garantie. Votre signature électronique a la même valeur juridique qu'une
            signature manuscrite.
          </p>
        </div>
      </div>
    </div>
  );
}
