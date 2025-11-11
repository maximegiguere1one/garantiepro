# Correctif: Permissions pour Réinitialisation de Mot de Passe

**Date**: 26 octobre 2025
**Statut**: ✅ Corrigé

## 🔴 Problème Identifié

**Erreur**: "Only administrators can reset passwords"

**Cause**: La fonction Edge `send-password-reset` ne reconnaissait que les rôles `admin` et `super_admin`, excluant ainsi:
- `franchisee_admin`
- `master`
- Autres rôles administratifs

## ✅ Solution Appliquée

### 1. Fonction Edge Mise à Jour

**Fichier**: `supabase/functions/send-password-reset/index.ts`

**Avant**:
```typescript
if (requestingProfile.role !== 'admin' && requestingProfile.role !== 'super_admin') {
  throw new Error('Only administrators can reset passwords');
}
```

**Après**:
```typescript
const allowedRoles = ['admin', 'super_admin', 'master', 'franchisee_admin'];
if (!allowedRoles.includes(requestingProfile.role)) {
  throw new Error('Only administrators can reset passwords');
}
```

### 2. Meilleure Gestion des Erreurs

**Fichier**: `src/components/settings/UsersAndInvitationsManagement.tsx`

**Ajouté**:
- Logging détaillé des erreurs
- Message d'erreur plus clair pour l'utilisateur
- Suggestion de recharger la page

```typescript
if (errorMsg.includes('Only administrators')) {
  errorMsg = 'Permissions insuffisantes. Seuls les administrateurs peuvent réinitialiser les mots de passe. Veuillez recharger la page et réessayer.';
}
```

## 🚀 Déploiement Requis

**IMPORTANT**: La fonction Edge doit être redéployée pour que les changements prennent effet.

### Option 1: Déploiement Automatique via Dashboard Supabase

1. Aller sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner votre projet
3. Aller dans **Edge Functions**
4. Trouver la fonction `send-password-reset`
5. Cliquer sur **Deploy**

### Option 2: Déploiement via CLI (si configuré)

```bash
# Si vous avez la Supabase CLI configurée
supabase functions deploy send-password-reset
```

### Option 3: Redéploiement via Git (si configuré avec CI/CD)

```bash
git add .
git commit -m "fix: Allow franchisee_admin and master roles to reset passwords"
git push
```

## 🧪 Test de Validation

Après le déploiement:

1. Recharger la page de l'application
2. Se reconnecter si nécessaire
3. Aller dans **Réglages** → **Utilisateurs & Invitations**
4. Sélectionner un utilisateur
5. Cliquer sur l'icône 🔑 (Key)
6. Entrer un nouveau mot de passe
7. Cliquer sur "Changer"
8. ✅ Le mot de passe devrait être changé avec succès

## 📋 Rôles Autorisés

Après cette correction, les rôles suivants peuvent réinitialiser les mots de passe:

- ✅ **super_admin** - Accès complet
- ✅ **admin** - Administrateur principal
- ✅ **master** - Rôle maître
- ✅ **franchisee_admin** - Administrateur de franchise

## ⚠️ Note Importante

Si vous voyez toujours l'erreur après le déploiement:

1. **Vider le cache**: Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)
2. **Se déconnecter et se reconnecter**
3. **Vérifier votre rôle**: Assurez-vous que votre utilisateur a un des rôles autorisés

## 📞 Diagnostic

Pour vérifier votre rôle actuel:

1. Ouvrir la console du navigateur (F12)
2. Taper:
```javascript
supabase.auth.getUser().then(console.log)
```
3. Vérifier le champ `role` dans le résultat

## ✅ Checklist

- [x] Code de la fonction Edge corrigé
- [x] Gestion des erreurs améliorée
- [x] Documentation créée
- [ ] **Fonction Edge redéployée** ⚠️ À FAIRE
- [ ] Tests de validation effectués

---

**Prochaine étape**: Redéployer la fonction Edge `send-password-reset` sur Supabase.
