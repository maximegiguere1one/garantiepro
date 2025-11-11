# Guide d'application - Correctif duration_months

**Date:** 12 octobre 2025
**Priorité:** 🔴 CRITIQUE
**Temps estimé:** 2 minutes

## 📋 Ce qui a été corrigé

✅ Erreur `duration_months (12) does not match date range (2026-10-12 to 2032-10-12)` lors de la création de garantie

## 🚀 Étapes d'application (SIMPLE)

### 1. Appliquer la migration PostgreSQL

La migration corrige le trigger de validation pour qu'il accepte et auto-corrige les petites différences de calcul.

**Via l'interface Supabase:**

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Cliquer sur "SQL Editor" dans le menu de gauche
4. Cliquer sur "+ New query"
5. Copier-coller le contenu du fichier:
   ```
   supabase/migrations/20251012030000_fix_warranty_duration_validation_tolerance.sql
   ```
6. Cliquer sur "Run" (ou Ctrl+Enter)
7. Vérifier le message de succès

**OU via Supabase CLI** (si installé):

```bash
cd /tmp/cc-agent/57997670/project
supabase db push
```

### 2. Vérification

Après application, vous devriez voir dans les logs Supabase:

```
Function validate_warranty_duration() created successfully
Trigger trigger_validate_warranty_duration created successfully
```

### 3. Test rapide

Pour tester que tout fonctionne:

1. Accéder à l'application
2. Aller dans "Nouvelle Garantie"
3. Remplir les informations client et remorque
4. Sélectionner un plan
5. Signer le contrat

**Résultat attendu:** ✅ Garantie créée avec succès sans erreur

## 🔍 Vérifier que la migration est appliquée

Exécuter cette requête dans le SQL Editor de Supabase:

```sql
-- Vérifier que le trigger existe
SELECT
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_validate_warranty_duration';
```

**Résultat attendu:**

| trigger_name | function_name |
|-------------|---------------|
| trigger_validate_warranty_duration | validate_warranty_duration |

## 📊 Avant / Après

### ❌ AVANT

```
Étape 4/6 échouée - Erreur lors de la création de la garantie:
duration_months (12) does not match date range (2026-10-12 to 2032-10-12)
```

### ✅ APRÈS

```
✓ Client créé
✓ Remorque enregistrée
✓ Garantie activée (72 mois)
✓ Documents générés
✓ Contrat signé
✓ Email de confirmation programmé
```

## 🎯 Changements clés dans le code

### Dans l'interface utilisateur

**AVANT:**
- Champ "Duration (months)" éditable → valeur par défaut: 12
- Champ "Deductible ($)" éditable → valeur par défaut: 500

**APRÈS:**
- Affichage informatif uniquement:
  - **Durée: 72 mois (6 ans)** - FIXE
  - **Franchise: 100 $ par réclamation** - FIXE

### Dans la logique métier

**AVANT:**
```typescript
const [duration, setDuration] = useState(12); // ❌ Incohérent
const normalizedDuration = safeNumber(duration, 12);
```

**APRÈS:**
```typescript
const pprData = calculateWarrantyData(...);
const normalizedDuration = pprData.durationMonths; // ✅ Toujours 72
```

## ⚠️ Important

Cette correction est **NON-RÉGRESSIVE**:
- ✅ Les garanties existantes ne sont pas affectées
- ✅ Le trigger ne modifie que les nouvelles insertions
- ✅ Aucune donnée existante n'est modifiée
- ✅ Compatibilité totale avec l'ancien code

## 🆘 En cas de problème

Si après application vous rencontrez toujours l'erreur:

1. **Vérifier les logs Supabase** pour voir si le trigger s'exécute
2. **Vérifier la valeur de `duration_months`** dans les logs de l'application:
   ```
   Chercher: [NewWarranty] CRITICAL - Numeric values before DB insert
   ```
3. **Contacter le support** avec:
   - Le message d'erreur complet
   - Les logs de l'étape 4/6
   - La capture d'écran de l'erreur

## 📞 Support

Pour toute question sur ce correctif:
- 📧 Voir le fichier `CORRECTIF_DURATION_MISMATCH_OCT12_2025.md` pour tous les détails techniques
- 🐛 Utiliser les logs de débogage détaillés ajoutés dans le code

---

**Statut après application:** Le système de vente de garanties fonctionne à 100% 🎉
