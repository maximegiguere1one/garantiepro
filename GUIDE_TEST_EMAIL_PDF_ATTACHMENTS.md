# Guide de Test - Envoi Automatique du Contrat PDF par Email

## Ce qui a été corrigé

Le problème était que le client ne recevait pas le fichier PDF du contrat avec la facture par email après la signature.

### Cause du problème

1. Les documents PDF étaient générés **après** la création de la garantie
2. L'email était préparé en utilisant les données initiales de la garantie qui ne contenaient pas encore les URLs des PDFs
3. Le code essayait d'attacher `warrantyData.contract_pdf_url` mais ce champ était `undefined` au moment de la préparation de l'email

### Solution implémentée

1. **Récupération des données mises à jour**: Après la génération des documents, une requête est faite pour récupérer la garantie avec tous les URLs de PDFs
2. **Ajout de deux pièces jointes**: Le contrat signé ET la facture client sont maintenant joints
3. **Validation robuste**: Vérification du format base64, de la taille des fichiers, et gestion des erreurs
4. **Template email amélioré**: Section dédiée pour informer le client des documents joints
5. **Métadonnées enrichies**: Suivi détaillé de ce qui a été attaché pour faciliter le débogage

## Test Manuel - Étape par Étape

### 1. Créer une nouvelle garantie

1. Connectez-vous à l'application
2. Allez dans "Nouvelle Garantie"
3. Remplissez tous les champs requis:
   - Informations client (prénom, nom, email, etc.)
   - Informations remorque (VIN, marque, modèle, etc.)
   - Sélectionnez un plan de garantie
4. Ajoutez des options si nécessaire
5. Procédez à la signature électronique

### 2. Vérifier les logs dans la console

Après la signature, vérifiez les logs suivants dans la console du navigateur:

```
[NewWarranty] Step 5/6: Documents generation result: SUCCESS
[NewWarranty] Fetching updated warranty data with PDF URLs...
[NewWarranty] Updated warranty data fetched successfully: {
  id: "xxx",
  hasContractPdf: true,
  hasCustomerInvoicePdf: true,
  contractPdfLength: XXXXX,
  customerInvoicePdfLength: XXXXX
}
[NewWarranty] Preparing email attachments from warranty data: {
  warrantyId: "xxx",
  contractPdfAvailable: true,
  invoicePdfAvailable: true,
  usingUpdatedData: true
}
[NewWarranty] Adding contract PDF as email attachment (size: XXX KB)
[NewWarranty] Adding customer invoice PDF as email attachment (size: XXX KB)
[NewWarranty] Total attachments prepared: 2
[NewWarranty] Email queued successfully with attachments: {
  queueId: "xxx",
  attachmentsCount: 2,
  hasContract: true,
  hasInvoice: true
}
```

### 3. Vérifier le message de succès

Le message de succès devrait afficher:

```
✓ Email programmé avec contrat et facture
```

Si seulement un document est joint:
```
✓ Email programmé (un document joint)
⚠️ Contrat PDF manquant
```
ou
```
⚠️ Facture PDF manquante
```

Si aucun document n'est joint:
```
✓ Email programmé
⚠️ Aucun document joint - génération PDF a échoué
```

### 4. Vérifier la queue d'emails

1. Ouvrez l'onglet Supabase Dashboard
2. Allez dans Table Editor > email_queue
3. Trouvez l'email le plus récent
4. Vérifiez les champs:
   - `status`: devrait être "queued"
   - `attachments`: devrait contenir un array avec 2 objets
   - `metadata.attachments_count`: devrait être 2
   - `metadata.has_contract_pdf`: devrait être true
   - `metadata.has_invoice_pdf`: devrait être true

### 5. Traiter la queue d'emails

L'email peut être envoyé de deux façons:

#### A. Automatique (si configuré)
Si vous avez configuré un cron job, l'email sera envoyé automatiquement dans les prochaines minutes.

#### B. Manuel
Appelez l'edge function manuellement:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 6. Vérifier l'email reçu

1. Ouvrez le client email avec l'adresse utilisée lors de la création de la garantie
2. Cherchez un email de `noreply@locationproremorque.ca`
3. Sujet devrait être: "Confirmation de garantie - PPR-XXXX..."
4. **Vérifiez les pièces jointes**: Vous devriez voir 2 fichiers PDF:
   - `Contrat-PPR-XXXX.pdf` (le contrat signé)
   - `Facture-PPR-XXXX.pdf` (la facture détaillée)
5. Dans le corps de l'email, vous devriez voir une section "📎 Documents joints" avec la liste des documents

### 7. Vérifier le contenu des PDFs

1. Téléchargez et ouvrez les deux PDFs
2. **Contrat PDF** devrait contenir:
   - Toutes les informations de la garantie
   - La signature du client
   - Le code QR pour les réclamations
   - La signature du vendeur (si configurée)
3. **Facture PDF** devrait contenir:
   - Les informations du client
   - Les détails de la remorque
   - Le plan de garantie choisi
   - Les options sélectionnées
   - Le calcul des taxes
   - Le montant total

## Vérifications de la base de données

### Vérifier que les PDFs sont stockés

```sql
SELECT 
  id,
  contract_number,
  LENGTH(contract_pdf_url) as contract_pdf_size,
  LENGTH(customer_invoice_pdf_url) as invoice_pdf_size,
  LENGTH(merchant_invoice_pdf_url) as merchant_invoice_size,
  signed_at,
  created_at
FROM warranties
WHERE id = 'VOTRE_WARRANTY_ID'
ORDER BY created_at DESC
LIMIT 1;
```

Les trois champs de taille devraient avoir des valeurs positives (typiquement > 50000 caractères pour un PDF base64).

### Vérifier l'email dans la queue

```sql
SELECT 
  id,
  to_email,
  subject,
  status,
  jsonb_array_length(attachments) as attachments_count,
  metadata->'has_contract_pdf' as has_contract,
  metadata->'has_invoice_pdf' as has_invoice,
  metadata->'attachments_count' as attachments_metadata,
  sent_at,
  created_at
FROM email_queue
WHERE metadata->>'warranty_id' = 'VOTRE_WARRANTY_ID'
ORDER BY created_at DESC
LIMIT 1;
```

Le `attachments_count` devrait être 2.

## Cas de test supplémentaires

### Test 1: Échec de génération de PDF
- Simuler un échec de génération de PDF
- Vérifier que l'email est toujours envoyé mais avec un avertissement
- Message devrait indiquer "⚠️ Aucun document joint"

### Test 2: PDF trop volumineux
- Créer une garantie avec beaucoup d'options
- Vérifier que les warnings apparaissent si les PDFs dépassent 10MB
- Les PDFs devraient quand même être attachés

### Test 3: Préférence linguistique
- Créer une garantie avec préférence anglais
- Vérifier que l'email est en anglais
- Section "📎 Attached Documents" devrait être présente

## Débogage

### Si les PDFs ne sont pas joints:

1. Vérifiez les logs de `generateAndStoreDocuments`:
   ```
   [generateAndStoreDocuments] Step 6/6: Warranty updated successfully
   ```

2. Vérifiez que les PDFs ont bien été stockés dans la base de données

3. Vérifiez que la requête de récupération après génération réussit:
   ```
   [NewWarranty] Updated warranty data fetched successfully
   ```

4. Si `usingUpdatedData: false`, cela signifie que la requête a échoué et les anciens données sont utilisées

### Si l'email n'est pas envoyé:

1. Vérifiez la configuration Resend:
   - `RESEND_API_KEY` configurée dans Supabase Edge Functions
   - Domaine vérifié dans Resend Dashboard

2. Vérifiez la queue d'emails:
   ```sql
   SELECT * FROM email_queue 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. Consultez les logs de l'edge function `process-email-queue`

## Support

Pour toute question ou problème:
1. Vérifiez d'abord les logs dans la console du navigateur
2. Consultez les logs Supabase Edge Functions
3. Vérifiez les entrées dans `email_queue` et `error_logs` tables

---

**Date de création**: 12 octobre 2025  
**Version**: 1.0  
**Auteur**: Système de gestion de garanties Location Pro-Remorque
