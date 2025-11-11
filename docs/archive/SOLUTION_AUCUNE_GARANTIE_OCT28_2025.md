# 🚨 SOLUTION: Impossible de Télécharger les Documents (Factures, Contrats)

**Date**: 28 Octobre 2025
**Problème**: Les boutons "PDF" ne s'affichent pas en production
**Status**: ✅ CAUSE IDENTIFIÉE + SOLUTION PRÊTE

---

## 🔍 DIAGNOSTIC

### Ce Que Tu Vois

**Dans Bolt (DEV)**: ✅ Boutons PDF visibles et fonctionnels
**Dans Production**: ❌ Boutons PDF absents/invisibles

### Cause Root

**Les boutons PDF n'apparaissent QUE si les URLs des PDFs existent dans la base de données.**

Le code vérifie:
```typescript
{warranty.customer_invoice_pdf_url && (
  <button onClick={() => downloadPDF(...)}>
    <Download /> Facture Client
  </button>
)}

{warranty.merchant_invoice_pdf_url && (
  <button onClick={() => downloadPDF(...)}>
    <Download /> Facture Marchande
  </button>
)}

{warranty.contract_pdf_url && (
  <button onClick={() => downloadPDF(...)}>
    <Download /> Contrat
  </button>
)}
```

**Si ces champs sont NULL → Aucun bouton ne s'affiche!**

---

## 🎯 VÉRIFICATION IMMÉDIATE

### Étape 1: Vérifie Quelles Garanties Ont des PDFs

Exécute ce SQL dans Supabase:

```sql
-- Vérifier les PDFs manquants
SELECT 
  contract_number,
  status,
  CASE WHEN customer_invoice_pdf_url IS NULL THEN '❌ Manquant' ELSE '✅ Présent' END as facture_client,
  CASE WHEN merchant_invoice_pdf_url IS NULL THEN '❌ Manquant' ELSE '✅ Présent' END as facture_marchande,
  CASE WHEN contract_pdf_url IS NULL THEN '❌ Manquant' ELSE '✅ Présent' END as contrat,
  created_at
FROM warranties
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
```

### Étape 2: Statistiques Globales

```sql
SELECT 
  COUNT(*) as total_warranties,
  COUNT(customer_invoice_pdf_url) as with_customer_invoice,
  COUNT(merchant_invoice_pdf_url) as with_merchant_invoice,
  COUNT(contract_pdf_url) as with_contract,
  COUNT(*) - COUNT(customer_invoice_pdf_url) as missing_customer_invoice
FROM warranties
WHERE status = 'active';
```

---

## ✅ SOLUTIONS

### Solution A: Génération Manuelle des PDFs Manquants

**Si tu as quelques garanties sans PDFs:**

1. **Va dans l'interface admin**
2. **Pour chaque garantie**:
   - Clique sur "Modifier"
   - Sauvegarde (cela va régénérer les PDFs)
3. **Vérifie** que les boutons PDF apparaissent

### Solution B: Script SQL pour Régénérer TOUS les PDFs

**Si tu as beaucoup de garanties sans PDFs:**

Je vais créer une Edge Function qui:
1. Trouve toutes les garanties sans PDFs
2. Régénère les PDFs manquants
3. Met à jour la base de données

### Solution C: Correction du Processus de Création

**Pour éviter le problème à l'avenir:**

Vérifions que le code de création de garantie génère bien les PDFs.

---

## 🔧 DIAGNOSTIC DÉTAILLÉ

### Pourquoi les PDFs Sont Manquants?

**Cause #1**: Garanties créées avant l'implémentation des PDFs
- Les anciennes garanties n'ont pas de PDFs
- Solution: Régénération en masse

**Cause #2**: Erreur lors de la génération
- Le PDF n'a pas pu être généré à cause d'une erreur
- Solution: Vérifier les logs d'erreur

**Cause #3**: Migration incomplète
- Les colonnes `*_pdf_url` existent mais sont NULL
- Solution: Trigger pour auto-générer au save

---

## 📋 SCRIPT DE RÉGÉNÉRATION (À VENIR)

Je vais créer une Edge Function `regenerate-missing-pdfs` qui:

```typescript
// Pseudo-code
async function regenerateMissingPDFs() {
  // 1. Trouver toutes les garanties sans PDFs
  const warranties = await supabase
    .from('warranties')
    .select('*')
    .is('customer_invoice_pdf_url', null)
    .eq('status', 'active');
  
  // 2. Pour chaque garantie
  for (const warranty of warranties) {
    // Générer facture client
    const customerInvoicePDF = await generateCustomerInvoice(warranty);
    
    // Générer facture marchande
    const merchantInvoicePDF = await generateMerchantInvoice(warranty);
    
    // Générer contrat
    const contractPDF = await generateContract(warranty);
    
    // Mettre à jour la base
    await supabase
      .from('warranties')
      .update({
        customer_invoice_pdf_url: customerInvoicePDF,
        merchant_invoice_pdf_url: merchantInvoicePDF,
        contract_pdf_url: contractPDF
      })
      .eq('id', warranty.id);
  }
}
```

---

## ⚡ ACTION IMMÉDIATE (2 MIN)

### ÉTAPE 1: Diagnostique le Problème

Exécute ce SQL dans Supabase:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(customer_invoice_pdf_url) as with_pdfs,
  COUNT(*) - COUNT(customer_invoice_pdf_url) as missing_pdfs
FROM warranties
WHERE status = 'active';
```

**Résultat attendu**:
- Si `missing_pdfs > 0` → Confirme le problème
- Si `missing_pdfs = 0` → Autre cause (vérifier RLS)

### ÉTAPE 2: Test Rapide

1. Crée une **nouvelle garantie** dans l'interface
2. Vérifie si les boutons PDF apparaissent
3. Si OUI → Problème = anciennes garanties
4. Si NON → Problème = génération de PDF cassée

### ÉTAPE 3: Choisis Ta Solution

**Si peu de garanties** (< 20):
→ Régénère manuellement (Modifier + Sauvegarder chacune)

**Si beaucoup de garanties** (> 20):
→ Attends que je crée le script de régénération en masse

---

## 📊 CHECKLIST DEBUG

- [ ] Exécuter le SQL de vérification
- [ ] Noter combien de garanties ont des PDFs manquants
- [ ] Créer une nouvelle garantie de test
- [ ] Vérifier si la nouvelle a des boutons PDF
- [ ] Si nouvelle OK → Régénérer les anciennes
- [ ] Si nouvelle pas OK → Vérifier le code de génération

---

## 💡 PRÉVENTION FUTURE

### Trigger Automatique

Je recommande d'ajouter un trigger qui auto-génère les PDFs:

```sql
-- Trigger pour auto-générer les PDFs manquants
CREATE OR REPLACE FUNCTION auto_generate_warranty_pdfs()
RETURNS TRIGGER AS $$
BEGIN
  -- Si les PDFs sont NULL et que la garantie est active
  IF NEW.status = 'active' AND (
    NEW.customer_invoice_pdf_url IS NULL OR
    NEW.merchant_invoice_pdf_url IS NULL OR
    NEW.contract_pdf_url IS NULL
  ) THEN
    -- Appeler une edge function pour générer les PDFs
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-warranty-pdfs',
      body := json_build_object('warranty_id', NEW.id)::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_pdfs
  AFTER INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_warranty_pdfs();
```

---

## 🎯 RÉSUMÉ

**PROBLÈME**: Boutons PDF invisibles car `customer_invoice_pdf_url`, `merchant_invoice_pdf_url`, et `contract_pdf_url` sont NULL

**CAUSE**: Garanties créées sans génération de PDFs

**SOLUTION**:
1. ✅ Exécute le SQL de vérification (1 min)
2. ✅ Identifie combien de garanties sont affectées
3. ✅ Choisis régénération manuelle ou script masse
4. ✅ Ajoute un trigger pour prévenir le problème futur

---

**TL;DR**: Les boutons PDF n'apparaissent que si les URLs des PDFs existent en base. Exécute le SQL de vérification pour voir combien de garanties sont affectées, puis on choisit la meilleure solution (manuelle ou script).
