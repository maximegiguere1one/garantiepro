import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import { warrantyService } from '../../lib/warranty-service';

export function PerformanceMonitor() {
  const [stats, setStats] = useState({
    avgTime: 0,
    maxTime: 0,
    minTime: 0,
    totalQueries: 0,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = warrantyService.getPerformanceStats();
      setStats(newStats);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible && stats.totalQueries === 0) {
    return null;
  }

  const getPerformanceColor = (time: number) => {
    if (time < 200) return 'text-emerald-600';
    if (time < 500) return 'text-primary-600';
    if (time < 1000) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPerformanceEmoji = (time: number) => {
    if (time < 200) return '🚀';
    if (time < 500) return '⚡';
    if (time < 1000) return '🔄';
    return '🐌';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <button
          onClick={() => setIsVisible(true)}
          className="p-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all hover:scale-110"
          title="Performance Monitor"
        >
          <Activity className="w-5 h-5" />
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 min-w-[280px] animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-bold text-slate-900">Performance</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          </div>

          {stats.totalQueries === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">
              Aucune requête effectuée
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Temps moyen:</span>
                <span className={`font-bold ${getPerformanceColor(stats.avgTime)}`}>
                  {getPerformanceEmoji(stats.avgTime)} {stats.avgTime.toFixed(0)}ms
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Plus rapide:</span>
                <span className="font-semibold text-emerald-600">
                  {stats.minTime.toFixed(0)}ms
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Plus lent:</span>
                <span className="font-semibold text-red-600">
                  {stats.maxTime.toFixed(0)}ms
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total requêtes:</span>
                  <span className="font-semibold text-slate-900">{stats.totalQueries}</span>
                </div>
              </div>

              <div className="pt-2">
                {stats.avgTime < 200 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                    <p className="text-xs text-emerald-700 font-medium">
                      🎉 Performance excellente !
                    </p>
                  </div>
                )}
                {stats.avgTime >= 200 && stats.avgTime < 500 && (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-2">
                    <p className="text-xs text-primary-700 font-medium">
                      ⚡ Bonne performance
                    </p>
                  </div>
                )}
                {stats.avgTime >= 500 && stats.avgTime < 1000 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <p className="text-xs text-amber-700 font-medium">
                      ⚠️ Performance acceptable
                    </p>
                  </div>
                )}
                {stats.avgTime >= 1000 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-xs text-red-700 font-medium">
                      🐌 Performance à améliorer
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
