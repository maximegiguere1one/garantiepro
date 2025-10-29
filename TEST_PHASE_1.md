# 🧪 TESTS PHASE 1 - GUIDE RAPIDE

**Durée:** 10 minutes
**Objectif:** Vérifier que les correctifs de sécurité fonctionnent

---

## ✅ TEST 1: Safe Logger (2 min)

### Étapes:
1. Ouvre l'application en **mode production** (build)
2. Ouvre la **Console Chrome** (F12 → Console)
3. Navigue dans l'application:
   - Va sur **Réglages → Taxes**
   - Change une province
   - Sauvegarde

### ✅ Attendu:
- Console **VIDE** ou seulement warnings/errors
- **AUCUN** log avec:
  - Tokens
  - Emails
  - Données utilisateur
  - "Starting upsert with"
  - "Loaded users"

### ❌ Si tu vois des logs sensibles:
```bash
# Cherche les console.log restants
grep -r "console\.log" src/ | grep -v node_modules

# Remplace-les par safeLog
```

---

## ✅ TEST 2: Edge Function Sans Auth (3 min)

### Test avec curl:
```bash
# Remplace YOUR_PROJECT_ID par ton vrai ID Supabase
curl -v -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "body": "Test message"
  }'
```

### ✅ Attendu:
```json
HTTP/1.1 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### ❌ Si tu vois 200 OK:
- L'auth n'est PAS activée!
- Vérifie que `verifyAuth(req)` est appelé ligne 119

---

## ✅ TEST 3: Edge Function Avec Auth (3 min)

### Obtiens un token:
1. Connecte-toi à l'application
2. Ouvre DevTools → Application → Local Storage
3. Cherche la clé `sb-...` qui contient ton token
4. Copie le `access_token`

### Test avec auth:
```bash
# Remplace YOUR_TOKEN et YOUR_PROJECT_ID
curl -v -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "checkConfigOnly": true
  }'
```

### ✅ Attendu (si Resend configuré):
```json
HTTP/1.1 200 OK
{
  "success": true,
  "configured": true,
  "fromEmail": "noreply@locationproremorque.ca"
}
```

### ✅ Attendu (si Resend PAS configuré):
```json
HTTP/1.1 503 Service Unavailable
{
  "errorCode": "CONFIG_MISSING",
  "error": "RESEND_API_KEY not configured"
}
```

---

## ✅ TEST 4: Vérification des Rôles (2 min)

### Test avec user non-admin:
1. Crée un user avec role `'customer'` dans Supabase Dashboard
2. Connecte-toi avec ce user
3. Essaie d'accéder à une fonction admin (ex: envoyer email)

### ✅ Attendu:
```json
HTTP/1.1 403 Forbidden
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

---

## 📊 CHECKLIST FINALE

Coche chaque test réussi:

- [ ] **Console vide** en production (aucun log sensible)
- [ ] **401 Unauthorized** sans token
- [ ] **200 OK** avec token valide
- [ ] **403 Forbidden** avec role insuffisant
- [ ] **Build réussit** (`npm run build`)

---

## 🐛 DÉPANNAGE RAPIDE

### Problème: Logs apparaissent encore
**Solution:**
```bash
# Trouve les console.log restants
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# Pour chaque fichier trouvé:
# 1. Importe safeLog: import { safeLog } from './lib/safe-logger';
# 2. Remplace console.log par safeLog.debug ou safeLog.sensitive
```

### Problème: Edge function n'authentifie pas
**Vérifications:**
```typescript
// Dans send-email/index.ts, ligne ~119
try {
  await verifyAuth(req); // ← Doit être là!
  // ...
}
```

### Problème: 500 Internal Error
**Causes possibles:**
1. Supabase env vars manquantes (SUPABASE_URL, SUPABASE_ANON_KEY)
2. Table `profiles` n'existe pas
3. User n'a pas de profil dans la table

**Debug:**
```bash
# Vérifie les logs Supabase
# Dashboard → Functions → send-email → Logs
```

---

## 🎯 RÉSULTATS ATTENDUS

Si tous les tests passent:

✅ **Sécurité:** Aucune donnée sensible exposée
✅ **Auth:** Seuls les users authentifiés peuvent appeler l'API
✅ **Autorisation:** Seuls les rôles autorisés ont accès
✅ **Erreurs:** Codes HTTP appropriés (401, 403, 500)

**Score:** 🟢 Phase 1 COMPLÈTE!

---

## 📸 EXEMPLES DE SUCCÈS

### Console Propre ✅
```
[Aucun log]

--- ou seulement ---

[WARN] Network slow
[ERROR] Failed to load resource
```

### Appel API Sans Auth ✅
```bash
$ curl -X POST .../send-email ...
HTTP/1.1 401 Unauthorized
{"error":"Unauthorized"}
```

### Appel API Avec Auth ✅
```bash
$ curl -X POST .../send-email -H "Authorization: Bearer ..."
HTTP/1.1 200 OK
{"success":true}
```

---

## ⏱️ TEMPS TOTAL: 10 MINUTES

1. Test logger: 2 min
2. Test sans auth: 3 min
3. Test avec auth: 3 min
4. Test roles: 2 min

---

**Si tous les tests passent → Déploie en production! 🚀**

*Guide de test créé le 2025-10-29*
