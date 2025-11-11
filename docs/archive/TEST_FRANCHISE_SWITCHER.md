# 🧪 Test du Sélecteur de Franchise

## ✅ Correctifs Appliqués (NOUVEAU)

### **1. RLS Policy pour Master** ✅
```sql
Le master peut maintenant voir TOUTES les organisations
Même après avoir changé de franchise
```

### **2. Chargement Amélioré** ✅
- Les organisations se chargent dès que le profil est détecté
- Plus de dépendance sur `canSwitchOrganization`
- Logs de debug ajoutés pour tracer les problèmes

### **3. Messages de Chargement** ✅
- "Chargement de la franchise..." → Organisation pas encore chargée
- "Chargement des franchises..." → Liste des franchises en cours de chargement

---

## 🧪 **TEST À FAIRE MAINTENANT**

### **Étape 1: Vider le cache COMPLÈTEMENT**

```
1. F12 → Console
2. Application/Storage → Clear site data
3. OU: Ctrl + Shift + Delete → Vider tout
4. Fermer TOUS les onglets de l'application
5. Rouvrir l'application
```

### **Étape 2: Se connecter en tant que Master**

```
Email: maxime@giguere-influence.com
Rôle attendu: master
```

### **Étape 3: Vérifier la console (F12)**

Vous devriez voir:

```javascript
FranchiseSwitcher Debug: {
  canSwitchOrganization: true,
  activeOrganization: { name: "Location Pro Remorque..." },
  profileRole: "master",
  organizationsCount: 5  // IMPORTANT!
}

FranchiseSwitcher: Profile detected as master/admin, loading orgs
FranchiseSwitcher: Loading organizations...
FranchiseSwitcher: Loaded organizations: 5
```

**Si `organizationsCount: 0`** → Problème RLS, me le dire!

### **Étape 4: Vérifier le dropdown**

Le dropdown devrait afficher **5 franchises:**

```
✓ Location Pro Remorque (Owner)
○ alex the goat (Franchisé)
○ Location remorque Saint-nicolas (Franchisé)
○ Remorques Laval - TEST (Franchisé)
○ Remorques Montréal - TEST (Franchisé)
```

### **Étape 5: Changer vers "alex the goat"**

```
1. Cliquer sur le dropdown
2. Sélectionner "alex the goat"
3. La page va recharger (c'est normal)
4. APRÈS le rechargement:
   - Le dropdown DOIT TOUJOURS être visible
   - Il DOIT afficher les 5 franchises
   - "alex the goat" doit avoir le checkmark ✓
```

### **Étape 6: Vérifier dans la console APRÈS le changement**

```javascript
// Au rechargement, vous devriez voir:
FranchiseSwitcher: Profile detected as master/admin, loading orgs
FranchiseSwitcher: Loading organizations...
FranchiseSwitcher: Loaded organizations: 5  // DOIT être 5!

// Si vous voyez:
FranchiseSwitcher: Loaded organizations: 0
// → PROBLÈME RLS! Me le dire!
```

### **Étape 7: Changer vers une autre franchise**

```
1. Ouvrir à nouveau le dropdown
2. Sélectionner "Remorques Montréal - TEST"
3. Vérifier que ça fonctionne encore
4. Retourner à "Location Pro Remorque"
```

---

## ❌ **Si ça ne marche pas:**

### **Problème 1: Le dropdown disparaît après changement**

**Cause:** Les organisations ne se chargent pas

**Solution:** Regarder la console:
```javascript
// Si vous voyez:
Error loading organizations: {...}

// Copiez-moi l'erreur complète
```

### **Problème 2: organizationsCount: 0**

**Cause:** Problème de permissions RLS

**Test SQL à faire:**
```sql
-- Dans Supabase SQL Editor:
SELECT id, name, type
FROM organizations
ORDER BY type DESC, name;
```

Si ça retourne 0 résultats → me le dire!

### **Problème 3: Le dropdown ne s'ouvre pas**

**Cause:** Erreur JavaScript

**Solution:** Console → Copiez-moi les erreurs rouges

---

## 📊 **Ce qui DOIT fonctionner:**

| Action | Résultat Attendu |
|---|---|
| Connexion master | Dropdown visible avec 5 franchises |
| Clic sur dropdown | Liste s'ouvre |
| Changement franchise #1 | Page recharge, dropdown VISIBLE |
| Changement franchise #2 | Page recharge, dropdown VISIBLE |
| Changement franchise #3 | Page recharge, dropdown VISIBLE |
| Retour à l'original | Fonctionne |

---

## 🐛 **Logs à Vérifier**

### **Au premier chargement:**
```
[AuthContext] Loading profile...
[AuthContext] Profile loaded successfully
FranchiseSwitcher: Profile detected as master/admin
FranchiseSwitcher: Loading organizations...
FranchiseSwitcher: Loaded organizations: 5
```

### **Après changement de franchise:**
```
FranchiseSwitcher: Switching to organization: xxx-xxx-xxx
[AuthContext] Switched to organization: alex the goat
FranchiseSwitcher: Reloading page...

// Après reload:
[AuthContext] Loading profile...
FranchiseSwitcher: Profile detected as master/admin
FranchiseSwitcher: Loading organizations...
FranchiseSwitcher: Loaded organizations: 5  // MUST BE 5!
```

---

## ✅ **Checklist Complète**

- [ ] Cache vidé
- [ ] Connecté avec maxime@giguere-influence.com
- [ ] Dropdown visible au premier chargement
- [ ] 5 franchises dans la liste
- [ ] Changement vers "alex the goat" fonctionne
- [ ] Dropdown TOUJOURS visible après rechargement
- [ ] 5 franchises TOUJOURS dans la liste
- [ ] Changement vers autre franchise fonctionne
- [ ] Retour à Location Pro Remorque fonctionne

---

## 🆘 **Si Problème Persiste**

**Donnez-moi ces infos:**

1. **Console logs** (copiez tout)
2. **Erreurs rouges** (screenshot ou texte)
3. **Résultat de:** `organizationsCount: ?`
4. **Avec quel compte êtes-vous connecté?** (visible en bas de sidebar)

---

**TESTEZ MAINTENANT!** 🚀

Videz le cache, reconnectez-vous, et testez le changement de franchise plusieurs fois!
