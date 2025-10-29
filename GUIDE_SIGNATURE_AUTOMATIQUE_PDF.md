# Guide: Signature Automatique sur les Documents PDF

## Vue d'ensemble

Le système utilise maintenant automatiquement la signature de l'employé connecté lors de la génération des documents PDF de garantie. La signature de l'employé remplace ou complète la signature de l'entreprise sur le contrat.

## 🎯 Comment ça fonctionne

### 1. Création de votre signature

Avant de créer des garanties, vous devez créer votre signature:

1. Allez dans **Paramètres > Signatures**
2. Choisissez un mode:
   - **Généré**: Tapez votre nom + sélectionnez un style
   - **Dessiné**: Dessinez votre signature à la main
3. Cliquez sur **Aperçu** (pour mode généré)
4. Cliquez sur **Enregistrer**

Votre première signature sera automatiquement activée.

### 2. Création d'une garantie avec signature automatique

Quand vous créez une nouvelle garantie:

1. Remplissez le formulaire de garantie normalement
2. Le système récupère **automatiquement** votre signature active
3. Le PDF généré inclut votre signature dans la section "LE VENDEUR"
4. Votre nom complet apparaît sous la signature

**Aucune action supplémentaire requise!** C'est complètement automatique.

## 📋 Priorité des signatures

Le système utilise cette logique pour déterminer quelle signature utiliser:

```
1. Signature active de l'employé (si disponible) ✓ PRIORITÉ
2. Signature de l'entreprise (vendorSignatureUrl) ✓ FALLBACK
3. Pas de signature image (nom seulement) ✓ PAR DÉFAUT
```

### Exemple de logique

```typescript
// L'employé Maxime Giguere a une signature active
Document PDF généré:
└── Section VENDEUR
    ├── Image: Signature de Maxime Giguere
    ├── Nom: Maxime Giguere
    └── Date: 2025-10-15

// L'employé n'a pas de signature, mais l'entreprise en a une
Document PDF généré:
└── Section VENDEUR
    ├── Image: Signature de Pro Remorque
    ├── Nom: Pro Remorque
    └── Date: 2025-10-15

// Ni l'employé ni l'entreprise n'ont de signature
Document PDF généré:
└── Section VENDEUR
    ├── (Pas d'image)
    ├── Nom: Pro Remorque
    └── Date: 2025-10-15
```

## 🔧 Configuration technique

### Fichiers modifiés

1. **`src/lib/signature-generator-utils.ts`**
   - Ajout de `getEmployeeSignatureForPDF(userId)` pour récupération facile

2. **`src/lib/document-utils.ts`**
   - Import de la fonction helper
   - Récupération automatique de la signature lors de la génération
   - Ajout au payload `InvoiceData`

3. **`src/lib/pdf-generator-professional.ts`**
   - Modification de la logique de signature dans `addSignatureSection()`
   - Priorité à `employeeSignature` sur `vendorSignatureUrl`
   - Affichage du nom de l'employé sous la signature

4. **`src/lib/pdf-wrapper.ts`**
   - Mise à jour de l'interface `InvoiceData` avec `employeeSignature`

### Structure de données

```typescript
interface InvoiceData {
  warranty: Warranty;
  customer: Customer;
  trailer: Trailer;
  plan: WarrantyPlan;
  companyInfo: {
    name: string;
    // ... autres champs
    vendorSignatureUrl: string | null;
  };
  employeeSignature?: {
    full_name: string;      // Ex: "Maxime Giguere"
    signature_data: string; // Ex: "data:image/png;base64,..."
  } | null;
}
```

## 📊 Logs de diagnostic

Le système log chaque étape pour faciliter le débogage:

```
[generateAndStoreDocuments] Step 1.5/6: Fetching employee signature
[generateAndStoreDocuments] Employee signature loaded: Maxime Giguere
[pdf-professional] Adding employee/vendor signature to contract
[pdf-professional] Using employee signature: Maxime Giguere
[pdf-professional] Signature added successfully
```

Si aucune signature n'est trouvée:
```
[generateAndStoreDocuments] No active employee signature found
[pdf-professional] Using company vendor signature
```

## 🎓 Cas d'utilisation

### Cas 1: Nouvel employé
```
1. Employé se connecte pour la première fois
2. Va dans Paramètres > Signatures
3. Crée sa signature (générée ou dessinée)
4. Commence à créer des garanties
5. Sa signature apparaît automatiquement sur tous les documents
```

### Cas 2: Changement de signature
```
1. Employé crée une nouvelle signature
2. Active la nouvelle signature (clic sur ✓)
3. L'ancienne signature est automatiquement désactivée
4. Les nouvelles garanties utilisent la nouvelle signature
5. Les anciennes garanties gardent l'ancienne signature (immuable)
```

### Cas 3: Multiples employés
```
Employé A:
├── Crée garantie #001 → Signature de l'employé A
├── Crée garantie #002 → Signature de l'employé A

Employé B:
├── Crée garantie #003 → Signature de l'employé B
├── Crée garantie #004 → Signature de l'employé B

Résultat: Chaque garantie a la signature de son créateur
```

### Cas 4: Employé sans signature
```
1. Employé sans signature active
2. Crée une garantie
3. Le système utilise la signature de l'entreprise (fallback)
4. Document généré avec signature de l'entreprise
```

## 🔐 Sécurité et traçabilité

### Traçabilité
- Chaque garantie stocke `created_by` (ID de l'employé)
- Le système récupère la signature active au moment de la création
- La signature est intégrée dans le PDF (immuable)

### Sécurité
- Seule la signature **active** est utilisée
- RLS Supabase protège l'accès aux signatures
- Validation des images base64 avant insertion dans PDF

### Audit
- Chaque signature a un statut d'approbation
- Les admins peuvent approuver les signatures
- Logs complets dans la console pour débogage

## ⚠️ Points importants

1. **Créez votre signature avant de créer des garanties**
   - Sans signature, le fallback (entreprise) sera utilisé

2. **Une seule signature active par employé**
   - L'activation d'une nouvelle signature désactive l'ancienne automatiquement

3. **Les signatures sont immuables dans les PDFs**
   - Une fois le PDF généré, la signature est "gravée" dedans
   - Changer votre signature n'affecte pas les anciens documents

4. **Format requis: Image base64**
   - Le système génère automatiquement le format correct
   - Pas besoin de se soucier du format technique

## 🚀 Prochaines étapes recommandées

1. **Formation des employés**
   - Former tous les employés à créer leur signature
   - Expliquer l'importance de la signature professionnelle

2. **Politique de signature**
   - Définir si les signatures doivent être approuvées
   - Établir des standards (styles acceptés, etc.)

3. **Monitoring**
   - Vérifier que tous les employés ont une signature active
   - Surveiller les logs pour détecter les problèmes

4. **Améliorations futures**
   - Ajout de la signature sur la facture (invoice)
   - Signature sur d'autres types de documents
   - Rapports de signatures par employé

## 📞 Support

En cas de problème:
1. Vérifier les logs de console (F12 > Console)
2. Vérifier que la signature est bien active (Paramètres > Signatures)
3. Recharger la page et réessayer
4. Contacter le support technique si le problème persiste

---

**Version**: 1.0.0
**Date**: Octobre 2025
**Dernière mise à jour**: Intégration signature automatique dans PDFs
