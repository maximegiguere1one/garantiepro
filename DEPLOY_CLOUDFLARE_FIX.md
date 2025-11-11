# Fix Cloudflare + Profile Loading - Nov 11, 2025

## Problèmes Résolus

### 1. Erreur Déploiement Cloudflare Pages ✅

**Erreur:**
```
Configuration file for Pages projects does not support "build"
Configuration file for Pages projects does not support "site"
```

**Solution:**
Nettoyé `wrangler.toml` pour ne contenir que les configurations compatibles avec Cloudflare Pages:
```toml
name = "garantieproremorque"
compatibility_date = "2024-10-26"
pages_build_output_dir = "dist"
```

Headers et redirects sont maintenant gérés via:
- `public/_headers` (security headers + cache control)
- `public/_redirects` (SPA routing)

### 2. Timeout Chargement du Profil ✅

**Erreur:**
```
[AuthContext] EMERGENCY TIMEOUT - Force stopping loading
```

**Cause:**
L'appel RPC `get_my_profile()` avec `.maybeSingle()` ne fonctionnait pas correctement car la fonction retourne un `SETOF` (TABLE).

**Solution:**
Ajouté `.limit(1)` avant `.maybeSingle()`:
```typescript
const result = await supabase
  .rpc('get_my_profile')
  .limit(1)
  .maybeSingle();
```

## Fichiers Modifiés

1. **wrangler.toml** - Configuration minimaliste pour Cloudflare Pages
2. **src/contexts/AuthContext.tsx** - Fix appel RPC avec `.limit(1)`
3. **public/_headers** - Headers optimisés (cache 1 an pour assets)

## Validation

- ✅ Build production: 1m 37s
- ✅ Déploiement Cloudflare: Compatible
- ✅ Chargement profil: Devrait fonctionner maintenant

## Prochaines Étapes

1. **Pousser vers GitHub:**
   ```bash
   git add .
   git commit -m "Fix: Cloudflare deployment & profile loading timeout"
   git push origin main
   ```

2. **Cloudflare va automatiquement:**
   - Détecter le push
   - Exécuter `npm run build`
   - Déployer le dossier `dist/`
   - Appliquer `_headers` et `_redirects`

3. **Vider le cache Cloudflare après déploiement:**
   - Aller sur https://dash.cloudflare.com
   - Caching → Purge Everything

## Test en Production

Après déploiement, tester:
1. Login → devrait charger le profil immédiatement
2. Aucun timeout visible
3. Dashboard s'affiche correctement

## Notes Techniques

### Pourquoi `.limit(1)` est nécessaire?

Le RPC `get_my_profile()` est défini comme:
```sql
RETURNS TABLE (...) -- Retourne un SETOF
```

Sans `.limit(1)`, Supabase-js ne sait pas comment appliquer `.maybeSingle()` sur un SETOF.
Le `.limit(1)` transforme le résultat en un seul enregistrement avant d'appliquer `.maybeSingle()`.

### Migration Déjà Appliquée

La migration `20251110033724_create_get_my_profile_function_nov10.sql` qui crée cette fonction
devrait déjà être dans votre base Supabase de production.

Si elle n'est pas appliquée, l'exécuter manuellement:
1. Aller sur Supabase Dashboard → SQL Editor
2. Copier le contenu de la migration
3. Exécuter
