# 🎯 Guide: Activer l'envoi automatique des emails

## 📧 Situation actuelle

**✅ CE QUI FONCTIONNE:**
- Les garanties sont créées parfaitement
- Les PDFs sont générés
- Les emails sont **mis en queue** dans `email_queue`
- Le trigger `notify_new_warranty()` fonctionne

**⏸️ CE QUI MANQUE:**
- Les emails restent en queue avec statut 'queued'
- Ils ne sont pas envoyés automatiquement
- Besoin d'un processeur pour la queue

## 🛠️ 3 solutions pour activer l'envoi

### ✅ Solution 1: Appel manuel (RAPIDE - Test immédiat)

**Pour tester tout de suite:**

```bash
# Depuis votre terminal (remplacer YOUR_PROJECT et YOUR_ANON_KEY)
curl -X POST https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Ou depuis Supabase Dashboard:**
1. Aller dans Edge Functions
2. Sélectionner `process-email-queue`
3. Cliquer "Invoke Function"
4. Vérifier les logs

**Résultat:**
```json
{
  "success": true,
  "stats": {
    "processed": 2,
    "sent": 2,
    "failed": 0,
    "retried": 0
  },
  "executionTime": "1234ms"
}
```

### ✅ Solution 2: Cron externe (RECOMMANDÉ - Production)

**Option A: Utiliser un service comme Cron-Job.org ou EasyCron**

1. Créer un compte sur https://cron-job.org (gratuit)
2. Créer un nouveau job:
   - **URL:** `https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue`
   - **Schedule:** Toutes les minutes (`* * * * *`)
   - **HTTP Method:** POST
   - **Headers:**
     ```
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
     ```

3. Activer le job
4. Les emails seront traités automatiquement toutes les minutes

**Option B: Serveur Linux avec crontab**

```bash
# Créer un script
cat > /usr/local/bin/process-emails.sh << 'SCRIPT'
#!/bin/bash
curl -X POST https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -s > /dev/null
SCRIPT

chmod +x /usr/local/bin/process-emails.sh

# Ajouter au crontab
crontab -e
# Ajouter cette ligne:
* * * * * /usr/local/bin/process-emails.sh
```

**Option C: Cloudflare Workers (Gratuit)**

```javascript
// worker.js
export default {
  async scheduled(event, env, ctx) {
    await fetch('https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

// wrangler.toml
[triggers]
crons = ["* * * * *"]
```

### ✅ Solution 3: Supabase Database Webhooks (SIMPLE)

**Via Supabase Dashboard:**

1. Aller dans **Database > Webhooks**
2. Créer un nouveau webhook:
   - **Table:** `email_queue`
   - **Events:** INSERT
   - **Type:** Edge Function
   - **Function:** `process-email-queue`
   - **HTTP Method:** POST

**Avantages:**
- Traitement immédiat (dès qu'un email est ajouté)
- Pas besoin de cron externe
- Intégré à Supabase

**Inconvénient:**
- Un appel par email (au lieu de batch)
- Peut coûter plus cher en termes d'invocations

## 🔧 Configuration Resend (Prérequis)

**Avant que les emails partent, vérifier:**

1. **Variables d'environnement Supabase:**
   ```
   RESEND_API_KEY=re_xxx (clé API Resend)
   ```

2. **Domaine vérifié dans Resend:**
   - Aller sur https://resend.com/domains
   - Ajouter `locationproremorque.ca`
   - Configurer DNS (SPF, DKIM, DMARC)
   - Attendre validation (quelques minutes)

3. **Tester la clé API:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer re_xxx" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@locationproremorque.ca",
       "to": "test@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

## 🧪 Tester le système complet

### Test 1: Vérifier la queue

```sql
-- Dans Supabase SQL Editor
SELECT 
  id,
  to_email,
  subject,
  status,
  attempts,
  created_at,
  next_retry_at
FROM email_queue
WHERE status IN ('queued', 'retry')
ORDER BY priority DESC, created_at ASC
LIMIT 10;
```

**Attendu:** Voir les emails en attente

### Test 2: Créer une garantie

1. Créer une nouvelle garantie dans l'app
2. Vérifier que 2 emails sont ajoutés dans la queue:
   - Un pour le client
   - Un pour les admins

```sql
SELECT COUNT(*) FROM email_queue WHERE status = 'queued';
-- Devrait augmenter de 2
```

### Test 3: Traiter la queue manuellement

```bash
curl -X POST https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Résultat attendu:**
```json
{
  "success": true,
  "stats": {
    "processed": 2,
    "sent": 2,
    "failed": 0
  }
}
```

### Test 4: Vérifier l'envoi

```sql
SELECT 
  id,
  to_email,
  subject,
  status,
  sent_at,
  error_message
FROM email_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

**Attendu:** Status = 'sent', sent_at rempli

### Test 5: Vérifier dans Resend

1. Aller sur https://resend.com/emails
2. Voir les emails envoyés
3. Vérifier le statut de livraison

## 📊 Monitoring

### Voir les statistiques

```sql
-- Statistiques globales
SELECT 
  status,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts
FROM email_queue
GROUP BY status;

-- Emails en échec
SELECT 
  id,
  to_email,
  subject,
  attempts,
  error_message,
  failed_at
FROM email_queue
WHERE status = 'failed'
ORDER BY failed_at DESC;

-- Emails en attente de retry
SELECT 
  id,
  to_email,
  attempts,
  next_retry_at,
  error_message
FROM email_queue
WHERE status = 'retry'
ORDER BY next_retry_at ASC;
```

## 🚨 Troubleshooting

### Les emails ne partent pas

1. **Vérifier RESEND_API_KEY:**
   ```sql
   -- Dans Supabase Dashboard > Settings > Edge Functions
   -- Vérifier que RESEND_API_KEY est configurée
   ```

2. **Vérifier le domaine:**
   - Le domaine doit être vérifié dans Resend
   - SPF/DKIM doivent être configurés

3. **Vérifier les logs:**
   ```bash
   # Dans Supabase Dashboard > Edge Functions > process-email-queue > Logs
   ```

4. **Tester manuellement:**
   ```bash
   curl -X POST https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue \
     -H "Authorization: Bearer YOUR_ANON_KEY" -v
   ```

### Erreur "RESEND_API_KEY not configured"

```bash
# Dans Supabase Dashboard:
# Settings > Edge Functions > Add new secret
# Name: RESEND_API_KEY
# Value: re_xxxxxxxxxxxxx
```

### Erreur 401 Unauthorized

- L'ANON_KEY utilisée est incorrecte
- Vérifier dans: Settings > API > Project API keys > anon public

## ✅ Recommandation finale

**Pour la production, utilisez:**

1. **Cron externe** (Cron-Job.org ou serveur Linux)
   - Toutes les minutes: `* * * * *`
   - Appelle `process-email-queue`
   - Fiable et gratuit

2. **Configuration:**
   - RESEND_API_KEY dans Supabase
   - Domaine vérifié dans Resend
   - DNS configurés (SPF, DKIM)

3. **Monitoring:**
   - Vérifier les logs quotidiennement
   - Surveiller les emails en échec
   - Alertes si queue > 100 emails

**Résultat:** Emails envoyés automatiquement, toutes les minutes! 📧✅
