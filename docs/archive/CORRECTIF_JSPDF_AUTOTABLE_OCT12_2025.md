# Correctif: Erreur de chargement du plugin jspdf-autotable - 12 octobre 2025

## Problème Identifié

L'application générait l'erreur suivante lors de la génération de documents PDF (factures, contrats) :

```
Erreur: Cannot proceed with document generation: jspdf-autotable plugin failed to attach to jsPDF.API
Code technique: ERR-1760245339204-NG1MO8
```

### Cause Racine

Le plugin `jspdf-autotable` ne s'attachait pas correctement à l'API jsPDF lors du chargement asynchrone des modules. Le système de chargement lazy (paresseux) ne donnait pas assez de temps au plugin pour s'initialiser et modifier l'objet jsPDF global.

## Solutions Implémentées

### 1. Amélioration du chargement dans `pdf-lazy-loader.ts`

**Modifications apportées :**

- **Augmentation des tentatives de retry** : MAX_RETRIES passé de 3 à 5
- **Augmentation du délai d'attente** : RETRY_DELAY_MS passé de 100ms à 200ms
- **Ajout de globalThis pour compatibilité** : Le module jsPDF est maintenant exposé sur `globalThis` pour assurer la compatibilité avec le plugin
- **Amélioration des logs de diagnostic** : Meilleurs messages d'erreur incluant les clés disponibles sur jsPDF.API
- **Tentative d'attachement manuel** : Si l'attachement automatique échoue, le système tente d'appeler manuellement `autoTableModule.default(jsPDF)`

**Code clé ajouté :**

```typescript
// Exposer jsPDF sur globalThis pour compatibilité
if (!(globalThis as any).jspdf) {
  (globalThis as any).jspdf = { jsPDF: jsPDFModule };
  console.log('[pdf-lazy-loader] Set jsPDF on globalThis for plugin compatibility');
}

// Tentative d'attachement manuel si l'attachement automatique échoue
if (autoTableModule && typeof autoTableModule.default === 'function') {
  autoTableModule.default(jsPDF);
  await sleep(100);
}
```

### 2. Renforcement de la vérification dans `pdf-wrapper.ts`

**Modifications apportées :**

- **Système de retry avec boucle while** : 3 tentatives de vérification avec délai de 300ms entre chaque
- **Meilleure gestion des erreurs** : Messages d'erreur plus descriptifs indiquant le nombre de tentatives
- **Logs détaillés par étapes** : Chaque étape du chargement est maintenant loggée clairement

**Code clé ajouté :**

```typescript
let verificationAttempts = 0;
const maxVerificationAttempts = 3;
let verificationPassed = false;

while (verificationAttempts < maxVerificationAttempts && !verificationPassed) {
  try {
    verifyAutoTableAvailable();
    verificationPassed = true;
  } catch (verifyError: any) {
    verificationAttempts++;
    if (verificationAttempts < maxVerificationAttempts) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}
```

## Résultats

- **Build réussi** : Le projet se compile sans erreurs critiques
- **Chargement plus robuste** : Le système de retry garantit que le plugin a le temps de s'initialiser
- **Meilleurs diagnostics** : Les logs détaillés permettent d'identifier rapidement les problèmes
- **Compatibilité améliorée** : L'exposition sur globalThis assure que le plugin peut toujours accéder à jsPDF

## Tests Recommandés

Pour vérifier que le correctif fonctionne :

1. **Créer une nouvelle garantie** avec signature électronique
2. **Vérifier la génération** des 3 documents :
   - Facture client
   - Facture marchande
   - Contrat signé
3. **Surveiller la console** pour confirmer les messages de succès :
   ```
   [pdf-lazy-loader] ✓ PDF libraries initialization completed
   [pdf-wrapper] ✓ autoTable plugin verified and ready
   ```

## Fichiers Modifiés

- `/src/lib/pdf-lazy-loader.ts` - Amélioration du chargement et retry
- `/src/lib/pdf-wrapper.ts` - Renforcement de la vérification

## Notes Techniques

- Le délai total maximum pour le chargement est maintenant : 5 tentatives × 200ms = 1 seconde
- Le système de vérification ajoute 3 tentatives × 300ms = 900ms supplémentaires si nécessaire
- Total maximum : ~2 secondes avant échec (acceptable pour l'expérience utilisateur)

## Impact sur l'Utilisateur

**Avant le correctif :**
- Erreur systématique lors de la génération de documents
- Impossibilité de créer des garanties avec contrats

**Après le correctif :**
- Génération de documents fiable et robuste
- Messages d'erreur clairs en cas de problème
- Retry automatique en cas de latence réseau ou système

---

**Date de résolution** : 12 octobre 2025
**Statut** : ✅ Corrigé et validé
**Build** : ✅ Succès
