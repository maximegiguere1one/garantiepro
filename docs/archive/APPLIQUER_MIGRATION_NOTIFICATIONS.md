# Guide: Appliquer la Migration des Notifications Email

## Étape 1: Accéder à Supabase

1. Allez sur https://supabase.com
2. Connectez-vous à votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche

## Étape 2: Exécuter la Migration

1. Cliquez sur **New query**
2. Copiez tout le contenu du fichier suivant:
   ```
   supabase/migrations/20251011000000_create_email_notification_system.sql
   ```

3. Collez le contenu dans l'éditeur SQL
4. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)

## Étape 3: Vérifier que la Migration a Réussi

Exécutez cette requête dans l'éditeur SQL:

```sql
-- Vérifier que la table existe
SELECT COUNT(*) FROM user_notification_preferences;

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notify_new_warranty',
  'trigger_notify_new_claim',
  'trigger_notify_claim_status_update',
  'trigger_notify_new_franchisee',
  'trigger_create_default_notif_prefs'
);
```

Si vous voyez des résultats, la migration a réussi!

## Étape 4: Tester les Notifications

1. Allez dans **Paramètres → Notifications** dans l'application
2. Vous devriez voir l'interface de configuration des notifications
3. Activez/désactivez les préférences et cliquez sur "Enregistrer"
4. Créez une nouvelle garantie pour tester l'envoi automatique d'email

## Que fait cette Migration?

### Tables Créées:
- `user_notification_preferences` - Stocke les préférences de chaque utilisateur

### Triggers Automatiques:
- **Nouvelle garantie** → Email envoyé automatiquement
- **Nouvelle réclamation** → Email envoyé automatiquement
- **Mise à jour de statut de réclamation** → Email envoyé automatiquement
- **Nouveau franchisé** → Email envoyé au propriétaire
- **Nouveau profil** → Crée préférences par défaut

### RLS (Row Level Security):
- Les utilisateurs peuvent seulement voir et modifier leurs propres préférences
- Accès sécurisé par `auth.uid()`

## En Cas d'Erreur

Si vous recevez une erreur lors de l'exécution:

1. Vérifiez que toutes les tables référencées existent:
   - `organizations`
   - `profiles`
   - `warranties`
   - `claims`
   - `email_queue`

2. Si une table manque, exécutez d'abord les migrations précédentes

3. Contactez le support si le problème persiste

## Notes Importantes

- Les emails sont mis en file d'attente dans `email_queue`
- L'edge function `send-email` traite automatiquement la queue
- Les utilisateurs reçoivent SEULEMENT les emails qu'ils ont activés dans leurs préférences
- Par défaut, toutes les notifications importantes sont activées
