# Guide Complet - Configuration Supabase Dashboard

**Date:** 26 octobre 2025
**Temps estimé:** 10-15 minutes
**Niveau:** Administrateur

---

## Objectif

Ce guide vous permet de configurer correctement votre projet Supabase pour que les liens d'invitation pointent vers votre domaine de production au lieu de localhost.

---

## Prérequis

- Accès administrateur au projet Supabase
- Connaître votre domaine de production: `https://www.garantieproremorque.com`
- Accès à votre compte Resend pour la clé API

---

## Étape 1: Configuration Authentication Settings

### 1.1 Accéder aux Paramètres Auth

1. Ouvrez [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Dans le menu latéral gauche, cliquez sur **Authentication**
4. Cliquez sur **Configuration** dans le sous-menu

### 1.2 Modifier le Site URL

**Section: URL Configuration**

1. Localisez le champ **Site URL**
2. Valeur actuelle (incorrecte): `http://localhost:5173`
3. **Remplacer par:** `https://www.garantieproremorque.com`
4. **Important:** Pas de `/` à la fin de l'URL

![Site URL Configuration](https://via.placeholder.com/800x200/1e40af/ffffff?text=Site+URL:+https://www.garantieproremorque.com)

**Pourquoi c'est important:**
Cette URL est utilisée par Supabase Auth pour générer tous les liens de redirection dans les emails (reset password, invitation, confirmation).

### 1.3 Configurer les Redirect URLs

**Section: Redirect URLs**

1. Localisez la liste **Additional Redirect URLs**
2. Cliquez sur **Add URL**
3. Ajoutez ces trois URLs (une par ligne):

```
https://www.garantieproremorque.com/reset-password
https://www.garantieproremorque.com/setup
https://www.garantieproremorque.com/auth/callback
```

4. Cliquez **Add** après chaque URL

**Capture d'écran attendue:**
```
Redirect URLs:
  ✓ https://www.garantieproremorque.com/reset-password
  ✓ https://www.garantieproremorque.com/setup
  ✓ https://www.garantieproremorque.com/auth/callback
```

**Pourquoi c'est important:**
Ces URLs sont les seules autorisées pour les redirections après authentification. Sans elles, les utilisateurs ne peuvent pas compléter le processus.

### 1.4 Sauvegarder les Changements

1. Faites défiler jusqu'en bas de la page
2. Cliquez sur le bouton vert **Save**
3. Attendez le message de confirmation: "Configuration saved successfully"

⚠️ **Important:** Les changements prennent effet immédiatement pour toutes les nouvelles authentifications.

---

## Étape 2: Configuration des Secrets (Edge Functions)

### 2.1 Accéder aux Secrets

1. Dans le menu latéral gauche, cliquez sur **Edge Functions**
2. Cliquez sur l'onglet **Settings** en haut
3. Faites défiler jusqu'à la section **Secrets**

### 2.2 Vérifier les Secrets Existants

Vous devriez voir une liste de secrets déjà configurés. Vérifiez si `SITE_URL` existe:

```
Existing Secrets:
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  RESEND_API_KEY (à vérifier)
  SITE_URL (à vérifier/ajouter)
```

### 2.3 Ajouter/Modifier SITE_URL

**Si SITE_URL n'existe pas:**

1. Cliquez sur **Add Secret**
2. **Name:** `SITE_URL`
3. **Value:** `https://www.garantieproremorque.com`
4. Cliquez **Add Secret**

**Si SITE_URL existe déjà:**

1. Cliquez sur le bouton **Edit** (icône crayon) à côté de SITE_URL
2. Vérifiez la valeur: `https://www.garantieproremorque.com`
3. Si incorrecte, modifier et cliquer **Update**
4. Si correcte, cliquez **Cancel**

### 2.4 Vérifier RESEND_API_KEY

**Si vous utilisez Resend pour les emails:**

1. Cherchez `RESEND_API_KEY` dans la liste des secrets
2. Si absent, cliquez **Add Secret**
3. **Name:** `RESEND_API_KEY`
4. **Value:** Votre clé API Resend (commence par `re_`)
5. Cliquez **Add Secret**

**Obtenir votre clé Resend:**
1. Aller sur [https://resend.com/api-keys](https://resend.com/api-keys)
2. Créer une nouvelle clé API si nécessaire
3. Copier la clé (elle commence par `re_`)

### 2.5 Secrets Finaux

Votre configuration finale devrait ressembler à:

```
✓ SITE_URL = https://www.garantieproremorque.com
✓ RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx
✓ SUPABASE_URL = https://fkxldrkkqvputdgfpayi.supabase.co
✓ SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...
✓ SUPABASE_ANON_KEY = eyJhbGc...
```

---

## Étape 3: Redéploiement des Edge Functions

### 3.1 Pourquoi Redéployer?

Les secrets ne sont chargés que lors du déploiement. Vous devez redéployer toutes les fonctions qui utilisent `SITE_URL` pour qu'elles prennent en compte les nouveaux secrets.

### 3.2 Fonctions à Redéployer

Liste des fonctions à mettre à jour:
1. `invite-user`
2. `resend-invitation`
3. `send-password-reset`
4. `onboard-franchisee`

### 3.3 Option A: Via Supabase Dashboard (Recommandé)

**Pour chaque fonction:**

1. Cliquez sur **Edge Functions** dans le menu latéral
2. Sélectionnez la fonction (ex: `invite-user`)
3. Cliquez sur l'onglet **Details**
4. En haut à droite, cliquez **Deploy**
5. Une modal s'ouvre: "Deploy new version?"
6. Cliquez **Deploy**
7. Attendez le message: "Function deployed successfully"
8. Répétez pour les 3 autres fonctions

**Temps total:** ~2 minutes

### 3.4 Option B: Via Supabase CLI

**Si vous avez installé Supabase CLI:**

```bash
# Se connecter à Supabase
supabase login

# Lier au projet
supabase link --project-ref votre-project-ref

# Déployer les fonctions
supabase functions deploy invite-user
supabase functions deploy resend-invitation
supabase functions deploy send-password-reset
supabase functions deploy onboard-franchisee
```

**Sortie attendue:**
```
Deploying function invite-user...
✓ Function deployed successfully
Version: 1.0.1
URL: https://...supabase.co/functions/v1/invite-user
```

### 3.5 Vérification Post-Déploiement

1. Retournez sur **Edge Functions**
2. Pour chaque fonction, vérifiez:
   - Status: **Active** (point vert)
   - Last deployed: Date/heure récente
   - Version: Numéro incrémenté

---

## Étape 4: Vérification et Tests

### 4.1 Test avec les Logs

1. Allez dans **Edge Functions** → Sélectionnez `invite-user`
2. Cliquez sur l'onglet **Logs**
3. Créez une invitation depuis votre application
4. Dans les logs, cherchez:

```
[invite-user] Manual password mode enabled
Generated invitation link: https://www.garantieproremorque.com/reset-password?token=...
Redirect URL in link: https://www.garantieproremorque.com/reset-password
```

**✅ Bon signe:** URL contient `garantieproremorque.com`
**❌ Problème:** URL contient `localhost`

### 4.2 Test Complet d'Invitation

**Test 1: Invitation par Email**

1. Ouvrez votre application en production
2. Allez dans Réglages → Utilisateurs
3. Cliquez "Inviter un utilisateur"
4. Entrez un email de test (utilisez votre propre email)
5. Sélectionnez un rôle
6. Cliquez "Envoyer invitation"
7. Vérifiez votre boîte email
8. Ouvrez l'email d'invitation
9. **Vérification critique:**
   - Le bouton "Créer mon mot de passe" pointe-t-il vers `https://www.garantieproremorque.com/reset-password`?
   - Pas de mention de `localhost`?
10. Cliquez sur le lien
11. La page de reset s'ouvre-t-elle sur le bon domaine?
12. Définissez un mot de passe et connectez-vous
13. La connexion fonctionne-t-elle?

**✅ Succès:** Tout fonctionne, le domaine est correct partout
**❌ Échec:** Voir section Troubleshooting

**Test 2: Création Manuelle**

1. Allez dans Réglages → Utilisateurs
2. Cliquez "Inviter un utilisateur"
3. Entrez email + rôle
4. Entrez un mot de passe: `TestPassword123!`
5. Cochez "Création manuelle (sans email)"
6. Cliquez "Créer utilisateur"
7. Une modal affiche les credentials
8. Copiez le mot de passe
9. Ouvrez une fenêtre de navigation privée
10. Allez sur `https://www.garantieproremorque.com`
11. Connectez-vous avec l'email et le mot de passe
12. La connexion fonctionne-t-elle?

**✅ Succès:** Connexion réussie avec le mot de passe manuel
**❌ Échec:** Voir section Troubleshooting

---

## Troubleshooting

### Problème 1: Les liens contiennent encore localhost

**Symptômes:**
- Email reçu avec lien vers `http://localhost:5173/reset-password`
- Logs montrent `localhost` dans les URLs

**Diagnostic:**

1. **Vérifier Auth Settings**
   ```
   Authentication → Configuration → Site URL
   Est-ce que c'est: https://www.garantieproremorque.com ?
   ```

2. **Vérifier les Secrets**
   ```
   Edge Functions → Settings → Secrets
   SITE_URL existe-t-il?
   Valeur correcte?
   ```

3. **Vérifier le Déploiement**
   ```
   Edge Functions → invite-user → Details
   Date du dernier déploiement?
   Après modification des secrets?
   ```

**Solutions:**

**Solution 1:** Secrets non configurés
```
1. Edge Functions → Settings → Secrets
2. Add Secret: SITE_URL = https://www.garantieproremorque.com
3. Redéployer toutes les Edge Functions
4. Retester
```

**Solution 2:** Fonctions pas redéployées
```
1. Edge Functions → invite-user → Deploy
2. Attendre confirmation
3. Répéter pour resend-invitation, send-password-reset, onboard-franchisee
4. Retester
```

**Solution 3:** Cache du navigateur
```
1. Vider le cache du navigateur
2. Ou utiliser navigation privée
3. Retester
```

### Problème 2: Erreur "Failed to send email"

**Symptômes:**
- Message: "Utilisateur créé, mais l'email n'a pas pu être envoyé"
- Pas d'email reçu

**Diagnostic:**

1. **Vérifier RESEND_API_KEY**
   ```
   Edge Functions → Settings → Secrets
   RESEND_API_KEY existe-t-il?
   Commence par "re_"?
   ```

2. **Vérifier les Logs**
   ```
   Edge Functions → invite-user → Logs
   Chercher: "RESEND_API_KEY not configured"
   Ou: "Failed to send invitation email"
   ```

**Solutions:**

```
1. Aller sur resend.com → API Keys
2. Créer une nouvelle clé si nécessaire
3. Copier la clé (re_xxxxx)
4. Edge Functions → Settings → Secrets → Add Secret
5. Name: RESEND_API_KEY
6. Value: re_xxxxx (votre clé)
7. Redéployer invite-user
8. Retester
```

### Problème 3: "URL not allowed"

**Symptômes:**
- Erreur lors du reset de mot de passe
- Message: "Redirect URL not allowed"

**Diagnostic:**
```
Authentication → Configuration → Redirect URLs
Les URLs suivantes sont-elles présentes?
  - https://www.garantieproremorque.com/reset-password
  - https://www.garantieproremorque.com/setup
  - https://www.garantieproremorque.com/auth/callback
```

**Solution:**
```
1. Authentication → Configuration
2. Scroll to "Redirect URLs"
3. Add URL: https://www.garantieproremorque.com/reset-password
4. Add URL: https://www.garantieproremorque.com/setup
5. Add URL: https://www.garantieproremorque.com/auth/callback
6. Save
7. Retester
```

### Problème 4: Mode Manuel ne fonctionne pas

**Symptômes:**
- Erreur: "Le mot de passe doit contenir au moins 8 caractères"
- Ou: Connexion échoue avec le mot de passe manuel

**Solutions:**

**Solution 1:** Mot de passe trop court
```
Utiliser un mot de passe d'au moins 8 caractères
Exemple: MonMotDePasse123!
```

**Solution 2:** Mauvais mot de passe copié
```
1. Dans la modal de credentials, cliquer "Copier mot de passe"
2. Ne pas taper manuellement
3. Réessayer la connexion
```

**Solution 3:** Cache de session
```
1. Fermer tous les onglets de l'application
2. Ouvrir navigation privée
3. Réessayer la connexion
```

---

## Checklist Complète

Avant de considérer la configuration terminée, vérifiez:

### Configuration Supabase

- [ ] Authentication → Configuration → Site URL = `https://www.garantieproremorque.com`
- [ ] Authentication → Configuration → Redirect URLs contient:
  - [ ] `https://www.garantieproremorque.com/reset-password`
  - [ ] `https://www.garantieproremorque.com/setup`
  - [ ] `https://www.garantieproremorque.com/auth/callback`
- [ ] Edge Functions → Settings → Secrets contient:
  - [ ] `SITE_URL` = `https://www.garantieproremorque.com`
  - [ ] `RESEND_API_KEY` = `re_...` (si emails actifs)

### Déploiement

- [ ] Function `invite-user` redéployée
- [ ] Function `resend-invitation` redéployée
- [ ] Function `send-password-reset` redéployée
- [ ] Function `onboard-franchisee` redéployée
- [ ] Tous les déploiements ont réussi (statut vert)

### Tests

- [ ] Invitation par email fonctionne
- [ ] Email reçu contient le bon domaine
- [ ] Lien dans l'email fonctionne
- [ ] Création manuelle fonctionne
- [ ] Connexion avec mot de passe manuel réussie
- [ ] Pas de mention de localhost dans les emails ou logs

---

## Maintenance

### Vérifications Périodiques

**Mensuel:**
- Vérifier que Site URL n'a pas été modifié accidentellement
- Vérifier que les secrets sont toujours présents
- Tester une invitation pour confirmer le bon fonctionnement

**Après Chaque Mise à Jour de Code:**
- Si modification d'une Edge Function, la redéployer
- Vérifier les logs après déploiement
- Tester le flux complet

### En Cas de Changement de Domaine

Si vous changez de domaine (ex: passage de garantieproremorque.com à nouveaudomaine.com):

1. **Frontend (.env):**
   ```env
   SITE_URL=https://nouveaudomaine.com
   VITE_SITE_URL=https://nouveaudomaine.com
   ```

2. **Supabase Auth Settings:**
   ```
   Site URL: https://nouveaudomaine.com
   Redirect URLs:
     - https://nouveaudomaine.com/reset-password
     - https://nouveaudomaine.com/setup
     - https://nouveaudomaine.com/auth/callback
   ```

3. **Supabase Secrets:**
   ```
   SITE_URL = https://nouveaudomaine.com
   ```

4. **Redéployer:** Toutes les Edge Functions

5. **Tester:** Complet

---

## Support et Ressources

### Documentation Officielle

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/config)
- [Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

### En Cas de Problème Persistant

1. Consulter les logs Supabase: Edge Functions → Sélectionner fonction → Logs
2. Vérifier le fichier `SOLUTION_COMPLETE_LIENS_INVITATION_OCT26_2025.md`
3. Tester en navigation privée (évite les problèmes de cache)
4. Vérifier le statut Supabase: [status.supabase.com](https://status.supabase.com)

### Contact Support Supabase

Si rien ne fonctionne:
1. Aller sur [app.supabase.com](https://app.supabase.com)
2. Cliquer sur l'icône ? en bas à droite
3. Choisir "Contact Support"
4. Fournir:
   - Project ID
   - Edge Function concernée
   - Logs d'erreur
   - Captures d'écran de votre configuration

---

## Conclusion

Après avoir suivi ce guide, votre système devrait:
- ✅ Générer des liens vers le domaine de production
- ✅ Envoyer des emails avec les bons liens
- ✅ Permettre la création manuelle d'utilisateurs
- ✅ Fonctionner de manière fiable dans tous les environnements

**Temps total de configuration:** 10-15 minutes
**Impact:** Zéro downtime
**Bénéfice:** Système robuste et professionnel

---

**Dernière mise à jour:** 26 octobre 2025
**Version:** 1.0
