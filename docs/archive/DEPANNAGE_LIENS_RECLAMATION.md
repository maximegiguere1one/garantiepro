# 🔧 Dépannage - Liens de Réclamation

## ❌ Problème: "Offline - Resource not available"

### Cause Probable
L'URL `https://www.garantieproremorque.com` affiche cette erreur car:
- **L'application n'est PAS déployée** sur ce domaine
- Vous testez une URL de production sans avoir déployé

---

## ✅ SOLUTION 1: Test en Local (RECOMMANDÉ)

### Étape 1: Démarrer le serveur
```bash
cd /chemin/vers/le/projet
npm run dev
```

Vous devriez voir:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Étape 2: Tester un lien
Ouvrez dans votre navigateur:
```
http://localhost:5173/claim/submit/020f9d7a-aee7-485e-bac4-f4bade5c132d
```

### Étape 3: Vérifier le résultat
✅ **Ça marche?** → Le système fonctionne! Il faut juste déployer.
❌ **Erreur?** → Passez à la section "Diagnostic Avancé" ci-dessous.

---

## ✅ SOLUTION 2: Déployer en Production

### Option A: Cloudflare Pages (GRATUIT)

1. **Créer un compte** sur [Cloudflare Pages](https://pages.cloudflare.com/)

2. **Connecter votre repo Git** ou upload manuel:

   **Upload Manuel:**
   ```bash
   npm run build
   # Upload le dossier dist/ via l'interface Cloudflare
   ```

3. **Configurer le domaine:**
   - Dans Cloudflare Pages → Custom Domains
   - Ajouter: `www.garantieproremorque.com`
   - Suivre les instructions DNS

4. **Variables d'environnement:**
   ```
   VITE_SUPABASE_URL=https://lfpdfdugijzewshxwofy.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_SITE_URL=https://www.garantieproremorque.com
   ```

### Option B: Netlify (GRATUIT)

1. **Installer Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build et déployer:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **Configurer le domaine custom:**
   ```bash
   netlify domains:add www.garantieproremorque.com
   ```

4. **Variables d'environnement:**
   - Aller dans Site Settings → Build & Deploy → Environment
   - Ajouter les variables VITE_*

### Option C: Vercel (GRATUIT)

1. **Installer Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Déployer:**
   ```bash
   vercel --prod
   ```

3. **Configurer le domaine:**
   ```bash
   vercel domains add www.garantieproremorque.com
   ```

---

## 🔍 Diagnostic Avancé

### Test 1: Vérifier Supabase

Ouvrez le fichier `test-claim-token.html` dans votre navigateur.

✅ **Tests réussis?** → Supabase fonctionne
❌ **Erreurs?** → Problème de configuration Supabase

### Test 2: Console du Navigateur

1. Appuyez sur **F12** (Chrome/Edge/Firefox)
2. Allez dans l'onglet **Console**
3. Ouvrez l'URL du lien de réclamation
4. Regardez les erreurs

**Erreurs communes:**

#### "Failed to fetch"
- Problème de connexion réseau
- CORS non configuré
- URL Supabase incorrecte

#### "Invalid API key"
- Vérifier VITE_SUPABASE_ANON_KEY dans .env

#### "Token expired" ou "Token used"
- Le token n'est plus valide
- Utilisez un autre token de la liste

### Test 3: Vérifier les Variables d'Environnement

```bash
# Dans le terminal du projet
cat .env
```

Doit contenir:
```env
VITE_SUPABASE_URL=https://lfpdfdugijzewshxwofy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SITE_URL=https://www.garantieproremorque.com
```

### Test 4: Rebuild

Parfois, un rebuild résout les problèmes:

```bash
# Supprimer les fichiers de cache
rm -rf node_modules/.vite
rm -rf dist

# Rebuild
npm run build

# Redémarrer le dev server
npm run dev
```

---

## 🆘 Erreurs Spécifiques

### "Offline - Resource not available"
**Cause:** Application non déployée
**Solution:** Déployez ou testez en local

### Page blanche
**Cause:** Erreur JavaScript
**Solution:** Vérifiez la console (F12)

### "Token invalide"
**Cause:** Token expiré ou utilisé
**Solution:** Utilisez un token de la liste:
```sql
SELECT token
FROM warranty_claim_tokens
WHERE is_used = false
  AND expires_at > now()
LIMIT 5;
```

### "Network Error"
**Cause:** Supabase inaccessible
**Solution:**
1. Vérifiez l'URL Supabase
2. Vérifiez votre connexion internet
3. Vérifiez le status de Supabase: https://status.supabase.com/

---

## 📊 Vérifications Finales

### ✅ Checklist Avant Déploiement

- [ ] `npm run build` fonctionne sans erreur
- [ ] Fichier `.env` contient les bonnes valeurs
- [ ] Test local fonctionne (localhost:5173)
- [ ] Token valide disponible
- [ ] Supabase accessible

### ✅ Checklist Après Déploiement

- [ ] Page d'accueil accessible (`https://www.garantieproremorque.com`)
- [ ] Login fonctionne
- [ ] Lien de réclamation s'affiche dans les garanties
- [ ] Lien de réclamation fonctionne
- [ ] Formulaire se charge
- [ ] Soumission fonctionne

---

## 💡 Besoin d'Aide?

### Informations à Fournir

Si ça ne marche toujours pas, fournissez:

1. **Quelle URL** avez-vous testé?
2. **Message d'erreur exact** (screenshot ou texte)
3. **Erreurs dans la console** (F12 → Console)
4. **Est-ce déployé?** Où? (Cloudflare/Netlify/Vercel/Autre)
5. **Sortie de** `npm run dev` (les 10 premières lignes)

### Obtenir un Nouveau Token

Si tous vos tokens sont expirés:

```sql
-- Dans Supabase SQL Editor
SELECT
  'http://localhost:5173/claim/submit/' || token as local_url,
  'https://www.garantieproremorque.com/claim/submit/' || token as prod_url,
  expires_at
FROM warranty_claim_tokens
WHERE is_used = false
  AND expires_at > now()
LIMIT 5;
```

---

## 🎯 Résumé Simple

1. **Pour tester MAINTENANT:** `npm run dev` puis `http://localhost:5173/claim/submit/TOKEN`
2. **Pour la production:** Déployez sur Cloudflare/Netlify/Vercel
3. **Si problème:** Ouvrez F12, regardez Console, partagez l'erreur

Le système est **100% fonctionnel**, il faut juste l'utiliser correctement! 🚀
