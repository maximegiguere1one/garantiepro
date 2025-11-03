import { Shield, AlertCircle, Package, Users, ChevronRight, LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  badge?: number;
  action: () => void;
}

interface QuickActionGridProps {
  pendingClaims: number;
  availableInventory: number;
  onNavigate?: (page: string) => void;
}

export function QuickActionGrid({ pendingClaims, availableInventory, onNavigate }: QuickActionGridProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'optimized-warranty',
      icon: Shield,
      label: 'Nouvelle garantie ⚡',
      description: '60% plus rapide',
      color: 'bg-gradient-to-r from-primary-600 to-primary-600',
      action: () => onNavigate?.('optimized-warranty'),
    },
    {
      id: 'new-warranty',
      icon: Shield,
      label: 'Formulaire classique',
      description: 'Version standard',
      color: 'bg-slate-500',
      action: () => onNavigate?.('new-warranty'),
    },
    {
      id: 'claims',
      icon: AlertCircle,
      label: 'Réclamations',
      description: `${pendingClaims} en attente`,
      color: 'bg-amber-500',
      badge: pendingClaims > 0 ? pendingClaims : undefined,
      action: () => onNavigate?.('claims'),
    },
    {
      id: 'dealer-inventory',
      icon: Package,
      label: 'Inventaire',
      description: `${availableInventory} dispo`,
      color: 'bg-emerald-500',
      action: () => onNavigate?.('dealer-inventory'),
    },
    {
      id: 'customers',
      icon: Users,
      label: 'Clients',
      description: 'Voir tous',
      color: 'bg-primary-500',
      action: () => onNavigate?.('customers'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.action}
            className="relative bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 text-left group"
          >
            {action.badge && (
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                {action.badge}
              </div>
            )}
            <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{action.label}</h3>
            <p className="text-sm text-slate-600">{action.description}</p>
            <ChevronRight className="w-5 h-5 text-slate-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>
        );
      })}
    </div>
  );
}
