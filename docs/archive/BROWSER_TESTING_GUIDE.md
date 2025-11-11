# Guide de Test Multi-Navigateurs - Notifications Push et Suivi en Temps Réel

## Vue d'ensemble

Ce guide fournit une méthodologie complète pour tester les fonctionnalités de notifications push et de suivi en temps réel sur différents navigateurs et plateformes.

## Navigateurs Supportés

### Desktop

| Navigateur | Version Minimale | Support Push | Support Service Worker | Notes |
|------------|------------------|--------------|------------------------|-------|
| Chrome | 50+ | ✅ Complet | ✅ Complet | Support optimal |
| Firefox | 44+ | ✅ Complet | ✅ Complet | Support excellent |
| Safari | 16+ | ✅ Complet | ✅ Complet | Nécessite macOS 13+ |
| Edge | 79+ | ✅ Complet | ✅ Complet | Basé sur Chromium |
| Opera | 37+ | ✅ Complet | ✅ Complet | Basé sur Chromium |

### Mobile

| Navigateur | Plateforme | Support Push | Support Service Worker | Notes |
|------------|------------|--------------|------------------------|-------|
| Chrome Mobile | Android | ✅ Complet | ✅ Complet | Support optimal |
| Firefox Mobile | Android | ✅ Complet | ✅ Complet | Support excellent |
| Safari Mobile | iOS 16.4+ | ✅ Limité | ✅ Complet | Nécessite Add to Home Screen |
| Samsung Internet | Android | ✅ Complet | ✅ Complet | Support excellent |

## Pré-requis pour les Tests

### Configuration Initiale

1. **Clés VAPID configurées**
   ```bash
   node scripts/generate-vapid-keys.js
   ```

2. **Variables d'environnement définies**
   - `VITE_VAPID_PUBLIC_KEY` dans .env
   - `VAPID_PRIVATE_KEY` dans Supabase secrets

3. **Service Worker enregistré**
   - Vérifier dans DevTools > Application > Service Workers

4. **HTTPS activé**
   - Les notifications nécessitent HTTPS (sauf localhost)

### Outils de Test

- **Chrome DevTools**: Application > Service Workers, Manifest
- **Firefox DevTools**: Application > Service Workers
- **Safari Web Inspector**: Storage > Service Workers
- **Lighthouse**: Audit PWA et performance
- **BrowserStack**: Tests cross-browser automatisés (optionnel)

## Scénarios de Test

### 1. Configuration et Activation des Notifications

#### Test 1.1: Vérification du Support

**Objectif**: Vérifier que le navigateur supporte les notifications push

**Étapes**:
1. Ouvrir l'application dans le navigateur
2. Naviguer vers "Notifications" dans le menu
3. Vérifier l'affichage du statut de support

**Résultat attendu**:
- Message "Notifications non supportées" si non supporté
- Bouton "Activer" visible si supporté
- Message de configuration VAPID si clés non configurées

**Navigateurs à tester**: Tous

#### Test 1.2: Demande de Permission

**Objectif**: Tester le workflow de demande de permission

**Étapes**:
1. Cliquer sur "Activer" dans la page Notifications
2. Observer l'invite de permission du navigateur
3. Accepter la permission

**Résultat attendu**:
- Invite de permission native du navigateur
- État "Notifications activées" après acceptation
- Badge vert avec icône de succès
- Inscription enregistrée dans la base de données

**Points de vigilance**:
- Safari: Nécessite un geste utilisateur (clic)
- Firefox: Peut afficher une barre d'information avant l'invite

**Navigateurs à tester**: Chrome, Firefox, Safari, Edge

#### Test 1.3: Refus de Permission

**Objectif**: Gérer le cas où l'utilisateur refuse les permissions

**Étapes**:
1. Cliquer sur "Activer"
2. Cliquer sur "Bloquer" dans l'invite
3. Observer le message d'erreur

**Résultat attendu**:
- Message toast "Veuillez autoriser les notifications..."
- État reste "Notifications désactivées"
- Instructions pour réactiver dans les paramètres

**Navigateurs à tester**: Tous

### 2. Envoi et Réception de Notifications

#### Test 2.1: Notification de Test

**Objectif**: Vérifier l'envoi et l'affichage d'une notification test

**Étapes**:
1. Activer les notifications
2. Cliquer sur "Envoyer une notification de test"
3. Observer la notification

**Résultat attendu**:
- Notification apparaît dans le système
- Titre: "Test de notification"
- Corps: "Les notifications fonctionnent correctement!"
- Icône de l'application visible
- Vibration sur mobile (si supporté)

**Navigateurs à tester**: Tous

#### Test 2.2: Notification avec Action

**Objectif**: Tester les notifications avec boutons d'action

**Étapes**:
1. Déclencher une notification avec actions (ex: nouvelle réclamation)
2. Observer les boutons dans la notification
3. Cliquer sur un bouton d'action

**Résultat attendu**:
- Boutons d'action visibles dans la notification
- Clic sur bouton exécute l'action appropriée
- Application s'ouvre sur la page correcte

**Navigateurs à tester**: Chrome, Firefox, Edge (Safari ne supporte pas les actions)

#### Test 2.3: Notification en Arrière-Plan

**Objectif**: Vérifier les notifications quand l'application est fermée

**Étapes**:
1. Activer les notifications
2. Fermer complètement le navigateur
3. Déclencher une notification depuis un autre compte/appareil
4. Observer la notification système

**Résultat attendu**:
- Notification reçue même avec navigateur fermé
- Clic ouvre l'application
- Navigation vers le contenu approprié

**Navigateurs à tester**: Chrome, Firefox, Edge

**Note Safari**: Les notifications en arrière-plan nécessitent que l'app soit ajoutée à l'écran d'accueil

### 3. Préférences de Notification

#### Test 3.1: Configuration des Préférences

**Objectif**: Tester la personnalisation des préférences

**Étapes**:
1. Activer les notifications
2. Décocher "Nouveaux messages"
3. Déclencher un nouveau message
4. Observer l'absence de notification

**Résultat attendu**:
- Préférences sauvegardées en temps réel
- Notifications filtrées selon préférences
- Toast de confirmation "Préférences mises à jour"

**Navigateurs à tester**: Tous

#### Test 3.2: Synchronisation des Préférences

**Objectif**: Vérifier la synchronisation entre appareils

**Étapes**:
1. Modifier préférences sur appareil A
2. Ouvrir application sur appareil B
3. Observer les préférences

**Résultat attendu**:
- Préférences identiques sur tous les appareils
- Synchronisation en temps réel via Supabase

**Navigateurs à tester**: Combinaison d'appareils

### 4. ClaimStatusTracker en Temps Réel

#### Test 4.1: Affichage du Tracker

**Objectif**: Vérifier l'intégration dans ClaimsCenter

**Étapes**:
1. Naviguer vers "Centre de réclamations"
2. Cliquer sur une réclamation
3. Scroller vers le ClaimStatusTracker

**Résultat attendu**:
- Tracker visible en bas du modal
- Timeline complète des statuts
- Design cohérent avec le reste de l'app

**Navigateurs à tester**: Tous

#### Test 4.2: Mise à Jour en Direct

**Objectif**: Tester les mises à jour en temps réel

**Étapes**:
1. Ouvrir une réclamation (compte A)
2. Sur compte B, changer le statut de cette réclamation
3. Observer la mise à jour sur compte A

**Résultat attendu**:
- Nouvelle mise à jour apparaît instantanément
- Animation de pulsation sur le nouvel item
- Badge "Nouveau" visible
- Pop-up de notification en haut à droite
- Pop-up disparaît après 5 secondes

**Navigateurs à tester**: Chrome, Firefox, Safari, Edge

#### Test 4.3: Notification Pop-up

**Objectif**: Vérifier l'affichage des notifications in-app

**Étapes**:
1. Ouvrir une réclamation
2. Laisser l'onglet ouvert mais naviguer ailleurs
3. Changer le statut depuis un autre compte
4. Revenir à l'onglet

**Résultat attendu**:
- Pop-up visible en haut à droite
- Affiche le changement de statut
- Transition ancienne → nouvelle valeur
- Bouton fermer fonctionnel

**Navigateurs à tester**: Tous

### 5. Service Worker et Cache

#### Test 5.1: Installation du Service Worker

**Objectif**: Vérifier l'enregistrement correct du SW

**Étapes**:
1. Ouvrir DevTools > Application > Service Workers
2. Observer l'état du service worker
3. Vérifier les caches

**Résultat attendu**:
- Service Worker status: "activated"
- Caches créés: warranty-app-v2, warranty-runtime-v2, warranty-images-v1
- Événements push enregistrés

**Navigateurs à tester**: Tous

#### Test 5.2: Mise à Jour du Service Worker

**Objectif**: Tester le mécanisme de mise à jour

**Étapes**:
1. Modifier le numéro de version dans service-worker.js
2. Recharger la page
3. Observer la bannière de mise à jour

**Résultat attendu**:
- Nouveau SW installé en attente
- Bannière "Mise à jour disponible"
- Clic sur "Actualiser" active le nouveau SW

**Navigateurs à tester**: Chrome, Firefox, Edge

### 6. Tests Spécifiques Mobile

#### Test 6.1: Safari iOS - Add to Home Screen

**Objectif**: Tester les notifications sur Safari iOS

**Étapes**:
1. Ouvrir l'app dans Safari iOS 16.4+
2. Partager > Ajouter à l'écran d'accueil
3. Ouvrir depuis l'icône
4. Activer les notifications

**Résultat attendu**:
- App s'ouvre en mode standalone
- Notifications fonctionnent
- Badge d'icône se met à jour

**Note**: Les notifications ne fonctionnent PAS dans Safari iOS sans "Add to Home Screen"

#### Test 6.2: Chrome Android

**Objectif**: Vérifier les notifications sur Android

**Étapes**:
1. Ouvrir l'app dans Chrome Android
2. Activer les notifications
3. Mettre l'app en arrière-plan
4. Déclencher une notification

**Résultat attendu**:
- Notification dans le tiroir Android
- Vibration selon préférences
- Badge sur l'icône (si supporté)
- Clic ouvre l'app

### 7. Tests de Performance

#### Test 7.1: Temps de Latence

**Objectif**: Mesurer le délai de réception

**Étapes**:
1. Déclencher une notification
2. Mesurer le temps entre envoi et réception

**Résultat attendu**:
- Latence < 2 secondes en conditions normales
- Latence < 5 secondes sur connexion lente

**Outils**: Chrome DevTools > Network, console.time()

#### Test 7.2: Charge Multiple

**Objectif**: Tester avec plusieurs notifications simultanées

**Étapes**:
1. Déclencher 10 notifications rapidement
2. Observer le comportement

**Résultat attendu**:
- Toutes les notifications sont reçues
- Pas de perte de messages
- Groupement intelligent si supporté

### 8. Tests d'Erreur et Edge Cases

#### Test 8.1: Clés VAPID Invalides

**Objectif**: Gérer les clés mal configurées

**Étapes**:
1. Modifier VITE_VAPID_PUBLIC_KEY avec une valeur invalide
2. Tenter d'activer les notifications

**Résultat attendu**:
- Message d'erreur clair
- Instructions de configuration
- Pas de crash de l'application

#### Test 8.2: Perte de Connexion

**Objectif**: Tester la résilience hors ligne

**Étapes**:
1. Activer le mode avion
2. Déclencher une notification
3. Réactiver la connexion

**Résultat attendu**:
- Notification en attente est reçue après reconnexion
- Pas d'erreur JavaScript
- Message d'état de connexion approprié

#### Test 8.3: Permission Révoquée

**Objectif**: Gérer la révocation des permissions

**Étapes**:
1. Activer les notifications
2. Révoquer la permission dans les paramètres du navigateur
3. Observer le statut dans l'app

**Résultat attendu**:
- Détection de la révocation
- Message invitant à réactiver
- Instructions pour restaurer la permission

## Checklist de Test Rapide

Pour chaque navigateur, valider:

- [ ] Service Worker s'enregistre correctement
- [ ] Demande de permission s'affiche
- [ ] Accepter la permission active les notifications
- [ ] Notification de test fonctionne
- [ ] ClaimStatusTracker s'affiche correctement
- [ ] Mises à jour en temps réel fonctionnent
- [ ] Pop-up de notification in-app s'affiche
- [ ] Préférences se sauvegardent
- [ ] Notifications en arrière-plan (si supporté)
- [ ] Clic sur notification ouvre l'app
- [ ] Désactivation des notifications fonctionne

## Résolution de Problèmes par Navigateur

### Chrome

**Problème**: Notifications ne s'affichent pas
- Vérifier: chrome://settings/content/notifications
- Solution: Autoriser le site dans les paramètres

**Problème**: Service Worker ne s'installe pas
- Vérifier: DevTools > Console pour erreurs
- Solution: Vérifier la syntaxe de service-worker.js

### Firefox

**Problème**: Permission refusée automatiquement
- Vérifier: about:preferences#privacy > Permissions > Notifications
- Solution: Supprimer les permissions du site et réessayer

### Safari

**Problème**: Notifications ne fonctionnent pas
- iOS: App doit être ajoutée à l'écran d'accueil
- macOS: Nécessite macOS 13+ et Safari 16+
- Solution: Vérifier la version et utiliser Add to Home Screen

### Edge

**Problème**: Similaire à Chrome
- Edge est basé sur Chromium
- Vérifier edge://settings/content/notifications

## Outils Automatisés (Optionnel)

### Playwright

```javascript
// Exemple de test automatisé
import { test, expect } from '@playwright/test';

test('Push notifications work', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await page.goto('/');
  await page.click('text=Activer');
  await expect(page.locator('text=Notifications activées')).toBeVisible();
});
```

### Cypress

```javascript
// Exemple de test Cypress
describe('Push Notifications', () => {
  it('should enable notifications', () => {
    cy.visit('/');
    cy.get('[data-test="enable-notifications"]').click();
    cy.contains('Notifications activées').should('be.visible');
  });
});
```

## Métriques de Succès

### Critères d'Acceptation

- ✅ 100% des tests passent sur Chrome Desktop
- ✅ 100% des tests passent sur Firefox Desktop
- ✅ 100% des tests passent sur Safari macOS 13+
- ✅ 100% des tests passent sur Chrome Android
- ✅ 90%+ des tests passent sur Safari iOS 16.4+ (avec PWA)
- ✅ Latence < 2s pour 95% des notifications
- ✅ Aucune erreur JavaScript en console
- ✅ Service Worker actif sur tous les navigateurs supportés

### Performance Attendue

| Métrique | Cible | Acceptable |
|----------|-------|------------|
| Temps d'inscription | < 1s | < 3s |
| Latence notification | < 2s | < 5s |
| Taux de délivrance | > 99% | > 95% |
| Temps de mise à jour SW | < 5s | < 10s |

## Rapport de Test

Après les tests, compléter:

```
Date: ___________
Testeur: ___________

Navigateurs testés:
- [ ] Chrome Desktop (version: ___)
- [ ] Firefox Desktop (version: ___)
- [ ] Safari Desktop (version: ___)
- [ ] Edge Desktop (version: ___)
- [ ] Chrome Android (version: ___)
- [ ] Safari iOS (version: ___)

Résultats:
- Tests réussis: ___/___
- Tests échoués: ___/___
- Bugs identifiés: ___

Notes additionnelles:
_________________________________
_________________________________
```

## Prochaines Étapes

Une fois tous les tests validés:

1. Déployer en staging
2. Tester avec vrais utilisateurs beta
3. Collecter feedback
4. Optimiser selon retours
5. Déployer en production

## Support et Documentation

- Guide utilisateur: `/GUIDE_COMMUNICATION_TEMPS_REEL.md`
- Configuration VAPID: `/scripts/generate-vapid-keys.js`
- Edge Function: `/supabase/functions/send-push-notification/`
- Issues GitHub: Créer un ticket pour tout bug découvert

---

**Dernière mise à jour**: Octobre 2025
**Version du guide**: 1.0
