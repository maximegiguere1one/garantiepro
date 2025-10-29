import { AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { ReactNode } from 'react';

interface FormFieldWithHintProps {
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  id?: string;
}

export function FormFieldWithHint({
  label,
  hint,
  error,
  success,
  required = false,
  optional = false,
  children,
  id,
}: FormFieldWithHintProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1" title="Champ obligatoire">*</span>}
        {optional && <span className="text-slate-400 text-xs ml-2">(facultatif)</span>}
      </label>

      {children}

      {hint && !error && !success && (
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <p>{hint}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 text-xs text-emerald-600 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}
    </div>
  );
}
