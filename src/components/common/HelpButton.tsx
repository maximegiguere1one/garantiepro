import { useState, useEffect } from 'react';
import { HelpCircle, X, Search, Book, MessageCircle, ExternalLink, ChevronRight } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  slug: string;
}

interface HelpButtonProps {
  contextPage?: string;
  className?: string;
}

export function HelpButton({ contextPage, className = '' }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedArticles, setSuggestedArticles] = useState<HelpArticle[]>([]);

  const contextualHelp: Record<string, HelpArticle[]> = {
    warranties: [
      {
        id: '1',
        title: 'Comment créer une garantie',
        excerpt: 'Guide étape par étape pour créer une garantie',
        category: 'Garanties',
        slug: 'creer-garantie'
      },
      {
        id: '2',
        title: 'Calcul automatique des taxes',
        excerpt: 'Comprendre le calcul des taxes TPS/TVQ',
        category: 'Garanties',
        slug: 'calcul-taxes'
      }
    ],
    claims: [
      {
        id: '3',
        title: 'Gérer les réclamations',
        excerpt: 'Processus de traitement des réclamations',
        category: 'Réclamations',
        slug: 'gerer-reclamations'
      },
      {
        id: '4',
        title: 'Approuver ou refuser une réclamation',
        excerpt: 'Comment prendre une décision sur une réclamation',
        category: 'Réclamations',
        slug: 'decision-reclamation'
      }
    ],
    settings: [
      {
        id: '5',
        title: 'Configurer les paramètres',
        excerpt: 'Personnaliser votre espace Pro-Remorque',
        category: 'Paramètres',
        slug: 'configurer-parametres'
      },
      {
        id: '6',
        title: 'Gérer les plans de garantie',
        excerpt: 'Créer et modifier vos plans de garantie',
        category: 'Paramètres',
        slug: 'plans-garantie'
      }
    ],
    default: [
      {
        id: '7',
        title: 'Bienvenue dans Pro-Remorque',
        excerpt: 'Guide de démarrage rapide',
        category: 'Démarrage',
        slug: 'bienvenue'
      },
      {
        id: '8',
        title: 'Navigation dans l\'interface',
        excerpt: 'Découvrir les différentes sections',
        category: 'Démarrage',
        slug: 'navigation'
      }
    ]
  };

  useEffect(() => {
    if (isOpen) {
      const articles = contextualHelp[contextPage || 'default'] || contextualHelp.default;
      setSuggestedArticles(articles);
    }
  }, [isOpen, contextPage]);

  const filteredArticles = searchQuery
    ? suggestedArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestedArticles;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-40 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 ${className}`}
        title="Besoin d'aide?"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fadeIn"
        onClick={() => setIsOpen(false)}
      />

      {/* Help Panel */}
      <div className="fixed bottom-6 left-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-bold text-lg">Centre d'aide</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans l'aide..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* Contextual articles */}
          {filteredArticles.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {searchQuery ? 'Résultats de recherche' : 'Articles suggérés'}
              </h4>
              <div className="space-y-2">
                {filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => window.open(`/help/${article.slug}`, '_blank')}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h5 className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-primary-600 transition-colors">
                          {article.title}
                        </h5>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {article.excerpt}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Actions rapides
            </h4>

            <button
              onClick={() => window.open('/help', '_blank')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-primary-50 transition-colors border border-slate-200 text-left group"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Book className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 text-sm">Base de connaissances</div>
                <div className="text-xs text-slate-600">Parcourir tous les articles</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => window.location.hash = '#support'}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-success-50 transition-colors border border-slate-200 text-left group"
            >
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center group-hover:bg-success-200 transition-colors">
                <MessageCircle className="w-5 h-5 text-success-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 text-sm">Contacter le support</div>
                <div className="text-xs text-slate-600">Envoyer un message à l'équipe</div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-center text-slate-600">
            💡 Conseil: Utilisez <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">?</kbd> pour ouvrir l'aide rapidement
          </p>
        </div>
      </div>
    </>
  );
}

export function useHelpShortcut() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowHelp(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { showHelp, setShowHelp };
}
