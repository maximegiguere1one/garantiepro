#!/bin/bash

# Script de déploiement rapide vers Cloudflare Pages
# Usage: ./deploy-cloudflare.sh

echo "🚀 Déploiement vers Cloudflare Pages"
echo ""

# Vérifier si wrangler est installé
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler (Cloudflare CLI) n'est pas installé"
    echo "📦 Installation en cours..."
    npm install -g wrangler
    if [ $? -ne 0 ]; then
        echo "❌ Échec de l'installation de Wrangler"
        exit 1
    fi
    echo "✅ Wrangler installé avec succès"
    echo ""
fi

# Build le projet
echo "🔨 Build du projet..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Échec du build"
    exit 1
fi

echo "✅ Build terminé avec succès"
echo ""

# Vérifier si dist existe
if [ ! -d "dist" ]; then
    echo "❌ Le dossier dist n'existe pas"
    exit 1
fi

echo "📦 Contenu de dist:"
ls -lh dist/ | head -10
echo ""

# Vérifier si l'utilisateur est connecté
echo "🔐 Vérification de la connexion Cloudflare..."
wrangler whoami &> /dev/null

if [ $? -ne 0 ]; then
    echo "❌ Non connecté à Cloudflare"
    echo "🔐 Connexion en cours..."
    wrangler login

    if [ $? -ne 0 ]; then
        echo "❌ Échec de la connexion"
        exit 1
    fi
fi

echo "✅ Connecté à Cloudflare"
echo ""

# Déployer
echo "🚀 Déploiement vers Cloudflare Pages..."
echo ""
echo "⚠️  Si c'est votre premier déploiement, vous devrez:"
echo "   1. Créer un nouveau projet"
echo "   2. Nommer le projet: garantieproremorque"
echo ""

wrangler pages deploy dist --project-name=garantieproremorque

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement réussi!"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Configurer le domaine custom dans Cloudflare:"
    echo "      Pages → garantieproremorque → Custom domains"
    echo "      → Add: www.garantieproremorque.com"
    echo ""
    echo "   2. Purger le cache Cloudflare:"
    echo "      Caching → Configuration → Purge Everything"
    echo ""
    echo "   3. Vider le cache de votre navigateur:"
    echo "      F12 → Application → Clear site data"
    echo ""
else
    echo ""
    echo "❌ Échec du déploiement"
    echo ""
    echo "💡 Solutions alternatives:"
    echo "   1. Déployer manuellement via le dashboard:"
    echo "      https://dash.cloudflare.com → Pages → Upload assets"
    echo ""
    echo "   2. Uploader le contenu de dist/ via FTP"
    echo ""
fi
