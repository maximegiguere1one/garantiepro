# Configuration VAPID - Démarrage Rapide

## Vue d'ensemble

Ce document fournit un guide rapide pour configurer les notifications push avec les clés VAPID dans votre application de gestion de garanties.

## Prérequis

- Node.js installé
- Accès au projet
- Accès administrateur Supabase (pour configurer les secrets)

## Étapes de Configuration

### 1. Génération des Clés VAPID

Il existe deux méthodes pour générer les clés VAPID:

#### ✅ Méthode A: Générateur Web (Recommandé)

Ouvrez le générateur dans votre navigateur:

```
http://localhost:5173/generate-vapid-keys.html
```

Ou en production:
```
https://votre-domaine.com/generate-vapid-keys.html
```

**Étapes**:
1. Cliquez sur "Generate VAPID Keys"
2. Les clés seront générées instantanément
3. Cliquez sur "Copy" pour copier chaque clé
4. Suivez les instructions affichées à l'écran

**Avantages**:
- ✅ Fonctionne dans tous les environnements (StackBlitz, WebContainer, production)
- ✅ Interface visuelle intuitive avec boutons de copie
- ✅ Instructions de configuration intégrées
- ✅ Aucune dépendance Node.js requise
- ✅ Génération sécurisée côté client avec Web Crypto API

#### Méthode B: Script Node.js (Si disponible)

Si vous avez un environnement Node.js complet avec accès à l'API crypto:

```bash
node scripts/generate-vapid-keys.js
```

⚠️ **Note**: Cette méthode peut ne pas fonctionner dans certains environnements (StackBlitz, WebContainer) car elle nécessite l'API crypto complète de Node.js. Utilisez la méthode A dans ce cas.

Le générateur créera deux clés:
- **VITE_VAPID_PUBLIC_KEY**: Clé publique (peut être partagée)
- **VITE_VAPID_PRIVATE_KEY**: Clé privée (garder secrète)

### 2. Configuration du Fichier .env

Ouvrez le fichier `.env` à la racine du projet et ajoutez/remplacez les valeurs:

```env
VITE_SUPABASE_ANON_KEY=votre-clé-anon-existante
VITE_SUPABASE_URL=votre-url-existante

# Push Notifications - VAPID Keys
VITE_VAPID_PUBLIC_KEY=votre-clé-publique-générée
VITE_VAPID_PRIVATE_KEY=votre-clé-privée-générée
```

**Important**: Ne commitez JAMAIS le fichier .env avec la clé privée dans Git!

### 3. Configuration Supabase

La clé privée doit être configurée comme secret Supabase pour l'Edge Function `send-push-notification`.

#### Via Supabase CLI:

```bash
supabase secrets set VAPID_PRIVATE_KEY=votre-clé-privée-générée
```

#### Via Supabase Dashboard:

1. Ouvrez https://supabase.com/dashboard/project/[votre-project-id]/settings/vault
2. Cliquez sur "New secret"
3. Nom: `VAPID_PRIVATE_KEY`
4. Valeur: Coller votre clé privée
5. Cliquez "Add secret"

### 4. Déploiement de l'Edge Function

Déployez l'Edge Function pour l'envoi de notifications:

```bash
cd supabase/functions/send-push-notification
# Les fichiers sont déjà créés, déployez via Supabase CLI ou Dashboard
```

### 5. Redémarrage du Serveur

Redémarrez le serveur de développement pour prendre en compte les nouvelles variables:

```bash
npm run dev
```

## Vérification de la Configuration

### Test 1: Variables d'Environnement

Dans la console du navigateur (DevTools):

```javascript
console.log('VAPID configuré:', !!import.meta.env.VITE_VAPID_PUBLIC_KEY);
```

Résultat attendu: `true`

### Test 2: Interface Utilisateur

1. Connectez-vous à l'application
2. Naviguez vers "Notifications" dans le menu
3. Vous devriez voir le bouton "Activer"
4. Si vous voyez "Configuration requise", les clés ne sont pas correctement configurées

### Test 3: Activation des Notifications

1. Cliquez sur "Activer"
2. Acceptez les permissions du navigateur
3. Vous devriez voir "Notifications activées" avec un badge vert
4. Cliquez sur "Envoyer une notification de test"
5. Une notification devrait apparaître

## Résolution de Problèmes

### Erreur: "Configuration requise"

**Cause**: Clés VAPID non configurées ou invalides

**Solution**:
1. Vérifiez que les clés sont dans le fichier .env
2. Vérifiez qu'il n'y a pas de fautes de frappe
3. Redémarrez le serveur avec `npm run dev`

### Erreur: "Push notifications not configured on server"

**Cause**: La clé privée n'est pas configurée dans Supabase

**Solution**:
1. Configurez le secret VAPID_PRIVATE_KEY dans Supabase
2. Redéployez l'Edge Function si nécessaire

### Les notifications ne s'affichent pas

**Causes possibles**:
1. Permissions du navigateur refusées
2. Service Worker non enregistré
3. Navigateur non compatible

**Solutions**:
1. Vérifiez les permissions: chrome://settings/content/notifications
2. DevTools > Application > Service Workers (doit être "activated")
3. Utilisez Chrome, Firefox, Safari (version récente)

### Service Worker ne s'installe pas

**Cause**: Erreur dans le code du Service Worker

**Solution**:
1. Ouvrez DevTools > Console
2. Cherchez les erreurs en rouge
3. Vérifiez le fichier `public/service-worker.js`
4. Le Service Worker nécessite HTTPS (sauf sur localhost)

## Architecture des Notifications

```
┌─────────────────┐
│   Navigateur    │
│   (Frontend)    │
│                 │
│ ┌─────────────┐ │
│ │Push Manager │ │
│ │ (VAPID pub) │ │
│ └─────────────┘ │
└────────┬────────┘
         │
         │ Subscribe
         │
┌────────▼────────┐
│    Supabase     │
│   (Backend)     │
│                 │
│ ┌─────────────┐ │
│ │Edge Function│ │
│ │ (VAPID priv)│ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │  Database   │ │
│ │push_        │ │
│ │subscriptions│ │
│ └─────────────┘ │
└────────┬────────┘
         │
         │ Push Notification
         │
┌────────▼────────┐
│  Push Service   │
│  (Google/Apple) │
└────────┬────────┘
         │
         │ Deliver
         │
┌────────▼────────┐
│   Navigateur    │
│ Service Worker  │
│  (show notif)   │
└─────────────────┘
```

## Sécurité

### Bonnes Pratiques

✅ **À FAIRE**:
- Générer des clés uniques pour chaque environnement (dev, staging, prod)
- Stocker les clés privées dans des gestionnaires de secrets
- Configurer HTTPS en production
- Révoquer et régénérer les clés compromises
- Limiter l'accès aux secrets Supabase

❌ **À NE PAS FAIRE**:
- Committer les clés privées dans Git
- Partager les clés privées par email ou chat
- Utiliser les mêmes clés pour plusieurs applications
- Exposer les clés privées dans le code client
- Négliger les permissions d'accès aux secrets

### Rotation des Clés

Si les clés sont compromises:

1. Générer de nouvelles clés: `node scripts/generate-vapid-keys.js`
2. Mettre à jour le fichier .env
3. Mettre à jour le secret Supabase
4. Redéployer l'application
5. Les utilisateurs devront se réabonner aux notifications

## Support Multi-Navigateurs

### Navigateurs Supportés

| Navigateur | Support | Notes |
|------------|---------|-------|
| Chrome Desktop | ✅ Complet | Support optimal |
| Firefox Desktop | ✅ Complet | Support excellent |
| Safari Desktop | ✅ Complet | macOS 13+ requis |
| Edge Desktop | ✅ Complet | Basé sur Chromium |
| Chrome Android | ✅ Complet | Support optimal |
| Safari iOS | ⚠️ Limité | Nécessite "Add to Home Screen" |

### Tests Recommandés

Pour chaque navigateur:
1. Ouvrir l'application
2. Activer les notifications
3. Envoyer une notification de test
4. Fermer le navigateur
5. Déclencher une notification depuis un autre appareil
6. Vérifier la réception

Consultez `/BROWSER_TESTING_GUIDE.md` pour des tests détaillés.

## Intégration ClaimStatusTracker

### Localisation

Le composant **ClaimStatusTracker** est intégré dans:
- **Page**: Centre de réclamations
- **Emplacement**: En bas du modal de détails de réclamation
- **Accès**: Cliquer sur n'importe quelle réclamation

### Fonctionnalités

- Timeline chronologique des changements de statut
- Mises à jour en temps réel via Supabase Realtime
- Pop-up de notification pour nouveaux changements
- Animations visuelles pour améliorer l'UX
- Détails complets: qui, quand, pourquoi, notes

### Test du Tracker

1. Ouvrir une réclamation (compte utilisateur A)
2. Sur un autre compte (B), changer le statut de cette réclamation
3. Observer sur le compte A:
   - Nouvelle entrée apparaît instantanément
   - Pop-up en haut à droite
   - Animation de pulsation
   - Badge "Nouveau"

## Prochaines Étapes

Une fois la configuration terminée:

1. ✅ Former les utilisateurs (voir `/GUIDE_COMMUNICATION_TEMPS_REEL.md`)
2. ✅ Tester sur tous les navigateurs cibles
3. ✅ Configurer les préférences de notification par défaut
4. ✅ Mettre en place un monitoring des notifications
5. ✅ Planifier une rotation régulière des clés (annuelle recommandée)

## Ressources

- **Guide utilisateur**: `/GUIDE_COMMUNICATION_TEMPS_REEL.md`
- **Tests navigateurs**: `/BROWSER_TESTING_GUIDE.md`
- **Script VAPID**: `/scripts/generate-vapid-keys.js`
- **Edge Function**: `/supabase/functions/send-push-notification/`
- **Service Worker**: `/public/service-worker.js`
- **Manifest PWA**: `/public/manifest.json`

## Support

Pour toute question ou problème:

1. Consultez les guides de dépannage
2. Vérifiez les logs du navigateur (Console DevTools)
3. Vérifiez les logs Supabase Edge Functions
4. Créez un ticket avec les détails de l'erreur

---

**Date de création**: Octobre 2025
**Version**: 1.0
**Auteur**: Système de Gestion de Garanties
