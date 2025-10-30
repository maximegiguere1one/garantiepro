#!/bin/bash

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DÉPLOIEMENT PRODUCTION - Location Pro-Remorque            ║${NC}"
echo -e "${BLUE}║     Date: $(date '+%Y-%m-%d %H:%M:%S')                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher les étapes
step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Étape 1: Vérification de l'environnement
step "Étape 1/6: Vérification de l'environnement"

if [ ! -f "package.json" ]; then
    error "Erreur: package.json non trouvé. Êtes-vous dans le bon répertoire?"
    exit 1
fi
success "package.json trouvé"

if [ ! -f "vite.config.ts" ]; then
    error "Erreur: vite.config.ts non trouvé"
    exit 1
fi
success "vite.config.ts trouvé"

# Étape 2: Nettoyage
step "Étape 2/6: Nettoyage des fichiers de build précédents"
rm -rf dist/
success "Dossier dist/ supprimé"

# Étape 3: Build
step "Étape 3/6: Build de l'application"
echo -e "${YELLOW}Cela peut prendre 30-60 secondes...${NC}"

if npm run build > /tmp/build.log 2>&1; then
    success "Build réussi!"
else
    error "Échec du build. Vérifiez les erreurs ci-dessous:"
    tail -20 /tmp/build.log
    exit 1
fi

# Étape 4: Vérification des fichiers critiques
step "Étape 4/6: Vérification des fichiers critiques"

if [ ! -f "dist/_headers" ]; then
    warning "Fichier _headers manquant, copie depuis public/"
    cp public/_headers dist/_headers
fi
success "dist/_headers présent ($(stat -f%z dist/_headers 2>/dev/null || stat -c%s dist/_headers) bytes)"

if [ ! -f "dist/_redirects" ]; then
    warning "Fichier _redirects manquant, copie depuis public/"
    cp public/_redirects dist/_redirects
fi
success "dist/_redirects présent ($(stat -f%z dist/_redirects 2>/dev/null || stat -c%s dist/_redirects) bytes)"

if [ ! -f "dist/index.html" ]; then
    error "Fichier index.html manquant dans dist/"
    exit 1
fi
success "dist/index.html présent ($(stat -f%z dist/index.html 2>/dev/null || stat -c%s dist/index.html) bytes)"

# Compter les fichiers
JS_COUNT=$(find dist/assets -name "*.js" 2>/dev/null | wc -l | xargs)
CSS_COUNT=$(find dist/assets -name "*.css" 2>/dev/null | wc -l | xargs)
success "Assets compilés: ${JS_COUNT} fichiers JS, ${CSS_COUNT} fichiers CSS"

# Étape 5: Vérification de Wrangler
step "Étape 5/6: Vérification de Wrangler CLI"

if ! command -v wrangler &> /dev/null; then
    warning "Wrangler CLI n'est pas installé"
    echo -e "${YELLOW}Installation de Wrangler...${NC}"
    
    if npm install -g wrangler; then
        success "Wrangler installé avec succès"
    else
        error "Échec de l'installation de Wrangler"
        echo ""
        echo "Installez manuellement avec:"
        echo "  npm install -g wrangler"
        exit 1
    fi
else
    WRANGLER_VERSION=$(wrangler --version | head -1)
    success "Wrangler trouvé: $WRANGLER_VERSION"
fi

# Vérifier si connecté
step "Vérification de l'authentification Cloudflare"
if wrangler whoami &> /dev/null; then
    WHOAMI=$(wrangler whoami 2>&1 | grep "You are logged in" || echo "Connecté")
    success "Authentifié à Cloudflare"
else
    warning "Pas encore authentifié à Cloudflare"
    echo ""
    echo "Exécutez cette commande pour vous connecter:"
    echo -e "${BLUE}  wrangler login${NC}"
    echo ""
    echo -n "Voulez-vous vous connecter maintenant? (y/n): "
    read -r response
    
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        wrangler login
    else
        error "Déploiement annulé - authentification requise"
        exit 1
    fi
fi

# Étape 6: Déploiement
step "Étape 6/6: Déploiement sur Cloudflare Pages"
echo ""
echo -e "${YELLOW}📤 Déploiement en cours...${NC}"
echo ""

if wrangler pages deploy dist --project-name=garantieproremorque; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✅ DÉPLOIEMENT RÉUSSI! ✅                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Instructions post-déploiement
    echo -e "${YELLOW}🔴 ÉTAPE CRITIQUE SUIVANTE:${NC}"
    echo ""
    echo "1. Allez sur: https://dash.cloudflare.com"
    echo "2. Sélectionnez votre domaine: garantieproremorque.com"
    echo "3. Cliquez sur: Caching → Configuration"
    echo "4. Cliquez sur: Purge Everything"
    echo "5. Confirmez"
    echo ""
    echo -e "${BLUE}Pourquoi c'est important?${NC}"
    echo "Sans vider le cache, vous verrez toujours l'ancienne version!"
    echo ""
    echo -e "${GREEN}Ensuite:${NC}"
    echo "1. Attendez 2-3 minutes"
    echo "2. Videz le cache de votre navigateur (Ctrl+Shift+Delete)"
    echo "3. Rechargez la page (Ctrl+Shift+R)"
    echo "4. Ouvrez la console (F12) pour voir les logs de débogage"
    echo ""
    echo -e "${BLUE}URL de l'application:${NC}"
    echo "  https://www.garantieproremorque.com"
    echo ""
    echo -e "${BLUE}Page de diagnostic:${NC}"
    echo "  https://www.garantieproremorque.com/diagnostic-warranty-creation.html"
    echo ""
    echo -e "${BLUE}Identifiants de connexion:${NC}"
    echo "  Email: maxime@giguere-influence.com"
    echo "  Mot de passe: ProRemorque2025!"
    echo ""
    
else
    echo ""
    error "Échec du déploiement"
    echo ""
    echo "Vérifiez:"
    echo "1. Que vous êtes connecté à Cloudflare (wrangler login)"
    echo "2. Que le projet 'garantieproremorque' existe"
    echo "3. Que vous avez les permissions nécessaires"
    exit 1
fi
