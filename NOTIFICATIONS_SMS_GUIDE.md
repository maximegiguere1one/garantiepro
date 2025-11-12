# Guide des Notifications SMS

## Vue d'ensemble

Le système de notifications SMS a été installé et configuré avec succès. Il envoie automatiquement un SMS à votre numéro personnel (+14185728464) chaque fois qu'une nouvelle garantie est créée dans le système.

## Caractéristiques

✅ **Trigger automatique** - Se déclenche après chaque création de garantie
✅ **File d'attente SMS** - Gestion robuste avec réessais automatiques
✅ **Configuration flexible** - Paramètres par organisation
✅ **Non-bloquant** - Ne ralentit pas la création de garanties
✅ **Multi-langue** - Support français et anglais

## Configuration actuelle

### Paramètres par défaut

- **Numéro de notification**: `+14185728464` (votre numéro)
- **Notifications activées**: `Oui`
- **Langue des SMS**: `Français`

### Exemple de message SMS reçu

```
Nouvelle garantie!

Contrat: W-1699999999-ABC123XYZ
Client: Jean Tremblay
Plan: Protection Plus 24 mois
Total: 1,500.00 $

Garantie Pro-Remorque
```

## Comment ça fonctionne

### 1. Déclenchement automatique

Lorsqu'une garantie est créée via le formulaire `NewWarranty.tsx`, le trigger PostgreSQL `warranty_sms_notification` s'exécute automatiquement.

### 2. File d'attente

Le SMS est ajouté à la table `sms_queue` avec:
- Priorité: `high` (priorité élevée pour les nouvelles garanties)
- Statut initial: `pending`
- Max tentatives: 3 (avec réessais automatiques)

### 3. Envoi via Twilio

Si l'extension `pg_net` est disponible dans Supabase, le SMS est envoyé immédiatement via la fonction Edge `/functions/v1/send-sms`. Sinon, il reste en file d'attente et peut être traité par un cron job.

### 4. Suivi et traçabilité

Tous les SMS sont enregistrés dans la table `sms_queue` avec:
- Horodatage
- Statut (pending, sending, sent, failed)
- Nombre de tentatives
- Messages d'erreur (si échec)
- Métadonnées (warranty_id, contract_number, etc.)

## Gestion via l'interface

### Paramètres modifiables

Vous pouvez modifier les paramètres dans la table `company_settings`:

```sql
-- Voir les paramètres actuels
SELECT
  enable_sms_notifications,
  sms_notification_phone,
  sms_notification_language
FROM company_settings;

-- Modifier le numéro de notification
UPDATE company_settings
SET sms_notification_phone = '+1XXXXXXXXXX'
WHERE organization_id = 'votre-organisation-id';

-- Désactiver les notifications SMS
UPDATE company_settings
SET enable_sms_notifications = false
WHERE organization_id = 'votre-organisation-id';

-- Changer la langue en anglais
UPDATE company_settings
SET sms_notification_language = 'en'
WHERE organization_id = 'votre-organisation-id';
```

## Surveillance et débogage

### Consulter la file d'attente SMS

```sql
-- Voir les SMS récents
SELECT
  id,
  to_phone,
  body,
  status,
  attempts,
  created_at,
  sent_at,
  error_message
FROM sms_queue
ORDER BY created_at DESC
LIMIT 10;

-- Voir les SMS en attente
SELECT * FROM sms_queue
WHERE status = 'pending'
ORDER BY priority DESC, created_at ASC;

-- Voir les SMS échoués
SELECT * FROM sms_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Retraiter manuellement les SMS en attente

Si des SMS n'ont pas été envoyés, vous pouvez les retraiter manuellement:

```sql
-- Appeler la fonction de traitement de la file
SELECT process_sms_queue();
```

Cette fonction traite jusqu'à 10 SMS en attente et retourne le nombre de SMS traités.

## Structure de la base de données

### Table: `sms_queue`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Identifiant unique du SMS |
| `organization_id` | uuid | Organisation propriétaire |
| `to_phone` | text | Numéro du destinataire (format E.164) |
| `body` | text | Contenu du message |
| `status` | text | pending, sending, sent, failed |
| `priority` | text | low, normal, high, urgent |
| `attempts` | integer | Nombre de tentatives |
| `max_retries` | integer | Maximum de tentatives (défaut: 3) |
| `metadata` | jsonb | Métadonnées (warranty_id, etc.) |
| `error_message` | text | Message d'erreur si échec |
| `created_at` | timestamptz | Date de création |
| `sent_at` | timestamptz | Date d'envoi |

### Colonnes ajoutées à `company_settings`

| Colonne | Type | Valeur par défaut |
|---------|------|-------------------|
| `enable_sms_notifications` | boolean | `true` |
| `sms_notification_phone` | text | `+14185728464` |
| `sms_notification_language` | text | `fr` |

## Sécurité

- **RLS activé** - Les SMS ne sont visibles que par l'organisation propriétaire
- **SECURITY DEFINER** - Les fonctions s'exécutent avec des privilèges élevés mais sécurisés
- **Gestion d'erreur** - Les échecs SMS ne bloquent jamais la création de garanties
- **Credentials Twilio** - Stockés en tant que secrets Supabase (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)

## Performance

- **Non-bloquant** - Le trigger retourne immédiatement après avoir ajouté le SMS en file
- **Asynchrone** - L'envoi via `pg_net` est asynchrone
- **Index optimisés** - Requêtes rapides sur la file d'attente
- **Limite de traitement** - Max 10 SMS par appel à `process_sms_queue()` pour éviter les timeouts

## Dépannage

### Le SMS n'est pas reçu

1. **Vérifier la file d'attente**:
   ```sql
   SELECT * FROM sms_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5;
   ```

2. **Vérifier les logs PostgreSQL** dans Supabase Dashboard → Database → Logs

3. **Vérifier la configuration Twilio** dans Supabase Dashboard → Project Settings → Edge Functions → Environment Variables

### Le SMS est en status "pending"

Si `pg_net` n'est pas disponible, les SMS restent en status `pending`. Vous pouvez:

1. **Activer pg_net** dans Supabase (contactez le support si nécessaire)

2. **Créer un cron job** pour appeler périodiquement `process_sms_queue()`:
   ```sql
   -- Exemple: toutes les 5 minutes via pg_cron
   SELECT cron.schedule(
     'process-sms-queue',
     '*/5 * * * *',
     'SELECT process_sms_queue();'
   );
   ```

3. **Traiter manuellement**:
   ```sql
   SELECT process_sms_queue();
   ```

### Modifier le format du message

Le message SMS est généré dans la fonction `notify_new_warranty_sms()`. Pour le modifier:

1. Ouvrir: `/tmp/cc-agent/59288411/project/supabase/migrations/20251112050000_create_sms_notification_system_nov12.sql`

2. Modifier la section "Construire le message SMS selon la langue" (lignes 215-231)

3. Créer une nouvelle migration pour appliquer les changements:
   ```sql
   -- Nouvelle migration: 20251112060000_update_sms_message_format.sql
   CREATE OR REPLACE FUNCTION notify_new_warranty_sms()
   -- ... copier la fonction avec les modifications
   ```

## Coûts Twilio

- **SMS Canada/US**: ~$0.0075 USD par SMS
- **Estimation**: 100 garanties/mois = ~$0.75 USD/mois
- Consultez la [grille tarifaire Twilio](https://www.twilio.com/pricing/messaging) pour les coûts exacts

## Support et questions

Pour toute question ou problème:

1. Consultez les logs dans `sms_queue`
2. Vérifiez les logs PostgreSQL dans Supabase
3. Consultez la documentation Twilio
4. Contactez le support technique

---

**Système installé le**: 12 novembre 2025
**Version**: 1.0
**Status**: ✅ Actif et fonctionnel
