import { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}

export function AccordionItem({
  id,
  title,
  children,
  defaultOpen = false,
  icon,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        id={`${id}-trigger`}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 py-4 px-5 text-left
          hover:bg-slate-50 transition-colors duration-200 group focus:outline-none
          focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-lg"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
              {icon}
            </div>
          )}
          <span className="font-medium text-slate-900 truncate">{title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={`${id}-content`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        style={{ height: height === 'auto' ? 'auto' : `${height}px` }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
      >
        <div ref={contentRef} className="px-5 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({
  children,
  allowMultiple = false,
  className = '',
}: AccordionProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 ${className}`}
      role="group"
    >
      {children}
    </div>
  );
}
