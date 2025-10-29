# Guide Complet des Notifications Push

## Vue d'ensemble

Le système de notifications push permet de recevoir des alertes en temps réel sur votre navigateur ou appareil mobile, même lorsque l'application est fermée. Ce guide vous accompagne de A à Z dans la configuration et l'utilisation des notifications push.

## Table des matières

1. [Configuration Initiale](#configuration-initiale)
2. [Activation des Notifications](#activation-des-notifications)
3. [Gestion des Préférences](#gestion-des-préférences)
4. [Types de Notifications](#types-de-notifications)
5. [Dépannage](#dépannage)
6. [Architecture Technique](#architecture-technique)
7. [Sécurité et Confidentialité](#sécurité-et-confidentialité)

---

## Configuration Initiale

### Prérequis

- Navigateur moderne (Chrome, Firefox, Safari, Edge)
- Connexion Internet stable
- Permissions de notification autorisées dans le navigateur
- Compte utilisateur actif dans l'application

### Vérification de Compatibilité

Le système détecte automatiquement si votre navigateur supporte les notifications push. Si ce n'est pas le cas, vous verrez un message vous invitant à utiliser un navigateur compatible.

**Navigateurs supportés :**
- Chrome Desktop/Android: Support complet
- Firefox Desktop: Support complet
- Safari Desktop (macOS 13+): Support complet
- Edge Desktop: Support complet
- Safari iOS: Support limité (nécessite "Add to Home Screen")

---

## Activation des Notifications

### Étape 1: Accéder aux Paramètres

1. Connectez-vous à l'application
2. Cliquez sur votre profil en haut à droite
3. Sélectionnez "Paramètres" ou "Réglages"
4. Naviguez vers la section "Notifications Push"

### Étape 2: Activer les Notifications

1. Cliquez sur le bouton **"Activer"**
2. Une demande de permission apparaîtra dans votre navigateur
3. Cliquez sur **"Autoriser"** ou **"Allow"**

**Important:** Si vous cliquez sur "Bloquer", vous devrez réactiver les notifications manuellement dans les paramètres de votre navigateur.

### Étape 3: Vérification

Une fois activées, vous verrez :
- Un badge vert avec "Notifications activées"
- Vos préférences de notification
- Un bouton "Envoyer une notification de test"

### Test de Fonctionnement

Cliquez sur **"Envoyer une notification de test"** pour vérifier que tout fonctionne correctement. Une notification devrait apparaître immédiatement.

---

## Gestion des Préférences

### Types de Notifications Disponibles

Vous pouvez personnaliser quels types de notifications vous souhaitez recevoir :

#### 1. Nouveaux Messages
- Notifications pour les messages du chat en temps réel
- Alertes quand un client ou un collègue vous envoie un message
- **Recommandé:** Activé pour ne manquer aucune conversation importante

#### 2. Mises à jour des Réclamations
- Notifications lors de changements de statut des réclamations
- Alertes pour les nouvelles réclamations assignées
- Mises à jour sur les décisions de réclamation
- **Recommandé:** Activé pour un suivi optimal

#### 3. Garanties Arrivant à Expiration
- Alertes 30, 15 et 7 jours avant l'expiration
- Permet de contacter les clients proactivement
- **Recommandé:** Activé pour maintenir une bonne relation client

#### 4. Alertes Système
- Notifications importantes sur le système
- Mises à jour de sécurité
- Alertes de maintenance planifiée
- **Recommandé:** Activé pour rester informé

### Modification des Préférences

1. Dans la section "Préférences de notification"
2. Cochez/décochez les cases selon vos besoins
3. Les changements sont sauvegardés automatiquement
4. Un message de confirmation apparaît

---

## Types de Notifications

### Notifications de Chat

**Apparence:**
- Titre: "Nouveau message de [Nom]"
- Contenu: Aperçu du message
- Action: Cliquer ouvre la conversation

**Exemple:**
```
Nouveau message de Jean Dupont
"Bonjour, j'ai une question sur ma garantie..."
```

### Notifications de Réclamation

**Apparence:**
- Titre: "Réclamation #[Numéro] mise à jour"
- Contenu: Détails du changement de statut
- Action: Cliquer ouvre les détails de la réclamation

**Exemple:**
```
Réclamation #1234 mise à jour
Statut changé: En attente → Approuvée
```

### Notifications de Garantie

**Apparence:**
- Titre: "Garantie arrivant à expiration"
- Contenu: Nom du client et date d'expiration
- Action: Cliquer ouvre la fiche garantie

**Exemple:**
```
Garantie arrivant à expiration
Client: Marie Martin - Expire le 15/11/2025
```

### Alertes Système

**Apparence:**
- Titre: "Alerte système"
- Contenu: Message d'alerte
- Action: Cliquer ouvre la page concernée

---

## Dépannage

### Problème: "Notifications non supportées"

**Cause:** Votre navigateur ne supporte pas les notifications push.

**Solution:**
1. Mettez à jour votre navigateur vers la dernière version
2. Utilisez un navigateur compatible (Chrome, Firefox, Safari récent)
3. Vérifiez que JavaScript est activé

### Problème: "Configuration VAPID manquante"

**Cause:** Les clés de sécurité ne sont pas configurées.

**Solution (Administrateur uniquement):**
1. Ouvrez `/generate-vapid-keys.html`
2. Générez les clés VAPID
3. Configurez-les dans `.env` et Supabase
4. Redémarrez le serveur

### Problème: "Permission refusée"

**Cause:** Vous avez bloqué les notifications dans votre navigateur.

**Solution Chrome:**
1. Cliquez sur l'icône de cadenas dans la barre d'adresse
2. Trouvez "Notifications"
3. Changez en "Autoriser"
4. Rechargez la page et réessayez

**Solution Firefox:**
1. Cliquez sur l'icône d'information dans la barre d'adresse
2. Permissions → Notifications
3. Changez en "Autoriser"
4. Rechargez la page et réessayez

**Solution Safari:**
1. Safari → Préférences → Sites web
2. Notifications
3. Trouvez votre site et changez en "Autoriser"
4. Rechargez la page et réessayez

### Problème: "Service Worker non disponible"

**Cause:** Le Service Worker ne s'est pas enregistré correctement.

**Solution:**
1. Ouvrez les DevTools (F12)
2. Onglet "Application" → "Service Workers"
3. Cliquez sur "Unregister" si présent
4. Rechargez la page (Ctrl+Shift+R ou Cmd+Shift+R)

### Problème: Les notifications n'apparaissent pas

**Vérifications:**

1. **Permission accordée ?**
   - Vérifiez dans Diagnostics que "Permission: Accordée"

2. **VAPID configuré ?**
   - Vérifiez dans Diagnostics que "VAPID: Configuré"

3. **Préférences activées ?**
   - Vérifiez que le type de notification est coché

4. **Mode Ne Pas Déranger ?**
   - Désactivez le mode NPD de votre système d'exploitation

5. **Focus Assist (Windows) ?**
   - Désactivez temporairement pour tester

### Problème: Erreur lors de l'activation

**Message:** "Service Worker timeout"

**Solution:**
1. Fermez tous les onglets de l'application
2. Videz le cache du navigateur
3. Rechargez la page
4. Réessayez l'activation

### Réinitialisation Complète

Si rien ne fonctionne :

1. Cliquez sur le bouton **"Réinitialiser"**
2. Rechargez la page
3. Réactivez les notifications depuis le début

---

## Architecture Technique

### Composants du Système

```
┌─────────────────────────────────────────┐
│         Navigateur (Frontend)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  PushNotificationSettings.tsx     │ │
│  │  - Interface utilisateur          │ │
│  │  - Gestion des préférences        │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│                 ▼                       │
│  ┌───────────────────────────────────┐ │
│  │  Service Worker                   │ │
│  │  - Écoute les notifications       │ │
│  │  - Affiche les notifications      │ │
│  │  - Gère les clics                 │ │
│  └───────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ Push Protocol
                  │
        ┌─────────▼──────────┐
        │  Push Service      │
        │  (Google/Mozilla)  │
        └─────────┬──────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Backend (Supabase)              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Edge Function                    │ │
│  │  send-push-notification           │ │
│  │  - Chiffrement Web Push           │ │
│  │  - Envoi aux services push        │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│  ┌─────────────▼───────────────────┐  │
│  │  Database                       │  │
│  │  - push_subscriptions           │  │
│  │  - push_notification_logs       │  │
│  │  - notifications                │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Flux de Données

1. **Inscription:**
   - Utilisateur clique "Activer"
   - Permission demandée au navigateur
   - Service Worker enregistré
   - Subscription créée avec clés VAPID
   - Stockée dans `push_subscriptions`

2. **Envoi:**
   - Événement se produit (nouveau message, etc.)
   - Trigger crée entrée dans `notifications`
   - Fonction `handle_new_notification` appelée
   - Vérifie préférences utilisateur
   - Appelle Edge Function si préférences OK
   - Edge Function chiffre et envoie au Push Service
   - Push Service transmet au Service Worker
   - Service Worker affiche la notification

3. **Réception:**
   - Service Worker reçoit l'événement `push`
   - Parse les données JSON
   - Affiche la notification avec `showNotification`
   - Log l'événement pour analytics

4. **Interaction:**
   - Utilisateur clique sur la notification
   - Événement `notificationclick` déclenché
   - Service Worker ouvre/focus la bonne page
   - Notification fermée automatiquement

### Sécurité

**Chiffrement:**
- Protocole Web Push (RFC 8291)
- Clés VAPID (Voluntary Application Server Identification)
- ECDH (Elliptic Curve Diffie-Hellman) pour l'échange de clés
- AES-GCM pour le chiffrement du contenu

**Authentification:**
- VAPID JWT avec signature ECDSA P-256
- Tokens de subscription uniques par utilisateur/appareil
- RLS (Row Level Security) sur toutes les tables

---

## Sécurité et Confidentialité

### Données Collectées

Le système collecte uniquement :
- Endpoint de subscription (URL du service push)
- Clés publiques de chiffrement
- Préférences de notification
- Logs d'envoi (pour debugging)

**Aucune donnée sensible n'est stockée** dans les notifications push. Les contenus sont limités aux informations nécessaires.

### Droits et Permissions

- Vous pouvez désactiver les notifications à tout moment
- Les préférences sont modifiables à votre convenance
- Aucun tracking de localisation ou d'activité
- Conformité RGPD intégrée

### Suppression des Données

Pour supprimer toutes vos données de notifications :

1. Cliquez sur "Désactiver" dans les paramètres
2. Toutes vos subscriptions sont supprimées
3. Les logs sont automatiquement purgés après 90 jours

### Bonnes Pratiques

**Pour les utilisateurs :**
- Activez uniquement les notifications utiles
- Utilisez le mode "Ne pas déranger" si besoin
- Désactivez temporairement pour les réunions
- Revoyez vos préférences régulièrement

**Pour les administrateurs :**
- Rotez les clés VAPID annuellement
- Surveillez les logs d'erreur
- Testez régulièrement le système
- Informez les utilisateurs des changements

---

## Support et Contact

### Ressources Utiles

- Documentation technique: `/VAPID_SETUP_QUICK_START.md`
- Tests navigateurs: `/BROWSER_TESTING_GUIDE.md`
- Dépannage avancé: `/TROUBLESHOOTING_GARANTIES.md`

### Obtenir de l'Aide

Si vous rencontrez des problèmes :

1. **Consultez d'abord la section Dépannage**
2. **Vérifiez les Diagnostics** dans l'interface
3. **Contactez votre administrateur** avec :
   - Capture d'écran du message d'erreur
   - Navigateur et version
   - Actions effectuées avant l'erreur

---

**Dernière mise à jour:** Octobre 2025
**Version:** 2.0
**Auteur:** Système de Gestion de Garanties
