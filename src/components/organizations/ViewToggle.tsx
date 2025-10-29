import { LayoutGrid, List, Columns2 as Columns } from 'lucide-react';

export type ViewMode = 'cards' | 'list' | 'kanban';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  const views = [
    { id: 'cards' as ViewMode, icon: LayoutGrid, label: 'Cartes' },
    { id: 'list' as ViewMode, icon: List, label: 'Liste' },
    { id: 'kanban' as ViewMode, icon: Columns, label: 'Kanban' },
  ];

  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-1">
      {views.map(view => {
        const Icon = view.icon;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentView === view.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={view.label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
