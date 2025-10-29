import { Save, X, Loader2 } from 'lucide-react';

interface SaveBarProps {
  show: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function SaveBar({ show, saving, onSave, onCancel }: SaveBarProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-slate-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
        <span className="text-sm font-medium">Modifications non sauvegardées</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
