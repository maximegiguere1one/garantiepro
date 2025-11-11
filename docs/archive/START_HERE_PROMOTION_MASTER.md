# 🚀 PROMOTION MAXIME AU RÔLE MASTER - GUIDE RAPIDE

## ✅ Tout est Prêt!

La fonction Edge est déployée et la page web est construite.

---

## 📍 ÉTAPES SIMPLES:

### 1. Ouvrez la Page

**En local (Vite dev server):**
```
http://localhost:5173/promote-master.html
```

**Ou directement sur Supabase:**
```
https://zbnktduicggfvvpbqsbo.supabase.co/functions/v1/create-admin-maxime
```

### 2. Cliquez sur le Bouton

Sur la page, cliquez sur:
```
"Promouvoir au rôle Master"
```

### 3. Vérifiez la Console

Appuyez sur **F12** pour ouvrir la console du navigateur et voir:
- 🚀 Les logs de démarrage
- ✅ Le résultat de la promotion
- 📊 Les détails de l'opération

### 4. Si Succès ✅

Vous verrez:
```
✅ Succès!
Maxime promoted to master role successfully!
```

**Puis:**
1. Fermez l'onglet
2. Déconnectez-vous de l'application
3. Reconnectez-vous avec: maxime@giguere-influence.com
4. Vous êtes Master! 👑

### 5. Si Erreur ❌

**Erreur possible: "User not found"**

Cela signifie que l'utilisateur `maxime@giguere-influence.com` n'existe pas encore.

**Solution:**
1. Créez d'abord le compte via l'application
2. Ou vérifiez l'email exact dans la base de données

---

## 🔍 DÉBOGAGE

### Voir les utilisateurs disponibles:

La console affichera la liste des utilisateurs disponibles si l'utilisateur n'est pas trouvé.

### Vérifier manuellement:

```sql
-- Dans Supabase SQL Editor
SELECT email, role FROM profiles;
```

### Tester la fonction directement:

Vous pouvez aussi tester avec curl:
```bash
curl -X POST https://zbnktduicggfvvpbqsbo.supabase.co/functions/v1/create-admin-maxime
```

---

## 🎯 CE QUI SE PASSE

1. **La page HTML** appelle l'Edge Function
2. **L'Edge Function** cherche l'utilisateur avec email `maxime@giguere-influence.com`
3. **Si trouvé**: Met à jour le rôle à `master`
4. **Si non trouvé**: Retourne la liste des utilisateurs disponibles

---

## ⚡ ALTERNATIVE RAPIDE

Si la page ne fonctionne pas, utilisez directement l'URL de la fonction:

**Dans votre navigateur, allez à:**
```
https://zbnktduicggfvvpbqsbo.supabase.co/functions/v1/create-admin-maxime
```

Vous verrez la réponse JSON directement!

---

## 📋 CHECKLIST

Avant d'essayer:
- [ ] Le compte maxime@giguere-influence.com existe
- [ ] L'utilisateur s'est connecté au moins une fois
- [ ] La console du navigateur est ouverte (F12)
- [ ] Vous êtes prêt à vous reconnecter après

Après succès:
- [ ] Déconnexion effectuée
- [ ] Reconnexion avec maxime@giguere-influence.com
- [ ] Badge Master visible
- [ ] Peut tout faire dans l'application

---

## 🆘 BESOIN D'AIDE?

### La page ne charge pas?
- Vérifiez l'URL: `/promote-master.html`
- Essayez de rafraîchir (Ctrl+R)
- Vérifiez le build: `npm run build`

### Le bouton ne fait rien?
- Ouvrez la console (F12)
- Regardez les erreurs réseau
- Vérifiez que l'Edge Function est déployée

### Erreur CORS?
- L'Edge Function est configurée pour accepter tous les origins
- Vérifiez les headers dans la console réseau

### Toujours bloqué?
Testez directement l'URL de la fonction dans votre navigateur:
```
https://zbnktduicggfvvpbqsbo.supabase.co/functions/v1/create-admin-maxime
```

---

## 🎉 C'EST TOUT!

Une fois que vous voyez "✅ Succès!", vous êtes Master et avez le contrôle total du système!

**Bonne chance!** 👑
