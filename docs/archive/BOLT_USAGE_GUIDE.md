# Guide d'utilisation dans Bolt.new

## Problème connu: CORS et limitations WebContainer

Votre application fonctionne dans un environnement **Bolt/WebContainer** qui a des limitations importantes avec Supabase, particulièrement les erreurs CORS que vous voyez dans la console.

## Solution recommandée

### Option 1: Déployer en production (RECOMMANDÉ)

L'application est conçue pour fonctionner en production. Les erreurs CORS n'existent pas en production car les restrictions de WebContainer ne s'appliquent pas.

**Pour déployer rapidement:**

```bash
# Construire l'application
npm run build

# Déployer sur Cloudflare Pages, Vercel, ou Netlify
# Les fichiers sont dans le dossier 'dist'
```

### Option 2: Travailler avec les limitations de Bolt

Si vous devez absolument tester dans Bolt, voici ce qui a été fait:

#### ✅ Améliorations implémentées

1. **Timeout de 30 secondes** - L'application ne restera plus bloquée indéfiniment
2. **Détection d'environnement** - L'app sait qu'elle est dans WebContainer
3. **Désactivation du refresh automatique** - Le token ne se rafraîchit plus automatiquement dans Bolt (cause des erreurs CORS)
4. **Bouton "Ignorer et continuer"** - Permet de continuer même si l'auth échoue

#### ⚠️ Limitations restantes dans Bolt

- **Erreurs CORS continues** - Supabase Auth ne peut pas rafraîchir les tokens (restriction du navigateur)
- **Session limitée** - La session expirera après ~1 heure et vous devrez vous reconnecter
- **Pas de real-time** - Les fonctionnalités temps réel peuvent ne pas fonctionner

## Comment utiliser l'application dans Bolt

### Étape 1: Attendre le timeout (30 secondes)

Si l'application est bloquée sur l'écran de chargement:
1. Attendez 30 secondes
2. Un bouton **"Ignorer et continuer"** apparaîtra
3. Cliquez dessus pour passer outre le chargement

### Étape 2: Se connecter

Une fois sur la page de connexion:
1. Entrez vos identifiants
2. **NE PAS cocher "Se souvenir de moi"** dans Bolt (cause des problèmes)
3. Cliquez sur "Se connecter"

### Étape 3: Utiliser l'application

- L'application devrait fonctionner normalement pour ~1 heure
- Les erreurs CORS dans la console sont **normales** et peuvent être ignorées
- Si l'application se bloque, rafraîchissez la page (F5)

## Erreurs dans la console - NORMALES dans Bolt

Ces erreurs sont attendues et ne cassent pas l'application:

```
Access to fetch at 'https://fkxldrkkqvputdgfpayi.supabase.co/auth/v1/token?grant_type=refresh_token'
from origin '...' has been blocked by CORS policy
```

```
Failed to load resource: net::ERR_FAILED
```

```
AuthRetryableFetchError: Failed to fetch
```

**Pourquoi?** WebContainer utilise un système de sécurité très strict qui bloque les requêtes de rafraîchissement de token de Supabase.

## Configuration Supabase pour Bolt (optionnel)

Si vous voulez vraiment que ça fonctionne mieux dans Bolt, vous devez configurer Supabase:

1. Allez sur https://app.supabase.com
2. Ouvrez votre projet
3. Settings → Auth → Site URL
4. Ajoutez l'URL de votre preview Bolt comme URL autorisée
5. Ajoutez aussi les patterns: `*.webcontainer-api.io`, `*.bolt.new`

**MAIS** même avec ça, les limitations CORS resteront à cause de WebContainer.

## Pour le développement sérieux

**Utilisez un environnement local standard:**

```bash
# Cloner le projet localement
git clone [votre-repo]

# Installer les dépendances
npm install

# Lancer en local (pas de limitations CORS)
npm run dev
```

En local (localhost), les erreurs CORS n'existeront pas et tout fonctionnera parfaitement.

## Résumé

| Environnement | CORS Issues | Session | Real-time | Recommandé |
|--------------|-------------|---------|-----------|------------|
| **Bolt.new** | ❌ Oui | ⚠️ Limitée | ❌ Non | Pour demo rapide seulement |
| **Local (localhost)** | ✅ Non | ✅ Complète | ✅ Oui | ✅ Pour développement |
| **Production** | ✅ Non | ✅ Complète | ✅ Oui | ✅ Pour utilisation réelle |

## Support

Si vous voyez toujours l'écran de chargement infini:
1. Attendez 30 secondes pour le timeout
2. Cliquez sur "Ignorer et continuer"
3. Si ça ne marche pas, rafraîchissez la page (F5)
4. En dernier recours, videz le cache: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
