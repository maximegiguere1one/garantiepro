import { Home, ChevronRight } from 'lucide-react';
import { Breadcrumb } from '../../types/navigation';

interface PageBreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate?: (href: string) => void;
}

export function PageBreadcrumbs({ breadcrumbs, onNavigate }: PageBreadcrumbsProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate?.('dashboard')}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Accueil</span>
      </button>

      {breadcrumbs.map((crumb, index) => {
        const Icon = crumb.icon;
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-slate-300" />
            {isLast ? (
              <span className="flex items-center gap-1.5 font-medium text-slate-900">
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => crumb.href && onNavigate?.(crumb.href)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
