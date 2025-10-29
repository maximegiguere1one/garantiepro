import { ReactNode } from 'react';

interface SettingsCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export function SettingsCard({ children, title, description, icon }: SettingsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {(title || description) && (
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            {icon && <div className="text-slate-700">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
              {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
