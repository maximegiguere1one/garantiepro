import { Mail, Download, PlayCircle, Ban, X, Tag } from 'lucide-react';
import { useState } from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkEmail: () => void;
  onBulkExport: () => void;
  onBulkActivate: () => void;
  onBulkSuspend: () => void;
  onBulkTag: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkEmail,
  onBulkExport,
  onBulkActivate,
  onBulkSuspend,
  onBulkTag,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom">
        <div className="flex items-center gap-2 px-3 border-r border-slate-700">
          <span className="text-sm font-medium">
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="Désélectionner tout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBulkEmail}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            title="Envoyer un email groupé"
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm font-medium">Email</span>
          </button>

          <button
            onClick={onBulkTag}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            title="Ajouter des tags"
          >
            <Tag className="w-4 h-4" />
            <span className="text-sm font-medium">Tag</span>
          </button>

          <button
            onClick={onBulkActivate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            title="Activer"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Activer</span>
          </button>

          <button
            onClick={onBulkSuspend}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            title="Suspendre"
          >
            <Ban className="w-4 h-4" />
            <span className="text-sm font-medium">Suspendre</span>
          </button>

          <button
            onClick={onBulkExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="Exporter les données"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Exporter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
