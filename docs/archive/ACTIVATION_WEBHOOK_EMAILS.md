# ✅ WEBHOOK EMAIL ACTIVÉ! (Configuration finale)

## 🎉 CE QUI A ÉTÉ FAIT

✅ Extension `pg_net` activée  
✅ Fonction `trigger_email_processing()` créée  
✅ Trigger `trigger_process_new_email` créé sur `email_queue`  

**Résultat:** Dès qu'un email est ajouté dans la queue, le webhook s'exécute automatiquement!

---

## ⚙️ CONFIGURATION FINALE (1 commande SQL)

Pour que le webhook puisse appeler l'edge function, il faut configurer votre ANON_KEY:

### Étape 1: Récupérer votre ANON_KEY

1. Aller sur **Supabase Dashboard**
2. **Settings** > **API**
3. Copier **anon** / **public** key (commence par `eyJ...`)

### Étape 2: Configurer la clé dans Postgres

Exécuter cette commande SQL dans **Supabase SQL Editor**:

```sql
-- Remplacer YOUR_ANON_KEY par votre vraie clé
ALTER DATABASE postgres 
SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**C'est tout!** 🎉

---

## 🧪 TESTER

### Test 1: Créer une garantie

1. Créer une nouvelle garantie dans l'app
2. Vérifier la console Supabase Logs
3. Voir le message: `Email processing triggered: email_id=...`

### Test 2: Vérifier la queue

```sql
-- Voir les emails en queue
SELECT 
  id, 
  to_email, 
  subject, 
  status,
  created_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Statut attendu:**
- Emails passent rapidement de `queued` → `sending` → `sent`
- En moins d'1 seconde!

### Test 3: Vérifier les logs de l'edge function

1. Supabase Dashboard > **Edge Functions**
2. Sélectionner **process-email-queue**
3. Onglet **Logs**
4. Voir: `Processing 1 emails`, `Email sent successfully`

### Test 4: Vérifier dans Resend

1. Aller sur https://resend.com/emails
2. Voir les emails envoyés récemment
3. Statut: **Delivered** ✅

---

## 🔍 COMMENT ÇA MARCHE

### Flux complet:

```
1. Garantie créée
   ↓
2. Trigger notify_new_warranty() s'exécute
   ↓
3. Fonction queue_email() ajoute 2 emails dans email_queue
   ↓
4. Trigger trigger_process_new_email s'exécute (NOUVEAU!)
   ↓
5. Requête HTTP envoyée à process-email-queue via pg_net
   ↓
6. Edge function traite les emails
   ↓
7. Envoi via Resend API
   ↓
8. Client et admins reçoivent leurs emails! 📧✅
```

**Temps total:** 2-3 secondes maximum!

---

## 🚨 TROUBLESHOOTING

### Erreur: "app.settings.supabase_anon_key not found"

**Solution:** Configurer la clé (voir Étape 2 ci-dessus)

### Emails restent en status "queued"

**Vérifier:**

1. **ANON_KEY configurée?**
   ```sql
   SHOW app.settings.supabase_anon_key;
   ```

2. **pg_net activée?**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. **Trigger créé?**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_process_new_email';
   ```

4. **Logs Supabase:**
   - Database Logs > Voir les NOTICE/WARNING
   - Edge Functions Logs > process-email-queue

### Emails envoyés en double

**C'est normal si vous avez:**
- Webhook configuré ✅
- ET Cron configuré ⚠️

**Solution:** Désactiver le cron si webhook fonctionne

---

## 📊 MONITORING

### Statistiques temps réel

```sql
-- Emails traités dans la dernière heure
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds
FROM email_queue
WHERE created_at > now() - interval '1 hour'
GROUP BY status;
```

### Alertes recommandées

```sql
-- Emails qui restent en queue > 5 minutes = problème
SELECT 
  id,
  to_email,
  subject,
  status,
  attempts,
  created_at,
  error_message
FROM email_queue
WHERE status IN ('queued', 'retry')
  AND created_at < now() - interval '5 minutes'
ORDER BY created_at DESC;
```

---

## ✅ RÉSULTAT FINAL

**AVANT:**
- ❌ Emails restaient en queue
- ❌ Besoin d'appel manuel
- ❌ Besoin de cron externe

**APRÈS:**
- ✅ Emails envoyés automatiquement
- ✅ Délai: 2-3 secondes
- ✅ Pas de configuration externe
- ✅ Tout intégré dans Supabase

---

## 🎯 CHECKLIST FINALE

- [ ] Extension pg_net activée (✅ fait)
- [ ] Trigger créé (✅ fait)
- [ ] ANON_KEY configurée (⚠️ à faire - 1 commande SQL)
- [ ] RESEND_API_KEY configurée dans Edge Functions
- [ ] Domaine vérifié dans Resend
- [ ] Test: créer une garantie
- [ ] Vérifier: email reçu par le client

**Une fois la checklist complète: Système 100% automatique!** 🚀

---

**Date:** 30 Octobre 2025  
**Migration:** 20251030230000_create_email_queue_webhook.sql  
**Status:** ✅ Webhook créé, configuration ANON_KEY restante
