# 🔍 DIAGNOSTIC: Garanties Différentes Entre Bolt et Navigateur

**Date**: 29 Octobre 2025
**Problème**: Même compte connecté, garanties différentes entre Bolt et production

---

## 📸 Ce Que Tu Vois

### Bolt (Image 1)
- **Utilisateur**: Maxime Giguere (Master)
- **Garanties affichées**: 3
  - PPR-1761674028910-Z3WMAEK08
  - PPR-1761643046396-UVG9V767W
  - PPR-1761640470038-FZTM729IB

### Navigateur Production (Image 2)
- **Utilisateur**: Maxime Giguere (Master)
- **Garanties affichées**: 3+
  - PPR-1761461424807-LP7UAFISL
  - PPR-1761460849441-K0TRBJFX2
  - PPR-1761410009358-WK3SS8W2B

---

## 🎯 CAUSE ROOT

**Les deux environnements pointent vers des bases de données Supabase DIFFÉRENTES.**

### Scénario le plus probable:

1. **Bolt** utilise:
   - Projet Supabase de DEV/TEST
   - URL: `https://[projet-dev].supabase.co`
   - Données de test créées durant le développement

2. **Production (garantieproremorque.com)** utilise:
   - Projet Supabase de PRODUCTION
   - URL: `https://lfpdfdugijzewshxwofy.supabase.co`
   - Vraies données de production

---

## ✅ VÉRIFICATION IMMÉDIATE

### Étape 1: Ouvre la page de debug dans Bolt
```
1. Dans Bolt, va sur: /debug-supabase.html
2. Note l'URL Supabase affichée
```

### Étape 2: Ouvre la page de debug dans le navigateur production
```
1. Dans ton navigateur, va sur: 
   https://www.garantieproremorque.com/debug-supabase.html
2. Note l'URL Supabase affichée
```

### Étape 3: Compare les URLs
```
Si les URLs sont différentes:
  ✅ C'est confirmé - deux bases de données différentes

Si les URLs sont identiques:
  ❌ Autre problème - isolation multi-tenant
```

---

## 🔧 SOLUTIONS

### Solution A: Bolt Utilise la Prod (RECOMMANDÉ)

**Si tu veux que Bolt affiche les MÊMES données que la prod:**

1. **Vérifie le fichier `.env` dans Bolt**:
   ```
   VITE_SUPABASE_URL=https://lfpdfdugijzewshxwofy.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Redémarre Bolt** (important pour charger les nouvelles variables)

3. **Vide le cache** (Ctrl+Shift+R)

4. **Reconnecte-toi** avec le même compte

### Solution B: C'est Normal (DEV vs PROD)

**Si tu VEUX que Bolt et Prod soient séparés** (ce qui est normal):

- ✅ Bolt = Environnement de DEV avec données de test
- ✅ Prod = Environnement de PRODUCTION avec vraies données
- ✅ **C'est le comportement attendu!**

Dans ce cas, tu dois:
1. Créer les mêmes garanties dans DEV pour tester
2. Ou utiliser la prod pour voir les vraies données

---

## 🔍 AUTRES CAUSES POSSIBLES

### Cause #2: Isolation Multi-Tenant

Si les URLs Supabase sont identiques, le problème est l'isolation:

**Symptômes**:
- Même base de données
- Même compte email
- Mais `organization_id` différent

**Diagnostic**:
```sql
-- Vérifie l'organization_id de ton compte
SELECT id, email, organization_id, role
FROM profiles
WHERE email = 'maxime@giguere-influence.com';

-- Vérifie les garanties par organisation
SELECT organization_id, COUNT(*) as total
FROM warranties
GROUP BY organization_id;
```

**Solution**:
- Assure-toi que le même `organization_id` est utilisé
- Vérifie les RLS policies

### Cause #3: Cache Local

**Symptômes**:
- Données anciennes dans Bolt
- Données récentes dans navigateur

**Solution**:
```
1. Ouvre DevTools (F12)
2. Application → Storage → Clear site data
3. Recharge (Ctrl+Shift+R)
4. Reconnecte-toi
```

---

## 🎯 ACTION IMMÉDIATE

**ÉTAPE 1**: Vérifie quelle URL Supabase est utilisée:

Dans Bolt console:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
```

Dans Production console:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
```

**ÉTAPE 2**: Compare les résultats:

- ❌ URLs différentes → Deux bases de données
- ✅ URLs identiques → Problème d'isolation

**ÉTAPE 3**: Applique la solution appropriée

---

## 📊 CHECKLIST DEBUG

- [ ] Ouvrir `/debug-supabase.html` dans Bolt
- [ ] Noter l'URL Supabase dans Bolt
- [ ] Ouvrir `/debug-supabase.html` dans Production
- [ ] Noter l'URL Supabase dans Production
- [ ] Comparer les deux URLs
- [ ] Si différentes → Ajuster `.env` dans Bolt
- [ ] Si identiques → Vérifier `organization_id`
- [ ] Redémarrer Bolt
- [ ] Vider le cache
- [ ] Reconnecter
- [ ] Vérifier que les garanties correspondent

---

## 💡 NOTE IMPORTANTE

**C'est normal d'avoir des environnements séparés!**

La plupart des apps ont:
- **DEV/Staging**: Pour développer et tester
- **Production**: Pour les vrais utilisateurs

Si c'est ton cas, c'est **CORRECT** et tu ne devrais **RIEN changer**.

Utilise Bolt pour développer avec des données de test, et le navigateur pour voir/gérer les vraies données de production.

---

**TL;DR**: Bolt et Production utilisent probablement deux bases de données Supabase différentes (DEV vs PROD). Va sur `/debug-supabase.html` dans les deux pour confirmer. Si tu veux les mêmes données partout, assure-toi que le `.env` pointe vers la même base de données.
