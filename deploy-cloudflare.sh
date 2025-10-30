#!/bin/bash

echo "🚀 Déploiement Cloudflare Pages - Location Pro-Remorque"
echo "========================================================="

# 1. Build
echo ""
echo "📦 Étape 1/4: Build de l'application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Erreur lors du build"
  exit 1
fi

# 2. Vérification des fichiers critiques
echo ""
echo "🔍 Étape 2/4: Vérification des fichiers..."

if [ ! -f "dist/_headers" ]; then
  echo "⚠️  Fichier _headers manquant, copie depuis public/"
  cp public/_headers dist/_headers
fi

if [ ! -f "dist/_redirects" ]; then
  echo "⚠️  Fichier _redirects manquant, copie depuis public/"
  cp public/_redirects dist/_redirects
fi

# Vérifier que les fichiers existent
if [ -f "dist/_headers" ] && [ -f "dist/_redirects" ]; then
  echo "✅ Fichiers _headers et _redirects présents"
else
  echo "❌ Fichiers critiques manquants!"
  exit 1
fi

# 3. Vérification des assets
echo ""
echo "📊 Étape 3/4: Statistiques du build..."
echo "   - Fichiers HTML: $(find dist -name "*.html" | wc -l)"
echo "   - Fichiers JS: $(find dist/assets -name "*.js" 2>/dev/null | wc -l)"
echo "   - Fichiers CSS: $(find dist/assets -name "*.css" 2>/dev/null | wc -l)"

# 4. Instructions de déploiement
echo ""
echo "🎯 Étape 4/4: Déploiement"
echo ""
echo "IMPORTANT: Vous devez maintenant:"
echo ""
echo "1️⃣  Installer Wrangler (si pas déjà fait):"
echo "   npm install -g wrangler"
echo ""
echo "2️⃣  Vous connecter à Cloudflare:"
echo "   wrangler login"
echo ""
echo "3️⃣  Déployer avec cette commande:"
echo "   wrangler pages deploy dist --project-name=garantieproremorque"
echo ""
echo "4️⃣  Après le déploiement, VIDER LE CACHE:"
echo "   - Allez sur https://dash.cloudflare.com"
echo "   - Sélectionnez votre domaine"
echo "   - Caching → Configuration → Purge Everything"
echo ""
echo "✅ Build prêt pour le déploiement!"
echo ""
echo "Voulez-vous déployer maintenant? (y/n)"
read -r response

if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
  echo ""
  echo "🚀 Déploiement en cours..."
  wrangler pages deploy dist --project-name=garantieproremorque
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅ DÉPLOIEMENT RÉUSSI! ✅ ✅ ✅"
    echo ""
    echo "⚠️  N'OUBLIEZ PAS DE VIDER LE CACHE CLOUDFLARE!"
    echo ""
  else
    echo ""
    echo "❌ Erreur lors du déploiement"
    exit 1
  fi
else
  echo ""
  echo "ℹ️  Déploiement annulé. Utilisez la commande ci-dessus quand vous êtes prêt."
fi
