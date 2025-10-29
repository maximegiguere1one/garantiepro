export function WarrantySkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-slate-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-64"></div>
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-20"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="h-3 bg-slate-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-full mb-1"></div>
          <div className="h-3 bg-slate-200 rounded w-32"></div>
        </div>
        <div>
          <div className="h-3 bg-slate-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-full mb-1"></div>
          <div className="h-3 bg-slate-200 rounded w-24"></div>
        </div>
        <div>
          <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-full mb-1"></div>
          <div className="h-3 bg-slate-200 rounded w-20"></div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="flex items-center gap-4">
          <div>
            <div className="h-3 bg-slate-200 rounded w-16 mb-2"></div>
            <div className="h-6 bg-slate-200 rounded w-24"></div>
          </div>
          <div>
            <div className="h-3 bg-slate-200 rounded w-12 mb-2"></div>
            <div className="h-5 bg-slate-200 rounded w-20"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-slate-200 rounded-lg"></div>
          <div className="h-9 w-9 bg-slate-200 rounded-lg"></div>
          <div className="h-9 w-9 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function WarrantyListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <WarrantySkeleton key={index} />
      ))}
    </div>
  );
}

export function WarrantyCardSkeleton() {
  return (
    <div className="bg-slate-50 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-48"></div>
        </div>
      </div>
    </div>
  );
}

export function PerformanceBadge({ executionTime }: { executionTime: number }) {
  const getColor = (time: number) => {
    if (time < 200) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (time < 500) return 'bg-primary-100 text-primary-700 border-primary-300';
    if (time < 1000) return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getLabel = (time: number) => {
    if (time < 200) return 'Ultra rapide';
    if (time < 500) return 'Rapide';
    if (time < 1000) return 'Normal';
    return 'Lent';
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getColor(executionTime)}`}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></div>
      {getLabel(executionTime)} - {executionTime.toFixed(0)}ms
    </div>
  );
}
