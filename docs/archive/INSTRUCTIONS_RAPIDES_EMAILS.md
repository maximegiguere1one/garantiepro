# Instructions Rapides - Correction Emails de Garantie

## ⚡ Guide Express (5 minutes)

### 1️⃣ Appliquer la Migration (OBLIGATOIRE)

**Option A - Via Terminal** (Recommandé):
```bash
cd /path/to/your/project
supabase db push
```

**Option B - Via Dashboard**:
1. Ouvrir https://supabase.com/dashboard
2. Aller dans votre projet
3. Menu **SQL Editor**
4. Copier le fichier: `supabase/migrations/20251011200000_fix_email_system_complete.sql`
5. Coller et **Run**

### 2️⃣ Configurer Resend (CRITIQUE)

**A. Obtenir la clé API**:
1. Aller sur https://resend.com
2. Se connecter (ou créer compte)
3. Menu **API Keys** > **Create API Key**
4. Copier la clé `re_xxxxxxxxxxxxx`

**B. L'ajouter dans Supabase**:

**Via Terminal**:
```bash
supabase secrets set RESEND_API_KEY=re_votre_cle_ici
```

**Via Dashboard**:
1. **Settings** > **Edge Functions** > **Manage secrets**
2. Ajouter: `RESEND_API_KEY` = `re_votre_cle_ici`

### 3️⃣ Vérifier le Domaine Resend

1. Dashboard Resend > **Domains**
2. Chercher `locationproremorque.ca`
3. Status doit être **"Verified"** ✅

❌ Si "Pending": Ajouter les DNS records affichés dans votre registrar de domaine

### 4️⃣ Déployer l'Edge Function

```bash
supabase functions deploy process-email-queue
```

### 5️⃣ Tester

**Test rapide** (SQL dans Supabase):
```sql
SELECT queue_email(
  p_to_email := 'votre@email.com',
  p_subject := 'Test',
  p_html_body := '<h1>Ca marche!</h1>'
);
```

Ensuite:
```bash
supabase functions invoke process-email-queue
```

Vérifier email reçu ✅

---

## 🎯 C'est Tout!

Le système est maintenant:
- ✅ Corrigé
- ✅ Résilient (retry automatique)
- ✅ Fonctionnel

**Prochaine garantie créée**: Email sera automatiquement envoyé!

---

## 🆘 Problème?

### Email pas reçu?

1. **Vérifier la queue**:
```sql
SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5;
```

2. **Si status = 'queued'**: Invoquer le processeur
```bash
supabase functions invoke process-email-queue
```

3. **Si status = 'failed'**: Voir `error_message` pour diagnostic

### Erreur "RESEND_API_KEY not configured"?

Répéter étape 2️⃣ puis redéployer:
```bash
supabase secrets set RESEND_API_KEY=re_votre_cle
supabase functions deploy send-email
supabase functions deploy process-email-queue
```

### Domaine pas vérifié?

Ajouter les DNS records dans votre registrar:
- **Type TXT** avec valeur de vérification Resend
- **Type MX** vers `feedback-smtp.resend.com`
- **Type TXT** SPF: `v=spf1 include:_spf.resend.com ~all`
- **Type TXT** DKIM (fourni par Resend)

Attendre 10 minutes à 48h pour propagation DNS.

---

## 📚 Besoin de Plus de Détails?

Consulter les guides complets:
- **Configuration**: `GUIDE_CORRECTION_EMAILS_GARANTIE.md`
- **Tests**: `TESTS_VALIDATION_EMAILS.md`
- **Résumé**: `RESUME_CORRECTION_EMAILS_OCT11_2025.md`

---

**C'est parti! 🚀**
