import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProgressiveSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
  completed?: boolean;
  icon?: React.ReactNode;
}

export function ProgressiveSection({
  title,
  description,
  children,
  defaultOpen = false,
  required = false,
  completed = false,
  icon,
}: ProgressiveSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-slate-600">{icon}</div>}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {required && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                  Requis
                </span>
              )}
              {completed && (
                <span className="px-2 py-0.5 bg-green-100 text-primary-700 text-xs font-medium rounded">
                  Complété
                </span>
              )}
            </div>
            {description && <p className="text-sm text-slate-600 mt-0.5">{description}</p>}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 py-5 border-t border-slate-200 bg-slate-50/30">
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}
