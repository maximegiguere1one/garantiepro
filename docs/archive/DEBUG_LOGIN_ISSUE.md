# 🔍 Debug Login - Rien ne se passe au clic

**Date:** 9 novembre 2025
**Problème:** Bouton "Se connecter" ne fait rien

---

## ✅ Correctif Appliqué

J'ai ajouté des logs de debug dans `LoginPage.tsx` pour identifier le problème.

### Logs Ajoutés

```typescript
// Au chargement du composant
console.log('[LoginPage] useAuth returned:', authContext);
console.log('[LoginPage] signIn function:', typeof signIn);

// Au clic sur "Se connecter"
console.log('[LoginPage] Submit clicked', { email, password: '***' });
console.log('[LoginPage] Calling signIn...');
console.log('[LoginPage] signIn completed');
```

---

## 🔍 Comment Déboguer (Ouvrez la Console)

### 1. Ouvrir DevTools
- **Chrome/Edge:** `F12` ou `Ctrl+Shift+I`
- **Firefox:** `F12`
- Aller dans l'onglet **Console**

### 2. Rafraîchir la Page Login
- Vous devriez voir:
```
[LoginPage] useAuth returned: {user: null, signIn: ƒ, ...}
[LoginPage] signIn function: function
```

### 3. Cliquer sur "Se connecter"
- Vous devriez voir:
```
[LoginPage] Submit clicked {email: "...", password: "***"}
[LoginPage] Calling signIn...
```

---

## 🐛 Scénarios Possibles

### Scénario A: Aucun Log Visible
**Cause:** Le composant ne se charge pas
**Solution:**
- Vérifier que `App.tsx` importe bien `LoginPage`
- Vérifier les erreurs React dans la console

### Scénario B: signIn = undefined
**Cause:** `AuthContext` ne fournit pas la fonction
**Solution:**
```typescript
// Vérifier dans src/contexts/AuthContext.tsx
// Ligne ~700
value: AuthContextValue = {
  signIn,  // ← Doit être présent
  // ...
}
```

### Scénario C: Submit Clicked mais rien après
**Cause:** La fonction `signIn` ne fait rien
**Solution:**
- Vérifier que `signIn` dans `AuthContext.tsx` appelle bien Supabase
- Vérifier les logs `[AuthContext]` dans la console

### Scénario D: Erreur "loadingRef.current"
**Cause:** Guard empêche l'exécution
**Solution:**
```typescript
// AuthContext.tsx ligne 585-590
if (loadingRef.current) {
  logger.debug('Sign in skipped: already loading');
  return; // ← Peut bloquer si loadingRef reste true
}
```

### Scénario E: Mode Demo (Bolt)
**Cause:** En mode Bolt, l'app devrait utiliser demo data
**Solution:**
- Vérifier que vous voyez "Mode Démo Bolt" en haut de la page login
- N'importe quel email/password devrait fonctionner en demo

---

## 🛠️ Correctifs Rapides

### Fix 1: Forcer le Reset du Loading State

```typescript
// Dans AuthContext.tsx, avant signIn
loadingRef.current = false; // Reset au cas où bloqué
```

### Fix 2: Vérifier que signIn est Exporté

```typescript
// Dans AuthContext.tsx ligne ~700
const value: AuthContextValue = {
  user,
  profile,
  session,
  loading,
  signIn,     // ← Doit être ici
  signOut,
  // ...
};
```

### Fix 3: Mode Demo Force

Si vous êtes sur Bolt, ajoutez temporairement:
```typescript
// LoginPage.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // TEMP: Force demo login for Bolt
  if (envInfo.isBolt) {
    alert('Demo mode: Login simulé');
    return;
  }

  // ... rest of code
};
```

---

## 📊 Que Chercher dans Console

### Logs Normaux (Succès)
```
[LoginPage] useAuth returned: {user: null, signIn: ƒ, ...}
[LoginPage] signIn function: function
[LoginPage] Submit clicked {email: "test@example.com", password: "***"}
[LoginPage] Calling signIn...
[AuthContext] Signing in: test@example.com
[AuthContext] Sign in successful
[LoginPage] signIn completed
```

### Logs Problème
```
[LoginPage] useAuth returned: {user: null, signIn: undefined, ...}
                                              ^^^^^^^^^^^ PROBLÈME!
```

OU

```
[LoginPage] Submit clicked {email: "...", password: "***"}
[LoginPage] Calling signIn...
[AuthContext] Sign in skipped: already loading  ← BLOQUÉ!
```

---

## 🚀 Solution Finale

Une fois le problème identifié dans la console, je pourrai:

1. **Si signIn = undefined:** Corriger l'export dans AuthContext
2. **Si bloqué par loadingRef:** Reset le flag
3. **Si erreur Supabase:** Vérifier la connexion réseau
4. **Si mode Bolt:** Activer le mode demo automatiquement

---

## 📞 Prochaine Étape

**Testez maintenant avec DevTools ouvert** et dites-moi:

1. Voyez-vous les logs `[LoginPage]` ?
2. Quel est le `typeof signIn` ?
3. Que se passe-t-il après "Calling signIn..." ?

Avec ces infos, je pourrai corriger précisément le problème !

---

**Note:** Les logs seront supprimés une fois le bug corrigé.
