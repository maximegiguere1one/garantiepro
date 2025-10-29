# 🔴 PROBLÈME: Ancienne Version sur www.garantieproremorque.com

## Situation
- ✅ Bolt.new affiche la **nouvelle version rouge**
- ❌ www.garantieproremorque.com affiche l'**ancienne version noire**
- ✅ Certificat SSL valide
- ✅ Migration GoDaddy → Cloudflare effectuée

## 🎯 SOLUTION EN 3 ÉTAPES

---

## ÉTAPE 1: PURGER LE CACHE CLOUDFLARE (CRITIQUE!)

### Option A: Via Dashboard Cloudflare

1. **Connexion à Cloudflare**
   - Aller sur https://dash.cloudflare.com
   - Se connecter avec votre compte

2. **Sélectionner le domaine**
   - Cliquer sur **garantieproremorque.com**

3. **Purger TOUT le cache**
   - Menu gauche → **Caching** → **Configuration**
   - Cliquer sur **"Purge Everything"** (bouton rouge)
   - Confirmer
   - ⏱️ Attendre 2-3 minutes

### Option B: Via API Cloudflare

Si vous avez l'API key:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/VOTRE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer VOTRE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## ÉTAPE 2: VÉRIFIER OÙ EST HÉBERGÉ LE SITE

### Question Critique: Où sont les fichiers du site?

Cloudflare est un **CDN/Proxy**, pas un hébergeur. Vos fichiers sont quelque part:

#### Option 1: Cloudflare Pages
- Dashboard Cloudflare → **Pages**
- Vérifier si vous avez un projet "garantieproremorque"
- Si OUI → Cliquer dessus → **"Create deployment"**

#### Option 2: Netlify
- Aller sur https://app.netlify.com
- Trouver votre site
- **Sites** → Votre site → **Deploys** → **"Trigger deploy"**

#### Option 3: Vercel
- Aller sur https://vercel.com
- Trouver votre projet
- **Deployments** → **"Redeploy"**

#### Option 4: Serveur Personnel (VPS/Hébergement Web)
- Vous devez uploader manuellement les fichiers
- Localisation: Dossier `/dist` de ce projet
- Via FTP/SFTP ou panneau de contrôle

---

## ÉTAPE 3: VÉRIFIER LA CONFIGURATION DNS

### Dans Cloudflare Dashboard:

1. **DNS Records**
   - Menu gauche → **DNS** → **Records**

2. **Vérifier ces enregistrements:**

   ```
   Type: A ou CNAME
   Name: www
   Content: [Adresse IP de votre hébergeur OU CNAME]
   Proxy: ☁️ Proxied (Orange Cloud ACTIVÉ)
   ```

   ```
   Type: A ou CNAME
   Name: @
   Content: [Même adresse que www]
   Proxy: ☁️ Proxied (Orange Cloud ACTIVÉ)
   ```

3. **Si vous utilisez Cloudflare Pages:**
   ```
   Type: CNAME
   Name: www
   Content: garantieproremorque.pages.dev
   Proxy: ☁️ Proxied
   ```

---

## ÉTAPE 4: CONFIGURATION CLOUDFLARE SPÉCIALE

### A. Règles de Cache

1. **Caching → Configuration**
2. **Browser Cache TTL**: Changer à **1 hour** (au lieu de 4 hours ou plus)
3. **Sauvegarder**

### B. Page Rules (Important!)

1. **Rules → Page Rules**
2. **Create Page Rule**
3. URL: `www.garantieproremorque.com/index.html`
4. Settings:
   - **Cache Level**: Bypass
5. **Save and Deploy**

6. **Créer une 2e règle:**
   - URL: `www.garantieproremorque.com/*`
   - **Browser Cache TTL**: 1 hour
   - **Save and Deploy**

---

## ÉTAPE 5: DÉPLOYER LA NOUVELLE VERSION

### Si vous utilisez Cloudflare Pages:

```bash
# Dans le dossier du projet
npm run build

# Installer Wrangler (CLI Cloudflare)
npm install -g wrangler

# Se connecter
wrangler login

# Déployer
wrangler pages deploy dist --project-name=garantieproremorque
```

### Si vous utilisez un autre hébergeur:

1. **Build le projet:**
   ```bash
   npm run build
   ```

2. **Uploader TOUT le contenu de `/dist`** vers votre serveur
   - Via FTP: FileZilla, Cyberduck
   - Via SSH: `scp -r dist/* user@server:/var/www/html/`
   - Via Dashboard: Panneau de contrôle de l'hébergeur

---

## ÉTAPE 6: VIDER TOUS LES CACHES (VOUS)

### A. Cache Navigateur

**Chrome/Edge:**
1. Ouvrir www.garantieproremorque.com
2. **F12** (DevTools)
3. Clic droit sur le bouton **Refresh** (à gauche de l'URL)
4. Choisir **"Empty Cache and Hard Reload"**

**OU:**
- Windows: `Ctrl + Shift + Delete`
- Mac: `Cmd + Shift + Delete`
- Cocher "Cached images and files"
- Cliquer "Clear data"

### B. Service Worker

1. **F12** → Onglet **Application**
2. Menu gauche → **Service Workers**
3. Trouver le service worker actif
4. Cliquer **"Unregister"**
5. Fermer DevTools
6. **Hard Refresh**: `Ctrl + Shift + R`

### C. Mode Navigation Privée (Test Rapide)

1. Ouvrir une **fenêtre de navigation privée**
2. Aller sur www.garantieproremorque.com
3. ✅ Si la nouvelle version rouge apparaît = Problème de cache local!
4. ❌ Si l'ancienne version noire apparaît = Problème de déploiement

---

## 🔍 DIAGNOSTIC: Où sont vos fichiers?

Pour savoir où déployer, vérifiez:

### 1. Cloudflare Pages
```bash
# Chercher dans votre projet
ls -la | grep pages
cat .pages.json 2>/dev/null
```

### 2. Netlify
```bash
ls -la | grep netlify
cat netlify.toml 2>/dev/null
```

### 3. Vercel
```bash
ls -la | grep vercel
cat vercel.json 2>/dev/null
```

---

## ⚡ SOLUTION RAPIDE (Recommandée)

### Utiliser Cloudflare Pages (Gratuit et Rapide)

1. **Dans Cloudflare Dashboard:**
   - **Pages** → **Create a project**
   - **Upload assets** → Sélectionner le dossier `dist`
   - Project name: `garantieproremorque`
   - **Deploy site**

2. **Configurer le domaine custom:**
   - Dans le projet Pages → **Custom domains**
   - **Add custom domain**: `www.garantieproremorque.com`
   - Cloudflare va automatiquement créer le DNS

3. **Purger le cache:**
   - **Caching** → **Purge Everything**

---

## 📋 CHECKLIST DE VÉRIFICATION

Après chaque action, testez:

- [ ] Purge du cache Cloudflare effectué
- [ ] Nouveaux fichiers déployés sur l'hébergeur
- [ ] DNS pointant vers le bon serveur
- [ ] Cache navigateur vidé
- [ ] Service Worker désinstallé
- [ ] Test en navigation privée
- [ ] Attendre 5 minutes (propagation DNS)

---

## 🆘 SI RIEN NE FONCTIONNE

### Test de Contournement:

1. **Désactiver temporairement le proxy Cloudflare:**
   - DNS Records → Cliquer sur le cloud orange ☁️
   - Il devient gris ☁️
   - Attendre 2 minutes
   - Tester www.garantieproremorque.com

2. **Si ça fonctionne en gris:**
   - Le problème = Cache Cloudflare
   - Réactiver le proxy orange
   - Purger le cache à nouveau

3. **Si ça ne fonctionne toujours pas:**
   - Le problème = Fichiers pas déployés au bon endroit
   - Vérifier l'adresse IP/CNAME dans DNS
   - Vérifier que les nouveaux fichiers sont sur le serveur

---

## 📞 INFORMATIONS NÉCESSAIRES

Pour vous aider davantage, j'ai besoin de savoir:

1. **Où sont hébergés vos fichiers?**
   - Cloudflare Pages?
   - Netlify?
   - Vercel?
   - VPS/Serveur dédié?
   - Hébergement partagé (ex: cPanel)?

2. **Configuration DNS actuelle:**
   - Quel est le CNAME ou A record pour `www`?

3. **Dernier déploiement:**
   - Quand avez-vous uploadé les fichiers la dernière fois?
   - Comment? (FTP, Git, Dashboard?)

---

## 🎯 RÉSULTAT ATTENDU

Après ces étapes:
- ✅ Logo rouge visible
- ✅ Titre "Location Pro-Remorque"
- ✅ Bouton "Se connecter" rouge
- ✅ Même version que sur Bolt.new

---

**Date:** 26 octobre 2025
**Problème:** Cache Cloudflare + Déploiement
**Solution:** Purger cache + Redéployer fichiers
