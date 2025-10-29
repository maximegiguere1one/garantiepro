import { List, Grid2x2 as Grid } from 'lucide-react';
import { useViewMode } from '../../contexts/ViewModeContext';

export function ViewModeToggle() {
  const { viewMode, toggleViewMode } = useViewMode();

  return (
    <button
      onClick={toggleViewMode}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
      title={viewMode === 'comfortable' ? 'Mode compact' : 'Mode spacieux'}
    >
      {viewMode === 'comfortable' ? (
        <>
          <List className="w-4 h-4" />
          <span>Compact</span>
        </>
      ) : (
        <>
          <Grid className="w-4 h-4" />
          <span>Spacieux</span>
        </>
      )}
    </button>
  );
}
