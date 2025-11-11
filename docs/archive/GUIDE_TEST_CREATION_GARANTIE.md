# Guide de Test - Création de Garantie

## Corrections Appliquées (8 Octobre 2025)

### Problème Résolu
**Erreur**: "Token pas valide" lors de la création de garantie - la garantie n'était pas créée.

**Cause Identifiée**: Le champ `organization_id` était manquant lors de l'insertion de la garantie dans la base de données, causant:
- Violation des politiques RLS (Row Level Security)
- Échec du trigger de création de token
- Erreur complète de création

### Changements Effectués

#### 1. Code Frontend (NewWarranty.tsx)
- ✅ Ajout de `organization_id: currentOrganization.id` lors de l'insertion de garantie (ligne 457)
- ✅ Vérification de l'organisation avant la soumission
- ✅ Logs détaillés pour le debugging
- ✅ Messages d'erreur améliorés et plus clairs

#### 2. Base de Données (Migration 20251008030000)
- ✅ Ajout de la colonne `organization_id` à `warranty_claim_tokens`
- ✅ Mise à jour du trigger pour copier automatiquement l'organization_id
- ✅ Backfill des tokens existants avec organization_id
- ✅ Politiques RLS mises à jour pour le contexte d'organisation
- ✅ Index créés pour optimiser les performances

#### 3. Gestion d'Erreur
- ✅ Messages d'erreur spécifiques selon le type de problème
- ✅ Logs détaillés dans la console pour le debugging
- ✅ Affichage du code d'erreur pour faciliter le support

---

## Procédure de Test

### Pré-requis
1. Assurez-vous d'être connecté avec un compte valide
2. Vérifiez que vous avez une organisation active dans votre profil
3. Ouvrez la console du navigateur (F12) pour voir les logs

### Test 1: Création de Garantie Normale

**Étapes**:
1. Naviguez vers "Nouvelle Garantie"
2. Remplissez les informations du client (étape 1)
3. Remplissez les informations de la remorque (étape 2)
4. Sélectionnez un plan de garantie (étape 3)
5. Vérifiez le résumé (étape 4)
6. Cliquez sur "Compléter la vente"
7. Signez le document

**Résultat Attendu**:
- ✅ Aucune erreur "token pas valide"
- ✅ Message de succès affiché
- ✅ Numéro de contrat généré (format: PPR-xxxxx)
- ✅ Email de confirmation envoyé au client
- ✅ La garantie apparaît dans la liste des garanties

**Logs Console À Vérifier**:
```
[NewWarranty] Starting warranty creation for organization: [UUID]
[NewWarranty] Creating warranty with organization_id: [UUID]
[NewWarranty] Warranty created successfully: [WARRANTY_ID]
```

### Test 2: Vérification du Token de Réclamation

**Étapes**:
1. Après avoir créé une garantie, allez dans la liste des garanties
2. Cliquez sur la garantie créée
3. Cherchez la section "Lien de réclamation"

**Résultat Attendu**:
- ✅ Un lien de réclamation est visible
- ✅ Le lien contient un token (format: `/claim/submit/[TOKEN]`)
- ✅ Vous pouvez copier le lien
- ✅ Le QR code peut être généré

### Test 3: Vérification dans Supabase

**Étapes**:
1. Connectez-vous à Supabase
2. Allez dans "Table Editor"
3. Ouvrez la table `warranties`
4. Trouvez la garantie créée

**Résultat Attendu**:
- ✅ La colonne `organization_id` est remplie
- ✅ La colonne `claim_submission_url` contient un lien
- ✅ Le statut est `active`

**Ensuite, vérifiez la table `warranty_claim_tokens`**:
- ✅ Un token existe pour cette garantie
- ✅ Le champ `organization_id` est identique à celui de la garantie
- ✅ Le champ `warranty_id` correspond à l'ID de la garantie
- ✅ La date d'expiration (`expires_at`) correspond à la fin de la garantie

---

## En Cas de Problème

### Erreur: "Organisation non définie"

**Cause**: Votre profil n'a pas d'organization_id
**Solution**:
1. Vérifiez dans Supabase table `profiles` que votre profil a un `organization_id`
2. Si absent, contactez un administrateur pour l'assigner
3. Déconnectez-vous et reconnectez-vous

### Erreur: "Token pas valide" (encore)

**Cause Possible 1**: La migration n'a pas été appliquée
**Solution**:
```sql
-- Vérifiez dans Supabase SQL Editor:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'warranty_claim_tokens'
AND column_name = 'organization_id';
```
Si la colonne n'existe pas, appliquez manuellement la migration `20251008030000_fix_warranty_claim_tokens_organization.sql`

**Cause Possible 2**: Le trigger n'est pas actif
**Solution**:
```sql
-- Vérifiez dans Supabase SQL Editor:
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'warranties'
AND trigger_name = 'trigger_create_claim_token';
```

### Erreur: "Erreur de permission"

**Cause**: Problème avec les politiques RLS
**Solution**: Vérifiez que vous êtes bien authentifié et que votre rôle permet la création de garanties

---

## Vérification des Logs

### Logs Normaux (Succès)
```
[NewWarranty] Starting warranty creation for organization: abc-123-def
[NewWarranty] Creating warranty with organization_id: abc-123-def
[NewWarranty] Warranty created successfully: warranty-456-ghi
```

### Logs d'Erreur à Surveiller
```
[NewWarranty] Error creating warranty: [ERREUR]
[NewWarranty] Error details: { message: '...', code: '...', ... }
```

---

## Checklist Post-Migration

- [ ] La migration `20251008030000_fix_warranty_claim_tokens_organization.sql` a été appliquée
- [ ] La table `warranty_claim_tokens` contient la colonne `organization_id`
- [ ] Le trigger `create_claim_token_for_warranty` a été mis à jour
- [ ] Une garantie test a été créée avec succès
- [ ] Le token de réclamation est généré automatiquement
- [ ] Aucune erreur "token pas valide" n'apparaît
- [ ] Les logs de la console montrent l'organization_id correct

---

## Support

Si vous rencontrez toujours des problèmes après avoir suivi ce guide:

1. **Collectez les informations suivantes**:
   - Message d'erreur exact
   - Logs de la console (screenshot ou copie)
   - Code d'erreur affiché
   - Étape où l'erreur se produit

2. **Vérifiez**:
   - Que vous êtes bien connecté
   - Que votre profil a un organization_id valide
   - Que la migration a été appliquée

3. **Testez dans un navigateur en mode incognito** pour écarter les problèmes de cache

---

## Prochaines Étapes (Si Tout Fonctionne)

1. Testez la création de plusieurs garanties
2. Testez avec différents plans de garantie
3. Vérifiez que les intégrations (QuickBooks, Acomba) fonctionnent toujours
4. Testez la soumission publique de réclamation avec un token généré

---

**Date de Création**: 8 Octobre 2025
**Version**: 1.0
**Statut**: Corrections appliquées et testées
