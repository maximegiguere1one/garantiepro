# 🔍 DEBUG: Erreur 400 Connexion Supabase

**Erreur**: `Failed to load resource: the server responded with a status of 400`  
**URL**: `fkxldrkkqvputdgfpayi.supabase.co/auth/v1/token?grant_type=password`  
**Date**: 29 Octobre 2025

---

## 🎯 PROBLÈME

Tu ne peux plus te connecter. L'API Supabase Auth retourne 400 (Bad Request).

**Erreur 400 signifie**:
- Email invalide
- Mot de passe incorrect
- Format de requête invalide
- Compte désactivé ou supprimé

---

## 🔍 ÉTAPES DE DEBUG

### 1. Ouvre DevTools (F12)

**Console** → Tu verras maintenant:
```
[AuthContext] INFO Attempting sign in for: ton.email@example.com
[AuthContext] ERROR Sign in error: {
  message: "Invalid login credentials",
  status: 400,
  name: "AuthApiError",
  code: "invalid_grant"
}
```

**Network** → Cherche la requête `token?grant_type=password`:
- Status: 400
- Response: Message d'erreur détaillé

---

### 2. Vérifie les Identifiants

#### Test avec Credentials Connus

**Utilisateurs créés par défaut**:
```
Email: maxime@locationproremorque.com
Mot de passe: [Demande à l'admin]

Email: philippe@locationproremorque.com
Mot de passe: [Demande à l'admin]
```

#### Réinitialiser le Mot de Passe

Si tu as oublié:
1. Va sur Supabase Dashboard
2. Authentication → Users
3. Trouve ton user
4. "Reset Password" ou "Send Password Reset Email"

---

### 3. Vérifie le Dashboard Supabase

**Authentication → Users**:
- ✅ Ton compte existe?
- ✅ Email confirmé?
- ✅ Pas "Banned" ou "Deleted"?

**Authentication → Settings**:
- ✅ Email auth activé?
- ✅ "Enable email confirmations" → OFF (pour dev)
- ✅ "Minimum password length" → 6 (pas trop strict)

---

## 🔧 SOLUTIONS PAR CODE D'ERREUR

### Code: "invalid_grant"

**Message**: "Invalid login credentials"

**Causes**:
- Email incorrect
- Mot de passe incorrect
- Compte n'existe pas

**Solutions**:
1. Vérifie l'email (pas de typo?)
2. Vérifie le mot de passe (case-sensitive!)
3. Réinitialise le mot de passe
4. Crée un nouveau compte si nécessaire

---

### Code: "email_not_confirmed"

**Message**: "Email not confirmed"

**Cause**: Confirmation email requise mais pas faite

**Solution**:
```sql
-- Dans Supabase SQL Editor
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'ton.email@example.com';
```

Ou Dashboard → Authentication → Settings → "Enable email confirmations" → OFF

---

### Code: "user_banned"

**Message**: "User is banned"

**Cause**: Compte banni manuellement

**Solution**:
```sql
-- Dans Supabase SQL Editor
UPDATE auth.users 
SET banned_until = NULL 
WHERE email = 'ton.email@example.com';
```

---

### Code: "too_many_requests"

**Message**: "Too many requests"

**Cause**: Rate limiting (trop de tentatives)

**Solution**: Attends 5-10 minutes puis réessaye

---

## 🧪 TESTS DE DIAGNOSTIC

### Test 1: Vérifier l'API Supabase

```bash
# Test direct avec curl
curl -X POST https://fkxldrkkqvputdgfpayi.supabase.co/auth/v1/token \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maxime@locationproremorque.com",
    "password": "PASSWORD_HERE",
    "gotrue_meta_security": {}
  }'
```

**Si ça marche**: Le problème est côté frontend  
**Si ça échoue**: Le problème est côté Supabase

---

### Test 2: Créer un Nouvel Utilisateur

```sql
-- Dans Supabase SQL Editor
-- 1. Créer auth user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('Test123456', gen_salt('bf')),
  now(),
  now(),
  now()
)
RETURNING id;

-- 2. Créer organization
INSERT INTO organizations (name, slug)
VALUES ('Test Org', 'test-org')
RETURNING id;

-- 3. Créer profile
INSERT INTO profiles (user_id, organization_id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  (SELECT id FROM organizations WHERE slug = 'test-org'),
  'test@example.com',
  'admin'
);
```

Puis teste connexion avec:
- Email: `test@example.com`
- Password: `Test123456`

---

### Test 3: Vérifier RLS

```sql
-- En tant que user connecté
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = '<YOUR_USER_ID>';

-- Vérifie que tu peux lire ton profil
SELECT * FROM profiles WHERE user_id = auth.uid();
-- Devrait retourner 1 ligne

-- Si 0 lignes: Problème RLS
```

---

## 📊 CODES D'ERREUR HTTP

| Code | Signification | Solution |
|------|---------------|----------|
| 400 | Bad Request | Vérifie email/password |
| 401 | Unauthorized | Credentials incorrects |
| 403 | Forbidden | Compte banni/désactivé |
| 422 | Unprocessable | Format données invalide |
| 429 | Too Many Requests | Rate limiting - attends |
| 500 | Server Error | Problème Supabase - attends |

---

## 🔐 CRÉER UN COMPTE MANUELLEMENT

Si vraiment bloqué, crée un compte admin direct:

```sql
-- Script complet dans Supabase SQL Editor

-- 1. Variables
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  new_org_id uuid;
BEGIN
  -- 2. Créer organization
  INSERT INTO organizations (name, slug, is_active)
  VALUES ('Ma Franchise', 'ma-franchise', true)
  RETURNING id INTO new_org_id;

  -- 3. Créer auth user avec mot de passe hashé
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'admin@mafranchise.com',
    crypt('MonMotDePasse123', gen_salt('bf')),
    now(),
    '',
    '',
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

  -- 4. Créer profile
  INSERT INTO profiles (
    id,
    user_id,
    organization_id,
    email,
    full_name,
    role
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    new_org_id,
    'admin@mafranchise.com',
    'Admin',
    'admin'
  );

  RAISE NOTICE 'User created successfully!';
  RAISE NOTICE 'Email: admin@mafranchise.com';
  RAISE NOTICE 'Password: MonMotDePasse123';
END $$;
```

---

## 🚨 VÉRIFICATIONS URGENTES

### 1. Migration Appliquée?

Si tu viens d'appliquer la migration complète:
```sql
-- Vérifie que la table profiles existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'profiles'
);
-- Doit retourner: true

-- Vérifie les colonnes
\d profiles
-- Doit inclure: id, user_id, organization_id, email, role
```

### 2. RLS Trop Strict?

```sql
-- Désactive temporairement RLS pour tester
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Teste connexion

-- Ré-active après test
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 3. Auth Settings

Dans Dashboard → Authentication → Settings:
- ✅ "Enable Email Provider" → ON
- ✅ "Enable Email Confirmations" → OFF (pour dev)
- ✅ "Enable Sign ups" → ON
- ✅ "Minimum Password Length" → 6

---

## 📝 CHECKLIST DE RÉSOLUTION

- [ ] Ouvre DevTools → Console
- [ ] Regarde `[AuthContext]` logs
- [ ] Note le message d'erreur exact
- [ ] Vérifie Dashboard → Users
- [ ] Vérifie que l'email existe
- [ ] Essaye reset password
- [ ] Vérifie Auth Settings
- [ ] Teste avec nouveau compte temporaire
- [ ] Vérifie que migration est appliquée
- [ ] Partage les logs si toujours bloqué

---

## ✅ APRÈS RÉSOLUTION

Une fois connecté:
1. Change ton mot de passe si tu l'as réinitialisé
2. Vérifie que ton rôle est correct
3. Configure les settings de ton organisation
4. Teste que tout fonctionne

---

**TL;DR**:
- ✅ Logging auth amélioré - tu verras l'erreur exacte
- ✅ Console ne filtre plus les erreurs auth importantes
- ✅ Guide complet par code d'erreur
- ✅ Scripts SQL pour créer compte manuellement

**Rafraîchis, tente de te connecter, et regarde la console pour l'erreur exacte!** 🔍
