# Correctif: Erreur "invalid input syntax for type date"

## Problème résolu

**Erreur:** `Erreur lors de la création de la remorque: invalid input syntax for type date: ""`

**Cause racine:** Le champ `manufacturerWarrantyEndDate` était initialisé avec une chaîne vide `""` au lieu d'une date valide, ce qui causait une erreur PostgreSQL lors de l'insertion.

## Changements appliqués

### 1. NewWarranty.tsx
- ✅ Initialisation du champ avec une date par défaut (1 an à partir d'aujourd'hui)
- ✅ Validation côté client pour empêcher la soumission sans date
- ✅ Indication visuelle que le champ est obligatoire (astérisque rouge)
- ✅ Message d'erreur si le champ est vide
- ✅ Validation de la date minimale (ne peut pas être avant la date d'achat)
- ✅ Correction du reset du formulaire après soumission

### 2. MyProducts.tsx
- ✅ Initialisation du champ avec une date par défaut
- ✅ Gestion des cas où `manufacturer_warranty_end_date` est `null` ou vide

## Comment tester

### Test 1: Nouvelle garantie - Saisie manuelle
1. Connectez-vous à l'application
2. Allez dans "Nouvelle Garantie"
3. Remplissez les informations du client (Étape 1)
4. À l'étape 2 (Remorque):
   - Remplissez tous les champs obligatoires
   - Le champ "Fin garantie fabricant" devrait avoir une date par défaut (1 an après aujourd'hui)
   - Modifiez cette date si nécessaire
   - Vérifiez que vous ne pouvez pas continuer si le champ est vide
5. Continuez jusqu'à la signature et complétez la vente
6. ✅ **Résultat attendu:** La garantie est créée sans erreur

### Test 2: Nouvelle garantie - Import depuis inventaire
1. Allez dans "Nouvelle Garantie"
2. Remplissez les informations du client
3. À l'étape 2, cliquez sur "Choisir depuis mon inventaire"
4. Sélectionnez une remorque
5. Vérifiez que le champ "Fin garantie fabricant" est rempli automatiquement
6. Continuez jusqu'à la fin
7. ✅ **Résultat attendu:** La garantie est créée sans erreur

### Test 3: Nouvelle garantie - Import produit existant
1. Allez dans "Nouvelle Garantie"
2. Remplissez l'email d'un client existant
3. À l'étape 2, cliquez sur "Choisir un produit existant"
4. Sélectionnez un produit
5. Vérifiez que le champ "Fin garantie fabricant" est rempli
6. Continuez jusqu'à la fin
7. ✅ **Résultat attendu:** La garantie est créée sans erreur

### Test 4: Mes Produits - Nouveau produit
1. En tant que client, allez dans "Mes Produits"
2. Cliquez sur "Ajouter un produit"
3. Remplissez le formulaire
4. Le champ "Fin garantie fabricant" devrait avoir une date par défaut
5. Sauvegardez
6. ✅ **Résultat attendu:** Le produit est créé sans erreur

## Validation technique

### Base de données
- Le champ `manufacturer_warranty_end_date` dans la table `trailers` accepte `NULL` ou une date valide
- PostgreSQL refuse les chaînes vides pour le type `date`
- La contrainte `check_warranty_dates` vérifie que `end_date > start_date`

### Valeurs acceptées
- ✅ Date valide au format `YYYY-MM-DD` (ex: `2025-10-11`)
- ✅ `NULL` (le champ peut être nul)
- ❌ Chaîne vide `""` (provoque l'erreur)
- ❌ Chaîne invalide (ex: `"invalid"`)

## Code modifié

### Avant (❌ Incorrect)
```typescript
manufacturerWarrantyEndDate: ''  // Chaîne vide = erreur PostgreSQL
```

### Après (✅ Correct)
```typescript
manufacturerWarrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
// Date par défaut: aujourd'hui + 1 an
```

## Confirmation de correction

- ✅ Build réussi sans erreurs TypeScript
- ✅ Validation côté client ajoutée
- ✅ Valeur par défaut intelligente (1 an après aujourd'hui)
- ✅ Gestion des cas edge (produits existants, inventaire)
- ✅ Message d'erreur clair pour l'utilisateur
- ✅ Champ marqué comme obligatoire visuellement

## Notes importantes

1. **Date par défaut intelligente**: Le système propose automatiquement 1 an à partir d'aujourd'hui, ce qui est une durée typique pour une garantie fabricant
2. **Validation stricte**: L'utilisateur ne peut plus créer une garantie sans spécifier cette date
3. **Rétrocompatibilité**: Les produits existants avec `manufacturer_warranty_end_date` vide recevront automatiquement la date par défaut lors de l'édition
4. **Cohérence**: Tous les formulaires (NewWarranty, MyProducts) utilisent la même logique

## Prochaines étapes recommandées

1. **Migration de données** (optionnel): Mettre à jour les enregistrements existants avec `manufacturer_warranty_end_date` vide:
```sql
UPDATE trailers
SET manufacturer_warranty_end_date = purchase_date + INTERVAL '1 year'
WHERE manufacturer_warranty_end_date IS NULL;
```

2. **Contrainte NOT NULL** (optionnel): Si vous souhaitez rendre ce champ obligatoire au niveau de la base de données:
```sql
ALTER TABLE trailers
ALTER COLUMN manufacturer_warranty_end_date SET NOT NULL;
```

## Support

Si vous rencontrez toujours l'erreur après ce correctif:
1. Vérifiez la console du navigateur pour des erreurs JavaScript
2. Vérifiez que le champ a bien une valeur avant la soumission
3. Vérifiez les logs Supabase pour des détails supplémentaires
4. Contactez le support technique avec les détails de l'erreur
