import { useState, useEffect } from 'react';
import { Code, Settings } from 'lucide-react';

interface DeveloperModeToggleProps {
  onChange: (enabled: boolean) => void;
}

export function DeveloperModeToggle({ onChange }: DeveloperModeToggleProps) {
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('devMode') === 'true';
  });

  useEffect(() => {
    onChange(isEnabled);
  }, [isEnabled, onChange]);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem('devMode', String(newValue));
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isEnabled
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
      title={isEnabled ? 'Désactiver le mode développeur' : 'Activer le mode développeur'}
    >
      {isEnabled ? (
        <>
          <Code className="w-4 h-4" />
          <span className="hidden lg:inline">Mode Dev</span>
        </>
      ) : (
        <>
          <Settings className="w-4 h-4" />
          <span className="hidden lg:inline">Mode Normal</span>
        </>
      )}
    </button>
  );
}
