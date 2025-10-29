# Guide d'Utilisation - Communication en Temps Réel

## Pour commencer

### Accès rapide
- **Chat en direct**: Menu latéral → "Chat en direct"
- **Notifications**: Menu latéral → "Notifications"
- **Suivi de réclamation**: Visible dans les détails de chaque réclamation

### Configuration Initiale (Administrateurs)

**Important**: Avant d'activer les notifications push, les clés VAPID doivent être configurées.

#### Étape 1: Génération des clés VAPID

**Option recommandée**: Utilisez le générateur web intégré:

1. Ouvrez dans votre navigateur: `http://localhost:5173/generate-vapid-keys.html`
2. Cliquez sur "Generate VAPID Keys"
3. Copiez les clés générées

**Alternative**: Si Node.js crypto est disponible:
```bash
node scripts/generate-vapid-keys.js
```

Deux clés sont générées:
- **Clé publique**: Utilisée par le navigateur pour s'inscrire aux notifications
- **Clé privée**: Utilisée par le serveur pour envoyer les notifications (GARDER SECRÈTE)

#### Étape 2: Configuration des variables d'environnement

Ajoutez les clés générées dans votre fichier `.env`:

```env
VITE_VAPID_PUBLIC_KEY=votre-clé-publique-ici
VITE_VAPID_PRIVATE_KEY=votre-clé-privée-ici
```

#### Étape 3: Configuration Supabase

La clé privée doit également être configurée comme secret Supabase pour l'Edge Function:

```bash
supabase secrets set VAPID_PRIVATE_KEY=votre-clé-privée-ici
```

#### Étape 4: Redémarrage

Redémarrez le serveur de développement pour prendre en compte les nouvelles variables:

```bash
npm run dev
```

**Note de sécurité**:
- ⚠️ Ne commitez JAMAIS la clé privée dans Git
- ✅ La clé publique peut être partagée sans risque
- 🔒 Stockez la clé privée de manière sécurisée (secrets manager, coffre-fort)

## Chat en Temps Réel

### Démarrer une conversation

1. Cliquez sur "Chat en direct" dans le menu
2. Vous verrez la liste de toutes les conversations actives
3. Pour créer une nouvelle conversation (à venir)

### Interface du chat

**Liste des conversations (gauche)**
- Badge de priorité (Urgente, Haute, Normale, Basse)
- Compteur de messages non lus
- Dernière activité
- Tags associés

**Zone de chat (droite)**
- Messages en temps réel
- Indicateur de frappe en direct
- Statuts de lecture (Lu/Envoyé)
- Support pièces jointes (à venir)

### Fonctionnalités

**Messages**
- Envoi instantané avec Enter
- Indicateurs de frappe automatiques
- Confirmation de lecture
- Horodatage relatif ("il y a 2 minutes")

**Organisation**
- Filtrer par priorité
- Tags personnalisables
- Notes internes (visibles uniquement par l'équipe)
- Assignment aux agents

### Codes couleur

| Priorité | Couleur | Usage |
|----------|---------|-------|
| Urgente | Rouge | Problèmes critiques nécessitant action immédiate |
| Haute | Orange | Important mais pas urgent |
| Normale | Bleu | Communication standard |
| Basse | Gris | Questions informatives |

## Notifications Push

### Activation

1. Accédez à "Notifications" dans le menu
2. Cliquez sur "Activer"
3. Autorisez les notifications dans votre navigateur
4. Configurez vos préférences

### Préférences disponibles

**Nouveaux messages**
- Notification instantanée pour chaque nouveau message chat
- Son et vibration (selon appareil)

**Mises à jour des réclamations**
- Alerte quand le statut d'une réclamation change
- Détails du changement inclus

**Garanties arrivant à expiration**
- Rappels automatiques 30, 15, 7 jours avant expiration
- Liste des garanties concernées

**Alertes système**
- Mises à jour importantes
- Maintenance planifiée
- Nouvelles fonctionnalités

### Test des notifications

1. Dans "Notifications"
2. Cliquez sur "Envoyer une notification de test"
3. Vérifiez que vous recevez la notification

### Résolution de problèmes

**Les notifications n'apparaissent pas**
1. Vérifiez les paramètres de votre navigateur
2. Assurez-vous que le site est autorisé
3. Vérifiez que vous avez activé les notifications dans l'app
4. Sur mobile, vérifiez les paramètres système

**Trop de notifications**
- Désactivez les types non essentiels dans les préférences
- Ajustez les horaires dans les paramètres du système

## Suivi de Statut en Direct

### Visualisation

**Timeline complète**
- Tous les changements de statut chronologiques
- Animation pour les nouveautés
- Code couleur selon le statut

**Détails inclus**
- Ancien → Nouveau statut
- Qui a effectué le changement
- Quand (date et heure précise)
- Pourquoi (raison du changement)
- Notes additionnelles

### Notifications en direct

**Badge "Nouveau"**
- Apparaît sur les mises à jour récentes
- Animation de pulsation
- Disparaît après quelques secondes

**Pop-up de notification**
- En haut à droite de l'écran
- Affiche le changement de statut
- Auto-disparaît après 5 secondes
- Cliquable pour plus de détails

### Statuts des réclamations

| Statut | Couleur | Signification |
|--------|---------|---------------|
| En attente | Ambre | Réclamation reçue, en attente d'évaluation |
| En cours d'évaluation | Bleu | Analyse en cours par l'équipe |
| Approuvé | Vert | Réclamation acceptée |
| Rejeté | Rouge | Réclamation refusée |

## Intégration avec les réclamations

### ClaimStatusTracker - Nouveau!

Le **ClaimStatusTracker** est maintenant intégré directement dans le Centre de réclamations pour un suivi en temps réel amélioré.

#### Accéder au tracker

1. Naviguez vers **Centre de réclamations** dans le menu
2. Cliquez sur n'importe quelle réclamation pour voir ses détails
3. Scrollez vers le bas du modal
4. Le **ClaimStatusTracker** apparaît après les informations de la réclamation

#### Fonctionnalités du tracker

**Timeline interactive**:
- Affichage chronologique de tous les changements de statut
- Icônes codées par couleur selon le type de statut
- Animations visuelles pour les mises à jour récentes

**Informations détaillées pour chaque changement**:
- Statut précédent → Nouveau statut
- Nom de la personne ayant effectué le changement
- Date et heure précises (format relatif: "il y a 5 minutes")
- Raison du changement
- Notes additionnelles
- Confirmation d'envoi de notification au client

**Mises à jour en temps réel**:
- Les changements apparaissent instantanément sans rafraîchissement
- Pop-up de notification en haut à droite lors d'un nouveau changement
- Animation de pulsation sur le dernier statut
- Badge "Nouveau" sur les mises à jour récentes
- La pop-up disparaît automatiquement après 5 secondes

#### Scénarios d'utilisation

**Pour le personnel**:
1. Ouvrir une réclamation pour voir son historique complet
2. Observer les changements en temps réel pendant qu'un collègue met à jour
3. Vérifier qui a effectué quel changement et quand
4. Confirmer que les notifications ont été envoyées aux clients

**Pour les superviseurs**:
1. Suivre la progression des réclamations en temps réel
2. Auditer les décisions et les raisons fournies
3. Identifier les goulots d'étranglement dans le processus
4. Assurer la transparence et la traçabilité

### Créer une conversation depuis une réclamation

1. Ouvrez les détails d'une réclamation
2. Cliquez sur "Démarrer une conversation"
3. La conversation est automatiquement liée à la réclamation

### Voir l'historique complet

Dans chaque réclamation:
- **ClaimStatusTracker** en bas du modal pour l'historique de statut en temps réel
- Onglet "Timeline" pour l'historique général de la réclamation
- Onglet "Messages" pour la conversation (à venir)
- Tout est synchronisé en temps réel via Supabase Realtime

## Accès client

### Lien de réclamation

Les clients reçoivent un lien unique pour:
- Voir le statut de leur réclamation
- Recevoir des notifications
- Participer à la conversation
- Soumettre des documents additionnels

### Sécurité

- Accès par token unique
- Pas besoin de compte client
- Lien valide uniquement pour leur réclamation
- Expire selon configuration

## Bonnes pratiques

### Pour le chat

**Répondre rapidement**
- Visez < 5 minutes pour les priorités urgentes
- Visez < 1 heure pour les priorités normales
- Utilisez les templates de réponse (à venir)

**Organiser les conversations**
- Assignez à la bonne personne
- Utilisez les tags appropriés
- Ajoutez des notes internes pour contexte
- Marquez comme résolu quand terminé

### Pour les notifications

**Configurer intelligemment**
- Activez uniquement ce qui est pertinent pour votre rôle
- Testez régulièrement
- Ajustez selon votre workflow

**Agir rapidement**
- Cliquez sur la notification pour accès direct
- Utilisez-les comme rappels d'action
- Désactivez si vous êtes en vacances

### Pour le suivi de statut

**Être transparent**
- Changez le statut dès que possible
- Ajoutez toujours une raison
- Incluez des notes détaillées
- Le client est notifié automatiquement

**Communiquer clairement**
- Utilisez des raisons compréhensibles
- Évitez le jargon technique
- Soyez professionnel et courtois

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| Cmd/Ctrl + K | Ouvrir recherche globale |
| Entrée | Envoyer message |
| Échap | Fermer modal/notification |

## Support technique

### Problèmes communs

**"Notifications non supportées"**
- Votre navigateur est trop ancien
- Utilisez Chrome, Firefox ou Safari récent
- Sur iOS, utilisez Safari uniquement

**Messages ne s'affichent pas**
- Vérifiez votre connexion internet
- Rafraîchissez la page (F5)
- Vérifiez les paramètres RLS Supabase

**Indicateurs de frappe bloqués**
- Se résolvent automatiquement après 10 secondes
- Sinon, rafraîchissez la conversation

### Logs et débogage

**Console du navigateur**
```javascript
// Ouvrez avec F12
// Recherchez les erreurs en rouge
// Partagez les avec le support
```

**Vérifier la connexion Realtime**
```javascript
// Dans la console
supabase.channel('test').subscribe((status) => {
  console.log('Status:', status)
})
```

## Prochaines fonctionnalités

### En développement
- [ ] Upload de fichiers dans le chat
- [ ] Templates de réponses rapides
- [ ] Recherche dans les conversations
- [ ] Statistiques de temps de réponse
- [ ] Export des conversations

### Planifié
- [ ] Chatbot IA pour réponses automatiques
- [ ] Appels audio/vidéo
- [ ] Application mobile native
- [ ] Integration SMS

## Retour d'expérience

### Partager vos suggestions

Nous sommes à l'écoute de vos retours:
- Fonctionnalités manquantes
- Bugs rencontrés
- Améliorations UX
- Cas d'usage spécifiques

### Contribuer

Si vous avez des idées:
1. Documentez votre cas d'usage
2. Expliquez le problème résolu
3. Proposez une solution
4. Partagez avec l'équipe

## Conclusion

Le système de communication en temps réel transforme la façon dont vous interagissez avec vos clients:

- **Plus rapide**: Réponses instantanées, pas d'emails perdus
- **Plus transparent**: Clients toujours informés du statut
- **Plus efficace**: Tout centralisé au même endroit
- **Plus professionnel**: Interface moderne et intuitive

Profitez-en pour offrir un service client exceptionnel!
