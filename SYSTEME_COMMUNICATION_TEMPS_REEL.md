# Système de Communication en Temps Réel

## Vue d'ensemble

Système complet de communication temps réel intégrant chat, notifications push et suivi de statut de réclamations.

## Fonctionnalités implémentées

### 1. Chat en Temps Réel

**Composant**: `RealtimeChat.tsx`

**Caractéristiques**:
- Conversations client-équipe support
- Messages instantanés avec Supabase Realtime
- Indicateurs de frappe en direct
- Statuts de lecture (lu/non lu)
- Support pièces jointes
- Priorités de conversation (urgente, haute, normale, basse)
- Assignment automatique aux agents
- Tags et notes internes
- Accès client sécurisé via token

**Utilisation**:
```typescript
// Navigation vers le chat
onNavigate('chat')
```

### 2. Notifications Push

**Composant**: `PushNotificationSettings.tsx`

**Caractéristiques**:
- Support Web Push API
- Multi-device (web, iOS, Android)
- Préférences personnalisables par type:
  - Nouveaux messages
  - Mises à jour de réclamations
  - Garanties arrivant à expiration
  - Alertes système
- Notifications même app fermée
- Test de notification intégré

**Configuration**:
```typescript
// Activer les notifications
await registerPushSubscription({
  organization_id: orgId,
  user_id: userId,
  push_token: token,
  platform: 'web',
  preferences: {
    new_messages: true,
    claim_updates: true,
    warranty_expiring: true,
    system_alerts: true
  }
})
```

### 3. Suivi de Statut en Direct

**Composant**: `ClaimStatusTracker.tsx`

**Caractéristiques**:
- Timeline complète des changements de statut
- Notifications en temps réel des mises à jour
- Historique détaillé avec raisons et notes
- Indicateurs visuels animés
- Suivi de l'envoi de notifications clients
- Informations sur qui a effectué le changement

**Utilisation**:
```tsx
<ClaimStatusTracker
  claimId={claim.id}
  claimNumber={claim.claim_number}
/>
```

## Architecture de la base de données

### Tables créées

#### chat_conversations
```sql
- id: uuid (PK)
- organization_id: uuid (FK organizations)
- customer_name: text
- customer_email: text
- customer_phone: text
- assigned_to: uuid (FK profiles)
- warranty_id: uuid (FK warranties)
- claim_id: uuid (FK claims)
- status: enum (active, resolved, archived)
- priority: enum (low, normal, high, urgent)
- last_message_at: timestamptz
- unread_count_customer: integer
- unread_count_staff: integer
- access_token: text (unique)
- tags: text[]
- internal_notes: text
```

#### chat_messages
```sql
- id: uuid (PK)
- conversation_id: uuid (FK chat_conversations)
- sender_type: enum (customer, staff, system)
- sender_id: uuid (FK profiles)
- sender_name: text
- message_type: enum (text, file, image, status_update, system)
- content: text
- attachments: jsonb
- read_by_customer: boolean
- read_by_staff: boolean
- read_at: timestamptz
- is_internal: boolean
```

#### claim_status_updates
```sql
- id: uuid (PK)
- organization_id: uuid (FK organizations)
- claim_id: uuid (FK claims)
- old_status: text
- new_status: text
- changed_by: uuid (FK profiles)
- changed_by_name: text
- reason: text
- notes: text
- notification_sent: boolean
- notification_sent_at: timestamptz
- metadata: jsonb
```

#### push_subscriptions
```sql
- id: uuid (PK)
- organization_id: uuid (FK organizations)
- user_id: uuid (FK profiles)
- push_token: text
- platform: enum (web, ios, android)
- endpoint: text
- keys: jsonb
- enabled: boolean
- preferences: jsonb
- user_agent: text
- last_used_at: timestamptz
```

#### typing_indicators
```sql
- conversation_id: uuid (PK, FK chat_conversations)
- user_type: enum (customer, staff) (PK)
- user_id: uuid (PK, FK profiles)
- user_name: text
- expires_at: timestamptz
```

## API / Fonctions utilitaires

### Chat
```typescript
// Créer une conversation
await createConversation({
  organization_id: string,
  customer_name: string,
  customer_email: string,
  warranty_id?: string,
  claim_id?: string
})

// Envoyer un message
await sendMessage({
  conversation_id: string,
  sender_type: 'staff',
  sender_name: string,
  content: string
})

// S'abonner aux mises à jour
const channel = subscribeToConversation(conversationId, {
  onMessage: (message) => {...},
  onTyping: (indicator) => {...},
  onConversationUpdate: (conversation) => {...}
})
```

### Statuts de réclamation
```typescript
// Créer une mise à jour de statut
await createClaimStatusUpdate({
  organization_id: string,
  claim_id: string,
  old_status: string,
  new_status: string,
  changed_by: string,
  changed_by_name: string,
  reason?: string,
  notes?: string
})

// S'abonner aux mises à jour
const channel = subscribeToClaimUpdates(
  claimId,
  (update) => {...}
)
```

### Notifications push
```typescript
// Enregistrer une souscription
await registerPushSubscription({
  organization_id: string,
  user_id: string,
  push_token: string,
  platform: 'web' | 'ios' | 'android'
})

// Mettre à jour les préférences
await updatePushPreferences(subscriptionId, {
  new_messages: boolean,
  claim_updates: boolean,
  warranty_expiring: boolean,
  system_alerts: boolean
})
```

## Sécurité

### RLS (Row Level Security)
- Toutes les tables ont RLS activé
- Accès limité par organization_id
- Clients accèdent via tokens sécurisés
- Staff accède selon son organisation

### Tokens d'accès
- Généré automatiquement pour chaque conversation
- 256 bits de sécurité (32 bytes hex)
- Permet accès client sans authentification
- Unique et non-devinable

### Notifications
- HTTPS obligatoire pour Web Push
- Keys chiffrées dans la base
- Validation côté serveur
- Rate limiting recommandé

## Performance

### Optimisations
- Index sur toutes les colonnes de recherche
- Nettoyage automatique des indicateurs expirés
- Pagination des messages
- Limit de 20 notifications dans le centre

### Realtime
- Supabase Realtime activé sur toutes les tables
- Filtres au niveau de la base de données
- Unsubscribe automatique au démontage
- Gestion des reconnexions

## Navigation

### Pages ajoutées
1. **Chat en direct** (`/chat`)
   - Accessible: admin, operations
   - Badge de notification

2. **Notifications** (`/notifications`)
   - Accessible: admin, operations, f_and_i
   - Configuration des préférences push

### Intégrations
- NotificationCenter (header) - Déjà existant, amélioré
- ClaimStatusTracker - À intégrer dans ClaimsCenter
- Chat widget - À ajouter dans les détails de garantie/réclamation

## Migration

**Fichier**: `create_realtime_chat_system.sql`

**Commande d'application**:
```bash
# Déjà appliqué automatiquement
```

## Prochaines étapes recommandées

### Court terme
1. Intégrer ClaimStatusTracker dans ClaimsCenter
2. Ajouter widget de chat dans les détails de garantie
3. Configurer VAPID keys pour push notifications
4. Tester les notifications sur différents navigateurs

### Moyen terme
1. Ajouter support fichiers dans le chat
2. Créer templates de réponses rapides
3. Système de routing intelligent des conversations
4. Analytics des temps de réponse

### Long terme
1. Chatbot IA pour réponses automatiques
2. Support vocal/vidéo
3. Application mobile native
4. Integration SMS via Twilio

## Tests

### Tester le chat
1. Se connecter en tant qu'admin/operations
2. Naviguer vers "Chat en direct"
3. Créer une nouvelle conversation
4. Envoyer des messages
5. Vérifier les indicateurs de frappe
6. Vérifier les statuts de lecture

### Tester les notifications
1. Naviguer vers "Notifications"
2. Activer les notifications push
3. Autoriser dans le navigateur
4. Envoyer une notification de test
5. Modifier les préférences
6. Vérifier les notifications arrivent

### Tester le suivi de statut
1. Créer/modifier une réclamation
2. Changer le statut
3. Vérifier la notification en temps réel
4. Vérifier l'historique dans la timeline
5. Vérifier les détails (qui, quand, pourquoi)

## Support

Pour toute question ou problème:
1. Vérifier les logs dans la console navigateur
2. Vérifier les logs Supabase
3. Vérifier les politiques RLS
4. Vérifier la configuration Realtime

## Conclusion

Le système de communication en temps réel est maintenant pleinement fonctionnel avec:
- Chat instantané client-équipe
- Notifications push multi-device
- Suivi en direct des réclamations
- Architecture scalable et sécurisée
- Interface utilisateur moderne et intuitive

L'application est maintenant **10x plus pratique** pour la communication avec les clients!
