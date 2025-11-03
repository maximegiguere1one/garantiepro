import { useState, useEffect } from 'react';
import { Search, Book, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

const categories = [
  { id: 'getting_started', label: 'Démarrage', icon: '🚀', color: 'blue' },
  { id: 'warranties', label: 'Garanties', icon: '🛡️', color: 'green' },
  { id: 'claims', label: 'Réclamations', icon: '📋', color: 'orange' },
  { id: 'customers', label: 'Clients', icon: '👥', color: 'purple' },
  { id: 'settings', label: 'Paramètres', icon: '⚙️', color: 'gray' },
  { id: 'billing', label: 'Facturation', icon: '💰', color: 'yellow' },
];

export function HelpCenterPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<HelpArticle[]>([]);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [searchQuery, selectedCategory, articles]);

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading help articles:', error);
      showToast('Erreur lors du chargement des articles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (selectedCategory) {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        a.excerpt.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  };

  const trackArticleView = async (articleId: string) => {
    try {
      await supabase.from('help_article_views').insert({
        article_id: articleId,
      });

      // Increment view count
      const { data: article } = await supabase
        .from('help_articles')
        .select('view_count')
        .eq('id', articleId)
        .single();

      if (article) {
        await supabase
          .from('help_articles')
          .update({ view_count: (article.view_count || 0) + 1 })
          .eq('id', articleId);
      }
    } catch (error) {
      console.error('Error tracking article view:', error);
    }
  };

  const handleArticleClick = (article: HelpArticle) => {
    if (expandedArticle === article.id) {
      setExpandedArticle(null);
    } else {
      setExpandedArticle(article.id);
      trackArticleView(article.id);
    }
  };

  const handleHelpful = async (articleId: string, isHelpful: boolean) => {
    try {
      const { data: article } = await supabase
        .from('help_articles')
        .select('helpful_count, not_helpful_count')
        .eq('id', articleId)
        .single();

      if (article) {
        const updates = isHelpful
          ? { helpful_count: (article.helpful_count || 0) + 1 }
          : { not_helpful_count: (article.not_helpful_count || 0) + 1 };

        const { error } = await supabase
          .from('help_articles')
          .update(updates)
          .eq('id', articleId);

        if (error) throw error;

        showToast(
          isHelpful ? 'Merci pour votre retour!' : 'Merci, nous allons améliorer cet article',
          'success'
        );

        loadArticles();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Book className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold">Centre d'Aide</h1>
          </div>
          <p className="text-primary-100 text-lg mb-8">
            Trouvez rapidement des réponses à vos questions
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans la documentation..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-4">
              <h3 className="font-semibold text-slate-900 mb-4">Catégories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === null
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Tous les articles
                </button>
                {categories.map((cat) => {
                  const count = articles.filter(a => a.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedCategory === cat.id
                          ? 'bg-primary-50 text-primary-700 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => window.location.hash = '#support'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-lg hover:from-success-600 hover:to-success-700 transition-all font-semibold shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contacter le support
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {filteredArticles.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucun article trouvé
                </h3>
                <p className="text-slate-600">
                  Essayez de modifier votre recherche ou parcourez les catégories
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedArticles).map(([categoryId, categoryArticles]) => {
                  const category = categories.find(c => c.id === categoryId);
                  return (
                    <div key={categoryId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span>{category?.icon}</span>
                          {category?.label}
                        </h2>
                      </div>

                      <div className="divide-y divide-slate-200">
                        {categoryArticles.map((article) => (
                          <div key={article.id}>
                            <button
                              onClick={() => handleArticleClick(article)}
                              className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                                    {article.title}
                                    {expandedArticle === article.id ? (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                  </h3>
                                  <p className="text-sm text-slate-600 line-clamp-2">
                                    {article.excerpt}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                    <span>{article.view_count} vues</span>
                                    <span>•</span>
                                    <span>{article.helpful_count} utiles</span>
                                  </div>
                                </div>
                              </div>
                            </button>

                            {expandedArticle === article.id && (
                              <div className="px-6 pb-6 bg-slate-50 animate-slideDown">
                                <div className="prose prose-sm max-w-none">
                                  <div
                                    className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }}
                                  />
                                </div>

                                {article.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-4">
                                    {article.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-slate-200">
                                  <p className="text-sm font-semibold text-slate-700 mb-3">
                                    Cet article vous a-t-il été utile?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleHelpful(article.id, true)}
                                      className="flex items-center gap-2 px-4 py-2 bg-success-50 text-success-700 rounded-lg hover:bg-success-100 transition-colors"
                                    >
                                      <ThumbsUp className="w-4 h-4" />
                                      Oui
                                    </button>
                                    <button
                                      onClick={() => handleHelpful(article.id, false)}
                                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                      <ThumbsDown className="w-4 h-4" />
                                      Non
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
