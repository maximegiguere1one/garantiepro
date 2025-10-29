# Guide d'Utilisation Complète - Système de Garanties

## Démarrage Rapide

### Prérequis
- Node.js 18+ installé
- Compte Supabase configuré
- Variables d'environnement dans `.env`

### Installation et Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer en développement
npm run dev

# Build de production
npm run build

# Prévisualiser la production
npm run preview
```

L'application sera disponible à `http://localhost:5173`

## Architecture de l'Application

### Structure des Fichiers
```
src/
├── components/          # Composants React
│   ├── common/         # Composants réutilisables
│   └── organizations/  # Gestion des organisations
├── contexts/           # Contextes React (Auth, Toast, etc.)
├── hooks/              # Hooks personnalisés
├── lib/                # Utilitaires et services
│   ├── supabase.ts    # Client Supabase
│   ├── pdf-wrapper.ts # Génération PDF lazy-loaded
│   ├── performance-tracker.ts # Monitoring
│   └── ...
└── main.tsx           # Point d'entrée

supabase/
├── functions/         # Edge Functions
└── migrations/        # 75 migrations de base de données
```

## Fonctionnalités Principales

### 1. Authentification et Gestion des Utilisateurs

#### Connexion
- Email + Mot de passe
- Vérification automatique du rôle (dealer, admin, super_admin)
- Gestion des sessions sécurisée
- Redirection automatique selon le rôle

#### Rôles et Permissions
- **super_admin**: Accès complet, gestion des organisations
- **admin**: Gestion de l'organisation, facturation
- **dealer**: Création de garanties, consultation
- **user**: Consultation uniquement

### 2. Gestion des Garanties

#### Création d'une Garantie
1. Accéder à "Nouvelle Garantie"
2. Remplir les informations:
   - **Client**: Nom, adresse, téléphone, email
   - **Remorque**: VIN, marque, modèle, année
   - **Plan de garantie**: Sélection parmi les plans disponibles
   - **Options**: Ajout d'options supplémentaires
3. Signature électronique du client (conforme eIDAS)
4. Génération automatique des documents:
   - Facture client (PDF optimisé)
   - Facture marchande (PDF avec marge)
   - Contrat de garantie (PDF avec QR code)

#### Documents Générés
- **Facture Client**: Pour le client final, format professionnel
- **Facture Marchande**: Document interne avec calcul de marge
- **Contrat de Garantie**: Avec code QR pour soumission de réclamation
- **Certificat de Signature**: Preuve horodatée et sécurisée

#### Gestion des Garanties
- Liste complète avec filtres et recherche
- Export Excel/CSV
- Statistiques en temps réel
- Suivi des statuts (active, pending, cancelled)

### 3. Système de Réclamations

#### Soumission de Réclamation (Client)
1. Scanner le QR code sur le contrat
2. Accéder au formulaire public
3. Remplir les détails de la réclamation
4. Télécharger des photos/documents
5. Soumettre

#### Traitement (Dealer/Admin)
1. Recevoir la notification
2. Examiner les détails et documents
3. Communiquer avec le client
4. Approuver/Rejeter avec justification
5. Génération automatique de la lettre de décision

#### Fonctionnalités
- Timeline complète des événements
- Upload de fichiers (images, PDF)
- Communication bidirectionnelle
- Modèles de réponses prédéfinis
- Suivi du statut en temps réel

### 4. Gestion Multi-Organisation

#### Création d'Organisation
1. Accès super_admin uniquement
2. Configuration:
   - Nom de l'organisation
   - Informations de contact
   - Paramètres de facturation
   - Logo et signature du vendeur

#### Invitation d'Utilisateurs
1. Créer une invitation
2. Définir le rôle (admin, dealer, user)
3. Envoyer par email
4. L'utilisateur reçoit un lien d'inscription
5. Activation automatique après inscription

#### Isolation des Données
- Chaque organisation a ses propres données
- RLS (Row Level Security) appliqué
- Pas d'accès inter-organisations
- Facturation séparée

### 5. Facturation et Commissions

#### Système de Facturation
- Calcul automatique des commissions
- Facturation mensuelle
- Suivi des transactions
- Export des factures
- Intégration QuickBooks (optionnel)

#### Tableau de Bord Facturation
- Revenus totaux
- Commissions en attente
- Commissions payées
- Historique des transactions
- Graphiques de performance

### 6. Analytiques et Rapports

#### Métriques Disponibles
- Nombre de garanties vendues
- Revenus totaux et marges
- Taux de conversion
- Durée moyenne de vente
- Performance par plan de garantie
- Tendances mensuelles/annuelles

#### Exports
- Excel (toutes les garanties)
- CSV (données brutes)
- PDF (rapports formatés)
- Graphiques interactifs

### 7. Paramètres et Configuration

#### Paramètres de l'Organisation
- **Informations générales**: Nom, adresse, contacts
- **Email**: Configuration SMTP/Resend
- **Signature du vendeur**: Upload de l'image de signature
- **Logo**: Personnalisation des documents
- **Numéro d'entreprise**: NEQ/NIF

#### Plans de Garantie
- Création de plans personnalisés
- Définition des couvertures
- Prix et durées
- Options additionnelles
- Templates de contrat

#### Modèles de Réponses
- Réponses pré-écrites pour réclamations
- Personnalisables par organisation
- Catégories (approbation, rejet, information)

## Fonctionnalités Techniques

### Performance et Optimisations

#### Lazy Loading
- PDF library chargée uniquement à l'utilisation
- Composants chargés à la demande
- Réduction du bundle initial de 75%

#### Caching Intelligent
- Service Worker avec stratégies de cache
- Assets statiques cachés 1 an
- Cache séparé pour les images
- Nettoyage automatique des caches anciens

#### Compression
- Gzip et Brotli activés
- Réduction de 70% de la taille de transfert
- Minification avancée avec terser

#### Monitoring
- Suivi des Core Web Vitals
- Tracking des performances
- Détection des ressources lentes
- Rapports automatiques en développement

### Sécurité

#### Signatures Électroniques
- Conformes à eIDAS (Union Européenne)
- Horodatage cryptographique
- Hash SHA-256 des documents
- Preuve d'intégrité
- Certificats vérifiables publiquement

#### Base de Données
- Row Level Security (RLS) sur toutes les tables
- Isolation complète multi-tenant
- Pas d'accès inter-organisations
- Tokens de réclamation uniques et à usage unique
- Chiffrement des données sensibles

#### Authentification
- JWT sécurisés
- Tokens de session
- Vérification du rôle à chaque requête
- Déconnexion automatique sur inactivité

### Hors-Ligne et PWA

#### Capacités Hors-Ligne
- Service Worker pour mise en cache
- Fonctionnement basique sans connexion
- Synchronisation automatique au retour en ligne
- Queue de requêtes pour actions différées

#### Installation PWA
- Installable sur mobile et desktop
- Icône sur l'écran d'accueil
- Expérience native
- Notifications push (futur)

## Utilisation Avancée

### API et Intégrations

#### Edge Functions Disponibles
1. **send-email**: Envoi d'emails via Resend
2. **send-sms**: Envoi de SMS (futur)
3. **sync-quickbooks**: Synchronisation QuickBooks
4. **generate-monthly-invoices**: Facturation automatique
5. **warranty-expiration-checker**: Vérification des expirations
6. **invite-user**: Invitation d'utilisateurs
7. **onboard-franchisee**: Onboarding franchisés

#### Webhooks
- Configuration des webhooks entrants
- Gestion des événements externes
- Traitement asynchrone
- Retry automatique en cas d'échec

### Personnalisation

#### Templates de Documents
1. Accéder à "Templates de Garantie"
2. Créer un nouveau template
3. Options:
   - **PDF uploadé**: Utiliser un PDF existant
   - **Template personnalisé**: Créer avec sections
4. Définir les sections:
   - Conditions générales
   - Exclusions
   - Procédures de réclamation
   - Informations légales
5. Appliquer à un plan de garantie

#### Personnalisation Visuelle
- Logo sur tous les documents
- Couleurs de marque (configuration future)
- Templates d'emails personnalisés
- Champs personnalisés dans les garanties

## Résolution de Problèmes

### Problèmes Courants

#### La page ne charge pas
1. Vérifier la connexion internet
2. Vider le cache du navigateur (Ctrl+Shift+R)
3. Vérifier les variables d'environnement
4. Consulter la console du navigateur (F12)

#### Erreur de connexion à la base de données
1. Vérifier `VITE_SUPABASE_URL` dans `.env`
2. Vérifier `VITE_SUPABASE_ANON_KEY` dans `.env`
3. Tester la connexion avec le script de diagnostic
4. Vérifier les RLS policies dans Supabase

#### PDF ne se génère pas
1. Vérifier que jsPDF est installé: `npm list jspdf`
2. Vérifier les permissions de l'organisation
3. Consulter les logs du navigateur
4. Vérifier que les données sont complètes

#### Email ne s'envoie pas
1. Vérifier la configuration Resend dans les paramètres
2. Vérifier que le domaine est vérifié
3. Consulter les logs de l'edge function `send-email`
4. Tester avec l'outil de diagnostic email

### Mode Debug

#### Activer les Logs Détaillés
```javascript
// Dans la console du navigateur
localStorage.setItem('debug', 'true')
window.location.reload()
```

#### Voir les Métriques de Performance
```javascript
// Dans la console du navigateur
performanceTracker.logMetrics()
```

#### Tester la Connexion Base de Données
```javascript
// Dans la console du navigateur
import('./lib/test-warranties-connection').then(m => m.testWarrantiesConnection())
```

## Support et Assistance

### Documentation Technique
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md`: Détails des optimisations
- `PERFORMANCE_QUICK_REFERENCE.md`: Référence rapide
- `ERROR_HANDLING_GUIDE.md`: Gestion des erreurs
- `TROUBLESHOOTING_GARANTIES.md`: Dépannage garanties

### Commandes Utiles

```bash
# Vérifier les types TypeScript
npm run typecheck

# Lancer les linters
npm run lint

# Build de production
npm run build

# Analyser la taille des bundles
npm run build -- --mode analyze
```

## Meilleures Pratiques

### Pour les Dealers
1. Toujours vérifier les informations du client
2. S'assurer que le VIN est correct (validation automatique)
3. Expliquer les conditions au client avant signature
4. Conserver une copie des documents
5. Traiter les réclamations rapidement

### Pour les Admins
1. Réviser régulièrement les paramètres de l'organisation
2. Surveiller les métriques de facturation
3. Former les nouveaux utilisateurs
4. Maintenir les modèles de réponses à jour
5. Vérifier les backups régulièrement

### Pour les Super Admins
1. Auditer les organisations régulièrement
2. Surveiller les performances globales
3. Gérer les mises à jour de sécurité
4. Maintenir la documentation à jour
5. Planifier la capacité et la croissance

## Mise à Jour et Maintenance

### Mises à Jour de l'Application
1. Pull les dernières modifications
2. Installer les nouvelles dépendances: `npm install`
3. Appliquer les migrations: Automatique via Supabase
4. Tester en local
5. Build et déployer

### Backup et Restauration
- Supabase gère les backups automatiques
- Exports réguliers des données recommandés
- Test de restauration trimestriel
- Conservation des exports pendant 1 an

## Roadmap et Fonctionnalités Futures

### Court Terme (1-3 mois)
- [ ] Notifications push pour les réclamations
- [ ] Application mobile native
- [ ] Scan de VIN avec caméra
- [ ] Chat en temps réel dealer-client

### Moyen Terme (3-6 mois)
- [ ] Intelligence artificielle pour évaluation des réclamations
- [ ] Intégration avec systèmes de gestion de garage
- [ ] API publique pour intégrations tierces
- [ ] Portail client dédié

### Long Terme (6-12 mois)
- [ ] Blockchain pour traçabilité des garanties
- [ ] Marketplace de garanties
- [ ] Assurance directe
- [ ] Expansion internationale

## Conclusion

Ce système de gestion de garanties est conçu pour être:
- **Rapide**: Chargement en <2 secondes
- **Sécurisé**: Conformité légale et protection des données
- **Scalable**: Support de milliers d'organisations
- **User-friendly**: Interface intuitive
- **Performant**: Optimisé pour la production

Pour toute question ou assistance, consultez la documentation technique ou contactez le support.
