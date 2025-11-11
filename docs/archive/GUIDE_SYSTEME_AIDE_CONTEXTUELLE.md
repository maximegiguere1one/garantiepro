# Guide du Système d'Aide Contextuelle

## Vue d'ensemble

Le système d'aide contextuelle de Pro-Remorque offre une assistance intelligente et adaptée aux besoins spécifiques des utilisateurs selon leur contexte d'utilisation.

## Composants Principaux

### 1. HelpButton (Bouton d'Aide Contextuel)

**Emplacement:** Coin inférieur droit de chaque page

**Fonctionnalités:**
- Affichage contextuel selon la page active
- Suggestions d'articles pertinents
- Actions rapides (support, documentation)
- Raccourci clavier: `?`

**Utilisation:**

```tsx
import { HelpButton } from '@/components/common/HelpButton';

// Dans votre composant de page
function MyPage() {
  return (
    <div>
      {/* Votre contenu */}
      <HelpButton />
    </div>
  );
}
```

**Contextes supportés:**
- `/warranties` - Articles sur la gestion des garanties
- `/claims` - Articles sur le traitement des réclamations
- `/settings` - Articles sur la configuration
- `/dashboard` - Articles de démarrage rapide
- Défaut - Articles généraux "getting_started"

### 2. HelpCenterPage (Centre d'Aide)

**Route:** `/help`

**Fonctionnalités:**
- FAQ complète avec recherche
- Organisation par catégories
- Système de notation (utile/pas utile)
- Suivi des vues pour analytics
- Support Markdown pour le contenu

**Catégories d'articles:**
- `getting_started` - Démarrage rapide
- `warranties` - Gestion des garanties
- `claims` - Traitement des réclamations
- `settings` - Configuration du système
- `billing` - Facturation et paiements
- `troubleshooting` - Dépannage

**Interface:**
```typescript
interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  content: string;        // Markdown supporté
  excerpt: string;
  category: string;
  subcategory?: string;
  tags: string[];
  is_published: boolean;
  required_role?: string; // Restriction par rôle
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}
```

### 3. FeedbackWidget (Widget de Feedback)

**Emplacement:** Accessible via le bouton d'aide ou en standalone

**Fonctionnalités:**
- Collecte multi-étapes
- Classification par type et sentiment
- Capture de contexte (page, URL)
- Support screenshots (optionnel)

**Types de feedback:**
- `bug` - Rapport de bug
- `feature_request` - Demande de fonctionnalité
- `improvement` - Suggestion d'amélioration
- `question` - Question
- `praise` - Compliment
- `other` - Autre

**Sentiments:**
- `positive` - Positif
- `neutral` - Neutre
- `negative` - Négatif

## Base de Données

### Tables

#### 1. `help_articles`
Stocke tous les articles d'aide et FAQ.

```sql
CREATE TABLE help_articles (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  category text NOT NULL,
  subcategory text,
  tags text[],
  is_published boolean DEFAULT true,
  required_role text,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. `help_article_views`
Suit les vues pour analytics.

```sql
CREATE TABLE help_article_views (
  id uuid PRIMARY KEY,
  article_id uuid REFERENCES help_articles(id),
  user_id uuid REFERENCES auth.users(id),
  viewed_at timestamptz DEFAULT now()
);
```

#### 3. `user_feedback`
Collecte les retours utilisateurs.

```sql
CREATE TABLE user_feedback (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),
  feedback_type text NOT NULL,
  sentiment text,
  category text,
  page_url text,
  page_title text,
  subject text NOT NULL,
  message text NOT NULL,
  screenshot_url text,
  status text DEFAULT 'new',
  admin_response text,
  responded_by uuid REFERENCES auth.users(id),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### Sécurité (RLS)

**Articles d'aide:**
- Tous les utilisateurs authentifiés peuvent lire les articles publiés
- Seuls les admins/masters peuvent créer et modifier

**Feedback:**
- Les utilisateurs voient uniquement leurs propres feedbacks
- Les admins voient tous les feedbacks de leur organisation

**Vues d'articles:**
- Tous les utilisateurs authentifiés peuvent enregistrer des vues

## Utilisation dans l'Application

### Intégration du Bouton d'Aide

Le bouton d'aide devrait être ajouté à chaque layout principal:

```tsx
// Dans DashboardLayout.tsx
import { HelpButton } from '@/components/common/HelpButton';

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <MainContent>
        <Outlet />
      </MainContent>
      <HelpButton /> {/* Toujours visible */}
    </div>
  );
}
```

### Ajout de Nouveaux Articles

**Via SQL (migration):**

```sql
INSERT INTO help_articles (
  title,
  slug,
  content,
  excerpt,
  category,
  is_published
) VALUES (
  'Titre de l''article',
  'titre-article',
  E'# Contenu Markdown\n\nVotre contenu ici...',
  'Courte description',
  'warranties',
  true
);
```

**Via l'interface Admin (à implémenter):**
- Créer une page d'administration des articles
- Permettre la création/édition en Markdown
- Prévisualisation en temps réel
- Gestion des catégories et tags

### Personnalisation par Contexte

Le système détecte automatiquement la page active et suggère les articles pertinents:

```tsx
// Exemple de configuration contextuelle
const contextualArticles = {
  '/warranties': ['creer-garantie', 'modifier-garantie', 'annuler-garantie'],
  '/claims': ['gerer-reclamations', 'statuts-reclamations'],
  '/settings': ['configurer-entreprise', 'gerer-utilisateurs'],
};
```

## Workflows Utilisateur

### 1. Utilisateur Cherche de l'Aide

```
1. Utilisateur clique sur le bouton d'aide (ou presse '?')
2. Panel s'ouvre avec suggestions contextuelles
3. Utilisateur clique sur un article ou "Voir tout"
4. Redirigé vers le centre d'aide
5. Vue de l'article enregistrée pour analytics
6. Utilisateur peut noter l'article (utile/pas utile)
```

### 2. Utilisateur Soumet un Feedback

```
1. Utilisateur clique sur "Donner votre avis"
2. Sélectionne le type de feedback
3. Indique le sentiment (optionnel)
4. Remplit le formulaire détaillé
5. Feedback enregistré avec contexte
6. Notification envoyée aux admins
7. Confirmation affichée à l'utilisateur
```

### 3. Admin Répond au Feedback

```
1. Admin reçoit notification de nouveau feedback
2. Consulte le dashboard de feedback
3. Lit le feedback avec contexte complet
4. Rédige une réponse
5. Marque comme "responded"
6. Utilisateur reçoit notification de réponse
```

## Analytics et Métriques

### Métriques Disponibles

1. **Articles:**
   - Nombre total de vues par article
   - Taux d'utilité (helpful vs not_helpful)
   - Articles les plus consultés
   - Articles nécessitant amélioration (low helpful rate)

2. **Feedback:**
   - Volume par type et sentiment
   - Temps de réponse moyen
   - Taux de résolution
   - Tendances par catégorie

3. **Contexte:**
   - Pages générant le plus de demandes d'aide
   - Heures de pic d'utilisation
   - Parcours utilisateur vers l'aide

### Requêtes Utiles

```sql
-- Top 10 articles les plus vus
SELECT title, view_count, helpful_count, not_helpful_count
FROM help_articles
WHERE is_published = true
ORDER BY view_count DESC
LIMIT 10;

-- Taux de satisfaction des articles
SELECT
  title,
  ROUND(
    helpful_count::float /
    NULLIF(helpful_count + not_helpful_count, 0) * 100
  ) as satisfaction_rate
FROM help_articles
WHERE helpful_count + not_helpful_count > 0
ORDER BY satisfaction_rate DESC;

-- Distribution des feedbacks par type
SELECT
  feedback_type,
  sentiment,
  COUNT(*) as count
FROM user_feedback
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feedback_type, sentiment
ORDER BY count DESC;

-- Temps de réponse moyen aux feedbacks
SELECT
  AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) as avg_hours
FROM user_feedback
WHERE responded_at IS NOT NULL;
```

## Meilleures Pratiques

### Rédaction d'Articles

1. **Titre clair et descriptif**
   - Commencer par un verbe d'action
   - Ex: "Comment créer une garantie" vs "Garanties"

2. **Structurer avec Markdown**
   ```markdown
   # Titre Principal

   Introduction courte et claire.

   ## Section 1

   Contenu avec exemples.

   ## Section 2

   - Point 1
   - Point 2

   ## Conseils

   - Astuce 1
   - Astuce 2
   ```

3. **Inclure des visuels**
   - Screenshots des interfaces
   - Diagrammes de workflow
   - Vidéos tutorielles (liens)

4. **Mise à jour régulière**
   - Réviser après chaque release
   - Marquer les articles obsolètes
   - Archiver plutôt que supprimer

### Gestion des Feedbacks

1. **Réponse rapide**
   - Viser < 24h pour les bugs
   - < 48h pour les questions
   - < 1 semaine pour feature requests

2. **Template de réponses**
   - Créer des templates pour réponses communes
   - Personnaliser chaque réponse
   - Remercier l'utilisateur

3. **Suivi et actions**
   - Créer des tickets pour bugs confirmés
   - Ajouter feature requests à la roadmap
   - Informer l'utilisateur des actions prises

4. **Fermeture de boucle**
   - Notifier quand un bug est corrigé
   - Annoncer quand une feature est livrée
   - Demander validation de la solution

## Amélioration Continue

### A. Collecte de Données

- Activer le tracking des vues
- Monitorer les recherches sans résultat
- Analyser les patterns de feedback

### B. Itération

- Créer articles pour questions fréquentes
- Améliorer articles avec low satisfaction
- Ajouter contextes manquants

### C. Enrichissement

- Ajouter vidéos tutorielles
- Créer guides étape par étape interactifs
- Implémenter chatbot basé sur articles

## Tests et Validation

### Test de l'Aide Contextuelle

1. **Navigation:**
   ```bash
   # Ouvrir dans le navigateur
   http://localhost:5173/help
   ```

2. **Test des contextes:**
   - Naviguer vers /warranties
   - Cliquer sur le bouton d'aide
   - Vérifier suggestions contextuelles

3. **Test de recherche:**
   - Entrer "garantie" dans la recherche
   - Vérifier résultats filtrés
   - Tester recherche vide

### Test du Feedback

1. **Page de test:**
   ```bash
   # Ouvrir la page de test
   http://localhost:5173/test-onboarding-system.html
   ```

2. **Actions à tester:**
   - Soumettre différents types de feedback
   - Vérifier enregistrement en DB
   - Tester notifications admins

### Test des Analytics

```sql
-- Vérifier tracking des vues
SELECT * FROM help_article_views
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Vérifier feedbacks
SELECT * FROM user_feedback
ORDER BY created_at DESC LIMIT 10;
```

## Déploiement

### Checklist Pré-Production

- [ ] Migration appliquée avec succès
- [ ] Articles par défaut créés
- [ ] Tests manuels passés
- [ ] RLS policies vérifiées
- [ ] Performance indexes créés
- [ ] Documentation admin complétée

### Configuration Production

1. **Variables d'environnement:**
   - Aucune configuration spéciale requise
   - Utilise les mêmes clés Supabase

2. **Monitoring:**
   - Activer alertes pour feedbacks critiques
   - Dashboard analytics des articles
   - Suivi temps de réponse feedbacks

## Support et Contact

Pour toute question sur le système d'aide:
- Email: support@proremorque.com
- Documentation technique: /docs/help-system
- Slack: #help-system

---

**Version:** 1.0.0
**Dernière mise à jour:** 3 novembre 2025
**Auteur:** Équipe Pro-Remorque
