#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

URL="https://www.garantieproremorque.com"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         VÉRIFICATION PRODUCTION - Location Pro-Remorque       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Site accessible
echo -e "${BLUE}Test 1: Site accessible${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Site accessible (HTTP 200)${NC}"
else
    echo -e "${RED}❌ Erreur HTTP $STATUS${NC}"
fi

# Test 2: Headers MIME corrects
echo -e "\n${BLUE}Test 2: Headers _headers présent${NC}"
if curl -s "$URL/_headers" | grep -q "Content-Type"; then
    echo -e "${GREEN}✅ Fichier _headers présent${NC}"
else
    echo -e "${YELLOW}⚠️  Fichier _headers non accessible${NC}"
fi

# Test 3: Manifest.json
echo -e "\n${BLUE}Test 3: Manifest.json${NC}"
if curl -s "$URL/manifest.json" | grep -q "Warranty"; then
    echo -e "${GREEN}✅ Manifest.json présent et valide${NC}"
else
    echo -e "${RED}❌ Manifest.json manquant ou invalide${NC}"
fi

# Test 4: Page de diagnostic
echo -e "\n${BLUE}Test 4: Page de diagnostic${NC}"
if curl -s "$URL/diagnostic-warranty-creation.html" | grep -q "Diagnostic"; then
    echo -e "${GREEN}✅ Page de diagnostic accessible${NC}"
else
    echo -e "${RED}❌ Page de diagnostic non trouvée${NC}"
fi

# Test 5: API Supabase
echo -e "\n${BLUE}Test 5: Connexion API Supabase${NC}"
SUPABASE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://fkxldrkkqvputdgfpayi.supabase.co/rest/v1/")
if [ "$SUPABASE_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API Supabase accessible (HTTP 200)${NC}"
else
    echo -e "${YELLOW}⚠️  API Supabase: HTTP $SUPABASE_STATUS${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    RÉSUMÉ DE LA VÉRIFICATION                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "URL principale: $URL"
echo "Page de diagnostic: $URL/diagnostic-warranty-creation.html"
echo ""
echo -e "${YELLOW}Action requise:${NC}"
echo "1. Ouvrez le site dans votre navigateur"
echo "2. Ouvrez la console (F12)"
echo "3. Vérifiez qu'il n'y a pas d'erreurs MIME type"
echo "4. Connectez-vous et testez la création de garantie"
echo ""
