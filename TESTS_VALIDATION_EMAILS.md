# Tests de Validation du Système d'Emails

## Statut des Corrections

✅ **Migration créée**: `20251011200000_fix_email_system_complete.sql`
✅ **Triggers corrigés**: Utilisation de JOIN pour customer_name et vin
✅ **Frontend amélioré**: Queue-first strategy dans NewWarranty.tsx
✅ **Edge Function créée**: `process-email-queue` pour traitement automatique
✅ **Templates améliorés**: HTML professionnel multilingue
✅ **Build réussi**: Projet compile sans erreurs

## Tests à Effectuer

### Test 1: Vérifier la Migration

```bash
# Se connecter à Supabase
cd /path/to/project

# Appliquer la migration (si pas déjà fait)
supabase db push

# Ou via SQL Editor dans Supabase Dashboard
```

**Vérifications**:
```sql
-- 1. Vérifier que la table email_queue existe avec bon schéma
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'email_queue'
ORDER BY ordinal_position;

-- Résultat attendu: id, organization_id, to_email, from_email, subject,
-- html_body, text_body, priority, metadata, status, attempts,
-- max_retries, error_message, next_retry_at, sent_at, failed_at,
-- created_at, updated_at

-- 2. Vérifier que les triggers existent
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_notify%'
ORDER BY trigger_name;

-- Résultat attendu:
-- trigger_notify_new_warranty (warranties, AFTER INSERT)
-- trigger_notify_new_claim (claims, AFTER INSERT)
-- trigger_notify_claim_status_update (claims, AFTER UPDATE)

-- 3. Vérifier que les fonctions existent
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'queue_email',
  'send_email_notification',
  'notify_new_warranty',
  'notify_new_claim',
  'notify_claim_status_update'
)
ORDER BY routine_name;

-- Résultat attendu: 5 fonctions trouvées
```

### Test 2: Déployer les Edge Functions

```bash
# Déployer process-email-queue
supabase functions deploy process-email-queue

# Vérifier le déploiement
supabase functions list

# Tester l'invocation
supabase functions invoke process-email-queue --debug
```

**Résultat attendu**:
```json
{
  "success": true,
  "stats": {
    "processed": 0,
    "sent": 0,
    "failed": 0,
    "retried": 0
  },
  "executionTime": 123
}
```

### Test 3: Vérifier Configuration Resend

```bash
# Lister les secrets
supabase secrets list

# Devrait afficher: RESEND_API_KEY (set)
```

**Si manquant**:
```bash
# Obtenir la clé depuis https://resend.com/api-keys
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# Redéployer les fonctions
supabase functions deploy send-email
supabase functions deploy process-email-queue
```

**Vérifier le domaine**:
- Allez sur https://resend.com/domains
- Le domaine `locationproremorque.ca` doit avoir statut "Verified"
- Si "Pending", vérifiez les enregistrements DNS

### Test 4: Tester Email de Test Direct

```sql
-- Dans SQL Editor Supabase
SELECT queue_email(
  p_to_email := 'votre-email@example.com',
  p_subject := 'Test Email Queue System',
  p_html_body := '<h1>Test réussi!</h1><p>Le système de queue fonctionne correctement.</p>',
  p_priority := 'high',
  p_metadata := '{"test": true}'::jsonb
);

-- Vérifier que l'email est dans la queue
SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 1;
```

**Résultat attendu**:
- Fonction retourne un UUID
- Email visible dans `email_queue` avec status='queued'

**Traiter manuellement**:
```bash
# Invoquer le processeur
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Ou via CLI
supabase functions invoke process-email-queue
```

**Vérifier le résultat**:
```sql
-- L'email devrait maintenant avoir status='sent'
SELECT id, to_email, status, attempts, sent_at, error_message
FROM email_queue
ORDER BY created_at DESC
LIMIT 5;
```

### Test 5: Créer une Garantie (Test Complet End-to-End)

1. **Préparer un client test**:
   - Email valide que vous pouvez vérifier
   - Toutes les informations requises

2. **Créer la garantie**:
   - Aller dans l'application
   - Menu "Nouvelle vente"
   - Remplir tous les champs:
     - Client: prénom, nom, email, téléphone, adresse
     - Remorque: VIN, marque, modèle, année
     - Plan de garantie: sélectionner un plan
     - Options: sélectionner si nécessaire
   - Cliquer "Continuer" à chaque étape
   - Arriver à l'étape de signature

3. **Signer le contrat**:
   - Dessiner une signature dans le pad
   - Cocher l'acceptation des termes
   - Cliquer "Signer le contrat"

4. **Vérifier le message de succès**:
   ```
   Garantie créée avec succès!

   Contrat: XXXX-XXXXX
   Vente complétée en Xm XXs

   ✓ Client créé
   ✓ Remorque enregistrée
   ✓ Garantie activée
   ✓ Documents générés
   ✓ Contrat signé
   ✓ Email de confirmation programmé  <-- IMPORTANT
   ```

5. **Vérifier dans la base de données**:
   ```sql
   -- Vérifier que la garantie existe
   SELECT id, contract_number, status, customer_id
   FROM warranties
   ORDER BY created_at DESC
   LIMIT 1;

   -- Vérifier que l'email est en queue
   SELECT id, to_email, subject, status, priority
   FROM email_queue
   WHERE metadata->>'type' = 'warranty_confirmation'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

6. **Traiter la queue**:
   ```bash
   supabase functions invoke process-email-queue
   ```

7. **Vérifier l'envoi**:
   ```sql
   -- L'email devrait être envoyé
   SELECT status, sent_at, attempts, error_message
   FROM email_queue
   WHERE metadata->>'type' = 'warranty_confirmation'
   ORDER BY created_at DESC
   LIMIT 1;

   -- Status attendu: 'sent'
   -- sent_at: timestamp récent
   -- attempts: 1
   -- error_message: NULL
   ```

8. **Vérifier la réception**:
   - Ouvrir la boîte email du client test
   - Chercher l'email de Location Pro-Remorque
   - Vérifier le contenu:
     - ✓ Sujet correct (français ou anglais)
     - ✓ Design HTML professionnel
     - ✓ Toutes les informations de garantie
     - ✓ Numéro de contrat correct
     - ✓ Dates de début/fin correctes
     - ✓ Informations véhicule correctes
     - ✓ Droit de rétractation avec date limite

### Test 6: Tester le Système de Retry

1. **Simuler un échec**:
   ```sql
   -- Insérer un email avec une adresse invalide
   INSERT INTO email_queue (
     to_email,
     from_email,
     subject,
     html_body,
     status,
     priority,
     max_retries,
     metadata
   ) VALUES (
     'invalid-email@nonexistent-domain-12345.com',
     'noreply@locationproremorque.ca',
     'Test Retry System',
     '<p>This should fail and retry</p>',
     'queued',
     'normal',
     3,
     '{"test": "retry"}'::jsonb
   );
   ```

2. **Invoquer le processeur**:
   ```bash
   supabase functions invoke process-email-queue
   ```

3. **Vérifier le retry**:
   ```sql
   -- L'email devrait avoir status='retry'
   SELECT
     status,
     attempts,
     error_message,
     next_retry_at
   FROM email_queue
   WHERE metadata->>'test' = 'retry';

   -- Résultat attendu:
   -- status: 'retry'
   -- attempts: 1
   -- error_message: contient l'erreur Resend
   -- next_retry_at: ~1 minute dans le futur
   ```

4. **Attendre et réessayer**:
   ```bash
   # Attendre 1 minute
   sleep 60

   # Réinvoquer
   supabase functions invoke process-email-queue
   ```

5. **Vérifier les tentatives suivantes**:
   ```sql
   -- Après plusieurs tentatives, devrait être 'failed'
   SELECT
     status,
     attempts,
     max_retries,
     failed_at,
     error_message
   FROM email_queue
   WHERE metadata->>'test' = 'retry';

   -- Après 3+ tentatives:
   -- status: 'failed'
   -- attempts: 3
   -- failed_at: timestamp
   ```

### Test 7: Tester les Triggers de Notification

1. **Créer une garantie (trigger notify_new_warranty)**:
   ```sql
   -- Insertion manuelle pour test rapide
   INSERT INTO warranties (
     organization_id,
     customer_id,
     trailer_id,
     plan_id,
     contract_number,
     status,
     start_date,
     end_date,
     duration_months,
     base_price,
     total_price,
     province
   )
   SELECT
     o.id,
     c.id,
     t.id,
     p.id,
     'TEST-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
     'active',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '12 months',
     12,
     1000,
     1150,
     'QC'
   FROM organizations o, customers c, trailers t, warranty_plans p
   LIMIT 1;

   -- Vérifier que l'email de notification admin a été créé
   SELECT * FROM email_queue
   WHERE metadata->>'event_type' = 'new_warranty'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

2. **Vérifier le contenu**:
   - Sujet: "Nouvelle garantie créée - TEST-XXXXXX"
   - Corps HTML avec toutes les informations
   - Destinataire: email de l'admin

## Checklist de Validation Complète

### Avant de Tester

- [ ] Migration appliquée dans Supabase
- [ ] Edge Functions déployées (send-email, process-email-queue)
- [ ] RESEND_API_KEY configurée dans secrets
- [ ] Domaine vérifié sur Resend (status: Verified)
- [ ] DNS configurés correctement (MX, SPF, DKIM)
- [ ] Build du projet réussi (`npm run build`)

### Tests Fonctionnels

- [ ] Test 1: Migration vérifiée (tables, triggers, fonctions)
- [ ] Test 2: Edge Functions déployées et invocables
- [ ] Test 3: Configuration Resend validée
- [ ] Test 4: Email de test direct réussi
- [ ] Test 5: Création garantie end-to-end réussie
- [ ] Test 6: Système de retry fonctionne
- [ ] Test 7: Triggers de notification fonctionnent

### Validation Production

- [ ] Email reçu par client avec design correct
- [ ] Toutes les informations sont présentes et correctes
- [ ] Langue correcte (français/anglais selon préférence)
- [ ] Pas d'erreurs dans les logs Edge Functions
- [ ] Queue se vide automatiquement (si cron configuré)
- [ ] Aucune garantie bloquée par erreur de trigger
- [ ] Dashboard email_queue accessible et fonctionnel

## Résultats Attendus

### Avant Corrections
- ❌ Erreur: "Email de confirmation n'a pas pu être envoyé"
- ❌ Triggers bloquent création de garanties
- ❌ Emails perdus sans retry
- ❌ Configuration Resend manquante/invalide

### Après Corrections
- ✅ Message: "Email de confirmation programmé"
- ✅ Garanties créées sans blocage
- ✅ Emails automatiquement retentés en cas d'échec
- ✅ Configuration Resend validée
- ✅ Queue d'emails visible et gérable
- ✅ Logs détaillés pour diagnostic
- ✅ Templates professionnels multilingues

## Monitoring Continu

### Métriques à Surveiller

1. **Taux de succès emails**: > 95%
2. **Temps moyen de traitement**: < 2 secondes
3. **Taille de la queue**: < 100 emails
4. **Emails échoués**: < 5 par jour

### Alertes à Configurer

```sql
-- Emails en échec dans les dernières 24h
SELECT COUNT(*) as failed_count
FROM email_queue
WHERE status = 'failed'
AND failed_at > NOW() - INTERVAL '24 hours';

-- Emails bloqués dans la queue > 1h
SELECT COUNT(*) as stuck_count
FROM email_queue
WHERE status IN ('queued', 'retry')
AND created_at < NOW() - INTERVAL '1 hour';

-- Taux de réussite dernières 24h
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) as success_rate
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Prochaines Étapes

1. **Configuration Cron** (optionnel):
   - Ajouter un cron job pour invoquer `process-email-queue` toutes les minutes
   - Assure le traitement automatique sans intervention manuelle

2. **Dashboard de Monitoring**:
   - Créer une page admin pour visualiser la queue
   - Afficher statistiques en temps réel
   - Permettre actions manuelles (retry, cancel)

3. **Webhooks Resend**:
   - Configurer webhooks pour événements (delivered, bounced, complained)
   - Mettre à jour automatiquement les statuts dans la DB

4. **Tests Automatisés**:
   - Créer tests unitaires pour les triggers
   - Tests d'intégration pour le processeur de queue
   - Tests end-to-end pour la création de garantie

## Support et Documentation

- 📚 Guide complet: `GUIDE_CORRECTION_EMAILS_GARANTIE.md`
- 🔧 Configuration Resend: https://resend.com/docs
- 📖 Documentation Supabase: https://supabase.com/docs/guides/functions
- 💬 Support: Consulter les logs avec `supabase functions logs`
