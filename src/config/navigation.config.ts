import {
  LayoutDashboard,
  FileText,
  Users,
  AlertCircle,
  Settings,
  ShieldCheck,
  Award,
  BarChart3,
  Package,
  Building2,
  DollarSign,
  TrendingUp,
  Mail,
  Activity,
  Database,
  FileCheck,
  Wrench,
  TestTube,
  Lightbulb,
  ShoppingCart,
  Users2,
  FileBarChart,
  UserPlus,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { NavigationSection, NavigationItem } from '../types/navigation';

/**
 * Configuration de navigation améliorée
 * Organisation hiérarchique à 2 niveaux avec sections claires
 */

// Navigation pour le propriétaire (master organization)
export const ownerNavigation: NavigationSection[] = [
  {
    id: 'owner-dashboard',
    label: 'Administration Maître',
    icon: TrendingUp,
    roles: ['admin', 'master'],
    items: [
      {
        id: 'admin-dashboard',
        label: 'Tableau de bord global',
        description: 'Vue d\'ensemble de toutes les organisations',
        icon: TrendingUp,
        roles: ['admin', 'master'],
      },
      {
        id: 'organizations',
        label: 'Gérer les franchisés',
        description: 'Configuration et suivi des franchises',
        icon: Building2,
        roles: ['admin', 'master'],
        badge: 'Admin',
      },
    ],
  },
];

// Navigation pour les franchisés
export const franchiseeNavigation: NavigationSection[] = [
  {
    id: 'franchisee-billing',
    label: 'Facturation',
    icon: DollarSign,
    roles: ['admin', 'master'],
    items: [
      {
        id: 'billing',
        label: 'Mon abonnement',
        description: 'Facturation et paiements',
        icon: DollarSign,
        roles: ['admin', 'master'],
      },
    ],
  },
];

// Navigation principale standard
export const standardNavigation: NavigationSection[] = [
  // SECTION: Vue d'ensemble
  {
    id: 'overview',
    label: 'Vue d\'ensemble',
    icon: LayoutDashboard,
    roles: ['admin', 'master', 'f_and_i', 'operations', 'client'],
    items: [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        description: 'Aperçu de votre activité',
        icon: LayoutDashboard,
        roles: ['admin', 'master', 'f_and_i', 'operations'],
      },
      {
        id: 'analytics',
        label: 'Rapports et statistiques',
        description: 'Analyses détaillées et tendances',
        icon: BarChart3,
        roles: ['admin', 'master', 'f_and_i'],
      },
    ],
  },

  // SECTION: Ventes et Garanties
  {
    id: 'sales',
    label: 'Ventes et Garanties',
    icon: ShoppingCart,
    roles: ['admin', 'master', 'f_and_i', 'operations', 'client'],
    items: [
      {
        id: 'optimized-warranty',
        label: 'Nouvelle vente ⚡',
        description: 'Formulaire optimisé - 60% plus rapide',
        icon: FileText,
        roles: ['admin', 'master', 'f_and_i'],
        isNew: true,
      },
      {
        id: 'new-warranty',
        label: 'Vente (classique)',
        description: 'Formulaire standard',
        icon: FileText,
        roles: ['admin', 'master', 'f_and_i'],
      },
      {
        id: 'warranties',
        label: 'Toutes les garanties',
        description: 'Consulter et gérer les garanties',
        icon: ShieldCheck,
        roles: ['admin', 'master', 'f_and_i', 'operations', 'client'],
      },
      {
        id: 'my-products',
        label: 'Mes produits',
        description: 'Vos garanties actives',
        icon: Package,
        roles: ['client'],
      },
      {
        id: 'dealer-inventory',
        label: 'Inventaire',
        description: 'Gérer votre inventaire',
        icon: Package,
        roles: ['admin', 'master', 'f_and_i'],
      },
      {
        id: 'warranty-templates',
        label: 'Documents et contrats',
        description: 'Templates personnalisés',
        icon: FileCheck,
        roles: ['admin', 'master', 'f_and_i'],
      },
    ],
  },

  // SECTION: Service Client
  {
    id: 'support',
    label: 'Service Client',
    icon: AlertCircle,
    roles: ['admin', 'master', 'operations', 'client'],
    items: [
      {
        id: 'claims',
        label: 'Réclamations',
        description: 'Gérer les demandes de service',
        icon: AlertCircle,
        roles: ['admin', 'master', 'operations', 'client'],
      },
      {
        id: 'response-templates',
        label: 'Modèles de réponse',
        description: 'Réponses standardisées',
        icon: FileCheck,
        roles: ['admin', 'master', 'operations'],
      },
    ],
  },

  // SECTION: Clients et Relations
  {
    id: 'customers',
    label: 'Clients et Relations',
    icon: Users2,
    roles: ['admin', 'master', 'f_and_i', 'operations'],
    items: [
      {
        id: 'customers',
        label: 'Base clients',
        description: 'Gérer vos clients',
        icon: Users,
        roles: ['admin', 'master', 'f_and_i', 'operations'],
      },
      {
        id: 'loyalty',
        label: 'Programme de fidélité',
        description: 'Récompenses et avantages',
        icon: Award,
        roles: ['admin', 'master', 'f_and_i'],
      },
    ],
  },

  // SECTION: Configuration et Outils
  {
    id: 'settings',
    label: 'Configuration',
    icon: Settings,
    roles: ['admin', 'master', 'franchisee_admin'],
    items: [
      {
        id: 'users',
        label: 'Gestion des utilisateurs',
        description: 'Inviter et gérer les utilisateurs',
        icon: Users,
        roles: ['admin', 'master', 'franchisee_admin'],
        badge: 'Important',
      },
      {
        id: 'settings',
        label: 'Paramètres généraux',
        description: 'Configuration du système',
        icon: Settings,
        roles: ['admin', 'master'],
      },
      {
        id: 'signature-audit',
        label: 'Audit des signatures',
        description: 'Vérification et conformité',
        icon: ShieldCheck,
        roles: ['admin', 'master'],
      },
      {
        id: 'email-queue',
        label: 'Gestion des emails',
        description: 'File d\'attente et historique',
        icon: Mail,
        roles: ['admin', 'master'],
      },
    ],
  },

  // SECTION: Aide et Support
  {
    id: 'help',
    label: 'Aide et Support',
    icon: HelpCircle,
    roles: ['admin', 'master', 'f_and_i', 'operations', 'client'],
    items: [
      {
        id: 'help',
        label: 'Centre d\'aide',
        description: 'FAQ, manuels et guides',
        icon: HelpCircle,
        roles: ['admin', 'master', 'f_and_i', 'operations', 'client'],
      },
    ],
  },
];

// Navigation pour les outils de développement (masquée par défaut)
export const developerToolsNavigation: NavigationSection = {
  id: 'dev-tools',
  label: 'Outils de développement',
  icon: Wrench,
  roles: ['admin', 'master'],
  items: [
    {
      id: 'system-diagnostics',
      label: 'Diagnostics système',
      description: 'État général du système',
      icon: Activity,
      roles: ['admin', 'master'],
    },
    {
      id: 'warranty-diagnostics',
      label: 'Diagnostics garanties',
      description: 'Analyse des garanties',
      icon: FileBarChart,
      roles: ['admin', 'master'],
    },
    {
      id: 'supabase-health',
      label: 'État Supabase',
      description: 'Santé de la base de données',
      icon: Database,
      roles: ['admin', 'master'],
    },
    {
      id: 'warranty-form-test',
      label: 'Test formulaire',
      description: 'Tester le formulaire de garantie',
      icon: Wrench,
      roles: ['admin', 'master'],
    },
    {
      id: 'demo-features',
      label: 'Nouvelles fonctionnalités',
      description: 'Démo des features en dev',
      icon: Lightbulb,
      roles: ['admin', 'master'],
    },
    {
      id: 'ui-v2-demo',
      label: '🎨 UI V2 - Nouveau Design',
      description: 'Composants UI professionnels modernes',
      icon: Lightbulb,
      roles: ['admin', 'master'],
    },
  ],
};

// Actions rapides accessibles depuis n'importe où
export const quickActions: NavigationItem[] = [
  {
    id: 'new-warranty',
    label: 'Nouvelle vente',
    icon: FileText,
    roles: ['admin', 'master', 'f_and_i'],
  },
  {
    id: 'claims',
    label: 'Nouvelle réclamation',
    icon: AlertCircle,
    roles: ['admin', 'master', 'operations', 'client'],
  },
  {
    id: 'customers',
    label: 'Ajouter un client',
    icon: UserPlus,
    roles: ['admin', 'master', 'f_and_i'],
  },
];

/**
 * Construire la navigation complète basée sur le rôle et le type d'organisation
 */
export function buildNavigation(
  userRole: string,
  isOwner: boolean,
  organizationType: 'franchisee' | 'master' | null,
  showDevTools: boolean = false
): NavigationSection[] {
  let navigation: NavigationSection[] = [];

  // Normaliser les rôles super_admin et master vers admin pour la navigation
  const effectiveRole = ['super_admin', 'master'].includes(userRole) ? 'admin' : userRole;

  // Ajouter navigation owner si applicable
  if (isOwner) {
    navigation = [...ownerNavigation];
  }

  // Ajouter navigation franchisé si applicable
  if (organizationType === 'franchisee') {
    navigation = [...navigation, ...franchiseeNavigation];
  }

  // Ajouter navigation standard
  navigation = [...navigation, ...standardNavigation];

  // Ajouter outils de développement si demandé
  if (showDevTools && (effectiveRole === 'admin' || effectiveRole === 'master')) {
    navigation = [...navigation, developerToolsNavigation];
  }

  // Filtrer par rôle (super_admin a tous les droits admin)
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(effectiveRole)),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Obtenir les actions rapides disponibles pour un rôle
 */
export function getQuickActions(userRole: string): NavigationItem[] {
  // Normaliser les rôles super_admin et master vers admin
  const effectiveRole = ['super_admin', 'master'].includes(userRole) ? 'admin' : userRole;
  return quickActions.filter((action) => action.roles.includes(effectiveRole));
}
