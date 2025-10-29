#!/bin/bash

echo "🎨 Validation du Branding Rouge Pro-Remorque"
echo "=============================================="
echo ""

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASS=0
FAIL=0

# Fonction de test
test_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2 - Fichier manquant: $1"
        ((FAIL++))
    fi
}

# Fonction de test contenu
test_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $3"
        ((FAIL++))
    fi
}

echo "📦 Vérification des fichiers de design tokens..."
test_file "src/design/tokens-v2.json" "Design tokens V2"
test_content "src/design/tokens-v2.json" "#DC2626" "Couleur rouge #DC2626 présente"
test_content "src/design/tokens-v2.json" "rgba(220, 38, 38" "Ombres rouges configurées"

echo ""
echo "⚙️  Vérification de la configuration Tailwind..."
test_file "tailwind.config.js" "Configuration Tailwind"
test_content "tailwind.config.js" "tokens-v2.json" "Import des tokens V2"

echo ""
echo "🧩 Vérification des composants UI V2..."
test_file "src/components/ui/PrimaryButton.tsx" "PrimaryButton"
test_file "src/components/ui/SecondaryButton.tsx" "SecondaryButton"
test_file "src/components/ui/EnhancedInputField.tsx" "EnhancedInputField"
test_file "src/components/ui/KPICard.tsx" "KPICard"
test_file "src/components/ui/EnhancedCard.tsx" "EnhancedCard"
test_file "src/components/ui/EnhancedToast.tsx" "EnhancedToast"
test_file "src/components/ui/MultiStepWarrantyForm.tsx" "MultiStepWarrantyForm"
test_file "src/components/ui/ClaimsTimeline.tsx" "ClaimsTimeline"
test_file "src/components/ui/SignatureModal.tsx" "SignatureModal"
test_file "src/components/ui/index.ts" "UI Barrel export"

echo ""
echo "🎭 Vérification de la page de démo..."
test_file "src/components/UIV2Demo.tsx" "UIV2Demo"
test_content "src/components/UIV2Demo.tsx" "Rouge Pro-Remorque" "Label couleur mise à jour"

echo ""
echo "📚 Vérification de la documentation..."
test_file "MIGRATION_DESIGN_ROUGE_PRO_REMORQUE.md" "Documentation migration"
test_file "COMMENT_VOIR_LE_NOUVEAU_DESIGN_ROUGE.md" "Guide visualisation"
test_file "START_HERE_DESIGN_ROUGE.md" "Guide démarrage rapide"

echo ""
echo "🏗️  Test de build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Build de production réussi"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Build de production échoué"
    ((FAIL++))
fi

echo ""
echo "=============================================="
echo "📊 Résultats:"
echo -e "${GREEN}✓ Tests réussis: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}✗ Tests échoués: $FAIL${NC}"
else
    echo -e "${GREEN}✓ Tests échoués: 0${NC}"
fi
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 Tous les tests sont passés!${NC}"
    echo "Le branding rouge Pro-Remorque est correctement configuré."
    echo ""
    echo "Pour démarrer:"
    echo "  npm run dev"
    echo ""
    echo "Pour voir les changements:"
    echo "  Ouvrez http://localhost:5173"
    echo "  Consultez la page UIV2Demo"
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué${NC}"
    echo "Veuillez vérifier les fichiers manquants ou incorrects."
    exit 1
fi
