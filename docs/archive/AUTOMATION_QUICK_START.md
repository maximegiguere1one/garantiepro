# 🚀 Automation Quick Start Guide

## ⚡ Démarrage en 5 Minutes

### Étape 1: Appliquer la Migration (1 min)

```bash
# Via Supabase CLI
supabase db push

# OU manuellement dans votre DB
psql YOUR_DB < supabase/migrations/20251101000000_create_automation_system.sql
```

✅ Ceci crée:
- 5 tables (workflows, executions, preferences, tasks, logs)
- RLS policies complètes
- Functions & triggers automatiques
- Indexes pour performance

---

### Étape 2: Déployer Edge Functions (2 min)

```bash
# Déployer automation engine
supabase functions deploy automation-engine

# Déployer expiration checker
supabase functions deploy warranty-expiration-checker-advanced
```

✅ Les fonctions sont maintenant actives et accessibles!

---

### Étape 3: Initialiser Workflows (1 min)

```sql
-- Pour votre organisation
SELECT create_default_automation_workflows('YOUR_ORG_ID');

-- Vérifier la création
SELECT name, is_active FROM automation_workflows
WHERE organization_id = 'YOUR_ORG_ID';
```

✅ Vous devriez voir 6 workflows:
1. Rappel d'expiration 30 jours
2. Rappel d'expiration 15 jours
3. Rappel d'expiration 7 jours
4. Confirmation nouvelle garantie
5. Nouvelle réclamation
6. Génération factures mensuelles

---

### Étape 4: Ajouter dans Routes (1 min)

```typescript
// Dans App.tsx ou votre router
import { AutomationDashboard } from './components/AutomationDashboard';
import { NotificationPreferences } from './components/NotificationPreferences';

// Ajouter routes
<Route path="/automation" element={<AutomationDashboard />} />
<Route path="/settings/notifications" element={<NotificationPreferences />} />
```

---

### Étape 5: Tester! (30 sec)

#### Test Manuel via Dashboard
1. Aller à `/automation`
2. Cliquer ▶️ sur un workflow
3. Vérifier dans l'onglet "Historique"

#### Test via API
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/automation-engine \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_type": "manual",
    "trigger_data": {
      "organization_id": "YOUR_ORG_ID",
      "test": true
    }
  }'
```

---

## 🎯 Configuration Immédiate

### Activer Vérification Quotidienne

Le système vérifie automatiquement les expirations chaque jour:

```sql
-- Vérifier que le cron job existe
SELECT * FROM cron.job WHERE jobname LIKE '%warranty%';

-- Exécuter manuellement pour tester
SELECT cron.schedule(
  'warranty-expiration-daily',
  '0 3 * * *', -- Tous les jours à 3h AM
  $$SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/warranty-expiration-checker-advanced',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb
  );$$
);
```

### Configurer Email Queue Processing

```sql
-- Process emails toutes les minutes
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *', -- Chaque minute
  $$SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-email-queue',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb
  );$$
);
```

---

## 📧 Templates d'Emails

Créez vos templates dans `email_templates`:

```sql
INSERT INTO email_templates (
  organization_id,
  name,
  subject,
  html_body,
  text_body,
  category,
  is_active
) VALUES (
  'YOUR_ORG_ID',
  'warranty_expiring_30_days',
  'Votre garantie expire dans 30 jours',
  '<html>
    <h1>Bonjour {{customer_name}},</h1>
    <p>Votre garantie <strong>{{contract_number}}</strong> expire dans 30 jours.</p>
    <p>Date d''expiration: {{end_date}}</p>
    <p>Renouvelez maintenant pour maintenir votre couverture!</p>
    <a href="{{renewal_link}}">Renouveler</a>
  </html>',
  'Bonjour {{customer_name}}, Votre garantie {{contract_number}} expire dans 30 jours...',
  'warranty',
  true
);
```

---

## 🎨 Personnalisation

### Créer un Workflow Custom

```typescript
const workflow = {
  organization_id: 'YOUR_ORG_ID',
  name: 'Mon Workflow',
  trigger_type: 'warranty_created',
  actions: [
    {
      type: 'send_email',
      template: 'welcome',
      to: 'customer'
    },
    {
      type: 'create_notification',
      message: 'Nouvelle garantie!',
      priority: 'medium'
    }
  ],
  is_active: true
};

await supabase.from('automation_workflows').insert(workflow);
```

### Modifier Actions Existantes

```sql
UPDATE automation_workflows
SET actions = jsonb_set(
  actions,
  '{0}',
  '{"type": "send_email", "template": "new_template", "to": "customer"}'::jsonb
)
WHERE id = 'workflow-id';
```

---

## 📊 Monitoring

### Dashboard Temps Réel

```sql
-- Stats du jour
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) as avg_duration
FROM automation_executions
WHERE created_at > CURRENT_DATE;
```

### Alertes Automatiques

```sql
-- Créer alerte si taux échec > 10%
CREATE OR REPLACE FUNCTION check_automation_health()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  fail_rate numeric;
BEGIN
  SELECT
    (COUNT(*) FILTER (WHERE status = 'failed')::numeric /
     NULLIF(COUNT(*)::numeric, 0)) * 100
  INTO fail_rate
  FROM automation_executions
  WHERE created_at > NOW() - INTERVAL '1 hour';

  IF fail_rate > 10 THEN
    -- Envoyer alerte
    INSERT INTO notifications (
      recipient_id, type, title, body, priority
    )
    SELECT id, 'in_app', 'Automation Alert',
           'Fail rate: ' || fail_rate || '%', 'urgent'
    FROM profiles
    WHERE role IN ('master', 'admin');
  END IF;
END;
$$;

-- Exécuter toutes les heures
SELECT cron.schedule(
  'check-automation-health',
  '0 * * * *',
  'SELECT check_automation_health();'
);
```

---

## 🐛 Troubleshooting Rapide

### Workflow ne s'exécute pas?

```sql
-- 1. Vérifier si actif
SELECT is_active FROM automation_workflows WHERE id = 'xxx';

-- 2. Activer
UPDATE automation_workflows SET is_active = true WHERE id = 'xxx';

-- 3. Vérifier logs
SELECT * FROM automation_logs
WHERE workflow_id = 'xxx'
ORDER BY created_at DESC LIMIT 5;
```

### Emails ne partent pas?

```sql
-- 1. Vérifier queue
SELECT status, COUNT(*) FROM email_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- 2. Retraiter
UPDATE email_queue
SET status = 'pending', retry_count = 0
WHERE status = 'failed';

-- 3. Process manuellement
SELECT net.http_post(
  url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-email-queue',
  headers := '{"Authorization": "Bearer YOUR_KEY"}'::jsonb
);
```

### Performance lente?

```sql
-- Analyser durées
SELECT
  w.name,
  AVG(e.duration_ms) as avg_ms,
  COUNT(*) as count
FROM automation_executions e
JOIN automation_workflows w ON w.id = e.workflow_id
WHERE e.created_at > NOW() - INTERVAL '24 hours'
GROUP BY w.name
ORDER BY avg_ms DESC;

-- Solution: Réduire actions ou ajouter conditions
```

---

## ✅ Checklist de Lancement

Avant de déployer en production:

- [ ] Migration appliquée
- [ ] Edge functions déployées
- [ ] Workflows initialisés
- [ ] Templates d'emails créés
- [ ] Cron jobs configurés
- [ ] Dashboard accessible
- [ ] Préférences testées
- [ ] Exécution manuelle testée
- [ ] Logs vérifiés
- [ ] Monitoring actif
- [ ] Alertes configurées
- [ ] Documentation partagée avec équipe

---

## 🎉 Vous êtes Prêt!

En 5 minutes, vous avez:

✅ Système d'automatisation complet
✅ 6 workflows prêts à l'emploi
✅ Notifications multi-canal
✅ Dashboard de monitoring
✅ Préférences utilisateur
✅ Logs et analytics

**Commencez à économiser 60-80% du temps manuel dès maintenant!** 🚀

---

## 📚 Ressources

- **Documentation Complète**: `AUTOMATION_SYSTEM_COMPLETE.md`
- **API Edge Functions**: Dans `supabase/functions/`
- **Composants React**: `src/components/Automation*.tsx`
- **Migration SQL**: `supabase/migrations/20251101000000_*.sql`

---

**Support**: Pour questions ou problèmes, vérifiez les logs:
```sql
SELECT * FROM automation_logs
WHERE level IN ('error', 'warning')
ORDER BY created_at DESC;
```

**Happy Automating!** 🤖✨
