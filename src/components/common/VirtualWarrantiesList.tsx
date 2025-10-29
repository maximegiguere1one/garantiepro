import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Shield, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '../../lib/database.types';

type Warranty = Database['public']['Tables']['warranties']['Row'];

interface VirtualWarrantiesListProps {
  warranties: Warranty[];
  onWarrantyClick?: (warranty: Warranty) => void;
  isLoading?: boolean;
}

const WarrantyCard = memo(({ warranty, onClick }: {
  warranty: Warranty;
  onClick?: () => void;
}) => {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Shield className="w-5 h-5 text-primary-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Garantie #{warranty.warranty_number || warranty.id.slice(0, 8)}
            </h3>
            <p className="text-sm text-slate-600">
              {warranty.status === 'active' && 'Active'}
              {warranty.status === 'expired' && 'Expirée'}
              {warranty.status === 'cancelled' && 'Annulée'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <DollarSign className="w-4 h-4" aria-hidden="true" />
            <span>{warranty.total_price?.toFixed(2)} $</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <span>
            {warranty.start_date
              ? format(new Date(warranty.start_date), 'dd/MM/yyyy')
              : 'N/A'}
          </span>
        </div>
        {warranty.end_date && (
          <span className="text-slate-400">
            au {format(new Date(warranty.end_date), 'dd/MM/yyyy')}
          </span>
        )}
      </div>
    </div>
  );
});

WarrantyCard.displayName = 'WarrantyCard';

export function VirtualWarrantiesList({
  warranties,
  onWarrantyClick,
  isLoading
}: VirtualWarrantiesListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: warranties.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <span className="ml-3 text-slate-600">Chargement...</span>
      </div>
    );
  }

  if (warranties.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Aucune garantie trouvée
        </h3>
        <p className="text-slate-600">
          Commencez par créer votre première garantie
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto rounded-lg border border-slate-200"
      role="list"
      aria-label="Liste des garanties"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const warranty = warranties[virtualItem.index];
          return (
            <div
              key={warranty.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                padding: '8px',
              }}
            >
              <WarrantyCard
                warranty={warranty}
                onClick={() => onWarrantyClick?.(warranty)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
