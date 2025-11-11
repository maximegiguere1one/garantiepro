// Navigation utility types
interface NavigationItem {
  id: string;
  label: string;
  icon?: any;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export function generateBreadcrumbs(
  currentPage: string,
  navigation: NavigationSection[]
): { label: string; id: string }[] {
  const breadcrumbs: { label: string; id: string }[] = [
    { label: 'Accueil', id: 'dashboard' }
  ];

  for (const section of navigation) {
    const item = section.items.find((i: NavigationItem) => i.id === currentPage);
    if (item) {
      if (currentPage !== 'dashboard') {
        breadcrumbs.push({ label: item.label, id: item.id });
      }
      break;
    }
  }

  return breadcrumbs;
}

export function getPageTitle(pageId: string): string {
  const titles: Record<string, string> = {
    dashboard: 'Tableau de bord',
    warranties: 'Garanties',
    'new-warranty': 'Nouvelle garantie',
    customers: 'Clients',
    claims: 'Réclamations',
    settings: 'Paramètres',
    organizations: 'Organisations',
    billing: 'Facturation',
    analytics: 'Analytiques',
  };
  return titles[pageId] || 'Page';
}

export function getPageDescription(pageId: string): string {
  const descriptions: Record<string, string> = {
    dashboard: 'Vue d\'ensemble de vos activités',
    warranties: 'Gérez toutes vos garanties',
    'new-warranty': 'Créer une nouvelle garantie',
    customers: 'Gérez vos clients',
    claims: 'Traitez les réclamations',
    settings: 'Configurez votre compte',
    organizations: 'Gérez les organisations',
    billing: 'Facturation et paiements',
    analytics: 'Statistiques et rapports',
  };
  return descriptions[pageId] || '';
}
