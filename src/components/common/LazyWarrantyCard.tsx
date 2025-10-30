import { memo, useState, useEffect, useRef } from 'react';
import { Eye, Download, MapPin, Phone, Mail, Calendar, Trash2 } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import type { WarrantyListItem } from '../../lib/warranty-service';

interface LazyWarrantyCardProps {
  warranty: WarrantyListItem;
  onViewDetails: (warranty: WarrantyListItem) => void;
  onDownload: (warranty: WarrantyListItem) => void;
  onDelete?: (warranty: WarrantyListItem) => void;
  getStatusColor: (status: string) => string;
  canDelete?: boolean;
}

export const LazyWarrantyCard = memo(({ warranty, onViewDetails, onDownload, onDelete, getStatusColor, canDelete = false }: LazyWarrantyCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">{warranty.contract_number}</h3>
          <p className="text-sm text-slate-600">
            {warranty.customer_first_name} {warranty.customer_last_name}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(warranty.status)}`}
        >
          {warranty.status.charAt(0).toUpperCase() + warranty.status.slice(1)}
        </span>
      </div>

      {isVisible && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Remorque</p>
              <p className="text-sm font-medium text-slate-900">
                {warranty.trailer_year} {warranty.trailer_make} {warranty.trailer_model}
              </p>
              <p className="text-xs text-slate-500 truncate">{warranty.trailer_vin}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Plan</p>
              <p className="text-sm font-medium text-slate-900">{warranty.plan_name_en}</p>
              <p className="text-xs text-slate-500">
                {warranty.duration_months} mois - ${warranty.deductible} franchise
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Période de couverture</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(warranty.start_date).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-500">{warranty.province}</p>
            </div>
          </div>

          {showFullDetails && (
            <div className="mb-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4" />
                <span>{warranty.customer_email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4" />
                <span>{warranty.customer_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {warranty.customer_city}, {warranty.customer_province}
                </span>
              </div>
              {warranty.signed_at && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>Signé le {new Date(warranty.signed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-500">Prix total</p>
                <p className="text-lg font-bold text-slate-900">
                  {warranty.total_price != null ? `$${warranty.total_price.toFixed(2)} CAD` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Marge</p>
                <p className="text-sm font-medium text-slate-900">
                  {warranty.margin != null ? `$${warranty.margin.toFixed(2)}` : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {showFullDetails ? 'Moins' : 'Plus'}
              </button>
              <AnimatedButton variant="secondary" size="sm" onClick={() => onViewDetails(warranty)} icon={<Eye className="w-4 h-4" />}>
                Voir
              </AnimatedButton>
              {warranty.contract_pdf_url && (
                <AnimatedButton variant="secondary" size="sm" onClick={() => onDownload(warranty)} icon={<Download className="w-4 h-4" />}>
                  PDF
                </AnimatedButton>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={() => onDelete(warranty)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Supprimer définitivement cette garantie"
                  aria-label="Supprimer la garantie"
                >
                  <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

LazyWarrantyCard.displayName = 'LazyWarrantyCard';
