# 📊 Guide du Barème de Limites de Réclamation

## 🎯 Vue d'Ensemble

Le système permet maintenant de définir des **limites de réclamation variables** selon la **valeur d'achat de la remorque**.

Au lieu d'avoir une seule limite fixe pour tout le monde, vous pouvez créer un barème:
- Remorque de 0$ à 10,000$ → Limite de 1,500$
- Remorque de 10,001$ à 30,000$ → Limite de 3,000$
- Remorque de 30,001$ à 70,000$ → Limite de 5,000$
- Et ainsi de suite...

---

## 🆕 Nouvelles Fonctionnalités

### Deux Types de Limites

1. **Montant Fixe** (comme avant)
   - Une seule limite pour toutes les garanties
   - Ex: "Maximum 5,000$ peu importe le prix de la remorque"

2. **Barème par Tranches** (NOUVEAU)
   - Limite variable selon le prix de la remorque
   - Plus la remorque est chère, plus la limite peut être élevée

---

## 📝 Comment Configurer un Barème

### Étape 1: Accéder aux Plans de Garantie

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Réglages** → **Plans de garantie**
3. Cliquez sur **Modifier** sur un plan existant OU **Créer un nouveau plan**

### Étape 2: Choisir le Type de Limite

Dans le formulaire, vous verrez une section "**Limite de réclamation**" avec deux options:

```
○ Montant fixe
○ Barème selon valeur remorque  ← Sélectionnez cette option
```

### Étape 3: Ajouter des Tranches

Une fois le barème sélectionné, vous pouvez ajouter des tranches:

```
┌─────────────────────────────────────────────┐
│ De: 0 $      À: 10,000 $   Limite: 1,500 $ │  [🗑️]
├─────────────────────────────────────────────┤
│ De: 10,001 $ À: 30,000 $   Limite: 3,000 $ │  [🗑️]
├─────────────────────────────────────────────┤
│ De: 30,001 $ À: 70,000 $   Limite: 5,000 $ │  [🗑️]
└─────────────────────────────────────────────┘

          [+ Ajouter une tranche]
```

**Pour chaque tranche, définissez**:
- **De** : Prix minimum (inclus)
- **À** : Prix maximum (inclus)
- **Limite max** : Montant maximum de réclamation pour cette tranche

### Étape 4: Sauvegarder

Cliquez sur **Enregistrer** et votre barème est actif!

---

## 💡 Exemples Pratiques

### Exemple 1: Plan Standard

**Objectif**: Limites progressives selon la valeur

| Valeur Remorque | Limite Réclamation |
|-----------------|-------------------|
| 0 $ - 10,000 $ | 1,500 $ |
| 10,001 $ - 30,000 $ | 3,000 $ |
| 30,001 $ - 70,000 $ | 5,000 $ |
| 70,001 $ et + | 7,500 $ |

**Configuration**:
```
Tranche 1: De 0        À 10000    Limite 1500
Tranche 2: De 10001    À 30000    Limite 3000
Tranche 3: De 30001    À 70000    Limite 5000
Tranche 4: De 70001    À 99999999 Limite 7500
```

### Exemple 2: Plan Premium (10% de la valeur)

| Valeur Remorque | Limite (≈10%) |
|-----------------|---------------|
| 0 $ - 10,000 $ | 1,000 $ |
| 10,001 $ - 30,000 $ | 3,000 $ |
| 30,001 $ - 50,000 $ | 5,000 $ |
| 50,001 $ et + | 10,000 $ |

### Exemple 3: Plan Économique (limite basse)

| Valeur Remorque | Limite |
|-----------------|--------|
| 0 $ - 20,000 $ | 1,000 $ |
| 20,001 $ et + | 2,000 $ |

---

## 🔍 Comment Ça Fonctionne

### À la Création d'une Garantie

1. Le client achète une remorque à **25,000$**
2. Vous créez une garantie avec le **Plan Standard** (voir Exemple 1)
3. Le système trouve automatiquement la tranche: 10,001$ - 30,000$
4. La limite de réclamation est donc: **3,000$**
5. Cette limite apparaît dans le contrat PDF

### Dans le Contrat PDF

Le client verra:
```
Détails de la Garantie:
Plan: Plan Standard
Durée: 60 mois (5 ans)
Franchise: 100 $
Limite de réclamation: 3 000,00 $  ← Calculée automatiquement!
```

---

## 📊 Affichage dans l'Interface

### Liste des Plans

Dans la page "Plans de garantie", vous verrez:

**Plan avec montant fixe**:
```
┌─────────────────────────────────────┐
│ Plan Basique                        │
│ 2,999.99 $ | 60 mois | Max: 5,000$ │
└─────────────────────────────────────┘
```

**Plan avec barème**:
```
┌─────────────────────────────────────────┐
│ Plan Standard                           │
│ 2,999.99 $ | 60 mois | Barème (4 tranches) │
└─────────────────────────────────────────┘
```

---

## ⚙️ Détails Techniques

### Structure des Données

Le barème est stocké dans `max_claim_limits` en format JSON:

```json
{
  "type": "price_range",
  "ranges": [
    {
      "min_price": 0,
      "max_price": 10000,
      "max_claim_amount": 1500
    },
    {
      "min_price": 10001,
      "max_price": 30000,
      "max_claim_amount": 3000
    }
  ]
}
```

### Calcul Automatique

Fonction: `calculateMaxClaimAmount(purchasePrice, maxClaimLimits)`

```typescript
// Exemple
const purchasePrice = 25000;
const maxClaimLimits = {
  type: 'price_range',
  ranges: [
    { min_price: 0, max_price: 10000, max_claim_amount: 1500 },
    { min_price: 10001, max_price: 30000, max_claim_amount: 3000 },
    { min_price: 30001, max_price: 70000, max_claim_amount: 5000 }
  ]
};

const limit = calculateMaxClaimAmount(purchasePrice, maxClaimLimits);
// Résultat: 3000 (car 25000 est dans la tranche 10001-30000)
```

---

## ✅ Validations

Le système valide automatiquement:

1. **Prix minimum < Prix maximum**
   - ❌ De 10000 À 5000 (invalide)
   - ✅ De 5000 À 10000 (valide)

2. **Montant de réclamation positif**
   - ❌ Limite -1000 (invalide)
   - ❌ Limite 0 (invalide)
   - ✅ Limite 1500 (valide)

3. **Pas de chevauchement**
   - ❌ Tranche 1: 0-10000, Tranche 2: 5000-15000 (chevauchement)
   - ✅ Tranche 1: 0-10000, Tranche 2: 10001-20000 (pas de chevauchement)

---

## 🎨 Conseils de Configuration

### Bonne Pratique #1: Couvrir Toutes les Valeurs

Assurez-vous que toutes les valeurs possibles sont couvertes:

✅ **BON**:
```
Tranche 1: 0 - 10,000
Tranche 2: 10,001 - 30,000
Tranche 3: 30,001 - 999,999,999
```

❌ **MAUVAIS** (gap entre 30000 et 50000):
```
Tranche 1: 0 - 10,000
Tranche 2: 10,001 - 30,000
Tranche 3: 50,001 - 999,999,999
```

### Bonne Pratique #2: Utiliser une Tranche "Catch-All"

Ajoutez toujours une dernière tranche très large:

```
Tranche finale: De 70,001 À 999,999,999 Limite 10,000
```

Ceci assure qu'aucune remorque ne tombe "hors barème".

### Bonne Pratique #3: Limites Proportionnelles

Gardez les limites proportionnelles à la valeur:

```
Remorque 10,000 $ → Limite 1,500 $ (15%)
Remorque 30,000 $ → Limite 3,000 $ (10%)
Remorque 70,000 $ → Limite 5,000 $ (7%)
```

---

## 🔄 Migration depuis Montant Fixe

Si vous avez des plans existants avec montant fixe, voici comment migrer:

### Avant (Montant Fixe)
```
Plan Standard: Limite fixe de 3,000$ pour tous
```

### Après (Barème)
```
Plan Standard:
  0 - 20,000 $    → 1,500 $
  20,001 - 40,000 $ → 3,000 $
  40,001+ $       → 5,000 $
```

**Comment faire**:
1. Ouvrez le plan en édition
2. Changez "Montant fixe" vers "Barème selon valeur remorque"
3. Ajoutez vos tranches
4. Sauvegardez

Les garanties existantes gardent leur limite actuelle, seules les nouvelles garanties utiliseront le barème.

---

## 📋 FAQ

**Q: Que se passe-t-il si le prix de la remorque ne tombe dans aucune tranche?**
R: La limite sera considérée comme "Illimitée". C'est pourquoi il faut une tranche "catch-all" à la fin!

**Q: Puis-je avoir un mélange de plans avec barème et plans avec montant fixe?**
R: Oui! Chaque plan peut avoir son propre système (fixe ou barème).

**Q: Les garanties existantes sont-elles affectées?**
R: Non, les garanties déjà créées conservent leur limite. Seules les nouvelles garanties utilisent le nouveau barème.

**Q: Combien de tranches puis-je créer?**
R: Autant que vous voulez! Mais généralement 3-5 tranches suffisent.

**Q: Comment supprimer une tranche?**
R: Cliquez sur l'icône 🗑️ (poubelle) à droite de la tranche.

**Q: Les tranches doivent-elles être consécutives?**
R: Non, mais c'est fortement recommandé pour éviter les gaps.

---

## 🚀 Avantages

### Pour l'Entreprise

✅ **Tarification plus juste**: Limite adaptée à la valeur assurée
✅ **Réduction du risque**: Limites proportionnelles
✅ **Flexibilité**: Plusieurs plans possibles
✅ **Compétitivité**: Offres personnalisées par segment

### Pour les Clients

✅ **Transparence**: Limite clairement indiquée dans le contrat
✅ **Équité**: Paye proportionnellement à la valeur
✅ **Choix**: Plusieurs niveaux de couverture disponibles

---

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers
- ✅ `src/lib/price-range-utils.ts` - Utilitaires de calcul et validation du barème
- ✅ `GUIDE_BAREME_LIMITES_RECLAMATION.md` - Ce guide complet

### Fichiers Modifiés
- ✅ `src/components/settings/WarrantyPlansManagement.tsx` - Interface de gestion du barème
- ✅ `src/components/NewWarranty.tsx` - Calcul automatique de la limite selon le barème
- ✅ `src/lib/pdf-generator.ts` - Affichage de la limite calculée dans les PDFs
- ✅ `src/lib/pdf-generator-optimized.ts` - Affichage de la limite dans les PDFs optimisés
- ✅ `src/lib/pdf-generator-professional.ts` - Affichage de la limite dans les PDFs professionnels

---

## ✅ Implémentation Complète

Le système de barème est maintenant **100% fonctionnel** et intégré dans toute l'application:

1. **Configuration**: Les administrateurs peuvent créer des barèmes dans Réglages → Plans de garantie
2. **Création de garantie**: La limite est calculée automatiquement selon le prix de la remorque
3. **Stockage**: La limite calculée est sauvegardée dans `warranties.annual_claim_limit`
4. **Affichage PDF**: Tous les PDFs (standard, optimisé, professionnel) affichent la bonne limite
5. **Validation**: Le système valide les tranches (pas de chevauchement, valeurs positives, etc.)

---

**Date de création**: 3 novembre 2025
**Dernière mise à jour**: 4 novembre 2025
**Version**: 1.1.0
**Status**: ✅ Prêt à utiliser - Implémentation complète
