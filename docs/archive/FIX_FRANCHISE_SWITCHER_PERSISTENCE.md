# 🔧 Fix: Persistance du Changement de Franchise

## ✅ PROBLÈME IDENTIFIÉ ET CORRIGÉ

### **Problème:**
Quand vous changiez de franchise, après le rechargement ça revenait toujours à "Location Pro Remorque"!

### **Cause Racine:**
Le système sauvegardait bien la franchise active dans `sessionStorage`, MAIS le chargement ne la restaurait pas correctement. La logique vérifiait `canSwitch` trop tôt.

---

## ✅ **CORRECTIF APPLIQUÉ:**

### **Avant (Bugué):**
```typescript
// Définir activeOrganization à l'org de l'utilisateur
setActiveOrganization(orgData);

// PUIS vérifier si stored org existe
if (storedActiveOrgId && canSwitch) {
  // Charger async... mais trop tard!
}
```

### **Après (Corrigé):**
```typescript
// Vérifier FIRST si stored org existe
const storedActiveOrgId = sessionStorage.getItem('active_organization_id');

if (storedActiveOrgId && canSwitch && storedActiveOrgId !== orgData?.id) {
  // Charger la stored org directement!
  // Avec fallback si erreur
} else {
  // Utiliser l'org de l'utilisateur
  setActiveOrganization(orgData);
}
```

---

## 🧪 **TEST CRITIQUE:**

### **Étape 1: VIDER LE CACHE COMPLÈTEMENT**
```
F12 → Application → Storage → Clear site data
OU
Ctrl + Shift + Delete → Tout vider
PUIS
Fermer TOUS les onglets
Rouvrir l'application
```

### **Étape 2: Se connecter**
```
Email: maxime@giguere-influence.com
```

### **Étape 3: Vérifier la console (F12)**

Vous devriez voir:
```javascript
[AuthContext] Setting canSwitchOrganization to: true (role: master)
[AuthContext] Checking stored active organization: null  // Première fois!
[AuthContext] Setting activeOrganization to user's org: Location Pro Remorque...
```

**Vous êtes sur "Location Pro Remorque" ✅**

### **Étape 4: Changer vers "alex the goat"**

1. Ouvrir le dropdown
2. Cliquer sur "alex the goat"
3. La page va recharger

**Pendant le changement, dans la console:**
```javascript
FranchiseSwitcher: Switching to organization: 4286fe95-1cbe-4942-a4ba...
[AuthContext] Switched to organization: alex the goat {
  organizationId: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe",
  storedInSession: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe"  // SAUVEGARDÉ!
}
FranchiseSwitcher: Reloading page...
```

### **Étape 5: APRÈS le rechargement - LOG CRITIQUE**

**Dans la console, vous DEVEZ voir:**
```javascript
[AuthContext] Setting canSwitchOrganization to: true (role: master)
[AuthContext] Checking stored active organization: 4286fe95-1cbe-4942-a4ba-4e7d569ad2fe
[AuthContext] Loading stored active organization: 4286fe95-1cbe-4942-a4ba...
[AuthContext] Restored active organization: alex the goat  // ✅ RESTAURÉ!
```

**ET le dropdown DOIT afficher "alex the goat" avec le checkmark ✓**

### **Étape 6: Changer vers une 3e franchise**

```
1. Dropdown → "Remorques Montréal - TEST"
2. Page recharge
3. Vous DEVEZ rester sur "Remorques Montréal - TEST"
```

### **Étape 7: Retour à "Location Pro Remorque"**

```
1. Dropdown → "Location Pro Remorque"
2. Page recharge
3. Vous DEVEZ rester sur "Location Pro Remorque"
```

---

## ✅ **Résultats Attendus:**

| Action | Résultat Attendu |
|---|---|
| Première connexion | Location Pro Remorque |
| Switch → alex | Reste sur alex après reload |
| Switch → Montréal | Reste sur Montréal après reload |
| Switch → Location Pro | Reste sur Location Pro après reload |
| Fermer onglet et rouvrir | Reste sur la dernière franchise active |

---

## 🔍 **Logs à Vérifier:**

### **Au changement de franchise:**
```javascript
[AuthContext] Switched to organization: alex the goat {
  storedInSession: "4286fe95-xxx"  // DOIT être l'ID de la franchise!
}
```

### **Au rechargement:**
```javascript
[AuthContext] Checking stored active organization: 4286fe95-xxx
[AuthContext] Loading stored active organization: 4286fe95-xxx
[AuthContext] Restored active organization: alex the goat  // ✅
```

**Si vous voyez:**
```javascript
[AuthContext] Checking stored active organization: null
```
**→ sessionStorage n'a pas été sauvegardé!**

---

## ❌ **Si ça ne marche TOUJOURS pas:**

### **Test 1: Vérifier sessionStorage manuellement**

Dans la console:
```javascript
// Après avoir changé de franchise:
sessionStorage.getItem('active_organization_id')
// DOIT retourner l'ID de la franchise active!
// Ex: "4286fe95-1cbe-4942-a4ba-4e7d569ad2fe"
```

**Si `null`** → Le save ne fonctionne pas!

### **Test 2: Vérifier les logs de chargement**

Copiez-moi TOUS les logs qui contiennent:
- `[AuthContext] Checking stored active organization`
- `[AuthContext] Loading stored active organization`
- `[AuthContext] Restored active organization`
- `[AuthContext] Switched to organization`

---

## 🆘 **Debug:**

Si après le reload vous voyez:
```javascript
[AuthContext] Setting activeOrganization to user's org: Location Pro Remorque
```

**Au lieu de:**
```javascript
[AuthContext] Restored active organization: alex the goat
```

**Alors il y a un problème dans la restauration!**

Donnez-moi:
1. La valeur de `sessionStorage.getItem('active_organization_id')`
2. Tous les logs `[AuthContext]` au rechargement
3. Le nom de la franchise qui s'affiche dans le dropdown

---

## 📋 **Checklist:**

- [ ] Cache complètement vidé
- [ ] Reconnecté en tant que master
- [ ] Changé vers "alex the goat"
- [ ] Console affiche "Switched to organization: alex the goat"
- [ ] sessionStorage contient le bon ID
- [ ] Page recharge automatiquement
- [ ] Console affiche "Restored active organization: alex the goat"
- [ ] Dropdown affiche "alex the goat" avec ✓
- [ ] Garanties affichées sont celles d'alex
- [ ] Changement vers autre franchise fonctionne
- [ ] Retour à Location Pro fonctionne

---

**TESTEZ MAINTENANT!** 🚀

1. Videz COMPLÈTEMENT le cache
2. Reconnectez-vous
3. Changez de franchise
4. Vérifiez les logs!
