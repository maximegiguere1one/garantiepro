# 🧪 Test Local des Liens de Réclamation

## ⚠️ Important: L'application n'est pas encore déployée en production

L'erreur "Offline - Resource not available" signifie que `https://www.garantieproremorque.com` n'héberge pas encore l'application.

## 📋 Option 1: Test avec l'URL Locale (MAINTENANT)

### 1. Démarrez le serveur local
```bash
npm run dev
```

### 2. Utilisez ces liens locaux
Remplacez `garantieproremorque.com` par `localhost:5173`:

```
http://localhost:5173/claim/submit/020f9d7a-aee7-485e-bac4-f4bade5c132d
http://localhost:5173/claim/submit/ea30d1a4-be28-41b6-a012-fbf6ef6ff534
http://localhost:5173/claim/submit/eb5408f1-0b7c-4896-a9e1-dcbf03e6087f
http://localhost:5173/claim/submit/6baa0677-e33e-41da-b00e-6bea51ed0d25
http://localhost:5173/claim/submit/87d1b620-92e4-4e18-a418-a3a2a0af4eb0
```

### 3. Ouvrez un lien dans votre navigateur
- Le formulaire de réclamation devrait s'afficher
- Toutes les fonctionnalités sont opérationnelles

---

## 🚀 Option 2: Déploiement en Production

Pour que les liens `garantieproremorque.com` fonctionnent, vous devez:

### Étape 1: Build de Production
```bash
npm run build
```
Cela crée le dossier `dist/` avec tous les fichiers.

### Étape 2: Déployer sur votre Serveur

**Si vous utilisez Netlify:**
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Déployer
netlify deploy --prod --dir=dist
```

**Si vous utilisez Vercel:**
```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel --prod
```

**Si vous utilisez votre propre serveur:**
1. Uploadez le contenu du dossier `dist/` sur votre serveur
2. Configurez votre serveur web (Apache/Nginx) pour:
   - Servir les fichiers depuis `dist/`
   - Rediriger toutes les routes vers `index.html` (SPA)

### Étape 3: Configuration DNS
Assurez-vous que `www.garantieproremorque.com` pointe vers votre serveur.

---

## 🔧 Configuration du Serveur Web

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name www.garantieproremorque.com;
    root /var/www/garantieproremorque/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache Configuration (.htaccess)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## ✅ Vérification Post-Déploiement

1. **Testez la page d'accueil:**
   ```
   https://www.garantieproremorque.com
   ```

2. **Testez un lien de réclamation:**
   ```
   https://www.garantieproremorque.com/claim/submit/020f9d7a-aee7-485e-bac4-f4bade5c132d
   ```

3. **Vérifiez dans l'admin:**
   - Connectez-vous
   - Allez dans Garanties
   - Le lien affiché devrait être cliquable

---

## 🆘 Dépannage

### L'URL affiche "Offline - Resource not available"
- ✅ L'application n'est pas déployée
- ✅ Le DNS ne pointe pas vers le bon serveur
- ✅ Le serveur web n'est pas configuré

### Le formulaire ne s'affiche pas
- ❌ Videz le cache: Ctrl+Shift+R
- ❌ Vérifiez la console du navigateur (F12)
- ❌ Vérifiez que le fichier `_redirects` est bien déployé

### "Token invalide"
- ❌ Le token a expiré
- ❌ Le token a déjà été utilisé
- ❌ Problème de connexion à Supabase
