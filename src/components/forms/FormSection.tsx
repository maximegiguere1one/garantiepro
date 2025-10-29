import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  badge?: string;
  required?: boolean;
}

export function FormSection({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
  badge,
  required = false,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const HeaderComponent = collapsible ? 'button' : 'div';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-200 hover:border-slate-300">
      <HeaderComponent
        type={collapsible ? 'button' : undefined}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        className={`w-full px-6 py-4 ${collapsible ? 'cursor-pointer hover:bg-slate-50' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {title}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                {badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-slate-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          {collapsible && (
            <div className="ml-4 flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          )}
        </div>
      </HeaderComponent>

      {(!collapsible || isExpanded) && (
        <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
