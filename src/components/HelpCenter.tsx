import { useState } from 'react';
import { Search, Book, HelpCircle, Video, FileText, Download, ExternalLink, ChevronRight } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ManualSection {
  id: string;
  title: string;
  description: string;
  url: string;
}

const faqCategories = [
  'Toutes',
  'Compte et Accès',
  'Garanties',
  'Réclamations',
  'Signature électronique',
  'Paiements',
  'Programme Fidélité',
  'Support Technique'
];

const faqItems: FAQItem[] = [
  {
    id: 'q1',
    question: 'Comment créer mon compte Pro-Remorque?',
    answer: 'Vous recevez une invitation par email de votre administrateur. Cliquez sur le lien dans l\'email, créez votre mot de passe (minimum 8 caractères), et connectez-vous à l\'application.',
    category: 'Compte et Accès'
  },
  {
    id: 'q2',
    question: 'J\'ai oublié mon mot de passe, comment le réinitialiser?',
    answer: 'Sur la page de connexion, cliquez "Mot de passe oublié?", entrez votre adresse email, et suivez les instructions dans l\'email de réinitialisation (valide 1 heure).',
    category: 'Compte et Accès'
  },
  {
    id: 'q9',
    question: 'Combien de temps faut-il pour créer une garantie?',
    answer: '5-7 minutes une fois les informations en main. Le processus inclut: infos client (1-2 min), détails remorque (1-2 min), sélection plan (30 sec), révision (1 min), génération PDF (10 sec).',
    category: 'Garanties'
  },
  {
    id: 'q10',
    question: 'Le VIN est-il obligatoire?',
    answer: 'Oui, le VIN est obligatoire et doit être unique (17 caractères alphanumériques). Il permet l\'identification unique de la remorque et est requis pour les réclamations.',
    category: 'Garanties'
  },
  {
    id: 'q11',
    question: 'Quels plans de garantie sont disponibles?',
    answer: 'Trois durées: 12 mois (299$), 24 mois (499$), 36 mois (699$) avec couverture progressive. Options supplémentaires disponibles: pneus (+150$), batteries (+75$), système électrique (+200$), etc.',
    category: 'Garanties'
  },
  {
    id: 'q21',
    question: 'Comment soumettre une réclamation?',
    answer: 'Menu Réclamations → Nouvelle réclamation → Recherchez garantie (VIN ou numéro) → Sélectionnez type problème → Décrivez en détail → Uploadez 3+ photos → Soumettez. Temps: 10-15 minutes.',
    category: 'Réclamations'
  },
  {
    id: 'q22',
    question: 'Combien de photos dois-je fournir?',
    answer: 'Minimum 3, maximum 10. Formats JPG/PNG, max 10 MB chacune. Photos requises: vue d\'ensemble, gros plan du défaut, angle alternatif. Conseils: éclairage naturel, mise au point nette.',
    category: 'Réclamations'
  },
  {
    id: 'q24',
    question: 'Combien de temps pour traiter une réclamation?',
    answer: '3-5 jours ouvrables en moyenne, jusqu\'à 10 jours si complexe. Timeline: Soumission → Révision (24h) → Décision (3-5 jours). Photos de qualité et description structurée accélèrent le traitement.',
    category: 'Réclamations'
  },
  {
    id: 'q31',
    question: 'La signature électronique est-elle légale?',
    answer: 'Oui, 100% conforme aux lois canadiennes (LCSE), américaines (UETA) et européennes (eIDAS). Chaque signature génère: horodatage certifié, adresse IP, hash cryptographique SHA-256, certificat PDF/A.',
    category: 'Signature électronique'
  },
  {
    id: 'q32',
    question: 'Différence entre signature en personne et à distance?',
    answer: 'En personne: client présent avec tablette (immédiat, 1 min). À distance: lien email au client (1-48h délai). Les deux génèrent des preuves légales identiques.',
    category: 'Signature électronique'
  },
  {
    id: 'q42',
    question: 'Comment fonctionne le programme fidélité?',
    answer: 'Gagnez 2000$ de crédit tous les 10 garanties vendues. Utilisez ce crédit sur futures ventes pour réduire le prix. Le crédit ne expire jamais et est divisible sur plusieurs garanties.',
    category: 'Programme Fidélité'
  },
  {
    id: 'q46',
    question: 'Comment contacter le support?',
    answer: 'Email: support@proremorque.com (< 4h ouvrables). Téléphone: 1-800-XXX-XXXX (Lun-Ven 9h-17h EST). Chat: dans l\'application (< 5 min). Pour urgence critique, mentionner "URGENT".',
    category: 'Support Technique'
  }
];

const manualSections: ManualSection[] = [
  {
    id: 'create-warranty',
    title: 'Créer une garantie',
    description: 'Guide complet pour créer votre première garantie en 5 minutes',
    url: '/onboarding/user-manual/fr/01-creer-garantie.md'
  },
  {
    id: 'process-claim',
    title: 'Traiter une réclamation',
    description: 'Processus étape par étape pour gérer les réclamations clients',
    url: '/onboarding/user-manual/fr/02-traiter-reclamation.md'
  },
  {
    id: 'electronic-signature',
    title: 'Signature électronique',
    description: 'Comprendre et utiliser les signatures électroniques conformes',
    url: '/onboarding/user-manual/fr/03-signature-electronique.md'
  }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Toutes' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-red rounded-2xl mb-4 shadow-lg">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-800 mb-3">
            Centre d'aide Pro-Remorque
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Trouvez rapidement des réponses à vos questions, consultez les manuels d'utilisation et accédez aux ressources de formation.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Recherchez dans l'aide... (ex: VIN, signature, réclamation)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-neutral-200 rounded-xl focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-neutral-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Book className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-800">Guide de démarrage</h3>
            </div>
            <p className="text-neutral-600 mb-4">
              Commencez en 30 minutes avec notre guide rapide pour créer votre première garantie.
            </p>
            <a
              href="/onboarding/fr/quickstart.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-red hover:text-brand-red-dark font-medium"
            >
              Lire le guide
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-neutral-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Video className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-800">Vidéos tutoriels</h3>
            </div>
            <p className="text-neutral-600 mb-4">
              Apprenez visuellement avec nos vidéos de 5 minutes couvrant les fonctionnalités clés.
            </p>
            <button
              className="inline-flex items-center gap-2 text-brand-red hover:text-brand-red-dark font-medium"
              onClick={() => alert('Vidéos disponibles prochainement')}
            >
              Voir les vidéos
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-neutral-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-800">Documentation complète</h3>
            </div>
            <p className="text-neutral-600 mb-4">
              Consultez la documentation technique détaillée et les guides avancés.
            </p>
            <a
              href="/onboarding/knowledge-base.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-red hover:text-brand-red-dark font-medium"
            >
              Accéder aux docs
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-brand-red" />
            <h2 className="text-2xl font-bold text-neutral-800">Questions fréquentes</h2>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {faqCategories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-brand-red text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-500 text-lg">
                  Aucune question trouvée pour "{searchQuery}"
                </p>
                <p className="text-neutral-400 mt-2">
                  Essayez de modifier votre recherche ou contactez le support
                </p>
              </div>
            ) : (
              filteredFAQs.map(item => (
                <div
                  key={item.id}
                  className="border border-neutral-200 rounded-lg overflow-hidden hover:border-brand-red/30 transition-colors"
                >
                  <button
                    onClick={() => toggleFAQ(item.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-neutral-50 transition-colors"
                  >
                    <span className="font-semibold text-neutral-800 pr-4">
                      {item.question}
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 text-brand-red flex-shrink-0 transition-transform ${
                        expandedFAQ === item.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {expandedFAQ === item.id && (
                    <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
                      <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </p>
                      <span className="inline-block mt-3 text-xs font-medium text-brand-red bg-brand-red/10 px-3 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* View Full FAQ Link */}
          <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
            <a
              href="/onboarding/fr/faq.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-red hover:text-brand-red-dark font-medium text-lg"
            >
              <Download className="w-5 h-5" />
              Télécharger la FAQ complète (52 questions)
            </a>
          </div>
        </div>

        {/* Manual Sections */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Book className="w-6 h-6 text-brand-red" />
            <h2 className="text-2xl font-bold text-neutral-800">Manuels d'utilisation</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {manualSections.map(section => (
              <a
                key={section.id}
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 border-2 border-neutral-200 rounded-xl hover:border-brand-red hover:shadow-md transition-all group"
              >
                <h3 className="text-lg font-semibold text-neutral-800 mb-2 group-hover:text-brand-red transition-colors">
                  {section.title}
                </h3>
                <p className="text-neutral-600 text-sm mb-4">
                  {section.description}
                </p>
                <div className="flex items-center gap-2 text-brand-red font-medium">
                  <span>Lire le manuel</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-brand-red to-brand-red-dark rounded-xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Besoin d'aide supplémentaire?</h3>
          <p className="text-white/90 mb-6 text-lg">
            Notre équipe de support est là pour vous aider
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:support@proremorque.com"
              className="px-6 py-3 bg-white text-brand-red rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              support@proremorque.com
            </a>
            <a
              href="tel:1-800-XXX-XXXX"
              className="px-6 py-3 bg-white/10 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
            >
              1-800-XXX-XXXX
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
