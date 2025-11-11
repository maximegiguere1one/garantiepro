# 🚨 URGENT : Purger le Cache Cloudflare

## Problème

L'ancienne version de l'application est cached par Cloudflare et se charge pendant quelques secondes avant que la nouvelle version apparaisse.

## Solution : Purger le Cache Cloudflare

### Méthode 1 : Via le Dashboard Cloudflare (RECOMMANDÉ)

1. Va sur **https://dash.cloudflare.com**
2. Sélectionne ton domaine **garantieproremorque.com**
3. Dans le menu de gauche, clique sur **"Caching"**
4. Clique sur **"Purge Cache"** → **"Purge Everything"**
5. Confirme en cliquant sur **"Purge Everything"** dans la modal

⏱️ **Temps de propagation** : 30 secondes à 2 minutes

### Méthode 2 : Via l'API Cloudflare

Si tu as accès à l'API Cloudflare :

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Méthode 3 : Purger des fichiers spécifiques

Si tu ne veux purger QUE l'index.html :

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://www.garantieproremorque.com/","https://www.garantieproremorque.com/index.html"]}'
```

## Vérification

Après avoir purgé le cache :

1. Ouvre une **navigation privée** (Ctrl + Shift + N)
2. Va sur **www.garantieproremorque.com**
3. Tu devrais voir directement la nouvelle version (pas l'ancienne version d'urgence)

## Prévention

Pour éviter ce problème à l'avenir, tu peux :

1. **Configurer des Page Rules** pour ne PAS cacher index.html
2. **Utiliser un hash dans le nom du fichier** (déjà fait avec Vite)
3. **Purger automatiquement le cache** après chaque déploiement

---

## ✅ TO DO MAINTENANT

1. Purge le cache Cloudflare via le Dashboard
2. Vide le cache de ton navigateur (Ctrl + Shift + R)
3. Teste en navigation privée
4. Les réclamations devraient maintenant fonctionner ! 🚀
