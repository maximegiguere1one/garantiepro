import { useState, useEffect, useRef, TouchEvent } from 'react';
import { Menu, X, Search } from 'lucide-react';
import { NavigationSection } from '../../types/navigation';
import { NavigationSidebar } from './NavigationSidebar';

interface MobileNavProps {
  sections: NavigationSection[];
  currentPage: string;
  onNavigate: (pageId: string) => void;
  onSearchOpen: () => void;
  logo?: React.ReactNode;
  actions?: React.ReactNode;
}

export function MobileNav({
  sections,
  currentPage,
  onNavigate,
  onSearchOpen,
  logo,
  actions,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to trigger close
  const minSwipeDistance = 50;

  useEffect(() => {
    // Prevent body scroll when menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe) {
      setIsOpen(false);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <>
      {/* Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 safe-area-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            {logo}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSearchOpen}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Recherche"
            >
              <Search className="w-5 h-5 text-slate-600" />
            </button>

            {actions}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isOpen ? (
                <X className="w-6 h-6 text-slate-900" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out lg:hidden safe-area-inset ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu de navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200">
            {logo}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Navigation Content */}
          <NavigationSidebar
            sections={sections}
            currentPage={currentPage}
            onNavigate={onNavigate}
            onClose={() => setIsOpen(false)}
            isMobile={true}
          />

          {/* Swipe Indicator */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
              <span className="inline-block w-8 h-1 bg-slate-300 rounded-full"></span>
              Glissez pour fermer
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
