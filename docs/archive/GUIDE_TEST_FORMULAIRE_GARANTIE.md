# Guide Complet de Test du Formulaire de Création de Garantie

## 📋 Vue d'ensemble

Ce guide vous permet de tester complètement le formulaire de création de garantie pour vous assurer que toutes les fonctionnalités fonctionnent correctement avant de l'utiliser en production.

## 🚀 Accès au testeur

### Option 1: Interface Web (Recommandé)

1. Connectez-vous à l'application
2. Dans la console du navigateur, tapez:
   ```javascript
   window.location.hash = '#warranty-form-test'
   ```
3. Ou modifiez l'URL manuellement pour ajouter `/warranty-form-test` à la fin
4. Le testeur s'affichera automatiquement

### Option 2: Ligne de commande

Depuis le répertoire du projet, exécutez:
```bash
npm run test:warranty-form
```

## 📊 Ce qui est testé

Le testeur vérifie **31 tests** répartis en **6 suites**:

### Suite 1: Validation Client (5 tests)
- ✓ Client avec toutes les données valides
- ✓ Client sans prénom (doit échouer)
- ✓ Email invalide (doit échouer)
- ✓ Téléphone trop court (doit échouer)
- ✓ Code postal invalide (avertissement attendu)

### Suite 2: Validation Remorque (7 tests)
- ✓ Remorque avec toutes les données valides
- ✓ VIN trop court (avertissement attendu)
- ✓ Prix d'achat à 0 (doit échouer)
- ✓ Prix d'achat négatif (doit échouer)
- ✓ Date garantie fabricant avant date d'achat (doit échouer)
- ✓ Année dans le futur (avertissement attendu)
- ✓ Prix très élevé (avertissement attendu)

### Suite 3: Validation Signature (6 tests)
- ✓ Signature avec toutes les données valides
- ✓ Nom du signataire manquant (doit échouer)
- ✓ Signature manquante (doit échouer)
- ✓ Consentement non donné (doit échouer)
- ✓ Hash de document trop court (avertissement attendu)
- ✓ Format de signature invalide (doit échouer)

### Suite 4: Validation Organisation & Plan (5 tests)
- ✓ Organisation ID valide (UUID)
- ✓ Organisation ID manquante (doit échouer)
- ✓ Organisation ID invalide (doit échouer)
- ✓ Plan ID valide (UUID)
- ✓ Plan ID manquant (doit échouer)

### Suite 5: Validation Complète Avant Signature (3 tests)
- ✓ Validation complète avec toutes les données valides
- ✓ Organisation manquante (doit échouer)
- ✓ Plusieurs erreurs combinées (doit échouer)

### Suite 6: Validation Après Signature (3 tests)
- ✓ Signature valide avec email correspondant
- ✓ Email du signataire différent (avertissement attendu)
- ✓ Données de signature invalides (doit échouer)

## ✅ Résultat attendu

**Tous les 31 tests doivent passer (100%)**

Si tous les tests passent, vous verrez:
```
✓✓✓ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS! ✓✓✓

Le formulaire de création de garantie est prêt à être utilisé.
Toutes les validations fonctionnent correctement.
```

## 🧪 Test manuel complet avec création en base de données

Après avoir vérifié que tous les tests automatisés passent, effectuez un test manuel complet:

### Étape 1: Prérequis
1. Connectez-vous avec un compte ayant les permissions nécessaires
2. Vérifiez que vous êtes dans une organisation valide
3. Confirmez qu'il existe au moins un plan de garantie actif

### Étape 2: Créer une garantie de test

#### 2.1 Informations Client (Étape 1)
Utilisez ces données de test:
```
Prénom: Jean
Nom: Tremblay
Email: jean.tremblay.test@example.com
Téléphone: 514-555-1234
Adresse: 123 Rue Principale
Ville: Montréal
Province: QC
Code postal: H1A 1A1
Langue: Français
☐ Consentement marketing (optionnel)
```

Cliquez sur **"Suivant: Info remorque"**

#### 2.2 Informations Remorque (Étape 2)
```
VIN: 1HGBH41JXMN109186
Marque: Cargo Pro
Modèle: Stealth
Année: 2024
Type: Enclosed
Catégorie: Remorque Fermée
Date d'achat: [Aujourd'hui]
Prix d'achat: 15000 $
Date fin garantie fabricant: [Dans 1 an]
☐ Achat promotionnel (non coché)
```

**Vérifications importantes:**
- [ ] Le calcul de la limite annuelle s'affiche automatiquement
- [ ] Le crédit de fidélité est calculé correctement
- [ ] La franchise affiche 100 $
- [ ] La durée garantie PPR affiche 6 ans

Cliquez sur **"Suivant: Sélectionner un plan"**

#### 2.3 Sélection du Plan (Étape 3)
1. Sélectionnez un plan de garantie (par exemple: "PPR Extended Warranty")
2. Cochez des options supplémentaires si disponibles
3. Vérifiez que le prix total se calcule automatiquement
4. Notez les valeurs:
   - Prix de base: _______
   - Options: _______
   - Taxes: _______
   - **Total: _______**

Cliquez sur **"Suivant: Révision"**

#### 2.4 Révision et Confirmation (Étape 4)
1. Vérifiez que toutes les informations sont correctes
2. Confirmez qu'il n'y a aucune erreur de validation (icône rouge)
3. Notez les avertissements éventuels (icône jaune) - ils sont non-bloquants
4. Vérifiez l'affichage du prix total final

Cliquez sur **"Compléter la vente"**

#### 2.5 Signature Électronique
La modale de signature s'ouvre:

**A. Prévisualisation du document**
- [ ] Le contenu du contrat s'affiche
- [ ] Le timer de lecture s'incrémente
- [ ] Le bouton "J'ai lu et compris" devient actif après quelques secondes

Cliquez sur **"J'ai lu et compris"**

**B. Divulgation et consentement**
- [ ] L'avis de droit de rétractation de 10 jours s'affiche
- [ ] Les conditions générales sont visibles
- [ ] La date limite de rétractation est calculée automatiquement

Cochez la case de consentement et cliquez sur **"J'accepte les conditions"**

**C. Vérification d'identité**
Entrez:
```
Nom complet: Jean Tremblay
Email: jean.tremblay.test@example.com
Téléphone: 514-555-1234
```

Cliquez sur **"Confirmer mon identité"**

**D. Signature**
- [ ] Le pad de signature s'affiche
- [ ] Dessinez une signature au doigt ou à la souris
- [ ] Le bouton "Effacer" fonctionne
- [ ] Le bouton "Confirmer la signature" s'active après avoir signé

Cliquez sur **"Confirmer la signature"**

### Étape 3: Vérifications post-création

#### 3.1 Message de confirmation
Vous devriez voir un message similaire à:
```
Garantie créée avec succès!

Contrat: PPR-[timestamp]-[random]
Vente complétée en Xm Ys

✓ Client créé
✓ Remorque enregistrée
✓ Garantie activée
✓ Documents générés
✓ Contrat signé
✓ Email de confirmation programmé
```

Notez le **numéro de contrat**: ___________________________

#### 3.2 Vérifications en base de données

Ouvrez l'interface Supabase ou exécutez ces requêtes SQL:

**A. Vérifier le client**
```sql
SELECT * FROM customers
WHERE email = 'jean.tremblay.test@example.com'
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Le client existe
- [ ] `organization_id` est défini
- [ ] Les données correspondent

**B. Vérifier la remorque**
```sql
SELECT * FROM trailers
WHERE vin = '1HGBH41JXMN109186'
ORDER BY created_at DESC LIMIT 1;
```
- [ ] La remorque existe
- [ ] `organization_id` est défini
- [ ] Le `purchase_price` est 15000

**C. Vérifier la garantie**
```sql
SELECT * FROM warranties
WHERE contract_number = '[VOTRE_NUMERO_CONTRAT]';
```
Vérifications critiques:
- [ ] `organization_id` est défini (NON NULL)
- [ ] `customer_id` pointe vers le bon client
- [ ] `trailer_id` pointe vers la bonne remorque
- [ ] `plan_id` est défini
- [ ] `status` = 'active'
- [ ] `signed_at` contient une date
- [ ] `signature_session_id` est défini
- [ ] `consent_given` = true
- [ ] `document_hash` contient un hash de 64 caractères
- [ ] `legal_validation_passed` = true
- [ ] `total_price` correspond au montant attendu

**D. Vérifier le token de réclamation**
```sql
SELECT * FROM warranty_claim_tokens
WHERE warranty_id = (
  SELECT id FROM warranties
  WHERE contract_number = '[VOTRE_NUMERO_CONTRAT]'
);
```
- [ ] Le token existe
- [ ] `organization_id` est défini
- [ ] `expires_at` est dans le futur (au moins 1 an)

**E. Vérifier les événements de signature**
```sql
SELECT * FROM signature_audit_log
WHERE warranty_id = (
  SELECT id FROM warranties
  WHERE contract_number = '[VOTRE_NUMERO_CONTRAT]'
)
ORDER BY created_at;
```
Événements attendus (au moins 3):
- [ ] `document_opened` - Document ouvert
- [ ] `identity_verified` - Identité vérifiée
- [ ] `signature_completed` - Signature complétée

**F. Vérifier la queue d'emails**
```sql
SELECT * FROM email_queue
WHERE metadata->>'contract_number' = '[VOTRE_NUMERO_CONTRAT]'
ORDER BY created_at DESC LIMIT 1;
```
- [ ] L'email existe dans la queue
- [ ] `status` = 'queued' ou 'sent'
- [ ] `priority` = 'high'
- [ ] `to_email` = 'jean.tremblay.test@example.com'
- [ ] `subject` contient le numéro de contrat

### Étape 4: Test des documents PDF

**A. Via l'interface**
1. Allez dans "Garanties" (liste des garanties)
2. Trouvez la garantie que vous venez de créer
3. Cliquez sur les liens de téléchargement:
   - [ ] Contrat client (PDF avec signature)
   - [ ] Facture client
   - [ ] Facture marchand

**B. Via la base de données**
```sql
SELECT
  contract_pdf_url,
  customer_invoice_pdf_url,
  merchant_invoice_pdf_url,
  certificate_url
FROM warranties
WHERE contract_number = '[VOTRE_NUMERO_CONTRAT]';
```
- [ ] Tous les URLs sont définis (non NULL)
- [ ] Les URLs pointent vers Supabase Storage
- [ ] Les documents sont accessibles

### Étape 5: Test du lien de réclamation client

1. Récupérez le token de réclamation depuis la base de données
2. Construisez l'URL: `https://[votre-domaine]/claim/submit/[TOKEN]`
3. Ouvrez l'URL dans un nouvel onglet (navigation privée recommandée)
4. Vérifications:
   - [ ] La page de soumission de réclamation s'affiche
   - [ ] Les informations de la garantie sont pré-remplies
   - [ ] Le client peut soumettre une réclamation sans se connecter

## 🔍 Tests de cas limites

Après le test nominal, testez ces cas limites:

### Test 1: VIN déjà existant
1. Créez une nouvelle garantie avec le même VIN: `1HGBH41JXMN109186`
2. Résultat attendu:
   - [ ] La remorque existante est réutilisée (pas de duplication)
   - [ ] Une nouvelle garantie est créée avec une nouvelle `trailer_id` pointant vers la remorque existante
   - [ ] Aucune erreur "duplicate key"

### Test 2: Email client déjà existant
1. Créez une nouvelle garantie avec le même email: `jean.tremblay.test@example.com`
2. Résultat attendu:
   - [ ] Un nouveau client est créé (les clients ne sont pas uniques par email)
   - [ ] La garantie est créée normalement

### Test 3: Prix d'achat invalide
1. Essayez de créer une garantie avec `purchasePrice` = 0
2. Résultat attendu:
   - [ ] Le bouton "Suivant" est désactivé
   - [ ] Un message d'erreur s'affiche: "Le prix d'achat doit être supérieur à 0$"

### Test 4: Sans organisation
1. Modifiez temporairement le contexte pour `organization_id` = null
2. Essayez de créer une garantie
3. Résultat attendu:
   - [ ] Une erreur s'affiche: "Organisation non définie. Veuillez vous reconnecter."
   - [ ] Aucune donnée n'est créée en base

### Test 5: Sans consentement
1. Dans le flux de signature, ne cochez pas la case de consentement
2. Résultat attendu:
   - [ ] Le bouton "J'accepte les conditions" reste désactivé
   - [ ] Impossible de continuer sans cocher la case

## 📈 Critères de succès

Pour que le formulaire soit considéré comme fonctionnel:

### Tests automatisés
- [x] 31/31 tests de validation passent (100%)

### Tests manuels
- [ ] Création de client réussie avec organization_id
- [ ] Création de remorque réussie avec organization_id
- [ ] Création de garantie réussie avec tous les champs
- [ ] Token de réclamation créé automatiquement
- [ ] Événements de signature enregistrés (audit trail)
- [ ] Email ajouté à la queue avec succès
- [ ] Documents PDF générés et stockés
- [ ] Lien de réclamation client fonctionnel

### Performance
- [ ] Création complète en moins de 10 secondes
- [ ] Aucun spinner infini
- [ ] Transitions fluides entre les étapes

### Intégrité des données
- [ ] Aucune donnée orpheline (tous les IDs référencent des entités existantes)
- [ ] organization_id présent partout
- [ ] Pas de valeurs NULL critiques
- [ ] Calculs automatiques corrects (taxes, limites, crédits)

## 🐛 Problèmes connus et solutions

### Problème: "Organisation non définie"
**Solution:** Assurez-vous d'être connecté avec un compte ayant une organisation valide.

### Problème: "Aucun plan de garantie sélectionné"
**Solution:** Vérifiez qu'il existe des plans actifs dans warranty_plans.

### Problème: Email non envoyé
**Solution:** Vérifiez la configuration Resend et la table email_queue. L'envoi est asynchrone.

### Problème: Documents PDF non générés
**Solution:** Les documents sont générés en arrière-plan. Vérifiez les logs console pour les erreurs jsPDF.

### Problème: Token de réclamation manquant
**Solution:** Le token est créé par un trigger. Vérifiez que le trigger existe et fonctionne.

## 📞 Support

Si vous rencontrez des problèmes durant les tests:

1. Consultez les logs console du navigateur (F12)
2. Vérifiez les erreurs dans Supabase Dashboard
3. Consultez les fichiers de documentation:
   - `GUIDE_TEST_CREATION_GARANTIE.md`
   - `TROUBLESHOOTING_GARANTIES.md`
   - `ERROR_HANDLING_GUIDE.md`

## ✅ Checklist finale

Avant de considérer le formulaire prêt pour la production:

- [ ] Tous les tests automatisés passent (31/31)
- [ ] Test manuel complet réussi
- [ ] Vérifications en base de données OK
- [ ] Documents PDF générés
- [ ] Email de confirmation envoyé
- [ ] Lien de réclamation fonctionnel
- [ ] Tests de cas limites passés
- [ ] Performance acceptable (< 10s)
- [ ] Aucune fuite de données sensibles dans les logs
- [ ] Audit trail complet de signature

---

**Date du test:** ___________________________

**Testé par:** ___________________________

**Résultat global:** ☐ PASS  ☐ FAIL

**Notes additionnelles:**

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
