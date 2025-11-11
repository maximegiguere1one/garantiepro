# Guide: Promotion de Maxime au Rôle Master

## Solution Simplifiée pour Bolt Database

Vous avez maintenant un outil web simple pour promouvoir **maxime@giguere-influence.com** au rôle Master, sans avoir besoin d'accès SQL direct!

---

## 🚀 Étapes Rapides

### 1. Accédez à la Page de Promotion

Ouvrez votre navigateur et allez à:

```
https://votre-domaine.com/promote-master.html
```

Ou en local:
```
http://localhost:5173/promote-master.html
```

### 2. Cliquez sur le Bouton

Sur la page, vous verrez:
- Email confirmé: **maxime@giguere-influence.com**
- Badge: **→ Rôle Master**
- Bouton: **"Promouvoir au rôle Master"**

**Cliquez simplement sur le bouton!**

### 3. Attendez la Confirmation

Le processus prend quelques secondes:
- 🔄 "Promotion en cours..."
- ✅ "Promotion réussie!"

### 4. Reconnectez-vous

Une fois la promotion réussie:
1. **Fermez** cet onglet
2. **Déconnectez-vous** de l'application (si connecté)
3. **Reconnectez-vous** avec: maxime@giguere-influence.com
4. **Vous êtes maintenant Master!** 👑

---

## 🛠️ Comment ça Fonctionne

### Architecture

```
promote-master.html (Frontend)
        ↓
Edge Function: create-admin-maxime
        ↓
Supabase Database (profiles table)
        ↓
Role updated to 'master'
```

### Edge Function Mise à Jour

**Fichier:** `supabase/functions/create-admin-maxime/index.ts`

**Ce qu'elle fait:**
1. Cherche l'utilisateur avec l'email `maxime@giguere-influence.com`
2. Récupère son profil actuel
3. Met à jour le rôle à `master`
4. Retourne confirmation

**Code clé:**
```typescript
// Find user
const existingUser = existingUsers?.users?.find(
  u => u.email === 'maxime@giguere-influence.com'
);

// Update to master
await supabase
  .from('profiles')
  .update({ role: 'master' })
  .eq('user_id', existingUser.id);
```

---

## ✅ Vérification

### Après la Promotion

Une fois reconnecté, vérifiez:

1. **Dans Mon Profil:**
   - Configuration → Mon Profil
   - Le champ "Rôle" devrait afficher: **master**

2. **Dans Gestion des Utilisateurs:**
   - Configuration → Utilisateurs
   - Votre nom devrait avoir un badge **Master** doré
   - Vous pouvez inviter avec tous les rôles (incluant Master)
   - Vous pouvez changer tous les mots de passe

3. **Badge Visual:**
   - Le badge Master a un dégradé jaune-or
   - Bordure ambre distinctive

---

## 🔧 Dépannage

### Erreur: "User not found"

**Cause:** L'utilisateur n'existe pas encore dans le système.

**Solution:**
1. Créez d'abord le compte via l'interface normale
2. Invitez maxime@giguere-influence.com comme utilisateur
3. Attendez qu'il se connecte une fois
4. Puis utilisez la page de promotion

### Erreur: "Profile not found"

**Cause:** Le profil n'a pas été créé après la création du compte.

**Solution:**
1. Connectez-vous une fois avec le compte
2. Déconnectez-vous
3. Réessayez la promotion

### Erreur: "Failed to update role"

**Cause:** Problème de permission ou migration non appliquée.

**Solution:**
1. Vérifiez que la migration `add_master_role_and_admin_permissions` est appliquée
2. Vérifiez les logs de la fonction dans Supabase Dashboard

### Le badge ne s'affiche pas

**Cause:** Cache du navigateur.

**Solution:**
1. Déconnectez-vous
2. Videz le cache (Ctrl+Shift+R ou Cmd+Shift+R)
3. Reconnectez-vous

---

## 📋 Checklist de Vérification

Avant d'utiliser la page de promotion:

- [ ] Le compte maxime@giguere-influence.com existe
- [ ] L'utilisateur s'est connecté au moins une fois
- [ ] La migration `add_master_role_and_admin_permissions` est appliquée
- [ ] L'Edge Function `create-admin-maxime` est déployée
- [ ] Le fichier `promote-master.html` est accessible

Après la promotion:

- [ ] Message de succès affiché
- [ ] Déconnexion effectuée
- [ ] Reconnexion réussie
- [ ] Badge Master visible
- [ ] Peut inviter avec tous les rôles
- [ ] Peut changer tous les mots de passe

---

## 🎯 Permissions Master

Une fois Master, vous pouvez:

### Gestion des Utilisateurs
- ✅ Voir tous les utilisateurs (toutes organisations)
- ✅ Créer des utilisateurs avec n'importe quel rôle
- ✅ Modifier n'importe quel utilisateur
- ✅ Changer n'importe quel mot de passe
- ✅ Supprimer n'importe quel utilisateur
- ✅ Créer d'autres Masters

### Gestion du Système
- ✅ Accès à toutes les organisations
- ✅ Modifier toutes les garanties
- ✅ Accès aux diagnostics système
- ✅ Modifier les paramètres globaux

### Restrictions
- ❌ Aucune restriction
- 👑 Accès total au système

---

## 📱 Interface de la Page

La page `promote-master.html` est:
- ✨ Simple et élégante
- 🎨 Design moderne avec dégradés
- 📱 Responsive (mobile et desktop)
- ⚡ Feedback en temps réel
- 🔒 Sécurisée (pas d'input utilisateur)
- 🎯 Une seule action: promouvoir

---

## 🔐 Sécurité

### Protection
- La fonction utilise `SUPABASE_SERVICE_ROLE_KEY`
- Email hardcodé (pas modifiable via l'interface)
- Pas d'authentification requise pour cette page unique
- Une fois utilisée, elle peut être supprimée

### Recommandation
Après avoir promu Maxime:
1. La page peut être supprimée du dossier `public/`
2. Ou ajoutez une protection par mot de passe
3. Ou déployez-la uniquement en local

---

## 🚫 Désactivation

Si vous voulez désactiver l'outil après utilisation:

```bash
# Supprimer la page
rm public/promote-master.html

# Rebuild
npm run build
```

Ou simplement ne pas déployer le fichier en production.

---

## 📚 Fichiers Créés/Modifiés

1. ✅ `supabase/functions/create-admin-maxime/index.ts` - MODIFIÉ
   - Change l'email à maxime@giguere-influence.com
   - Promeut au rôle master au lieu de admin

2. ✅ `public/promote-master.html` - CRÉÉ
   - Interface web simple
   - Appelle l'Edge Function
   - Affiche résultat et prochaines étapes

3. ✅ Documentation complète créée

---

## 🎉 Résumé

**Avant:**
- Besoin d'accès SQL direct
- Commandes complexes
- Risque d'erreur

**Maintenant:**
- 1 page web simple
- 1 clic de bouton
- Confirmation immédiate
- Instructions claires

**C'est aussi simple que ça!** 🚀

---

## 💡 Prochaines Étapes

Une fois Master:

1. **Testez vos permissions:**
   - Créez un utilisateur test
   - Changez son mot de passe
   - Supprimez-le

2. **Créez d'autres admins:**
   - Configuration → Utilisateurs
   - Invitez avec le rôle approprié

3. **Explorez le système:**
   - Toutes les fonctionnalités sont débloquées
   - Vous avez le contrôle total

**Bonne utilisation!** 👑
