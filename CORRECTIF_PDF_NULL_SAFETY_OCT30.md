# ✅ CORRECTIF: Erreur PDF "Invalid arguments passed to jsPDF.text"

## 🚨 PROBLÈME

**Erreur en console:**
```
[pdf-wrapper] Error in generateInvoicePDF: Error: Invalid arguments passed to jsPDF.text
```

**Impact:**
- Le message "[OptimizedWarrantyPage] ✓ PDFs générés avec succès" apparaît quand même
- Mais les PDFs ne sont PAS réellement créés
- Les colonnes `contract_pdf_url`, `invoice_pdf_url`, `merchant_invoice_pdf_url` restent NULL
- Pas de bouton "PDF" sur la garantie créée

## 🔍 CAUSE ROOT

Dans `pdf-generator-optimized.ts`, plusieurs appels à `doc.text()` utilisaient directement les propriétés du customer/trailer sans vérifier si elles sont NULL ou undefined:

```typescript
// ❌ PROBLÈME
doc.text(customer.address, 25, yPos);  // Si address est NULL → ERREUR
doc.text(`${customer.city}, ${customer.province} ${customer.postal_code}`, 25, yPos);
```

**Pourquoi c'est un problème:**

Quand un champ optionnel comme `address`, `city`, `postal_code` est NULL dans la base de données, jsPDF reçoit:
```typescript
doc.text(null, 25, yPos);  // ❌ Invalid arguments
```

Et jsPDF lance une erreur: **"Invalid arguments passed to jsPDF.text"**

## ✅ SOLUTION APPLIQUÉE

**Fichier modifié:** `src/lib/pdf-generator-optimized.ts`

### Changement 1: Section Client du Contrat (lignes 245-257)

```typescript
// AVANT
doc.text(`L'ACHETEUR: ${customer.first_name} ${customer.last_name}`, 25, yPos);
yPos += 5;
doc.text(customer.address, 25, yPos);  // ❌ Peut être NULL
yPos += 5;
doc.text(`${customer.city}, ${customer.province} ${customer.postal_code}`, 25, yPos);
yPos += 5;
doc.text(`Téléphone: ${customer.phone}`, 25, yPos);
yPos += 5;
doc.text(`Courriel: ${customer.email}`, 25, yPos);

// APRÈS
doc.text(`L'ACHETEUR: ${customer.first_name || ''} ${customer.last_name || ''}`, 25, yPos);
yPos += 5;
if (customer.address) {  // ✅ Vérification avant d'utiliser
  doc.text(customer.address, 25, yPos);
  yPos += 5;
}
doc.text(`${customer.city || ''}, ${customer.province || 'QC'} ${customer.postal_code || ''}`, 25, yPos);
yPos += 5;
doc.text(`Téléphone: ${customer.phone || 'N/A'}`, 25, yPos);
yPos += 5;
doc.text(`Courriel: ${customer.email || 'N/A'}`, 25, yPos);
```

### Changement 2: Section Client de la Facture (lignes 613-623)

```typescript
// AVANT
doc.text(`${customer.first_name} ${customer.last_name}`, invoiceCol2X + 5, customerY);
customerY += 5;
doc.text(customer.address, invoiceCol2X + 5, customerY);
customerY += 5;
doc.text(`${customer.city}, ${customer.province} ${customer.postal_code}`, invoiceCol2X + 5, customerY);

// APRÈS
doc.text(`${customer.first_name || ''} ${customer.last_name || ''}`, invoiceCol2X + 5, customerY);
customerY += 5;
if (customer.address) {
  doc.text(customer.address, invoiceCol2X + 5, customerY);
  customerY += 5;
}
doc.text(`${customer.city || ''}, ${customer.province || 'QC'} ${customer.postal_code || ''}`, invoiceCol2X + 5, customerY);
```

### Changement 3: Informations Remorque (3 endroits)

```typescript
// AVANT
doc.text(`${trailer.year} ${trailer.make} ${trailer.model}`, 25, yPos);
doc.text(`Type: ${trailer.trailer_type}`, 25, yPos);
doc.text(`NIV: ${trailer.vin}`, 25, yPos);
doc.text(`Prix d'achat: ${formatCurrency(trailer.purchase_price)} $`, 25, yPos);

// APRÈS
doc.text(`${trailer.year || ''} ${trailer.make || ''} ${trailer.model || ''}`, 25, yPos);
doc.text(`Type: ${trailer.trailer_type || 'N/A'}`, 25, yPos);
doc.text(`NIV: ${trailer.vin || 'N/A'}`, 25, yPos);
doc.text(`Prix d'achat: ${formatCurrency(trailer.purchase_price || 0)} $`, 25, yPos);
```

### Changement 4: Adresse Complète avec Filter (lignes 831-837)

```typescript
// AVANT
doc.text(`Adresse: ${customer.address}, ${customer.city}, ${customer.province} ${customer.postal_code}`, 25, yPos);

// APRÈS
const addressParts = [
  customer.address || '',
  customer.city || '',
  customer.province || 'QC',
  customer.postal_code || ''
].filter(Boolean).join(', ');
doc.text(`Adresse: ${addressParts || 'N/A'}`, 25, yPos);
```

## 🎯 PROTECTION COMPLÈTE

Maintenant toutes les valeurs passées à `doc.text()` sont garanties non-NULL:

1. ✅ **Fallback avec `||`** - Si NULL → valeur par défaut ('N/A', '', 'QC', 0)
2. ✅ **Vérification `if`** - Ne génère la ligne que si la valeur existe
3. ✅ **Filter avec Boolean** - Supprime les valeurs vides avant de joindre
4. ✅ **formatCurrency avec 0** - Toujours un nombre valide

## 🧪 TEST

Pour vérifier que le correctif fonctionne:

1. Créer une garantie avec un client qui a des champs optionnels manquants:
   - Sans adresse
   - Sans ville
   - Sans code postal

2. Vérifier console (F12):
   ```
   [OptimizedWarrantyPage] Génération des PDFs pour warranty: xxx
   [generateAndStoreDocuments] PDF libraries loaded successfully
   [generateAndStoreDocuments] autoTable plugin verified and ready
   [OptimizedWarrantyPage] ✓ PDFs générés avec succès
   ```

3. Vérifier: Le bouton "PDF" doit apparaître ✅

4. Télécharger le PDF et vérifier:
   - Les champs manquants affichent "N/A" ou sont omis
   - Pas de valeurs "null" ou "undefined" visibles
   - Le PDF s'affiche correctement

## 📊 RÉSUMÉ

**Problème:** "Invalid arguments passed to jsPDF.text"  
**Cause:** Valeurs NULL/undefined passées directement à doc.text()  
**Solution:** Null-safety avec `||` et vérifications `if`  
**Fichiers modifiés:** 1 (pdf-generator-optimized.ts)  
**Lignes modifiées:** ~30 lignes dans 4 sections  
**Status:** ✅ Corrigé et compilé

---

**Date:** 30 Octobre 2025  
**Priorité:** 🔴 CRITIQUE (bloquait la génération des PDFs)  
**Build:** ✅ Compilé avec succès

## 🔄 PROCHAINES ÉTAPES

2 autres erreurs à investiguer:

1. **Erreur 400 sur `log_signature_event` RPC**
   - Fonction RPC a un problème de paramètres
   - Ne bloque pas la création, mais logs manquants

2. **Erreur 401/400 sur envoi d'emails**
   - Permissions ou configuration manquante
   - Ne bloque pas la création, mais emails non envoyés

Ces erreurs seront traitées dans des correctifs séparés.
