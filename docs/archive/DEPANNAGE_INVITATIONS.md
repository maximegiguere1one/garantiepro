# 🔧 Dépannage - Système d'Invitations

## 🎯 Problème: "Invitation" s'affiche mais rien ne se passe

### ✅ Corrections Appliquées

J'ai ajouté des **logs détaillés** pour identifier exactement où le problème se produit.

---

## 📋 Comment Obtenir les Vraies Erreurs

### Étape 1: Ouvrir la Console du Navigateur
```
Windows/Linux: F12
Mac: Cmd + Option + I

Puis aller dans l'onglet "Console"
```

### Étape 2: Nettoyer la Console
```
Clic droit dans la console → "Clear console" (Effacer la console)
```

### Étape 3: Essayer d'Envoyer une Invitation
```
1. Remplir le formulaire d'invitation
2. Cliquer sur "Envoyer l'invitation"
3. Observer les logs dans la console
```

### Étape 4: Chercher les Logs Importants

**Logs à chercher** (avec préfixe `[InvitationsDashboard]`):
```
✅ Logs de Succès:
[InvitationsDashboard] Starting invitation process...
[InvitationsDashboard] Email: maxime@example.com
[InvitationsDashboard] Role: franchisee_employee
[InvitationsDashboard] Organization ID: xxx-xxx-xxx
[InvitationsDashboard] Getting session...
[InvitationsDashboard] Session valid, calling invite-user function...
[InvitationsDashboard] Edge function response: {data: {...}, error: null}
[InvitationsDashboard] Invitation successful!

❌ Logs d'Erreur (exemples):
[InvitationsDashboard] No valid session found
[InvitationsDashboard] Edge function error: {...}
[InvitationsDashboard] Invitation failed: ...
[InvitationsDashboard] Error sending invitation: ...
```

---

## 🚨 Erreurs Courantes et Solutions

### Erreur 1: "Session invalide"
```
[InvitationsDashboard] No valid session found
```

**Solution**:
1. Déconnectez-vous
2. Reconnectez-vous
3. Réessayez l'invitation

---

### Erreur 2: "Missing organization or profile"
```
[InvitationsDashboard] Missing organization or profile
```

**Solution**:
1. Vérifiez que vous êtes bien connecté
2. Vérifiez que votre rôle est admin ou super_admin
3. Rechargez la page (F5)

---

### Erreur 3: "User already exists"
```
[InvitationsDashboard] Invitation failed: Un utilisateur avec l'email XXX existe déjà
```

**Solution**:
1. L'email est déjà dans le système
2. Allez dans "Utilisateurs" pour vérifier
3. Si nécessaire, utilisez un autre email

---

### Erreur 4: "Pending invitation exists"
```
[InvitationsDashboard] Invitation failed: Une invitation pour XXX est déjà en attente
```

**Solution**:
1. Allez dans le tableau des invitations
2. Trouvez l'invitation existante
3. Options:
   - Clic "Renvoyer" pour renvoyer l'email
   - Clic "Supprimer" puis créer nouvelle invitation

---

### Erreur 5: Edge Function Error
```
[InvitationsDashboard] Edge function error: {message: "..."}
```

**Solutions possibles**:
1. **Problème de permissions**:
   - Vérifiez que votre rôle est admin/super_admin
   - Contactez un super administrateur

2. **Problème de configuration**:
   - Vérifiez que Resend est configuré
   - Vérifiez les variables d'environnement

3. **Problème temporaire**:
   - Attendez 1 minute
   - Réessayez

---

## 🔍 Debug Complet - Étapes Détaillées

### 1. Vérifier Votre Profil
```javascript
// Dans la console du navigateur, tapez:
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();
console.log('Profile:', profile);
```

**Vérifiez**:
- `profile.role` doit être `'admin'` ou `'super_admin'`
- `profile.organization_id` doit exister

---

### 2. Vérifier la Session
```javascript
// Dans la console:
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

**Vérifiez**:
- `session` ne doit pas être null
- `session.access_token` doit exister

---

### 3. Tester la Fonction Edge Manuellement
```javascript
// Dans la console:
const { data, error } = await supabase.functions.invoke('invite-user', {
  body: {
    email: 'test@example.com',
    role: 'franchisee_employee',
    organization_id: 'VOTRE-ORG-ID-ICI'
  }
});

console.log('Result:', { data, error });
```

**Analysez la réponse**:
- Si `error` existe → problème avec la fonction edge
- Si `data.success === false` → voir `data.error`
- Si `data.success === true` → ça fonctionne!

---

## 📊 Checklist de Diagnostic

**Avant de contacter le support**, vérifiez:

- [ ] Console du navigateur ouverte (F12)
- [ ] Console nettoyée avant le test
- [ ] Vous êtes bien connecté
- [ ] Votre rôle est admin ou super_admin
- [ ] L'email n'existe pas déjà
- [ ] Pas d'invitation en attente pour cet email
- [ ] Les logs `[InvitationsDashboard]` sont visibles
- [ ] Vous avez copié le message d'erreur complet

---

## 🎯 Logs à Copier Pour le Support

Si le problème persiste, copiez ces informations:

```
1. Logs de la console (tout ce qui commence par [InvitationsDashboard])

2. Votre rôle actuel:
   - Allez dans votre profil en haut à droite
   - Notez le rôle affiché

3. L'erreur exacte affichée dans le toast (message rouge)

4. Capture d'écran du modal d'invitation au moment de l'erreur
```

---

## 🚀 Test Rapide

Pour vérifier que tout fonctionne:

### Test 1: Session Active
```
1. Ouvrir Console (F12)
2. Taper: await supabase.auth.getSession()
3. Résultat attendu: { data: { session: {...} }, error: null }
```

### Test 2: Profil Valide
```
1. Aller dans votre profil (icône en haut à droite)
2. Vérifier que le rôle s'affiche correctement
3. Rôle attendu: Admin ou Super Admin
```

### Test 3: Fonction Edge Accessible
```
1. Ouvrir Console (F12)
2. Taper: await supabase.functions.invoke('invite-user', { body: {} })
3. Résultat: Si vous voyez une erreur de validation → la fonction est accessible ✓
```

---

## 💡 Astuces

### Astuce 1: Forcer le Rafraîchissement
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Astuce 2: Mode Incognito
```
Essayez dans une fenêtre de navigation privée
pour éliminer les problèmes de cache
```

### Astuce 3: Vérifier le Réseau
```
1. F12 → Onglet "Network" (Réseau)
2. Essayer d'envoyer l'invitation
3. Chercher la requête "invite-user"
4. Cliquer dessus
5. Voir la réponse dans "Response"
```

---

## 📞 Contact Support

Si après toutes ces étapes le problème persiste:

**Informations à fournir**:
1. Tous les logs `[InvitationsDashboard]` de la console
2. Votre rôle utilisateur
3. L'email que vous essayez d'inviter
4. Le rôle que vous essayez d'assigner
5. Capture d'écran de l'erreur

**Où trouver de l'aide**:
- Guides dans le projet:
  - `GUIDE_INVITATIONS_RAPIDE.md`
  - `GUIDE_GESTION_UTILISATEURS_COMPLET.md`
  - `SYSTEME_INVITATIONS_UTILISATEURS_FINAL.md`

---

## ✅ Vérification Finale

**Le système fonctionne si**:
- ✅ Vous voyez les logs dans la console
- ✅ Le modal s'ouvre sans erreur
- ✅ Le bouton "Envoyer" montre un loading
- ✅ Un toast (vert ou rouge) apparaît après
- ✅ Le message d'erreur est précis (pas juste "Invitation")

**Le système ne fonctionne pas si**:
- ❌ Aucun log dans la console
- ❌ Le modal ne s'ouvre pas
- ❌ Le bouton ne répond pas
- ❌ Aucun feedback visuel
- ❌ Message d'erreur vague

---

## 🎉 Prochaines Étapes

Une fois que vous avez identifié l'erreur exacte dans les logs:

1. **Cherchez l'erreur** dans ce guide
2. **Appliquez la solution** correspondante
3. **Réessayez** l'invitation
4. **Vérifiez** que le toast vert apparaît
5. **Confirmez** que l'invitation est dans le tableau

---

**Maintenant, essayez d'envoyer une invitation et regardez EXACTEMENT ce qui apparaît dans la console!** 🔍
