# Guide de Dépannage - Erreur Email

**Erreur affichée:** "Edge Function returned a non-2xx status code"

---

## 🔍 Diagnostic Étape par Étape

### Étape 1: Vérifier la Console du Navigateur

1. Appuyez sur **F12** pour ouvrir les outils développeur
2. Allez dans l'onglet **Console**
3. Cliquez sur "Tester" dans l'interface
4. Cherchez les messages qui commencent par:
   - `Sending email to:`
   - `Edge function response:`
   - `Edge function invocation error:`

**Ce que vous devriez voir:**

Si le problème est la clé API manquante:
```
Edge function response: {
  data: { success: false, error: "Email service not configured..." }
}
```

Si le problème est le domaine non vérifié:
```
Edge function response: {
  data: { success: false, error: "Domain not verified", details: {...} }
}
```

---

### Étape 2: Vérifier les Logs Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu: **Edge Functions** > **send-email**
4. Cliquez sur l'onglet **Logs**
5. Cliquez sur "Tester" dans votre app
6. Rafraîchissez les logs

**Messages possibles:**

✅ **Si les secrets sont configurés:**
```
Received email request
Request details: { to: '...', subject: '...', hasBody: true }
RESEND_API_KEY is configured
FROM_EMAIL: info@locationproremorque.ca
FROM_NAME: Location Pro-Remorque
Sending email via Resend API...
```

❌ **Si RESEND_API_KEY manque:**
```
Received email request
CRITICAL: RESEND_API_KEY not configured in Supabase secrets!
Please configure RESEND_API_KEY in Supabase Dashboard
```

❌ **Si le domaine n'est pas vérifié:**
```
Resend API response status: 403
Resend API error response: {
  "message": "Domain info.locationproremorque.ca is not verified"
}
```

---

### Étape 3: Vérifier les Secrets Supabase

1. Dashboard Supabase > **Settings** > **Edge Functions**
2. Section **Secrets** ou **Environment Variables**
3. Vérifiez que vous avez **3 secrets**:

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL = info@locationproremorque.ca
FROM_NAME = Location Pro-Remorque
```

**⚠️ ATTENTION:**
- Le nom doit être **EXACTEMENT** `RESEND_API_KEY` (pas `RESEND_KEY` ou autre)
- La clé doit commencer par `re_`
- Pas d'espaces avant ou après

---

### Étape 4: Vérifier le Domaine Resend

1. Allez sur https://resend.com/domains
2. Cherchez `info.locationproremorque.ca`
3. Le statut doit être **"Verified" ✅** (pas "Pending" ou "Failed")

**Si le statut n'est pas "Verified":**
- Les enregistrements DNS ne sont pas encore propagés
- Vérifiez que vous avez ajouté TOUS les enregistrements (SPF + 3 DKIM)
- Attendez 15-30 minutes de plus
- Utilisez https://dnschecker.org pour vérifier

---

### Étape 5: Tester Manuellement l'API Resend

Pour vérifier que votre clé API fonctionne:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer VOTRE_CLE_API_ICI" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "info@locationproremorque.ca",
    "to": ["votre-email@example.com"],
    "subject": "Test Direct",
    "html": "<p>Test manuel de l API Resend</p>"
  }'
```

**Réponses possibles:**

✅ **Succès (200):**
```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

❌ **Clé invalide (401):**
```json
{
  "message": "Invalid API key"
}
```

❌ **Domaine non vérifié (403):**
```json
{
  "message": "Domain info.locationproremorque.ca is not verified"
}
```

---

## 🔧 Solutions aux Problèmes Courants

### Problème: "RESEND_API_KEY not configured"

**Cause:** Le secret n'est pas configuré dans Supabase

**Solution:**
1. Allez sur https://resend.com/api-keys
2. Créez une nouvelle clé API
3. Copiez la clé (commence par `re_`)
4. Dans Supabase: Settings > Edge Functions > Secrets
5. Ajoutez: `RESEND_API_KEY` = `votre_cle`
6. Sauvegardez

⚠️ **Les secrets sont actifs immédiatement, pas besoin de redéployer**

---

### Problème: "Domain not verified"

**Cause:** Le domaine n'est pas encore vérifié dans Resend

**Solution:**
1. Vérifiez dans Resend Dashboard que le domaine a le statut "Verified"
2. Si "Pending", ajoutez les enregistrements DNS:
   - 1 enregistrement TXT (SPF)
   - 3 enregistrements CNAME (DKIM)
3. Attendez 15 minutes à 2 heures pour la propagation
4. Cliquez "Verify" dans Resend

**Test DNS:**
```bash
# Vérifier SPF
dig TXT locationproremorque.ca

# Vérifier DKIM
dig CNAME resend._domainkey.info.locationproremorque.ca
```

---

### Problème: "Invalid API key"

**Cause:** La clé API est incorrecte ou révoquée

**Solution:**
1. Allez sur https://resend.com/api-keys
2. Vérifiez que la clé est "Active"
3. Si révoquée, créez une nouvelle clé
4. Mettez à jour le secret dans Supabase

---

### Problème: "Rate limit exceeded"

**Cause:** Vous avez dépassé 100 emails/jour (plan gratuit)

**Solution:**
1. Attendez 24h pour le reset
2. Ou passez au plan payant

---

## 📝 Checklist de Vérification

Cochez chaque point:

- [ ] Domaine vérifié dans Resend (statut "Verified")
- [ ] Clé API créée dans Resend (commence par `re_`)
- [ ] Secret `RESEND_API_KEY` configuré dans Supabase
- [ ] Secret `FROM_EMAIL` = info@locationproremorque.ca
- [ ] Secret `FROM_NAME` = Location Pro-Remorque
- [ ] Secrets sauvegardés dans Supabase
- [ ] Console navigateur ouverte (F12)
- [ ] Logs Supabase consultés

---

## 🎯 Test de Validation Finale

Une fois tous les secrets configurés:

1. **Ouvrez F12** dans votre navigateur
2. **Ouvrez l'onglet Console**
3. **Cliquez sur "Tester"**
4. **Vérifiez les logs:**

**Succès ✅:**
```
Sending email to: votre-email@example.com
Subject: Test Email - Pro-Remorque
Edge function response: {
  data: { success: true, message: "Email sent successfully", id: "..." }
}
```

**Échec ❌:**
```
Edge function response: {
  data: { success: false, error: "..." }
}
```

---

## 🆘 Encore Bloqué?

1. **Copiez TOUS les logs** de la console (F12)
2. **Copiez les logs** Supabase Edge Functions
3. **Vérifiez une dernière fois:**
   - Domaine vérifié dans Resend?
   - 3 secrets configurés dans Supabase?
   - Nom des secrets EXACTEMENT comme indiqué?
4. **Partagez les logs** pour diagnostic approfondi

---

## 📞 Ressources

- **Resend Dashboard:** https://resend.com/domains
- **Resend API Keys:** https://resend.com/api-keys
- **Supabase Dashboard:** https://supabase.com/dashboard
- **DNS Checker:** https://dnschecker.org

---

**Date:** 4 Octobre 2025
**Version:** 1.0
