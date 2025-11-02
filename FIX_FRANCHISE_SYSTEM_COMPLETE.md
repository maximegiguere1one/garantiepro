# 🔧 CORRECTION COMPLÈTE DU SYSTÈME DE GESTION DES FRANCHISES

**Date:** 2 novembre 2025
**Migration:** `20251102100000_fix_all_franchise_system_issues.sql`

---

## 📋 PROBLÈMES CORRIGÉS

### ✅ 1. Permissions RLS Manquantes

#### **Avant:**
- Politiques RLS incomplètes ou manquantes
- Masters ne pouvaient pas voir toutes les organisations
- Admins avaient des accès limités
- Conflits entre anciennes politiques

#### **Après:**
```sql
-- ORGANIZATIONS
✅ Masters et admins voient TOUTES les organisations
✅ Utilisateurs voient leur propre organisation
✅ Masters et admins peuvent créer des organisations
✅ Masters et admins peuvent modifier toutes les organisations
✅ Masters peuvent supprimer des organisations

-- ORGANIZATION_BILLING_CONFIG
✅ Masters et admins voient toutes les configs
✅ Utilisateurs voient la config de leur org
✅ Masters et admins peuvent créer/modifier configs
✅ Masters peuvent supprimer configs

-- FRANCHISEE_INVITATIONS
✅ Masters, admins et franchisee_admins voient les invitations
✅ Peuvent créer et modifier les invitations
✅ Masters peuvent supprimer les invitations
```

---

### ✅ 2. Erreurs de Création Utilisateur

#### **Problème:**
- Trigger `handle_new_user()` ne gérait pas correctement les métadonnées
- Conflits lors de la création de profil
- Organization_id pas toujours rempli

#### **Solution:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
-- Utilise ON CONFLICT DO UPDATE pour éviter les doublons
-- Récupère organization_id depuis raw_user_meta_data
-- Fallback sur 'client' si role non fourni
-- Gère les cas où le profil existe déjà
```

**Amélioration:**
- ✅ Pas d'erreur si profil existe déjà
- ✅ Organization_id correctement rempli depuis les métadonnées
- ✅ Role par défaut = 'client'
- ✅ Mise à jour intelligente des champs existants

---

### ✅ 3. Échec d'Envoi d'Email

#### **Causes possibles détectées:**

1. **Configuration Resend manquante**
   - Variable d'environnement `RESEND_API_KEY` absente
   - Domaine non vérifié dans Resend

2. **Rate limiting**
   - Fonction `check_invitation_rate_limit()` manquante
   - Trop d'envois dans un court laps de temps

3. **Erreurs de l'edge function**
   - Service role key non configuré
   - Problèmes de réseau

#### **Solutions apportées:**

**A) Fonction rate limit créée:**
```sql
CREATE FUNCTION check_invitation_rate_limit(
  p_organization_id uuid,
  p_hours integer DEFAULT 1,
  p_max_attempts integer DEFAULT 3
)
-- Limite: 3 tentatives par heure max par organisation
-- Évite le spam d'emails
```

**B) Edge function améliorée:**
- ✅ Retry logic (3 tentatives)
- ✅ Logging détaillé des erreurs
- ✅ Fallback sur lien manuel si email échoue
- ✅ Status 207 (Multi-Status) si email pas envoyé mais user créé

**C) Gestion gracieuse des échecs:**
```javascript
if (!emailSent) {
  // Retourne SUCCESS mais avec warning
  // Fournit lien manuel d'invitation
  // User créé même si email échoue
  return {
    success: true,
    warning: 'EMAIL_NOT_SENT',
    setupLink: '...'
  }
}
```

---

### ✅ 4. Configuration Resend

#### **Variables requises:**

Vérifier dans Supabase → Settings → Secrets:

```bash
# REQUIS pour envoi d'emails
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Déjà configurés (normalement)
SUPABASE_URL=https://wppvbdbpfnkbrlpxkcgb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SITE_URL=https://www.garantieproremorque.com
```

#### **Vérification domaine:**

1. Aller sur https://resend.com/domains
2. Vérifier que `garantieproremorque.com` est vérifié
3. Status doit être: ✅ **Verified**

#### **DNS Records requis:**

```
Type: TXT
Name: @
Value: resend-verify=xxxxx

Type: MX
Name: @
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com
```

---

### ✅ 5. Erreurs de Foreign Keys

#### **Avant:**
```sql
-- ON DELETE NO ACTION (défaut)
-- Causait des erreurs lors de suppression
CONSTRAINT fk_org FOREIGN KEY (organization_id)
REFERENCES organizations(id)
```

#### **Après:**
```sql
-- ON DELETE CASCADE
-- Supprime automatiquement les enregistrements liés
CONSTRAINT fk_org FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE
```

**Tables corrigées:**
- ✅ `organization_billing_config.organization_id`
- ✅ `franchisee_invitations.organization_id`

**Avantage:**
- Pas d'erreur si on supprime une organisation
- Cleanup automatique des données liées

---

### ✅ 6. Problèmes de Triggers

#### **Trigger 1: handle_new_user()**

**Problème:** Ne gérait pas les doublons
**Solution:** Ajout de `ON CONFLICT DO UPDATE`

#### **Trigger 2: auto_fill_billing_organization_id()**

**Problème:** Trigger trop strict
**Solution:**
```sql
-- Vérifie juste que organization_id n'est pas null
-- Laisse l'utilisateur fournir la valeur
IF NEW.organization_id IS NULL THEN
  RAISE EXCEPTION 'organization_id ne peut pas être null';
END IF;
```

---

## 🚀 APPLIQUER LES CORRECTIONS

### **Option 1: Via l'interface Supabase (RECOMMANDÉ)**

1. Aller sur https://supabase.com/dashboard/project/wppvbdbpfnkbrlpxkcgb/sql
2. Copier tout le contenu de:
   ```
   supabase/migrations/20251102100000_fix_all_franchise_system_issues.sql
   ```
3. Coller dans l'éditeur SQL
4. Cliquer **"Run"**
5. Vérifier qu'il n'y a pas d'erreurs

### **Option 2: Via CLI Supabase**

```bash
# Si tu as le CLI installé
supabase db push

# OU
supabase migration up
```

### **Option 3: Script automatique**

```bash
# Depuis le dossier du projet
cd /tmp/cc-agent/59288411/project
node apply-all-migrations.mjs
```

---

## ✅ VÉRIFICATIONS POST-MIGRATION

### **1. Vérifier RLS activé:**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'organizations',
  'organization_billing_config',
  'franchisee_invitations'
);
```

**Attendu:** `rowsecurity = true` pour les 3 tables

### **2. Compter les politiques:**

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'organizations',
  'organization_billing_config',
  'franchisee_invitations'
)
GROUP BY tablename;
```

**Attendu:**
- organizations: 5 politiques
- organization_billing_config: 5 politiques
- franchisee_invitations: 4 politiques

### **3. Tester la fonction rate limit:**

```sql
SELECT check_invitation_rate_limit(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
  1,
  3
);
```

**Attendu:** Retourne `true` ou `false`

### **4. Vérifier les Foreign Keys:**

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('organization_billing_config', 'franchisee_invitations')
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Attendu:** `delete_rule = CASCADE` pour les 2 tables

---

## 🧪 TESTS À EXÉCUTER APRÈS MIGRATION

### **Test 1: Permissions**

Aller sur: `https://www.garantieproremorque.com/test-organizations-access.html`

**Attendu:**
- ✅ PASS: Authentification
- ✅ PASS: Profil utilisateur
- ✅ PASS: Statut Owner
- ✅ PASS: Accès liste organisations

### **Test 2: RLS Permissions**

Aller sur: `https://www.garantieproremorque.com/test-rls-permissions.html`

**Attendu:**
- ✅ PASS: SELECT organizations
- ✅ PASS: INSERT organization
- ✅ PASS: UPDATE organization
- ✅ PASS: SELECT billing_config
- ✅ PASS: INSERT billing_config
- ✅ PASS: SELECT franchisee_invitations

### **Test 3: Flux Complet**

Aller sur: `https://www.garantieproremorque.com/test-complete-flow.html`

**Attendu (taux de réussite >= 88%):**
- ✅ PASS: Authentification
- ✅ PASS: Profil et permissions
- ✅ PASS: Création organisation
- ✅ PASS: Config facturation
- ✅ PASS/WARNING: Onboarding franchisé
- ✅ PASS: Profil admin créé
- ✅ PASS: Invitation enregistrée
- ✅ PASS: Org dans la liste
- ✅ PASS: Cleanup

**Note:** Si email n'est pas envoyé (WARNING), c'est OK tant que l'utilisateur est créé!

---

## 📊 RÉSUMÉ DES CHANGEMENTS

| Composant | Avant | Après |
|-----------|-------|-------|
| **RLS Organizations** | ❌ Incomplet | ✅ 5 politiques complètes |
| **RLS Billing Config** | ❌ Manquant | ✅ 5 politiques complètes |
| **RLS Invitations** | ❌ Incomplet | ✅ 4 politiques complètes |
| **Trigger Profil** | ⚠️ Basique | ✅ Robuste avec ON CONFLICT |
| **Foreign Keys** | ⚠️ NO ACTION | ✅ CASCADE |
| **Rate Limit** | ❌ Manquant | ✅ Fonction créée |
| **Index Performance** | ⚠️ Minimal | ✅ 5 index optimisés |

---

## 🎯 PROCHAINES ÉTAPES

1. **Appliquer la migration** (voir section ci-dessus)
2. **Vérifier Resend est configuré:**
   - Clé API dans Supabase Secrets
   - Domaine vérifié
3. **Lancer les tests automatiques:**
   - Test 1: Permissions ✅
   - Test 3: RLS ✅
   - Test 4: Flux complet ✅
4. **Tester dans l'interface:**
   - Menu "Gérer les franchisés" visible
   - Bouton "Nouveau franchisé" fonctionne
   - Modal s'ouvre correctement
   - Création de franchise réussie

---

## 🆘 EN CAS DE PROBLÈME

### **Erreur: "permission denied for table"**
→ RLS pas appliqué correctement, réexécuter la migration

### **Erreur: "violates foreign key constraint"**
→ Organisation parent n'existe pas, vérifier `owner_organization_id`

### **Erreur: "function check_invitation_rate_limit does not exist"**
→ Fonction pas créée, réexécuter section 5 de la migration

### **Email pas envoyé**
→ Normal si Resend pas configuré, utiliser lien manuel

### **Test échoue avec "Not authenticated"**
→ Se déconnecter/reconnecter pour rafraîchir la session

---

## ✅ CONFIRMATION FINALE

Une fois la migration appliquée et les tests passés, tu devrais avoir:

✅ Menu "Administration Maître" → "Gérer les franchisés" **visible**
✅ Bouton "➕ Nouveau Franchisé" **fonctionnel**
✅ Modal de création **s'ouvre sans erreur**
✅ Création de franchise **réussie**
✅ Admin créé avec **mot de passe temporaire**
✅ Email envoyé **OU lien manuel fourni**
✅ Franchise apparaît dans **la liste**
✅ Taux de réussite tests: **≥ 88%**

**Si tous ces points sont ✅, le système est 100% fonctionnel!** 🎉
