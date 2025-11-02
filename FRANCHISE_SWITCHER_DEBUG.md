# 🔍 Debug du Sélecteur de Franchise

## ✅ Correctifs Appliqués

### **1. is_master_account mis à jour** ✅
```sql
UPDATE profiles
SET is_master_account = true
WHERE email = 'maxime@giguere-influence.com';
```

### **2. Initialisation de activeOrganization améliorée** ✅
- `activeOrganization` est maintenant défini immédiatement (synchrone)
- Pas d'attente sur le chargement async

---

## 📋 Checklist de Dépannage

### **Étape 1: Vérifier votre compte**

**Quel compte utilisez-vous?**

Vous avez 3 comptes Maxime:

| Email | Rôle | Organisation | Peut changer? |
|---|---|---|---|
| maxime@giguere-influence.com | **master** ✅ | Location Pro Remorque | **OUI** ✅ |
| maxime@agence1.com | super_admin | alex the goat | NON ❌ |
| gigueremaxime321@gmail.com | franchisee_admin | alex the goat | NON ❌ |

**👉 Assurez-vous d'être connecté avec:** `maxime@giguere-influence.com`

---

### **Étape 2: Vider le cache et se reconnecter**

```
1. Ouvrir la console (F12)
2. Application/Storage → Clear site data
3. OU: Ctrl + Shift + R (hard refresh)
4. Se déconnecter complètement
5. Se reconnecter avec maxime@giguere-influence.com
```

---

### **Étape 3: Vérifier dans la console**

Ouvrir la console (F12) et chercher:

```javascript
// Devrait afficher:
FranchiseSwitcher Debug: {
  canSwitchOrganization: true,
  activeOrganization: { id: "...", name: "Location Pro Remorque", ... },
  profileRole: "master"
}
```

**Si vous voyez:**
- `canSwitchOrganization: false` → Mauvais compte ou rôle
- `activeOrganization: null` → Organisation pas chargée
- `profileRole: "franchisee_admin"` → Mauvais compte

---

### **Étape 4: Vérifier la sidebar**

Le dropdown devrait apparaître **en haut de la sidebar**, juste avant le menu de navigation:

```
┌─────────────────────────────────────┐
│  Pro-Remorque                       │
│                                     │
│  🏢 Franchise active: ▼             │ ← ICI!
│     Location Pro Remorque           │
│                                     │
│  📊 Tableau de bord                 │
│  👥 Clients                         │
│  📄 Garanties                       │
│  ...                                │
└─────────────────────────────────────┘
```

---

## 🔧 Si ça ne fonctionne toujours pas

### **Diagnostic SQL:**

Exécutez cette requête pour vérifier votre compte:

```sql
-- Vérifier votre profil actuel
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_master_account,
  o.name as organization_name,
  o.type as organization_type
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
WHERE p.email = 'maxime@giguere-influence.com';
```

**Résultat attendu:**
```
email: maxime@giguere-influence.com
role: master
is_master_account: true
organization_name: Location Pro Remorque - Compte Maître
organization_type: owner
```

---

### **Forcer le rôle master:**

Si votre compte n'est pas master:

```sql
UPDATE profiles
SET
  role = 'master',
  is_master_account = true,
  organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE email = 'maxime@giguere-influence.com';
```

---

## 🎯 Test Rapide

### **1. Console du navigateur:**
```javascript
// Dans la console:
console.log('Auth:', window.localStorage);
console.log('Session:', window.sessionStorage);
```

### **2. Vérifier les logs:**
Chercher dans la console:
- `[AuthContext]` - Logs d'authentification
- `FranchiseSwitcher Debug` - État du switcher
- `Restored active organization` - Organisation restaurée

---

## 📱 Où devrait apparaître le switcher?

### **Position exacte:**

```
DashboardLayoutV2
  └─ Sidebar (gauche)
      ├─ Logo "Pro-Remorque"
      ├─ (Developer mode toggle si actif)
      ├─ 🏢 FranchiseSwitcher ← ICI!
      ├─ Navigation (menu)
      └─ User profile (bas)
```

---

## 🐛 Logs de Debug Actifs

Le composant affiche maintenant des logs dans la console:

```javascript
// Au chargement:
FranchiseSwitcher Debug: {
  canSwitchOrganization: true/false,
  activeOrganization: {...},
  profileRole: "master"
}

// Si pas de permission:
"FranchiseSwitcher: Cannot switch - permission denied or not loaded yet"

// Si pas d'organisation:
"FranchiseSwitcher: No active organization yet"
```

---

## ✅ Une fois que ça fonctionne

Vous devriez voir:

```
┌─────────────────────────────────────┐
│  🏢 Franchise active:               │
│     Location Pro Remorque           │
│     [▼]                             │
└─────────────────────────────────────┘
```

Cliquez dessus et vous devriez voir **toutes les franchises**:
- Location Pro Remorque (Owner) ✓
- alex the goat (Franchisé)
- Location remorque Saint-nicolas (Franchisé)
- Remorques Montréal TEST (Franchisé)
- Remorques Laval TEST (Franchisé)

---

## 🆘 Support

**Si ça ne fonctionne toujours pas après ces étapes:**

1. Vérifiez dans la console les messages d'erreur
2. Copiez les logs de la console
3. Vérifiez avec quel compte vous êtes connecté (regarder en bas de la sidebar)
4. Assurez-vous d'avoir fait un hard refresh (Ctrl+Shift+R)

---

**Les correctifs sont appliqués!**
Maintenant:
1. **Videz le cache** (Ctrl+Shift+R)
2. **Reconnectez-vous** avec maxime@giguere-influence.com
3. **Le dropdown devrait apparaître!** 🎉
