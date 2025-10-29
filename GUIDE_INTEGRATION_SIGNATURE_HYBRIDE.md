# Guide d'Intégration - Système de Signature Hybride

**Date**: 14 Octobre 2025
**Version**: 1.0
**Statut**: ✅ Prêt pour intégration

---

## Vue d'ensemble

Le système de signature hybride permet aux clients de choisir entre **deux méthodes de signature**:
1. **Signature en ligne** (numérique) - Rapide, à distance
2. **Signature en personne** (physique) - En concession, avec témoin

---

## Composants créés

### 1. Base de données

**Fichier**: `supabase/migrations/20251014000000_create_hybrid_signature_system.sql`

**Contenu**:
- ✅ 16 nouvelles colonnes dans `warranties`
- ✅ Table `signature_methods` - Historique des choix
- ✅ Table `physical_signature_tracking` - Suivi signatures physiques
- ✅ Table `scanned_documents` - Documents scannés
- ✅ Table `signature_witnesses` - Témoins
- ✅ Table `identity_verifications` - Vérifications d'identité
- ✅ Fonctions helper et triggers
- ✅ Vues pour analytics

**À faire**: Appliquer la migration sur Supabase.

### 2. Composants React

#### A. SignatureMethodSelector
**Fichier**: `src/components/SignatureMethodSelector.tsx`

**Fonction**: Interface de sélection de la méthode de signature

**Props**:
```typescript
{
  onSelect: (method: 'online' | 'in_person') => void;
  onCancel: () => void;
  language?: 'fr' | 'en';
  recommendedMethod?: 'online' | 'in_person';
}
```

**Features**:
- Deux cartes interactives avec avantages
- Comparateur détaillé des méthodes
- Recommandation intelligente
- Bilingue (FR/EN)

#### B. InPersonSignatureFlow
**Fichier**: `src/components/InPersonSignatureFlow.tsx`

**Fonction**: Processus complet de signature physique en 7 étapes

**Props**:
```typescript
{
  warrantyId?: string;
  organizationId: string;
  documentContent: string;
  onComplete: (data: PhysicalSignatureData) => void;
  onCancel: () => void;
  language?: 'fr' | 'en';
}
```

**Étapes du flux**:
1. Instructions et préparation
2. Génération et impression du document
3. Capture de la pièce d'identité
4. Vérification de l'identité
5. Signature du client sur tablette
6. Signature du témoin
7. Scan du document (optionnel)
8. Révision finale

**Features**:
- Interface optimisée tablette
- Capture de photos (ID + client)
- Signatures numériques sur pad
- Upload vers Supabase Storage
- Géolocalisation automatique
- QR codes pour tracking

### 3. Utilitaires

**Fichier**: `src/lib/hybrid-signature-utils.ts`

**Fonctions principales**:
```typescript
// Génération
generatePhysicalDocumentNumber(): string
generateDocumentQRCode(docNumber, warrantyId): Promise<string>
generatePrintablePDF(content, docNumber, warrantyId): Promise<Blob>

// Sauvegarde
saveSignatureMethodSelection(warrantyId, orgId, method): Promise<void>
createPhysicalSignatureTracking(warrantyId, orgId, docNumber): Promise<string>
updatePhysicalSignatureStatus(trackingId, status): Promise<void>
saveIdentityVerification(warrantyId, orgId, data): Promise<string>
saveWitnessSignature(warrantyId, orgId, data): Promise<string>
saveScannedDocument(warrantyId, orgId, trackingId, data): Promise<string>

// Analytics
getSignatureMethodStats(orgId, startDate?, endDate?): Promise<Stats>
getPendingPhysicalSignatures(orgId): Promise<any[]>

// Validation
validateSignatureQuality(signatureDataUrl): {isValid, score, issues}
```

---

## Intégration dans NewWarranty

### Étape 1: Importer les composants

```typescript
// Ajouter en haut du fichier NewWarranty.tsx
import { SignatureMethodSelector, SignatureMethod } from './SignatureMethodSelector';
import { InPersonSignatureFlow } from './InPersonSignatureFlow';
import {
  saveSignatureMethodSelection,
  createPhysicalSignatureTracking,
  saveIdentityVerification,
  saveWitnessSignature,
  saveScannedDocument,
  generatePrintablePDF
} from '../lib/hybrid-signature-utils';
```

### Étape 2: Ajouter les états

```typescript
// Ajouter ces états dans le composant NewWarranty
const [showSignatureMethodSelector, setShowSignatureMethodSelector] = useState(false);
const [selectedSignatureMethod, setSelectedSignatureMethod] = useState<SignatureMethod | null>(null);
const [showInPersonSignatureFlow, setShowInPersonSignatureFlow] = useState(false);
const [showOnlineSignatureFlow, setShowOnlineSignatureFlow] = useState(false);
```

### Étape 3: Modifier la logique de finalisation

**Remplacer la fonction qui ouvre le pad de signature** par:

```typescript
const handleFinalizeClick = async () => {
  // Valider les données...

  // Au lieu d'ouvrir directement le signature pad:
  // setShowSignaturePad(true);

  // Ouvrir le sélecteur de méthode:
  setShowSignatureMethodSelector(true);

  // Sauvegarder les données pour usage ultérieur
  setPendingWarrantyData({
    customer,
    trailer,
    selectedPlan,
    selectedOptions,
    // ... autres données
  });
};
```

### Étape 4: Gérer la sélection de méthode

```typescript
const handleSignatureMethodSelected = async (method: SignatureMethod) => {
  setSelectedSignatureMethod(method);
  setShowSignatureMethodSelector(false);

  // Sauvegarder le choix dans la BD
  try {
    await saveSignatureMethodSelection(
      null, // warrantyId sera null pour nouvelle garantie
      currentOrganization!.id,
      method,
      profile?.id
    );
  } catch (error) {
    console.error('Error saving signature method:', error);
  }

  // Ouvrir le flux approprié
  if (method === 'online') {
    setShowOnlineSignatureFlow(true);
  } else {
    setShowInPersonSignatureFlow(true);
  }
};
```

### Étape 5: Gérer les données de signature

**Pour signature en ligne** (existant, juste adapter):
```typescript
const handleOnlineSignatureComplete = async (signatureData: any) => {
  // Logique existante de LegalSignatureFlow
  // + Ajouter signature_method: 'online'

  await createWarrantyWithSignature({
    ...pendingWarrantyData,
    signature_method: 'online',
    signature_method_selected_at: new Date().toISOString(),
    signature_location_type: 'remote',
    // ... autres données de signature en ligne
  });
};
```

**Pour signature en personne** (nouveau):
```typescript
const handleInPersonSignatureComplete = async (physicalSignatureData: any) => {
  try {
    setLoading(true);

    // 1. Créer la garantie
    const warranty = await createWarrantyRecord({
      ...pendingWarrantyData,
      signature_method: 'in_person',
      signature_method_selected_at: new Date().toISOString(),
      signature_location_type: physicalSignatureData.signatureLocationType,
      physical_document_number: physicalSignatureData.physicalDocumentNumber,
      signer_full_name: physicalSignatureData.signerFullName,
      signer_email: physicalSignatureData.signerEmail,
      signer_phone: physicalSignatureData.signerPhone,
      signature_data_url: physicalSignatureData.clientSignatureDataUrl,
      witness_name: physicalSignatureData.witnessName,
      witness_signature_data_url: physicalSignatureData.witnessSignatureDataUrl,
      identity_document_photo_url: physicalSignatureData.identityDocumentPhotoUrl,
      client_photo_url: physicalSignatureData.clientPhotoUrl,
      scanned_document_url: physicalSignatureData.scannedDocumentUrl,
      geolocation: physicalSignatureData.geolocation,
      verification_notes: physicalSignatureData.verificationNotes,
      verification_status: 'verified'
    });

    // 2. Créer le tracking de signature physique
    await createPhysicalSignatureTracking(
      warranty.id,
      currentOrganization!.id,
      physicalSignatureData.physicalDocumentNumber,
      profile?.id
    );

    // 3. Sauvegarder la vérification d'identité
    await saveIdentityVerification(warranty.id, currentOrganization!.id, {
      clientName: physicalSignatureData.signerFullName,
      clientEmail: physicalSignatureData.signerEmail,
      clientPhone: physicalSignatureData.signerPhone,
      documentPhotoFrontUrl: physicalSignatureData.identityDocumentPhotoUrl,
      clientPhotoUrl: physicalSignatureData.clientPhotoUrl,
      verifiedBy: profile?.id
    });

    // 4. Sauvegarder le témoin
    await saveWitnessSignature(warranty.id, currentOrganization!.id, {
      witnessName: physicalSignatureData.witnessName,
      witnessSignatureDataUrl: physicalSignatureData.witnessSignatureDataUrl,
      location: physicalSignatureData.signatureLocationType,
      geolocation: physicalSignatureData.geolocation
    });

    // 5. Sauvegarder le document scanné si présent
    if (physicalSignatureData.scannedDocumentUrl) {
      // Code pour sauvegarder...
    }

    // 6. Générer les documents PDF
    await generateAndStoreDocuments(warranty);

    // 7. Envoyer l'email avec les documents
    // ...

    // 8. Afficher succès
    alert('Signature en personne complétée avec succès!');

    // 9. Rediriger
    navigate('/warranties');

  } catch (error) {
    console.error('Error completing in-person signature:', error);
    alert('Erreur lors de la finalisation');
  } finally {
    setLoading(false);
  }
};
```

### Étape 6: Ajouter les composants dans le JSX

**À la fin du return(), avant la fermeture des fragments**:

```tsx
{/* Sélecteur de méthode de signature */}
{showSignatureMethodSelector && (
  <SignatureMethodSelector
    onSelect={handleSignatureMethodSelected}
    onCancel={() => {
      setShowSignatureMethodSelector(false);
      setPendingWarrantyData(null);
    }}
    language={customer.languagePreference}
    recommendedMethod="online" // Ou logique pour déterminer
  />
)}

{/* Flux de signature en ligne */}
{showOnlineSignatureFlow && pendingWarrantyData && (
  <LegalSignatureFlow
    warrantyId={undefined}
    organizationId={currentOrganization!.id}
    documentContent={generateDocumentContent(pendingWarrantyData)}
    onComplete={handleOnlineSignatureComplete}
    onCancel={() => {
      setShowOnlineSignatureFlow(false);
      setShowSignatureMethodSelector(true);
    }}
    language={customer.languagePreference}
  />
)}

{/* Flux de signature en personne */}
{showInPersonSignatureFlow && pendingWarrantyData && (
  <InPersonSignatureFlow
    warrantyId={undefined}
    organizationId={currentOrganization!.id}
    documentContent={generateDocumentContent(pendingWarrantyData)}
    onComplete={handleInPersonSignatureComplete}
    onCancel={() => {
      setShowInPersonSignatureFlow(false);
      setShowSignatureMethodSelector(true);
    }}
    language={customer.languagePreference}
  />
)}
```

---

## Configuration Supabase Storage

### Créer le bucket pour les documents

```sql
-- Dans Supabase Dashboard > Storage
-- Créer un bucket nommé: warranty-documents
-- Configuration:
-- - Public: false
-- - File size limit: 10MB
-- - Allowed MIME types: image/*, application/pdf
```

### Policies RLS pour Storage

```sql
-- Politique de lecture
CREATE POLICY "Users can read their organization's documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'warranty-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Politique d'écriture
CREATE POLICY "Users can upload to their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'warranty-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);
```

---

## Amélioration du Dashboard d'Audit

### Ajouter les filtres par méthode

**Dans `SignatureAuditDashboard.tsx`**, ajouter:

```tsx
const [methodFilter, setMethodFilter] = useState<'all' | 'online' | 'in_person'>('all');

// Dans la requête Supabase
let query = supabase
  .from('warranties')
  .select('*')
  .eq('organization_id', currentOrganization.id);

if (methodFilter !== 'all') {
  query = query.eq('signature_method', methodFilter);
}

// Dans le JSX, ajouter les boutons de filtre
<div className="flex gap-2">
  <button
    onClick={() => setMethodFilter('all')}
    className={methodFilter === 'all' ? 'active' : ''}
  >
    Toutes
  </button>
  <button
    onClick={() => setMethodFilter('online')}
    className={methodFilter === 'online' ? 'active' : ''}
  >
    En ligne
  </button>
  <button
    onClick={() => setMethodFilter('in_person')}
    className={methodFilter === 'in_person' ? 'active' : ''}
  >
    En personne
  </button>
</div>
```

### Ajouter les statistiques

```tsx
// Composant pour afficher les stats
function SignatureMethodStats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const data = await getSignatureMethodStats(currentOrganization.id);
      setStats(data);
    }
    loadStats();
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm text-slate-600">Total</p>
        <p className="text-2xl font-bold">{stats.total}</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-600">En ligne</p>
        <p className="text-2xl font-bold text-blue-900">
          {stats.online} ({stats.onlinePercentage.toFixed(1)}%)
        </p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-green-600">En personne</p>
        <p className="text-2xl font-bold text-green-900">
          {stats.inPerson} ({stats.inPersonPercentage.toFixed(1)}%)
        </p>
      </div>
    </div>
  );
}
```

---

## Tests à effectuer

### 1. Test du sélecteur de méthode
- [ ] Les deux cartes s'affichent correctement
- [ ] La sélection fonctionne visuellement
- [ ] Le bouton "Continuer" est activé après sélection
- [ ] Le bouton "Comparer" affiche le tableau
- [ ] Les textes en FR et EN sont corrects

### 2. Test signature en ligne
- [ ] Le flux existant LegalSignatureFlow fonctionne toujours
- [ ] Les nouvelles colonnes sont remplies correctement
- [ ] Le type de signature est bien "online"

### 3. Test signature en personne
- [ ] Toutes les 7 étapes fonctionnent
- [ ] La génération de document PDF fonctionne
- [ ] L'impression fonctionne
- [ ] La capture de photos fonctionne
- [ ] Les signatures sur pad fonctionnent
- [ ] L'upload vers Supabase Storage fonctionne
- [ ] La géolocalisation est capturée
- [ ] Toutes les données sont sauvegardées

### 4. Test du dashboard
- [ ] Les filtres par méthode fonctionnent
- [ ] Les statistiques s'affichent
- [ ] Les signatures des deux types sont visibles

---

## Prochaines améliorations (Phase 2)

1. **OCR automatique** des documents scannés
2. **Comparaison automatique** document original vs scanné
3. **Notifications push** pour signatures en attente
4. **Mode hors ligne** pour tablettes en concession
5. **Dashboard dédié** pour signatures physiques en attente
6. **Export PDF** des certificats de signature différenciés
7. **Intégration email** avec templates différents par méthode
8. **Analytics avancés** avec graphiques de tendance

---

## Support et Dépannage

### Problème: Les photos ne s'uploadent pas

**Solution**:
1. Vérifier que le bucket `warranty-documents` existe
2. Vérifier les policies RLS du Storage
3. Vérifier la taille des fichiers (< 10MB)

### Problème: La géolocalisation ne fonctionne pas

**Solution**:
1. Vérifier que le site est en HTTPS
2. L'utilisateur doit autoriser la géolocalisation
3. Sur mobile, vérifier les permissions de l'app

### Problème: Le QR code ne se génère pas

**Solution**:
1. Vérifier que la librairie `qrcode` est installée
2. Vérifier que les URLs sont correctes
3. Vérifier la console pour les erreurs

---

## Conclusion

Le système de signature hybride est maintenant **prêt à être intégré**.

**Fichiers créés**:
- ✅ Migration Supabase complète
- ✅ SignatureMethodSelector component
- ✅ InPersonSignatureFlow component
- ✅ hybrid-signature-utils library
- ✅ Ce guide d'intégration

**Prochaines étapes**:
1. Appliquer la migration Supabase
2. Intégrer dans NewWarranty selon les instructions ci-dessus
3. Configurer Supabase Storage
4. Tester les deux flux
5. Déployer en production

**Temps d'intégration estimé**: 2-3 heures pour un développeur

---

**Fait avec ❤️ pour Location Pro Remorque**
