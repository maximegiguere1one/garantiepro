# 🔍 Diagnostic SMS - Guide Complet

## Le Problème Root Cause

**L'Edge Function `send-sms` n'est probablement PAS DÉPLOYÉE** ou **les secrets Twilio ne sont PAS configurés**.

## ✅ Solution en 3 Étapes

### Étape 1: Vérifier si l'Edge Function existe

Allez dans **Supabase Dashboard**:
1. Cliquez sur votre projet
2. Menu latéral → **Edge Functions**
3. Cherchez **send-sms** dans la liste

**Si vous ne la voyez pas** → Elle n'est pas déployée ✅ C'est le problème!

### Étape 2: Déployer l'Edge Function

#### Option A: Via Supabase CLI (Recommandé)

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Se connecter
supabase login

# 3. Lier votre projet
supabase link --project-ref fkxldrkkqvputdgfpayi

# 4. Déployer la fonction
supabase functions deploy send-sms

# Vous devriez voir:
# ✓ Deployed function send-sms
```

#### Option B: Via Supabase Dashboard

1. Allez dans **Edge Functions**
2. Cliquez sur **Create a new function**
3. Nom: `send-sms`
4. Copiez le code de `/supabase/functions/send-sms/index.ts`
5. Cliquez sur **Deploy**

### Étape 3: Configurer les Secrets Twilio

Dans **Supabase Dashboard → Project Settings → Edge Functions**:

1. Cliquez sur **Add secret**
2. Ajoutez ces 3 secrets:

```
Nom: TWILIO_ACCOUNT_SID
Valeur: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Trouvez-le dans https://console.twilio.com/)

Nom: TWILIO_AUTH_TOKEN
Valeur: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Trouvez-le dans https://console.twilio.com/)

Nom: TWILIO_PHONE_NUMBER
Valeur: +1XXXXXXXXXX
(Votre numéro Twilio)
```

## 🧪 Test Après Configuration

1. **Rechargez l'application** (Ctrl+F5)
2. Allez dans **Paramètres → Test SMS**
3. Ouvrez la **Console** (F12)
4. Cliquez sur **"Envoyer Test Rapide"**
5. Regardez les logs dans la console

### Si ça fonctionne:
```
✓ SMS added to queue: {...}
✓ SMS sent successfully: { success: true, sid: "SM..." }
```

### Si l'Edge Function n'existe pas:
```
❌ 404 Not Found
ou
❌ Function not found: send-sms
```
→ **Déployez l'Edge Function** (Étape 2)

### Si les secrets manquent:
```
❌ { error: "SMS service not configured" }
```
→ **Configurez les secrets Twilio** (Étape 3)

### Si le compte Twilio a un problème:
```
❌ Twilio API returned 403: Account not authorized
```
→ Vérifiez votre compte Twilio et que le numéro est vérifié

## 📊 Vérifier le Statut dans la Base de Données

```sql
-- Voir le dernier SMS
SELECT
  to_phone,
  body,
  status,
  error_message,
  created_at,
  sent_at
FROM sms_queue
ORDER BY created_at DESC
LIMIT 1;
```

**Statuts possibles:**
- `sending` → En cours d'envoi
- `sent` → Envoyé avec succès ✅
- `failed` → Échec (regardez `error_message`)

## 🔄 Si Vous Devez Redéployer

```bash
# Redéployer avec les derniers changements
cd /tmp/cc-agent/59288411/project
supabase functions deploy send-sms --no-verify-jwt
```

## 📝 Checklist Complète

- [ ] Edge Function `send-sms` déployée dans Supabase
- [ ] Secret `TWILIO_ACCOUNT_SID` configuré
- [ ] Secret `TWILIO_AUTH_TOKEN` configuré
- [ ] Secret `TWILIO_PHONE_NUMBER` configuré
- [ ] Compte Twilio actif avec crédit
- [ ] Numéro Twilio vérifié
- [ ] Application rechargée (Ctrl+F5)
- [ ] Console ouverte (F12) pour voir les logs
- [ ] Test effectué via "Envoyer Test Rapide"

## 🎯 Ce Qui a Été Corrigé

**Avant:** La fonction `process_sms_queue()` essayait d'utiliser `pg_net` (extension non activée) et ne faisait rien.

**Maintenant:** Le code appelle **directement** l'Edge Function via HTTP:

```typescript
// Appel direct à l'Edge Function
const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
  },
  body: JSON.stringify({ to, body })
})
```

## 💡 Astuce

Pour tester si l'Edge Function existe sans l'interface:

```bash
curl https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/send-sms \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"to":"+14185728464","body":"Test"}'
```

Si vous obtenez **404** → L'Edge Function n'existe pas
Si vous obtenez **"SMS service not configured"** → Les secrets manquent
Si vous obtenez **{ success: true }** → Tout fonctionne! 🎉

---

**Actions immédiates:**
1. Vérifiez si l'Edge Function est déployée
2. Si non, déployez-la
3. Configurez les secrets Twilio
4. Testez!
