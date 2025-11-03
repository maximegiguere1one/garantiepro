import { TrendingUp } from 'lucide-react';

interface ROIImpactSectionProps {
  totalWarranties: number;
}

export function ROIImpactSection({ totalWarranties }: ROIImpactSectionProps) {
  const savingsPerWarranty = 1470;
  const totalSavings = totalWarranties * savingsPerWarranty;

  return (
    <div className="relative bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-900 rounded-2xl shadow-xl p-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-secondary-600/10" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Impact sur le ROI</h2>
            <p className="text-neutral-300 text-sm">Économies réalisées avec Pro-Remorque</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <p className="text-neutral-300 text-sm font-medium mb-2">Économies par garantie</p>
            <p className="text-4xl font-bold text-white mb-1">{savingsPerWarranty.toLocaleString('fr-CA')} $</p>
            <p className="text-neutral-400 text-xs">Après coûts variables (~30-40 $)</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <p className="text-neutral-300 text-sm font-medium mb-2">Économies totales</p>
            <p className="text-4xl font-bold text-primary-400 mb-1">
              {totalSavings.toLocaleString('fr-CA')} $
            </p>
            <p className="text-neutral-400 text-xs">Frais d'intermédiaires éliminés</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <p className="text-neutral-300 text-sm font-medium mb-2">État du système</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-success-400 rounded-full animate-pulse shadow-lg shadow-success-400/50" />
              <span className="text-2xl font-bold text-white">Opérationnel</span>
            </div>
            <p className="text-neutral-400 text-xs">Tous les systèmes fonctionnent</p>
          </div>
        </div>
      </div>
    </div>
  );
}
