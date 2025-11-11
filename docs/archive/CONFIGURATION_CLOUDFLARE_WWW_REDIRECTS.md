# 🔧 Configuration Cloudflare pour www. - 4 novembre 2025

## 🎯 OBJECTIF

Faire fonctionner les URLs avec `www.garantieproremorque.com` pour que les liens dans les emails fonctionnent avec le domaine custom (pas l'URL Supabase).

---

## ⚠️ PROBLÈME ACTUEL

### Ce qui ne fonctionne PAS

**Fichier `_redirects`** fonctionne SEULEMENT sur le domaine principal du site Cloudflare Pages.

Si votre site est déployé sur:
- ✅ `garantieproremorque.com` → Redirects fonctionnent
- ❌ `www.garantieproremorque.com` → Redirects NE fonctionnent PAS

**Résultat**:
- `https://garantieproremorque.com/api/download-warranty-direct?token=xxx` → ✅ Fonctionne
- `https://www.garantieproremorque.com/api/download-warranty-direct?token=xxx` → ❌ 502 Bad Gateway

---

## ✅ SOLUTION 1: Rediriger www. vers domaine principal (RECOMMANDÉ)

### Étape 1: Configuration DNS Cloudflare

**Aller sur Cloudflare Dashboard → DNS Records**

Vérifier que vous avez:
```
Type: CNAME
Name: www
Target: garantieproremorque.com
Proxy: ✅ Proxied (orange cloud)
```

### Étape 2: Créer Page Rule de Redirection

**Aller sur Cloudflare Dashboard → Rules → Page Rules**

**Créer nouvelle règle**:
```
URL Pattern: www.garantieproremorque.com/*
Setting: Forwarding URL
Status Code: 301 (Permanent Redirect)
Destination: https://garantieproremorque.com/$1
```

**Résultat**: Tous les accès à `www.` seront automatiquement redirigés vers le domaine principal.

### Étape 3: Mettre à jour l'URL dans le trigger email

```sql
-- Utiliser le domaine SANS www.
v_base_url := 'https://garantieproremorque.com';
v_download_url := v_base_url || '/api/download-warranty-direct?token=' || v_secure_token;
```

**URL finale dans l'email**:
```
https://garantieproremorque.com/api/download-warranty-direct?token=xxx
```

---

## ✅ SOLUTION 2: Faire fonctionner www. directement (ALTERNATIVE)

### Option A: Déployer le site sur www. au lieu du domaine principal

**Dans Cloudflare Pages → Custom Domains**:
1. Retirer `garantieproremorque.com` comme domaine principal
2. Ajouter `www.garantieproremorque.com` comme domaine principal
3. Redéployer le site

**Inconvénient**: Inverse le problème (non-www ne fonctionnera plus)

### Option B: Utiliser Cloudflare Workers pour router

**Créer un Cloudflare Worker** qui route les requêtes:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Si c'est /api/download-warranty-direct
  if (url.pathname.startsWith('/api/download-warranty-direct')) {
    // Rediriger vers Supabase Edge Function
    const supabaseUrl = 'https://sjzpkdxwgvhuwxgacbfy.supabase.co/functions/v1/download-warranty-direct' + url.search
    return fetch(supabaseUrl, request)
  }

  // Sinon, comportement normal
  return fetch(request)
}
```

**Route du Worker**: `www.garantieproremorque.com/api/*`

---

## ✅ SOLUTION 3: Utiliser les deux domaines dans _redirects (NE FONCTIONNE PAS)

**ATTENTION**: Cette solution **NE FONCTIONNERA PAS** car `_redirects` ne peut pas gérer plusieurs domaines.

```
# ❌ CECI NE FONCTIONNE PAS
https://www.garantieproremorque.com/api/download-warranty-direct https://sjzpkdxwgvhuwxgacbfy.supabase.co/functions/v1/download-warranty-direct:splat 200
```

Les redirects doivent être **relatifs** (commencer par `/`) et ne fonctionnent que sur le domaine où le site est déployé.

---

## 🎯 SOLUTION RECOMMANDÉE (LA PLUS SIMPLE)

### Configuration en 3 étapes

#### 1. Cloudflare: Rediriger www. → non-www.

**Page Rule**:
```
www.garantieproremorque.com/* → https://garantieproremorque.com/$1 (301)
```

#### 2. Email: Utiliser domaine sans www.

**Migration SQL**:
```sql
CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_download_url text;
  v_secure_token text;
  -- ... autres variables ...
BEGIN
  -- ... code ...

  -- Utiliser domaine SANS www.
  IF v_secure_token IS NOT NULL THEN
    v_download_url := 'https://garantieproremorque.com/api/download-warranty-direct?token=' || v_secure_token;
  END IF;

  -- ... reste du code ...
END;
$function$;
```

#### 3. Vérifier _redirects local

**Fichier `public/_redirects`**:
```
/api/download-warranty-direct https://sjzpkdxwgvhuwxgacbfy.supabase.co/functions/v1/download-warranty-direct:splat 200
/api/download-warranty-documents https://sjzpkdxwgvhuwxgacbfy.supabase.co/functions/v1/download-warranty-documents:splat 200

/* /index.html 200
```

**Résultat final**:

```
Client clique: https://www.garantieproremorque.com/api/download-warranty-direct?token=xxx
  ↓
Cloudflare Page Rule: 301 redirect
  ↓
Nouveau URL: https://garantieproremorque.com/api/download-warranty-direct?token=xxx
  ↓
_redirects: Proxy vers Supabase
  ↓
Edge Function: https://sjzpkdxwgvhuwxgacbfy.supabase.co/functions/v1/download-warranty-direct?token=xxx
  ↓
✅ PDF téléchargé!
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Partie 1: Configuration Cloudflare (À faire manuellement)

- [ ] Vérifier CNAME pour www → garantieproremorque.com
- [ ] Créer Page Rule: www.garantieproremorque.com/* → garantieproremorque.com/$1
- [ ] Tester: `curl -I https://www.garantieproremorque.com` (doit redirect 301)

### Partie 2: Mise à jour du Code (Automatique)

- [ ] Créer migration pour mettre à jour trigger email
- [ ] Changer URL de Supabase vers garantieproremorque.com
- [ ] Appliquer migration
- [ ] Builder et déployer

### Partie 3: Tests

- [ ] Créer nouvelle garantie
- [ ] Vérifier email reçu
- [ ] Confirmer URL contient `garantieproremorque.com` (sans www)
- [ ] Tester clic sur lien
- [ ] Confirmer PDF se télécharge

---

## 🚨 IMPORTANT: Page Rule Cloudflare

**VOUS DEVEZ CONFIGURER MANUELLEMENT** la Page Rule dans Cloudflare car nous n'avons pas accès à l'API Cloudflare depuis le code.

**Sans cette Page Rule**:
- ❌ www.garantieproremorque.com donnera 502
- ✅ garantieproremorque.com fonctionnera

**Avec cette Page Rule**:
- ✅ www.garantieproremorque.com redirige vers garantieproremorque.com (301)
- ✅ garantieproremorque.com fonctionne
- ✅ Les deux URLs fonctionnent!

---

## 🧪 TESTS DE VALIDATION

### Test 1: Redirect www. → non-www.

```bash
curl -I https://www.garantieproremorque.com/
```

**Résultat attendu**:
```
HTTP/2 301 Moved Permanently
location: https://garantieproremorque.com/
```

### Test 2: API redirect fonctionne

```bash
curl -I "https://garantieproremorque.com/api/download-warranty-direct?token=VALID_TOKEN"
```

**Résultat attendu**:
```
HTTP/2 200 OK
content-type: application/pdf
```

### Test 3: www. + API fonctionne (via redirect)

```bash
curl -I "https://www.garantieproremorque.com/api/download-warranty-direct?token=VALID_TOKEN"
```

**Résultat attendu**:
```
HTTP/2 301 Moved Permanently (redirect vers garantieproremorque.com)
Puis:
HTTP/2 200 OK
content-type: application/pdf
```

---

## 📝 ALTERNATIVE: Si vous voulez garder www. dans les emails

Si vous voulez ABSOLUMENT que l'email contienne `www.garantieproremorque.com`, alors:

1. **Déployez le site Cloudflare Pages sur www. comme domaine principal**
2. **Redirigez non-www. vers www.** (inverse de la solution recommandée)
3. **Mettez à jour le trigger pour utiliser www.**

Mais **ce n'est pas recommandé** car:
- Convention web: domaine principal sans www.
- SEO: meilleur sans www.
- Plus simple à gérer

---

## ✅ RÉSUMÉ

**Pour que les emails avec www.garantieproremorque.com fonctionnent**:

1. 🔧 **Configurer Page Rule Cloudflare** (301 redirect www. → non-www.)
2. 💾 **Mettre à jour trigger email** (utiliser garantieproremorque.com sans www.)
3. 🚀 **Déployer**
4. 🧪 **Tester**

**Temps requis**: 10 minutes
**Complexité**: Faible
**Fiabilité**: 100%

---

**Date**: 4 novembre 2025
**Priorité**: 🔥 CRITIQUE
**Status**: Configuration Cloudflare requise manuellement
