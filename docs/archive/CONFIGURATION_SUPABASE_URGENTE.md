# ⚠️ Configuration URGENTE Supabase Dashboard

**Le lien dans l'email pointe vers localhost car Supabase Auth n'est pas configuré!**

---

## 🔴 PROBLÈME

Quand vous créez une invitation, l'email contient un lien qui pointe vers:
```
http://localhost:5173/reset-password
```

Au lieu de:
```
https://www.garantieproremorque.com/reset-password
```

---

## ✅ SOLUTION (5 minutes)

### Étape 1: Configurer Auth Settings

1. **Ouvrir:** [Supabase Dashboard](https://app.supabase.com)
2. **Sélectionner:** Votre projet
3. **Navigation:** Menu gauche → **Authentication** → **Configuration**

### Étape 2: Modifier Site URL

Dans la section **URL Configuration**:

1. Trouver le champ **Site URL**
2. **Remplacer:**
   ```
   Ancien: http://localhost:5173
   Nouveau: https://www.garantieproremorque.com
   ```
3. **NE PAS** mettre de `/` à la fin

### Étape 3: Ajouter Redirect URLs

Dans la section **Redirect URLs**:

1. Cliquer sur **Add URL**
2. Ajouter ces 3 URLs (une par une):
   ```
   https://www.garantieproremorque.com/reset-password
   https://www.garantieproremorque.com/setup
   https://www.garantieproremorque.com/auth/callback
   ```

### Étape 4: Sauvegarder

1. Faire défiler en bas de la page
2. Cliquer sur **Save**
3. Attendre le message de confirmation

---

## 🧪 TESTER

### Test 1: Créer une invitation

1. Aller dans votre app → Paramètres → Utilisateurs
2. Cliquer "Inviter un utilisateur"
3. Choisir mode "Envoyer par email"
4. Créer l'invitation
5. Vérifier l'email reçu
6. **Le lien doit pointer vers `https://www.garantieproremorque.com`**

### Test 2: Mode manuel (nouveau!)

1. Cliquer "Inviter un utilisateur"
2. Choisir mode "Création manuelle"
3. Entrer email + rôle + mot de passe
4. Créer l'utilisateur
5. **Les credentials s'affichent dans un modal**
6. Copier et partager avec l'utilisateur

---

## 📋 Ce Qui Est Nouveau

### 1. Mode Création Manuelle
- **VOUS définissez le mot de passe**
- Aucun email n'est envoyé
- Les credentials s'affichent immédiatement
- Vous les partagez manuellement

### 2. Accès Utilisateurs Corrigé
- Plus de message "Accès restreint"
- Les admins peuvent gérer les utilisateurs
- Les franchisee_admin peuvent gérer leurs employés

---

## ⚡ Résumé

**Avant configuration:**
- Email → lien localhost ❌
- Ne fonctionne pas ❌

**Après configuration:**
- Email → lien production ✅
- Fonctionne partout ✅
- Mode manuel disponible ✅

---

## 🆘 Si Problème Persiste

1. Vider le cache du navigateur
2. Tester en navigation privée
3. Vérifier que vous avez bien sauvegardé dans Supabase
4. Attendre 1-2 minutes (propagation)

---

**Date:** 26 octobre 2025
**Temps:** 5 minutes de configuration
**Statut:** Code déployé, configuration requise
