# 🔍 Analyse Complète du Système Multi-Franchise

**Date:** 2 novembre 2025
**Analyste:** Claude Code
**Objectif:** Assurer l'isolation complète entre les franchises

---

## 📊 État Actuel du Système

### **1. Structure des Organisations**

Actuellement dans la base de données:

| ID | Nom | Type | Statut | Créé le |
|---|---|---|---|---|
| `a0000000-0000...0001` | Location Pro Remorque - Compte Maître | **owner** | active | 05/10/2025 |
| `4286fe95-1cbe...d2fe` | alex the goat | **franchisee** | active | 05/10/2025 |
| `40f50ab5-be45...8dfe` | Location remorque Saint-nicolas | **franchisee** | active | 12/10/2025 |

### **2. Distribution des Utilisateurs**

```
📊 PROBLÈME MAJEUR IDENTIFIÉ:
╔════════════════════════════════════════════════════════╗
║  TOUS LES 4 UTILISATEURS SONT DANS LA MÊME FRANCHISE  ║
║            "alex the goat" (4286fe95...)              ║
╚════════════════════════════════════════════════════════╝
```

| Utilisateur | Email | Rôle | Organisation |
|---|---|---|---|
| Maxime Giguere | maxime@giguere-influence.com | **master** | alex the goat  |
| maxime | maxime@agence1.com | super_admin | alex the goat  |
| gigueremaxime321 | gigueremaxime321@gmail.com | franchisee_admin | alex the goat  |
| Philippe Jacob | philippe@proremorque.com | admin | alex the goat  |

**⚠️ Problème:** Même Philippe Jacob est dans "alex the goat" au lieu de "Location Pro Remorque"!

### **3. Distribution des Données**

```sql
Organization: alex the goat          → 16 garanties ✅
Organization: Location Pro Remorque  →  0 garanties
Organization: Saint-nicolas          →  0 garanties
```

---

## 🏗️ Architecture Multi-Tenant

### **Tables avec isolation (65 tables au total)**

✅ **Toutes les tables critiques ont `organization_id`:**

```
✓ profiles              → Utilisateurs isolés
✓ warranties           → Garanties isolées
✓ customers            → Clients isolés
✓ warranty_plans       → Plans de garantie isolés
✓ company_settings     → Réglages isolés
✓ claim_settings       → Paramètres réclamations isolés
✓ tax_settings         → Taxes isolées
✓ pricing_settings     → Prix isolés
✓ email_templates      → Templates email isolés
✓ warranty_options     → Options garantie isolées
... et 55 autres tables
```

### **Policies RLS Actives**

✅ **Les policies d'isolation existent:**

```sql
-- Exemples de policies qui limitent l'accès:

warranties:
  ✓ "Franchisees view own org warranties"
    → WHERE user_can_access_organization(organization_id)

  ✓ "Franchisees insert own org warranties"
    → WITH CHECK (organization_id = get_user_organization_id())

profiles:
  ✓ "select_org_profiles_if_admin"
    → WHERE organization_id = get_my_org_id()

company_settings:
  ✓ "Users can view their org company settings"
    → WHERE organization_id = get_user_organization_id()
```

---

## 🚨 Problèmes Identifiés

### **PROBLÈME #1: Tous les utilisateurs dans la même franchise**

**Impact:** CRITIQUE ⚠️

```
Situation actuelle:
- 4 utilisateurs créés
- TOUS dans "alex the goat" (4286fe95...)
- 2 autres franchises existent mais sont vides
- Aucune isolation réelle en production
```

**Cause probable:**
- Lors de la création d'utilisateurs, l'`organization_id` n'est pas spécifié correctement
- Ou tous les utilisateurs héritent de l'organisation du créateur
- Le système assigne automatiquement la première franchise trouvée

### **PROBLÈME #2: Interface de création de franchise manquante**

**Impact:** BLOQUANT 🚫

```
Fichier: OrganizationsManagementV2.tsx
Ligne 761: <CreateOrganizationModal />
Ligne 1096: // Keep the existing modals... (copy from backup file)

❌ Le composant CreateOrganizationModal n'est PAS implémenté!
```

Le modal existe dans le code mais le composant n'est pas défini.

### **PROBLÈME #3: Pas de sélection de franchise lors de l'invitation**

**Impact:** CRITIQUE ⚠️

Dans `UsersAndInvitationsManagement.tsx`:

```typescript
// Ligne 259 - Quand on invite un utilisateur:
organization_id: organization?.id  // ← Toujours la même org!
```

**Problème:**
- Aucun sélecteur de franchise
- Toujours l'organisation de l'utilisateur connecté
- Impossible d'assigner à une autre franchise

### **PROBLÈME #4: Pas de gestion de la hiérarchie Master → Franchises**

**Impact:** MAJEUR ⚠️

Le rôle **master** devrait pouvoir:
- ✅ Voir toutes les franchises
- ✅ Créer de nouvelles franchises
- ✅ Assigner des utilisateurs à n'importe quelle franchise
- ❌ **MAIS**: Interface manquante pour ces actions

---

## ✅ Ce Qui Fonctionne Déjà

### **1. Infrastructure de base solide**

✅ `organization_id` présent partout (65 tables)
✅ RLS policies fonctionnelles
✅ Fonctions helpers:
   - `get_user_organization_id()`
   - `user_can_access_organization(org_id)`
   - `get_my_org_id()`
   - `get_my_role()`

### **2. Isolation technique prête**

Si on assigne correctement les `organization_id`, l'isolation fonctionnera immédiatement grâce aux RLS policies existantes.

### **3. Structure des rôles**

```
master              → Peut tout gérer, toutes les franchises
admin               → Admin d'une franchise propriétaire
super_admin         → Super admin d'une franchise
franchisee_admin    → Admin d'une franchise franchisée
franchisee_employee → Employé d'une franchise
```

---

## 🎯 Plan d'Action Recommandé

### **PHASE 1: Correction des Données Existantes** (Priorité: URGENT)

**Objectif:** Réassigner correctement les utilisateurs

```sql
-- 1. Identifier l'organisation "propriétaire" (owner)
SELECT id, name, type
FROM organizations
WHERE type = 'owner';
-- Résultat: a0000000-0000-0000-0000-000000000001

-- 2. Réassigner les utilisateurs master/admin au propriétaire
UPDATE profiles
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE role IN ('master', 'admin')
  AND email IN (
    'maxime@giguere-influence.com',
    'philippe@proremorque.com'
  );

-- 3. Garder les franchisee_admin dans leurs franchises
-- (déjà ok, mais vérifier)
```

### **PHASE 2: Créer le Modal de Création de Franchise** (Priorité: HAUTE)

**Composants à créer:**

1. **CreateOrganizationModal**
   - Formulaire: Nom, province, contact, email
   - Type: franchisee (fixe)
   - Statut: active (par défaut)
   - Crée automatiquement:
     - Organization
     - Organization_billing_config
     - Company_settings par défaut

2. **FranchiseSelector** (nouveau composant)
   - Dropdown pour sélectionner une franchise
   - Utilisable dans UsersAndInvitationsManagement
   - Filtré selon les permissions:
     - Master: voit toutes
     - Admin: voit la sienne seulement

### **PHASE 3: Améliorer l'Invitation d'Utilisateurs** (Priorité: HAUTE)

**Modifications à `UsersAndInvitationsManagement.tsx`:**

```typescript
// Ajouter un sélecteur de franchise
const [selectedOrganization, setSelectedOrganization] = useState<string>('');
const [availableOrganizations, setAvailableOrganizations] = useState([]);

// Charger les franchises disponibles
useEffect(() => {
  if (profile.role === 'master') {
    // Charger toutes les franchises
    loadAllOrganizations();
  } else {
    // Utiliser seulement la franchise actuelle
    setSelectedOrganization(organization.id);
  }
}, [profile.role, organization]);

// Dans handleInviteUser:
organization_id: selectedOrganization || organization?.id
```

### **PHASE 4: Interface de Gestion Master** (Priorité: MOYENNE)

**Dashboard Master avec:**
1. Liste de toutes les franchises
2. Stats par franchise:
   - Nombre d'utilisateurs
   - Nombre de garanties
   - Revenus
3. Actions rapides:
   - Créer franchise
   - Voir détails
   - Assigner utilisateurs
   - Activer/Suspendre

### **PHASE 5: Tests d'Isolation** (Priorité: HAUTE)

**Scénarios à tester:**

```
Test 1: Isolation des garanties
- Utilisateur Franchise A se connecte
- Liste les garanties
- ✅ Ne voit QUE les garanties de Franchise A

Test 2: Isolation des clients
- Utilisateur Franchise B se connecte
- Liste les clients
- ✅ Ne voit QUE les clients de Franchise B

Test 3: Isolation des réglages
- Franchise A modifie company_settings
- Franchise B vérifie ses company_settings
- ✅ Les réglages sont indépendants

Test 4: Création multi-franchise
- Master crée un utilisateur pour Franchise C
- Utilisateur se connecte
- ✅ Voit uniquement les données de Franchise C
```

---

## 📋 Checklist de Vérification

### **Avant de lancer en production:**

- [ ] Tous les utilisateurs sont dans la bonne organisation
- [ ] Le modal CreateOrganizationModal fonctionne
- [ ] On peut sélectionner une franchise lors de l'invitation
- [ ] Les tests d'isolation passent (4/4)
- [ ] Le dashboard master affiche toutes les franchises
- [ ] Un franchisee_admin ne peut pas voir les autres franchises
- [ ] Les settings sont bien isolés entre franchises
- [ ] Les emails/templates sont isolés
- [ ] Les warranty_plans sont isolés (ou partagés si template)

---

## 🔧 Fonctions Utiles pour le Debug

```sql
-- Voir toutes les organisations avec leur contenu
SELECT
  o.name,
  o.type,
  COUNT(DISTINCT p.id) as nb_users,
  COUNT(DISTINCT w.id) as nb_warranties,
  COUNT(DISTINCT c.id) as nb_customers
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN warranties w ON w.organization_id = o.id
LEFT JOIN customers c ON c.organization_id = o.id
GROUP BY o.id, o.name, o.type
ORDER BY o.type, o.name;

-- Vérifier l'isolation d'un utilisateur spécifique
SET request.jwt.claims.sub TO 'user-uuid-here';
SELECT * FROM warranties; -- Ne devrait voir que sa franchise
```

---

## 💡 Recommandations Finales

### **URGENT (À faire immédiatement):**
1. ✅ Réassigner les utilisateurs aux bonnes organisations
2. ✅ Créer le modal CreateOrganizationModal
3. ✅ Ajouter le sélecteur de franchise dans l'invitation

### **IMPORTANT (Cette semaine):**
4. ✅ Tester l'isolation complète
5. ✅ Créer le dashboard master
6. ✅ Documentation utilisateur

### **NICE TO HAVE (Plus tard):**
7. Migration automatique des données existantes
8. Audit trail des changements d'organisation
9. Statistiques comparatives entre franchises
10. Système de facturation par franchise

---

## 🎯 Résultat Attendu

Après implémentation:

```
Organization: Location Pro Remorque (owner)
  ├── Maxime Giguere (master) ✅
  ├── Philippe Jacob (admin) ✅
  └── 0 garanties

Organization: alex the goat (franchisee)
  ├── gigueremaxime321 (franchisee_admin) ✅
  └── 16 garanties ✅

Organization: Location remorque Saint-nicolas (franchisee)
  ├── [Créer un admin] 🆕
  └── 0 garanties (vide pour l'instant)
```

**Isolation:** ✅ 100% étanche entre franchises
**Permissions:** ✅ Chaque rôle voit ce qu'il doit voir
**Scalabilité:** ✅ Prêt pour des centaines de franchises

---

**Status actuel:** 🟡 Infrastructure prête, interface à compléter
**Effort estimé:** 4-6 heures de développement
**Impact:** 🔴 CRITIQUE - Bloquant pour multi-franchise
