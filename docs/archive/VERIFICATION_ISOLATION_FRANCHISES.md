# Vérification de l'Isolation des Données par Franchise

## Résumé des Changements Appliqués

Les politiques RLS (Row Level Security) ont été mises à jour pour garantir une isolation stricte des données entre les franchisés.

### Migrations Appliquées

1. **fix_franchisee_warranty_isolation** - Isolation des garanties
2. **fix_customers_warranty_claims_isolation** - Isolation des clients et réclamations

## Nouvelles Fonctions de Sécurité

### `is_master_admin()`
Vérifie si l'utilisateur actuel est un administrateur master.

### `user_can_access_organization(target_org_id)`
Vérifie si l'utilisateur peut accéder à une organisation spécifique:
- ✅ L'utilisateur appartient à l'organisation cible
- ✅ L'utilisateur est master admin ET l'organisation cible est une franchisée de son organisation

## Politiques RLS Appliquées

### Table `warranties`

| Politique | Opération | Description |
|-----------|-----------|-------------|
| Clients view own warranties | SELECT | Les clients voient uniquement leurs propres garanties |
| Franchisees view own org warranties | SELECT | Les franchisés voient uniquement les garanties de leur organisation |
| Franchisees insert own org warranties | INSERT | Les franchisés ne peuvent créer que des garanties pour leur organisation |
| Franchisees update own org warranties | UPDATE | Les franchisés ne peuvent modifier que les garanties de leur organisation |
| Admins delete own org warranties | DELETE | Seuls les admins peuvent supprimer les garanties de leur organisation |

### Table `customers`

| Politique | Opération | Description |
|-----------|-----------|-------------|
| Clients view own record | SELECT | Les clients voient uniquement leur propre fiche |
| Franchisees view own org customers | SELECT | Les franchisés voient uniquement les clients de leur organisation |
| Franchisees insert own org customers | INSERT | Les franchisés ne peuvent créer que des clients pour leur organisation |
| Franchisees update own org customers | UPDATE | Les franchisés ne peuvent modifier que les clients de leur organisation |
| Admins delete own org customers | DELETE | Seuls les admins peuvent supprimer les clients de leur organisation |

### Table `warranty_claims` (si elle existe)

Même logique d'isolation appliquée via la relation avec les garanties.

## Règles d'Isolation

### ✅ Ce qui est PERMIS:

1. **Franchisé A** peut:
   - ✅ Voir ses propres garanties
   - ✅ Voir ses propres clients
   - ✅ Créer de nouvelles garanties pour son organisation
   - ✅ Modifier ses propres garanties

2. **Master Admin** peut:
   - ✅ Voir toutes les garanties de toutes ses franchises
   - ✅ Voir tous les clients de toutes ses franchises
   - ✅ Gérer les données de toutes ses franchises

3. **Client** peut:
   - ✅ Voir uniquement ses propres garanties
   - ✅ Voir uniquement sa propre fiche client

### ❌ Ce qui est INTERDIT:

1. **Franchisé A** ne peut PAS:
   - ❌ Voir les garanties du Franchisé B
   - ❌ Voir les clients du Franchisé B
   - ❌ Créer des garanties pour le Franchisé B
   - ❌ Modifier les garanties du Franchisé B

2. **Client A** ne peut PAS:
   - ❌ Voir les garanties du Client B
   - ❌ Voir la fiche du Client B

## Comment Tester l'Isolation

### Test 1: Vérifier l'isolation entre franchisés

```sql
-- Se connecter en tant qu'utilisateur du Franchisé A
-- Cette requête ne devrait retourner QUE les garanties du Franchisé A
SELECT COUNT(*) as my_warranties
FROM warranties;

-- Vérifier l'organization_id
SELECT DISTINCT organization_id
FROM warranties;
-- Devrait retourner UN SEUL organization_id (celui du franchisé connecté)
```

### Test 2: Vérifier l'accès du Master Admin

```sql
-- Se connecter en tant qu'admin master
-- Cette requête devrait retourner toutes les garanties de toutes les franchises
SELECT
  o.name as franchise_name,
  COUNT(w.id) as num_warranties
FROM warranties w
INNER JOIN organizations o ON w.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;
```

### Test 3: Vérifier l'isolation des clients

```sql
-- Se connecter en tant que client
-- Cette requête ne devrait retourner QUE ses propres garanties
SELECT
  w.warranty_number,
  w.vehicle_make,
  w.vehicle_model
FROM warranties w
INNER JOIN customers c ON w.customer_id = c.id
WHERE c.user_id = auth.uid();
```

## État Actuel du Système

D'après la base de données:

| Organisation | Type | Utilisateurs | Garanties |
|-------------|------|--------------|-----------|
| alex the goat | franchisee | 3 | 5 |
| Location remorque Saint-nicolas | franchisee | 0 | 0 |
| Location Pro Remorque - Compte Maître | owner | 0 | 0 |

## Vérification dans l'Application

### Pour un utilisateur franchisé:

1. Se connecter avec un compte franchisé
2. Aller dans "Garanties"
3. Vérifier que seules les garanties de SA franchise sont affichées
4. Le nombre total doit correspondre uniquement aux garanties de son organisation

### Pour un administrateur master:

1. Se connecter avec un compte master
2. Aller dans "Garanties"
3. Vérifier que toutes les garanties de toutes les franchises sont affichées
4. Possibilité de filtrer par franchise

## Sécurité Garantie

- ✅ **Isolation stricte par organization_id**
- ✅ **Pas de bypass possible via les politiques RLS**
- ✅ **Les requêtes SQL directes sont filtrées automatiquement**
- ✅ **Les API REST Supabase appliquent les politiques**
- ✅ **Protection au niveau de la base de données (impossible à contourner côté client)**

## Prochaines Étapes

Si vous constatez qu'un franchisé peut voir les données d'un autre franchisé:

1. Vérifier l'`organization_id` de l'utilisateur dans la table `profiles`
2. Vérifier l'`organization_id` des garanties affichées
3. Consulter les logs d'erreur dans la console du navigateur
4. Tester avec les requêtes SQL ci-dessus pour identifier le problème
