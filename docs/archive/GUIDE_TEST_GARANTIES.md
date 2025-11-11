# Guide de Test - Page des Garanties

## État du Système

✅ **Base de données**: Opérationnelle avec 9 garanties
✅ **Fonctions RPC**: Toutes présentes et fonctionnelles
✅ **Code corrigé**: Erreurs JavaScript éliminées
✅ **Build réussi**: Application compilée sans erreurs

## Comment Tester

### 1. Démarrer l'Application

```bash
npm run dev
```

### 2. Se Connecter

- Ouvrez votre navigateur à l'adresse affichée (généralement http://localhost:5173)
- Connectez-vous avec vos identifiants

### 3. Ouvrir la Console du Navigateur

Appuyez sur **F12** (ou Cmd+Option+I sur Mac) pour ouvrir les DevTools.

### 4. Tester la Connexion (Optionnel)

Dans la console, tapez:

```javascript
testWarrantiesConnection()
```

Vous devriez voir:
```
=== TEST CONNEXION GARANTIES ===

1️⃣ Test connexion Supabase...
✅ Connexion Supabase OK

2️⃣ Test comptage garanties...
✅ 9 garanties trouvées

3️⃣ Test chargement garantie...
✅ Garantie chargée: [numéro contrat]
   Client: {...}

4️⃣ Test fonction RPC get_warranties_optimized...
✅ RPC OK - 9 garanties en 200ms

5️⃣ Test vue matérialisée...
✅ Vue matérialisée OK - 9 entrées

=== RÉSUMÉ ===
✅ Tous les tests passés!
📊 Total garanties: 9
⚡ Performance RPC: 200ms
```

### 5. Naviguer vers la Page des Garanties

- Cliquez sur **"Garanties"** dans le menu de navigation
- Observez la console pour les logs

### 6. Logs Attendus (Console)

Vous devriez voir ces messages (sans erreur):

```
[Cache Warmup] Starting cache warmup for organization: [uuid]
[WarrantyService] 🔍 Starting warranty load - Page 1, Filter: all, Search: ""
[WarrantyService] 💾 Cache MISS - fetching fresh data
[WarrantyService] 🚀 Calling RPC function get_warranties_optimized...
[WarrantyService] ⏱️  RPC call completed in 187ms
[WarrantyService] ✅ FAST LOAD: 9 warranties in 187ms
[Cache Warmup] Cache warmup completed successfully
```

### 7. Interface Attendue

Vous devriez voir:

- ✅ Titre: **"Garanties"**
- ✅ Badge de performance (vert si < 500ms)
- ✅ Barre de recherche et filtres
- ✅ **9 cartes de garanties** affichées
- ✅ Informations complètes sur chaque garantie:
  - Numéro de contrat
  - Client (nom, email)
  - Remorque (année, marque, modèle, VIN)
  - Plan de garantie
  - Dates de couverture
  - Prix et marge
  - Boutons d'action (téléchargement PDFs, détails)

## Problèmes Potentiels et Solutions

### Problème 1: "supabase.rpc(...).catch is not a function"

**Cause**: Code non mis à jour

**Solution**:
1. Vérifiez que vous avez bien pull les derniers changements
2. Assurez-vous que `src/lib/warranty-service.ts` contient:
   ```typescript
   supabase
     .rpc('log_query_performance', {...})
     .then(() => {})
     .catch(err => {...});
   ```

### Problème 2: Aucune garantie ne s'affiche

**Cause**: Problème de permissions RLS ou utilisateur non connecté

**Solution**:
1. Vérifiez que vous êtes bien connecté (vérifier le profil dans DevTools)
2. Dans la console, exécutez:
   ```javascript
   // Vérifier l'utilisateur actuel
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user)

   // Vérifier le profil
   const { data: profile } = await supabase
     .from('profiles')
     .select('*')
     .eq('id', user.id)
     .single()
   console.log('Profile:', profile)
   ```

### Problème 3: Chargement très lent (> 2 secondes)

**Cause**: Cache non initialisé ou problème réseau

**Solution**:
1. Vérifiez votre connexion internet
2. Rafraîchissez la vue matérialisée:
   ```sql
   -- Dans Supabase SQL Editor
   REFRESH MATERIALIZED VIEW CONCURRENTLY warranty_list_view;
   ```
3. Videz le cache du navigateur et rechargez

### Problème 4: Erreur "PGRST116" ou timeout

**Cause**: Fonction RPC non disponible ou problème de timeout

**Solution**: Le système va automatiquement utiliser la méthode fallback. Regardez dans les logs pour:
```
[WarrantyService] ⚠️  FALLBACK used: 9 warranties
```

## Métriques de Performance Attendues

| Opération | Temps Cible | Temps Max Acceptable |
|-----------|-------------|---------------------|
| Premier chargement | < 200ms | 500ms |
| Chargement depuis cache | < 50ms | 100ms |
| Changement de page | < 150ms | 300ms |
| Recherche/Filtrage | < 200ms | 400ms |
| Fallback (si RPC échoue) | < 600ms | 1000ms |

## Diagnostic Avancé

Si vous rencontrez des problèmes, exécutez dans la console:

```javascript
// Test complet du système
runWarrantyDiagnostics()

// Statistiques de performance
warrantyService.getPerformanceStats()

// Forcer le rafraîchissement
warrantyService.invalidateCache()
await warrantyService.refreshMaterializedView()
```

## Support

En cas de problème persistant:

1. Copiez les logs de la console
2. Prenez un screenshot de l'erreur
3. Notez:
   - Votre rôle (admin/dealer/client)
   - L'organisation à laquelle vous êtes connecté
   - Les étapes exactes pour reproduire le problème

---

*Guide créé le 8 octobre 2025*
*Version: 1.0 - Post-correction erreur RPC*
