# Vérification Finale - Configuration Email

La fonction `send-email` a été **REDÉPLOYÉE** avec le nouveau code incluant tous les logs détaillés.

---

## ✅ Ce Qui a Été Fait

1. **Fonction Redéployée:** send-email avec logs détaillés
2. **Code Mis à Jour:** Messages d'erreur explicites
3. **Secrets Configurés:** RESEND_API_KEY, FROM_EMAIL, FROM_NAME (par vous)

---

## 🔍 Prochaines Étapes de Diagnostic

### Étape 1: Consulter les Logs Supabase (CRUCIAL)

Maintenant que la fonction est redéployée avec les nouveaux logs, vous DEVEZ vérifier les logs:

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu: **Edge Functions**
4. Cliquez sur **send-email**
5. Onglet: **Logs**
6. Cliquez sur "Tester" dans votre application
7. **Rafraîchissez les logs** (bouton refresh)

### Ce Que Vous Devriez Voir:

#### ✅ Configuration Correcte:
```
Received email request
Request details: { to: 'maxime@...', subject: 'Test Email...', hasBody: true }
RESEND_API_KEY is configured
FROM_EMAIL: onboarding@resend.dev
FROM_NAME: Pro-Remorque
Sending email via Resend API...
Resend API response status: 200
Email sent successfully. Resend ID: abc123...
```

#### ❌ RESEND_API_KEY Manquant:
```
CRITICAL: RESEND_API_KEY not configured in Supabase secrets!
Please configure RESEND_API_KEY in Supabase Dashboard:
Project Settings > Edge Functions > Manage secrets
```

**Solution:** Vérifier que vous avez bien ajouté le secret dans la bonne section.

#### ⚠️ Erreur API Resend:
```
Resend API response status: 401
Resend API error response: { "message": "Invalid API key" }
```

**Problème:** La clé API est incorrecte ou invalide.

**Solution:** Générer une nouvelle clé sur https://resend.com/api-keys

#### ⚠️ Erreur Domaine:
```
Resend API response status: 403
Resend API error response: { "message": "Domain not verified" }
```

**Problème:** Vous utilisez un email avec un domaine non vérifié.

**Solution:** Utiliser `onboarding@resend.dev` ou vérifier votre domaine.

---

## 🔧 Vérification des Secrets Supabase

### Emplacement Correct:
Dashboard > **Settings** > **Edge Functions** > Section **Secrets**

### Vérifiez:

```
Secret Name: RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```
Secret Name: FROM_EMAIL
Value: onboarding@resend.dev
```

```
Secret Name: FROM_NAME
Value: Pro-Remorque
```

### IMPORTANT:
- Les noms doivent être EXACTEMENT comme indiqué (sensible à la casse)
- Pas d'espaces avant/après
- La clé doit commencer par `re_`

---

## 🔑 Vérification de la Clé API Resend

### Allez sur https://resend.com/api-keys

Vérifiez que votre clé:
- ✅ Est **Active** (pas révoquée)
- ✅ A les permissions **"Sending access"** ou **"Full access"**
- ✅ A été créée récemment (pas expirée)

### Test Direct (Optionnel):

Testez votre clé directement avec curl dans un terminal:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": ["maxime@giguere-influence.com"],
    "subject": "Test Direct Resend",
    "html": "<p>Ceci est un test direct de la clé API</p>"
  }'
```

**Si succès:** Vous recevrez un JSON avec un `id`
**Si échec:** Erreur 401 ou 403

---

## 🐛 Console Navigateur

Ouvrez la console (F12) et cliquez sur "Tester". Vous devriez voir:

```
Edge function invocation error: ...
Error details: { ... }
```

Ces logs vous donneront des informations supplémentaires.

---

## 📊 Checklist de Vérification

Cochez ce que vous avez vérifié:

- [ ] Logs Supabase Edge Functions consultés
- [ ] Message "RESEND_API_KEY is configured" visible dans les logs
- [ ] OU message "CRITICAL: RESEND_API_KEY not configured" visible
- [ ] Secrets configurés dans Edge Functions Secrets (pas ailleurs)
- [ ] Clé API Resend active et valide
- [ ] Clé commence par `re_`
- [ ] FROM_EMAIL = onboarding@resend.dev
- [ ] Aucune faute de frappe dans les noms de secrets

---

## 🎯 Scénarios Possibles

### Scénario A: "RESEND_API_KEY is configured" dans les logs
**Mais l'erreur persiste**

Cela signifie que le problème est avec l'API Resend elle-même:
- Clé invalide
- Domaine non vérifié
- Rate limit dépassé
- Problème de réseau

**Action:** Regardez le message `Resend API error response:` dans les logs

### Scénario B: "RESEND_API_KEY not configured" dans les logs
**Malgré avoir ajouté le secret**

Cela signifie que:
- Le secret n'est pas dans Edge Functions Secrets
- Ou il y a une faute de frappe dans le nom
- Ou la fonction n'a pas été redéployée (FAIT maintenant)

**Action:** Double-vérifier l'emplacement et le nom exact du secret

### Scénario C: Rien dans les logs
**Les logs sont vides**

Cela signifie que:
- La fonction n'a pas été appelée
- Ou il y a un problème de réseau/connexion

**Action:** Vérifier la console navigateur pour les erreurs

---

## 🆘 Si Ça Ne Fonctionne Toujours Pas

Collectez ces informations:

1. **Logs Supabase Edge Functions:**
   ```
   [Copier tout ce qui s'affiche quand vous testez]
   ```

2. **Console Navigateur (F12 > Console):**
   ```
   [Copier les messages d'erreur]
   ```

3. **Confirmation des Secrets:**
   ```
   ✅ RESEND_API_KEY = re_... (masquez les détails)
   ✅ FROM_EMAIL = onboarding@resend.dev
   ✅ FROM_NAME = Pro-Remorque
   ✅ Dans: Settings > Edge Functions > Secrets
   ```

4. **État de la Clé Resend:**
   - [ ] Active
   - [ ] Permissions "Sending access"
   - [ ] Créée récemment

---

## ✨ Résumé

```
Fonction send-email: ✅ REDÉPLOYÉE
Code avec logs: ✅ ACTIF
Secrets: ⏳ À VÉRIFIER dans les logs
```

**Prochaine action:** Consulter les logs Supabase Edge Functions pour voir le message exact.
