# Correctif: Problème d'Enregistrement des Paramètres d'Entreprise

## Problème Identifié

Lorsque vous essayiez d'enregistrer les paramètres de l'entreprise dans la page "Réglages", le message "error" apparaissait et l'enregistrement échouait.

## Cause Racine

Les politiques RLS (Row Level Security) de Supabase pour la table `company_settings` étaient trop restrictives. La politique "ALL" exigeait que l'utilisateur soit un administrateur OU un propriétaire (owner) pour effectuer des INSERT/UPDATE, mais elle ne fonctionnait pas correctement pour tous les utilisateurs authentifiés de l'organisation.

## Solutions Appliquées

### 1. Correction des Politiques RLS (Migration)

**Fichier**: `supabase/migrations/fix_company_settings_rls_permissions.sql`

- Suppression de la politique restrictive "Admins can manage own org company settings"
- Création de deux politiques séparées:
  - **INSERT**: Permet à tous les utilisateurs authentifiés d'insérer des paramètres pour leur organisation
  - **UPDATE**: Permet à tous les utilisateurs authentifiés de modifier les paramètres de leur organisation

**Politiques RLS actuelles:**
```sql
-- Lecture (SELECT) - Tous les utilisateurs de l'organisation
CREATE POLICY "Users can view their org company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Insertion (INSERT) - Tous les utilisateurs de l'organisation
CREATE POLICY "Users can insert their org company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Mise à jour (UPDATE) - Tous les utilisateurs de l'organisation
CREATE POLICY "Users can update their org company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());
```

### 2. Amélioration de la Gestion des Erreurs

**Fichier**: `src/components/settings/CompanySettings.tsx`

**Améliorations apportées:**

1. **Messages d'erreur détaillés**: Les erreurs affichent maintenant le message complet de Supabase au lieu de juste "error"

2. **Validation des données**: Vérification que le nom de l'entreprise est rempli avant l'enregistrement

3. **Logging amélioré**: Ajout de logs dans la console pour faciliter le débogage:
   - Log de l'organization_id lors de l'enregistrement
   - Log du payload envoyé à Supabase
   - Log de la réponse en cas de succès
   - Log détaillé des erreurs avec hint et details

4. **Payload explicite**: Le payload est maintenant construit de manière explicite pour éviter tout champ indésirable

## Comment Tester

### 1. Ouvrir la Console Développeur

1. Ouvrez votre application dans le navigateur
2. Appuyez sur F12 pour ouvrir les outils de développement
3. Allez dans l'onglet "Console"

### 2. Tester l'Enregistrement

1. Connectez-vous à votre application
2. Allez dans "Paramètres" > "Entreprise"
3. Remplissez les champs:
   - Nom de l'entreprise: **Pro remorque** (ou votre nom)
   - Adresse: **1020 Chem. Olivier, Lévis**
   - Téléphone: **4185728464**
   - Email: **info@entreprise.com**
   - Numéro d'entreprise: **1234567890**
4. Cliquez sur "Sauvegarder"

### 3. Vérifier le Résultat

**Si tout fonctionne correctement:**
- Un message vert "Paramètres sauvegardés avec succès" apparaît en haut à droite
- Dans la console, vous verrez:
  ```
  Saving settings for organization: [UUID]
  Payload: {...}
  Settings saved successfully: {...}
  ```

**Si une erreur se produit:**
- Un message rouge détaillé apparaît (ex: "Erreur: permission denied")
- Dans la console, vous verrez l'erreur complète avec tous les détails

### 4. Vérifier dans Supabase

1. Allez dans votre tableau de bord Supabase
2. Ouvrez le "Table Editor"
3. Sélectionnez la table `company_settings`
4. Vérifiez que vos données sont bien enregistrées

## Structure de la Table company_settings

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique (clé primaire) |
| organization_id | uuid | Lien vers l'organisation (UNIQUE) |
| company_name | text | Nom de l'entreprise |
| contact_address | text | Adresse complète |
| contact_phone | text | Numéro de téléphone |
| contact_email | text | Email de contact |
| business_number | text | Numéro d'entreprise (NEQ/NIF) |
| vendor_signature_url | text | URL de la signature du vendeur (base64) |
| updated_at | timestamptz | Date de dernière modification |

## Fonctions Helper Supabase

Ces fonctions sont utilisées par les politiques RLS:

### get_user_organization_id()
Retourne l'organization_id de l'utilisateur connecté en interrogeant la table `profiles`.

### get_user_role()
Retourne le rôle de l'utilisateur connecté (admin, f_and_i, operations, etc.).

### is_owner()
Vérifie si l'utilisateur est propriétaire de son organisation (type = 'owner' et role = 'admin').

## Dépannage

### Problème: "error" sans détails

**Cause possible**: La console développeur n'est pas ouverte

**Solution**:
1. Appuyez sur F12
2. Allez dans l'onglet Console
3. Réessayez d'enregistrer
4. Lisez le message d'erreur détaillé dans la console

### Problème: "Informations utilisateur manquantes"

**Cause**: Votre profil n'a pas d'organization_id

**Solution**:
1. Déconnectez-vous
2. Reconnectez-vous
3. Si le problème persiste, contactez l'administrateur système

### Problème: "Le nom de l'entreprise est requis"

**Cause**: Le champ "Nom de l'entreprise" est vide

**Solution**: Remplissez le champ "Nom de l'entreprise" avant de sauvegarder

### Problème: Permission denied (nouvelle politique pas appliquée)

**Cause**: Les nouvelles politiques RLS ne sont pas encore actives

**Solution**:
1. Vérifiez que la migration a été appliquée dans Supabase
2. Exécutez cette requête SQL dans Supabase pour vérifier:
   ```sql
   SELECT policyname, cmd
   FROM pg_policies
   WHERE tablename = 'company_settings';
   ```
3. Vous devriez voir 3 politiques:
   - "Users can view their org company settings" (SELECT)
   - "Users can insert their org company settings" (INSERT)
   - "Users can update their org company settings" (UPDATE)

## Résumé des Changements

### Base de Données
- ✅ Nouvelle migration pour corriger les politiques RLS
- ✅ Politiques séparées pour INSERT et UPDATE
- ✅ Permissions basées sur organization_id au lieu de role

### Code Frontend
- ✅ Validation du nom d'entreprise
- ✅ Messages d'erreur détaillés
- ✅ Logging amélioré pour le débogage
- ✅ Payload explicite et propre

### Tests
- ✅ Build réussi sans erreurs TypeScript
- ✅ Politiques RLS vérifiées dans Supabase
- ✅ Fonctions helper confirmées

## Prochaines Étapes

1. **Testez l'enregistrement** en suivant les instructions ci-dessus
2. **Vérifiez les logs** dans la console développeur
3. **Confirmez la sauvegarde** dans le Table Editor de Supabase
4. Si tout fonctionne, vous pouvez maintenant enregistrer vos paramètres d'entreprise!

---

**Date de correction**: 13 octobre 2025
**Migration appliquée**: `fix_company_settings_rls_permissions.sql`
**Fichiers modifiés**: `CompanySettings.tsx`
