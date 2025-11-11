# 🐛 DEBUG: Garanties ne s'affichent pas

**Problème:** L'application dit "5 garanties" mais ne les affiche pas
**Cause probable:** Mauvais paramètres RPC ou problème d'auth context

---

## ✅ CORRECTIF APPLIQUÉ

### Fichier: `src/lib/warranty-service.ts`

**Changement 1: Noms de paramètres RPC**
```typescript
// AVANT (INCORRECT ❌)
const { data, error } = await supabase.rpc('get_warranties_optimized', {
  p_limit: pageSize,      // ❌ Mauvais nom
  p_offset: offset,       // ❌ Mauvais nom
  p_status: statusFilter, // ❌ Mauvais nom
  p_search: searchQuery   // ❌ Mauvais nom
});

// APRÈS (CORRECT ✅)
const { data, error } = await supabase.rpc('get_warranties_optimized', {
  p_page: page,                    // ✅ Correct
  p_page_size: pageSize,           // ✅ Correct
  p_status_filter: statusFilter,   // ✅ Correct
  p_search_query: searchQuery      // ✅ Correct
});
```

**Changement 2: Debug logging ajouté**
```typescript
console.log('[WarrantyService] Calling get_warranties_optimized with:', {
  p_page: page,
  p_page_size: pageSize,
  p_status_filter: statusFilter,
  p_search_query: searchQuery
});

console.log('[WarrantyService] RPC Response:', {
  hasError: !!error,
  hasData: !!data,
  dataLength: Array.isArray(data) ? data.length : 'not array',
  data: data
});
```

---

## 🧪 COMMENT TESTER (5 MIN)

### Étape 1: Ouvre l'application
1. Lance l'app (`npm run dev` ou ouvre le build)
2. Connecte-toi avec ton compte
3. Va sur la page **Garanties**

### Étape 2: Ouvre la console (F12)
1. Appuie sur **F12**
2. Va dans l'onglet **Console**
3. Cherche les logs `[WarrantyService]`

### Étape 3: Analyse les logs

#### ✅ Si tu vois ça (BON):
```
[WarrantyService] Calling get_warranties_optimized with: {
  p_page: 1,
  p_page_size: 10,
  p_status_filter: "all",
  p_search_query: ""
}
[WarrantyService] RPC Response: {
  hasError: false,
  hasData: true,
  dataLength: 5,
  data: [{...}, {...}, ...]
}
[WarrantiesList] Successfully loaded 5 warranties
```
→ **Les garanties DEVRAIENT s'afficher!**

#### ❌ Si tu vois ça (PROBLÈME):
```
[WarrantyService] RPC Response: {
  hasError: false,
  hasData: true,
  dataLength: 0,
  data: []
}
[WarrantyService] get_warranties_optimized returned empty or invalid
```
→ **Problème d'authentification ou RLS**

---

## 🔍 DIAGNOSTIC AVANCÉ

### Si data est vide (length: 0):

**Test 1: Vérifie l'utilisateur**
```javascript
// Dans la console du navigateur
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id, user?.email);
```

**Test 2: Vérifie le profil**
```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
console.log('Profile:', profile);
```

**Test 3: Teste la fonction RPC directement**
```javascript
const { data, error } = await supabase.rpc('get_warranties_optimized', {
  p_page: 1,
  p_page_size: 10,
  p_status_filter: 'all',
  p_search_query: ''
});
console.log('Direct RPC call:', { data, error });
```

### Si RPC retourne une erreur:

**Erreur possible:** "permission denied for function get_warranties_optimized"
**Solution:** Vérifier les permissions de la fonction

```sql
-- Dans Supabase SQL Editor:
GRANT EXECUTE ON FUNCTION get_warranties_optimized TO authenticated;
```

**Erreur possible:** "function get_warranties_optimized does not exist"
**Solution:** La fonction n'est pas déployée

```sql
-- Vérifier si la fonction existe:
SELECT proname FROM pg_proc WHERE proname = 'get_warranties_optimized';
```

---

## 🛠️ SOLUTIONS SELON LE PROBLÈME

### Problème 1: Fonction retourne vide mais data existe en DB

**Cause:** RLS policy trop restrictive
**Solution:** Vérifie ton organisation_id

```sql
-- Dans Supabase SQL Editor, connecté comme ton user:
SELECT
  p.id,
  p.email,
  p.organization_id,
  o.name as org_name,
  COUNT(w.id) as warranty_count
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN warranties w ON w.organization_id = p.organization_id
WHERE p.id = auth.uid()
GROUP BY p.id, p.email, p.organization_id, o.name;
```

Si `warranty_count` = 0 mais tu sais qu'il y a des garanties:
→ Les garanties ont un `organization_id` différent!

**Fix:**
```sql
-- Mettre à jour l'organization_id des garanties
UPDATE warranties
SET organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
WHERE organization_id IS NULL OR organization_id != (SELECT organization_id FROM profiles WHERE id = auth.uid());
```

### Problème 2: Erreur "auth.uid() is null"

**Cause:** Token JWT non envoyé ou expiré
**Solution:**
1. Déconnecte-toi
2. Reconnecte-toi
3. Rafraîchis la page

### Problème 3: Fonction appelle réussie mais UI ne s'actualise pas

**Cause:** React state ou render issue
**Solution:** Force refresh

```javascript
// Dans la console
window.location.reload();
```

---

## 📊 CHECKLIST DE VÉRIFICATION

Coche chaque élément:

- [ ] Build réussi (`npm run build`)
- [ ] Console montre `[WarrantyService]` logs
- [ ] RPC response a `dataLength > 0`
- [ ] Aucune erreur dans la console
- [ ] User est authentifié (`auth.uid()` != null)
- [ ] Profile a un `organization_id`
- [ ] Warranties ont le bon `organization_id`
- [ ] Fonction RPC existe en DB
- [ ] Les garanties s'affichent dans l'UI

---

## 🎯 SI TOUT ÉCHOUE

### Option 1: Utilise la méthode fallback

Édite temporairement `src/lib/warranty-service.ts`:

```typescript
// Ligne ~119, FORCE le fallback:
public async getWarrantiesOptimized(...): Promise<WarrantyListResponse> {
  const startTime = performance.now();

  // DÉSACTIVE RPC, utilise fallback direct
  return await this.getWarrantiesFallback(page, pageSize, statusFilter, searchQuery, startTime);
}
```

### Option 2: Debug la vue directement

```sql
-- Dans Supabase SQL Editor
SELECT COUNT(*) FROM warranty_list_view;
-- Devrait montrer tes 5-7 garanties

-- Test avec ton user
SELECT * FROM warranty_list_view
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
LIMIT 5;
```

---

## 📞 RÉSULTATS ATTENDUS

Après le fix, tu devrais voir:

✅ Console: `[WarrantiesList] Successfully loaded 5 warranties`
✅ UI: Liste de 5 garanties avec détails
✅ Pagination: "1-5 sur 5"
✅ Filtres: Fonctionnent correctement

---

## 💡 POURQUOI ÇA MARCHAIT PAS?

**Root cause:** Les noms de paramètres RPC étaient incorrects.

La fonction SQL attend:
- `p_page` (pas `p_limit`)
- `p_page_size` (pas `p_offset`)
- `p_status_filter` (pas `p_status`)
- `p_search_query` (pas `p_search`)

Quand les paramètres ne correspondent pas, PostgreSQL utilise les valeurs DEFAULT de la fonction, ce qui peut retourner un result set vide selon la logique.

---

**Build:** ✅ Réussi
**Logs:** ✅ Ajoutés
**Fix:** ✅ Appliqué

**Teste maintenant et partage les logs de la console!** 🚀
