# 🔧 FIX: Erreur "Données de signature invalides" - Signature Papier

## 🚨 PROBLÈME IDENTIFIÉ

Quand l'utilisateur clique sur le bouton pour créer une garantie avec **signature en personne (format papier)**, l'erreur suivante se produit:

```
Erreur: Données de signature invalides. Veuillez réessayer.
```

## 🔍 CAUSE ROOT

Le code vérifie si `signatureData.signatureDataUrl` existe (ligne 646 de NewWarranty.tsx):

```typescript
if (!signatureData.signatureDataUrl) {
  alert('Erreur: Données de signature invalides. Veuillez réessayer.');
  setLoading(false);
  return;
}
```

**MAIS** dans le flux `InPersonSignatureFlow`, la signature du client n'est capturée qu'à l'étape **"client_signature"** et elle est stockée dans `clientSignatureDataUrl`.

## 🎯 SOLUTION

Le problème est dans `handleInPersonSignatureComplete` (ligne 577 de NewWarranty.tsx):

```typescript
const signatureData = {
  signerFullName: physicalSignatureData.signerFullName,
  signerEmail: physicalSignatureData.signerEmail,
  signerPhone: physicalSignatureData.signerPhone,
  signatureDataUrl: physicalSignatureData.clientSignatureDataUrl,  // ✅ CORRECT
  // ...
};
```

Le mapping est correct! Donc le problème vient d'**AVANT**.

## 🔎 ANALYSE APPROFONDIE

Vérifions où `handleInPersonSignatureComplete` est appelé avec `physicalSignatureData`:

1. L'utilisateur clique sur "Signature En Personne"
2. `SignatureMethodSelector` appelle `onSelect('in_person')`
3. `handleSignatureMethodSelected` est appelé avec `method = 'in_person'`
4. Ligne 559: `setShowInPersonSignatureFlow(true)` ouvre le modal
5. L'utilisateur complète toutes les étapes
6. `InPersonSignatureFlow` appelle `onComplete(data)`
7. `handleInPersonSignatureComplete` reçoit les données

**LE PROBLÈME**: Entre l'étape 4 et 6, il y a plusieurs étapes où l'utilisateur peut ne pas compléter correctement la signature.

## 🛠️ CORRECTIF REQUIS

Vérifier dans `InPersonSignatureFlow.tsx` ligne 557:

```typescript
if (!clientSignatureDataUrl || !witnessSignatureDataUrl || !identityPhotoFile || !clientPhotoFile) {
  alert(language === 'fr'
    ? 'Veuillez compléter toutes les étapes requises'
    : 'Please complete all required steps');
  return;
}
```

Cette vérification devrait empêcher de continuer si `clientSignatureDataUrl` est vide.

**MAIS** l'erreur "Données de signature invalides" vient de `NewWarranty.tsx`, pas de `InPersonSignatureFlow`.

## 🎭 HYPOTHÈSE

L'utilisateur peut-être:
1. Passe directement à l'étape finale **SANS** signer sur le pad
2. OU le pad de signature ne sauvegarde pas correctement les données
3. OU il y a un problème de réinitialisation de `clientSignatureDataUrl`

## ✅ ACTION REQUISE

1. Ajouter des logs détaillés dans `InPersonSignatureFlow`
2. Vérifier que `clientSignatureDataUrl` est bien défini avant `handleComplete`
3. Ajouter une validation plus stricte
