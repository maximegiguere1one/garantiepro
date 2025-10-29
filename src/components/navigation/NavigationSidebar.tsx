import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { NavigationSection, NavigationItem } from '../../types/navigation';

interface NavigationSidebarProps {
  sections: NavigationSection[];
  currentPage: string;
  onNavigate: (pageId: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function NavigationSidebar({
  sections,
  currentPage,
  onNavigate,
  onClose,
  isMobile = false,
}: NavigationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    // Par défaut, expand la section contenant la page courante
    new Set(
      sections
        .filter((section) =>
          section.items.some((item) => item.id === currentPage)
        )
        .map((section) => section.id)
    )
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleNavigate = (pageId: string) => {
    onNavigate(pageId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-1">
        {sections.map((section) => {
          const isSectionExpanded = expandedSections.has(section.id);
          const SectionIcon = section.icon;
          const hasActiveItem = section.items.some(
            (item) => item.id === currentPage
          );

          return (
            <div key={section.id} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  hasActiveItem
                    ? 'bg-primary-50 text-primary-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SectionIcon className="w-4 h-4" />
                  <span>{section.label}</span>
                </div>
                {isSectionExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Section Items */}
              {isSectionExpanded && (
                <div className="mt-1 ml-2 pl-4 border-l-2 border-slate-100 space-y-0.5">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm shadow-primary-600/30'
                            : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                      >
                        <ItemIcon
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-600'
                          }`}
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            {item.isNew && (
                              <span className="px-1.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded">
                                Nouveau
                              </span>
                            )}
                            {item.badge && (
                              <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && !isActive && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
