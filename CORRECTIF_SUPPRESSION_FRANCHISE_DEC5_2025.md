# Correctif Système de Suppression de Franchise - 5 Décembre 2025

## Problèmes Identifiés

Votre client a rencontré deux erreurs critiques lors de l'utilisation du système de suppression de franchise:

### Erreur 1: Column "fi.amount" does not exist
```
Error loading franchise stats:
code: "42703"
message: "column fi.amount does not exist"
```

**Cause:** La fonction `get_franchise_deletion_stats` référençait la colonne `fi.amount` qui n'existe pas dans la table `franchise_invoices`. La colonne correcte est `fi.total_amount`.

### Erreur 2: Function parameter mismatch
```
Error loading available franchises:
code: "PGRST202"
message: "Could not find the function public.get_available_destination_franchises(p_exclude_franchise_id) in the schema cache"
hint: "Perhaps you meant to call the function public.get_available_destination_franchises(p_franchise_to_delete_id)"
```

**Cause:** Le composant React appelait la fonction avec le paramètre `p_exclude_franchise_id`, mais la fonction était définie avec `p_franchise_to_delete_id`.

## Corrections Appliquées

### 1. Fonction `get_franchise_deletion_stats`

**Changements:**
- ✅ Remplacé `fi.amount` par `fi.total_amount`
- ✅ Corrigé les statuts de factures impayées: remplacé `'unpaid'` (qui n'existe pas) par `IN ('overdue', 'sent', 'draft')`

**Avant:**
```sql
'unpaid_invoices', COUNT(DISTINCT fi.id) FILTER (WHERE fi.status = 'unpaid'),
'total_unpaid_amount', COALESCE(SUM(fi.amount) FILTER (WHERE fi.status = 'unpaid'), 0),
```

**Après:**
```sql
'unpaid_invoices', COUNT(DISTINCT fi.id) FILTER (WHERE fi.status IN ('overdue', 'sent', 'draft')),
'total_unpaid_amount', COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.status IN ('overdue', 'sent', 'draft')), 0),
```

### 2. Fonction `get_available_destination_franchises`

**Changements:**
- ✅ Renommé le paramètre de `p_franchise_to_delete_id` à `p_exclude_franchise_id`
- ✅ Ajouté `DROP FUNCTION IF EXISTS` pour permettre le changement de signature
- ✅ Mis à jour toutes les références au paramètre dans le corps de la fonction

**Avant:**
```sql
CREATE OR REPLACE FUNCTION get_available_destination_franchises(p_franchise_to_delete_id uuid)
```

**Après:**
```sql
DROP FUNCTION IF EXISTS get_available_destination_franchises(uuid);

CREATE OR REPLACE FUNCTION get_available_destination_franchises(p_exclude_franchise_id uuid)
```

## Migrations Appliquées

### Migration: `fix_franchise_deletion_functions_dec5_v2.sql`
- Corrige les deux fonctions avec les changements mentionnés ci-dessus
- Appliquée avec succès le 5 décembre 2025

### Fichiers Modifiés

1. **Base de données:**
   - Migration appliquée: `supabase/migrations/fix_franchise_deletion_functions_dec5_v2.sql`

2. **Fichiers de migration source:**
   - `supabase/migrations/20251114000000_create_franchise_transfer_and_deletion_system.sql` (mis à jour)
   - `supabase/migrations/20251114175325_create_franchise_transfer_and_deletion_system.sql` (supprimé - doublon)

## Statuts de Factures Valides

Les statuts valides pour la table `franchise_invoices` sont:
- `draft` - Brouillon
- `sent` - Envoyée
- `paid` - Payée
- `overdue` - En retard
- `cancelled` - Annulée

**Note:** Le statut `'unpaid'` n'existe pas dans le schéma. Les factures non payées sont identifiées par les statuts `overdue`, `sent`, ou `draft`.

## Vérification du Build

✅ Build réussi sans erreurs
✅ Toutes les dépendances résolues
✅ Aucun problème TypeScript détecté

## Test de Fonctionnement

Les fonctions ont été testées et fonctionnent maintenant correctement:

1. ✅ `get_franchise_deletion_stats` - Retourne les statistiques sans erreur de colonne
2. ✅ `get_available_destination_franchises` - Accepte le bon paramètre et retourne les franchises disponibles

## Prochaines Étapes pour le Client

Le système de suppression de franchise est maintenant 100% fonctionnel. Votre client (Stephane@proremorque.com) peut:

1. **Accéder à la modal de suppression de franchise** sans erreurs
2. **Voir les statistiques complètes** de la franchise à supprimer
3. **Sélectionner une franchise de destination** pour le transfert
4. **Procéder à la suppression** en toute sécurité

## Sécurité

Toutes les fonctions restent sécurisées:
- ✅ Seul le compte master peut supprimer des franchises
- ✅ Vérification d'authentification maintenue
- ✅ RLS (Row Level Security) activé sur toutes les tables
- ✅ Audit complet de toutes les opérations
- ✅ Transaction ACID garantissant l'intégrité des données

## Support

Si des problèmes persistent, vérifier:
1. Le cache du navigateur (Ctrl+Shift+R pour rafraîchir)
2. La connexion à la base de données Supabase
3. Les permissions du compte master

---

**Date:** 5 décembre 2025
**Status:** ✅ Corrections appliquées et testées avec succès
**Version:** Production Ready
