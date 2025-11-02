# 🧪 Test d'Isolation des Franchises

## ✅ CORRECTIFS APPLIQUÉS

### **1. RPC Functions Mises à Jour** ✅
```sql
get_warranties_optimized + get_warranties_simple
→ Nouveau paramètre: p_organization_id
→ Master peut voir n'importe quelle franchise
→ Autres utilisateurs voient seulement leur franchise
```

### **2. Frontend Mis à Jour** ✅
```typescript
WarrantiesList passe maintenant activeOrganization.id
→ Les garanties se rechargent quand on change de franchise
```

### **3. Logs de Debug Ajoutés** ✅
```
Vous verrez l'organization_id dans les logs!
```

---

## 🧪 **TEST CRITIQUE:**

### **Étape 1: Hard Refresh**
```
Ctrl + Shift + R
```

### **Étape 2: Se connecter en tant que Master**
```
Email: maxime@giguere-influence.com
```

### **Étape 3: Vérifier la page Garanties**

**Vous devriez voir les garanties de "Location Pro Remorque"**

Dans la console (F12):
```javascript
[WarrantiesList] Loading warranties - attempt 1 {
  organizationId: "a0000000-0000-0000-0000-000000000001",
  organizationName: "Location Pro Remorque - Compte Maître"
}

[WarrantyService] Calling get_warranties_optimized with: {
  organizationId: "a0000000-0000-0000-0000-000000000001"
}
```

### **Étape 4: Changer vers "alex the goat"**

1. Cliquer sur le dropdown franchise
2. Sélectionner "alex the goat"
3. La page recharge

**Après rechargement, dans la console:**
```javascript
[WarrantiesList] Loading warranties - attempt 1 {
  organizationId: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe",
  organizationName: "alex the goat"
}
```

**Les garanties affichées DOIVENT être différentes!**

### **Étape 5: Compter les garanties**

**Test:**
- Franchise A → X garanties
- Changer vers Franchise B → Y garanties (différent!)
- Retour vers Franchise A → X garanties (pareil!)

---

## ✅ **Ce qui DOIT fonctionner:**

| Test | Résultat Attendu |
|---|---|
| Location Pro Remorque | Voir UNIQUEMENT ses garanties |
| Changement → alex the goat | Voir UNIQUEMENT les garanties d'alex |
| Changement → autre franchise | Voir UNIQUEMENT les garanties de cette franchise |
| Retour → Location Pro Remorque | Revoir ses garanties |

---

## 🚫 **Ce qui NE DOIT PAS arriver:**

- ❌ Voir toutes les garanties de toutes les franchises
- ❌ Voir les mêmes garanties après changement
- ❌ Timeout (18 secondes) → Devrait être plus rapide maintenant!

---

## 📊 **Vérification SQL Directe:**

Pour tester manuellement dans Supabase SQL Editor:

```sql
-- En tant que master, voir les garanties de "alex the goat"
SELECT
  id,
  contract_number,
  organization_id
FROM get_warranties_optimized(
  1,  -- page
  10, -- page_size
  'all', -- status
  '', -- search
  '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe'  -- alex the goat
);
```

**Résultat attendu:** Seulement les garanties où `organization_id = 4286fe95-1cbe-4942-a4ba-4e7d569ad2fe`

---

## 🐛 **Si les garanties ne sont PAS isolées:**

**Cherchez dans la console:**

```javascript
// DOIT afficher l'organizationId correct!
[WarrantyService] Calling get_warranties_optimized with: {
  organizationId: "???"  // DOIT changer quand vous changez de franchise!
}
```

**Si `organizationId: undefined`** → Problème dans le code
**Si `organizationId` ne change pas** → activeOrganization ne se met pas à jour

---

## 📈 **Performance Attendue:**

**Avant:**
```
[WarrantyService] Slow query: get_warranties_simple - 18481ms ❌
```

**Après:**
```
[WarrantyService] Query successful - 500ms ✅
```

Le filtre par organization_id devrait accélérer MASSIVEMENT les requêtes!

---

## ✅ **Checklist Complète:**

- [ ] Hard refresh fait
- [ ] Connecté en tant que master
- [ ] Page Garanties affiche les garanties de Location Pro Remorque
- [ ] Console log affiche le bon organization_id
- [ ] Changement vers alex the goat fonctionne
- [ ] Les garanties affichées changent
- [ ] Console log affiche le nouveau organization_id
- [ ] Changement vers une 3e franchise fonctionne
- [ ] Retour à Location Pro Remorque affiche les bonnes garanties
- [ ] Pas de timeout
- [ ] Performance améliorée

---

## 🆘 **Si ça ne marche pas:**

Donnez-moi:
1. **Les logs complets de la console**
2. **Le organization_id affiché dans les logs**
3. **Le nombre de garanties affichées pour chaque franchise**
4. **Les erreurs (s'il y en a)**

---

**TESTEZ MAINTENANT!** 🚀

Hard refresh, connectez-vous, et testez le changement de franchise plusieurs fois!
