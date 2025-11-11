# Solution au Timeout de Connexion WebContainer

## Problème Actuel

Vous voyez le message : "La connexion a pris trop de temps. Cliquez sur 'Ignorer et continuer' pour accéder à l'application."

**Cause**: Vous êtes dans un environnement WebContainer (Bolt.new/StackBlitz) qui a des **limitations réseau importantes** avec Supabase Auth.

## Solutions Rapides

### ✅ Option 1: Utiliser le Mode Démonstration (Recommandé pour tester)

1. Quand vous voyez la page d'erreur, cliquez sur **"Accès d'urgence (Mode Démonstration)"**
2. Cela créera un profil de démonstration pour tester l'interface
3. Limitations: Données fictives, pas de sauvegarde réelle

### ✅ Option 2: Continuer Sans Authentification

1. Cliquez sur **"Ignorer et continuer"** sur la page de timeout
2. Vous verrez l'interface mais sans connexion réelle à la base de données
3. Limitations: Interface en lecture seule

### ✅ Option 3: Réessayer (Peut fonctionner parfois)

1. Cliquez sur **"Réessayer la connexion"**
2. Si la connexion Supabase passe, vous aurez accès complet
3. Note: Dans WebContainer, cela échoue souvent

## Solution Permanente: Déployer en Production

Pour une expérience complète et stable, déployez l'application sur:

### Cloudflare Pages (Gratuit - Recommandé)
```bash
# 1. Installez Wrangler
npm install -g wrangler

# 2. Authentifiez-vous
wrangler login

# 3. Déployez
npm run build
wrangler pages deploy dist --project-name=garantie-pro-remorque
```

### Vercel (Gratuit)
```bash
# 1. Installez Vercel CLI
npm install -g vercel

# 2. Déployez
vercel
```

### Netlify (Gratuit)
```bash
# 1. Installez Netlify CLI
npm install -g netlify-cli

# 2. Déployez
npm run build
netlify deploy --prod --dir=dist
```

## Pourquoi WebContainer Ne Fonctionne Pas Bien?

1. **CORS Strict**: WebContainer a des restrictions CORS qui bloquent Supabase Auth
2. **Réseau Limité**: Timeouts courts sur les connexions externes
3. **Pas de Contrôle**: Impossible de configurer les headers réseau

## Configuration Actuelle

Vos clés Supabase sont **correctement configurées** dans `.env`:
- ✅ VITE_SUPABASE_URL configuré
- ✅ VITE_SUPABASE_ANON_KEY configuré
- ✅ VITE_SITE_URL configuré

Le problème vient uniquement de l'environnement WebContainer, pas de votre configuration.

## Timeouts Optimisés

L'application détecte automatiquement WebContainer et utilise des timeouts plus courts:
- WebContainer: 5 secondes (au lieu de 30)
- Production: 30 secondes

## Tests Recommandés

1. **Interface**: Testez en mode démonstration dans WebContainer
2. **Fonctionnalités réelles**: Déployez en production
3. **Développement local**: Clonez le repo et exécutez `npm run dev` localement

## Questions?

Si vous continuez à avoir des problèmes après déploiement en production:
1. Vérifiez que les variables d'environnement sont configurées sur votre plateforme
2. Consultez `SUPABASE_SETUP_GUIDE.md` pour la configuration
3. Vérifiez les logs de la console navigateur pour plus de détails
