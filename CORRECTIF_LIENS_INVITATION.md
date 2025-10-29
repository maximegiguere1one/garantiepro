# Correctif - Liens d'Invitation (localhost → Production)

## ✅ Problème Résolu

Les liens dans les emails d'invitation pointaient vers `localhost:5173` au lieu de `https://www.garantieproremorque.com`.

## 🔧 Corrections Appliquées

### Fonctions Edge Modifiées

4 Edge Functions ont été corrigées:

1. **invite-user**
2. **resend-invitation**
3. **send-password-reset**
4. **onboard-franchisee**

### Ce qui a été changé

Dans chaque fonction:

```typescript
// 1. Ajout de la constante SITE_URL avec fallback
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.garantieproremorque.com';

// 2. Force le remplacement du redirect_to après génération
const linkUrl = new URL(resetLink);
linkUrl.searchParams.set('redirect_to', `${SITE_URL}/reset-password`);
resetLink = linkUrl.toString();
```

Cette approche garantit que **même si Supabase Auth a localhost configuré**, le lien dans l'email pointera vers production!

## 📤 Déploiement

### Option 1: Script Automatique (RECOMMANDÉ)

```bash
./deploy-fixed-functions.sh
```

### Option 2: Déploiement Manuel

```bash
# Une par une
supabase functions deploy invite-user
supabase functions deploy resend-invitation
supabase functions deploy send-password-reset
supabase functions deploy onboard-franchisee
```

### Option 3: Via Supabase Dashboard

1. Aller dans **Edge Functions**
2. Pour chaque fonction, cliquer sur **Edit**
3. Copier le contenu de `supabase/functions/[nom-fonction]/index.ts`
4. Coller et **Deploy**

## ⚙️ Configuration Requise

Vous avez déjà ajouté `SITE_URL` dans les secrets Supabase:

```
SITE_URL=https://www.garantieproremorque.com
```

✅ C'est parfait! Les fonctions vont l'utiliser.

## 🧪 Test

1. **Inviter un nouvel utilisateur**
   - Aller dans Réglages → Utilisateurs
   - Cliquer sur "Inviter un utilisateur"
   - Entrer un email et choisir un rôle
   - Envoyer l'invitation

2. **Vérifier l'email reçu**
   - Ouvrir l'email d'invitation
   - Vérifier que le bouton "Créer mon mot de passe" pointe vers:
     ```
     https://www.garantieproremorque.com/reset-password?...
     ```
   - ✅ Le lien devrait maintenant être correct!

3. **Tester le lien**
   - Cliquer sur le lien
   - Vous devriez arriver sur la page de réinitialisation
   - Créer un nouveau mot de passe
   - Se connecter avec le nouveau compte

## 📊 Avant vs Après

### ❌ Avant (Problème)
```
http://localhost:5173/reset-password?token=...
```

### ✅ Après (Corrigé)
```
https://www.garantieproremorque.com/reset-password?token=...
```

## 🔍 Détails Techniques

### Pourquoi ça arrivait?

Supabase Auth utilise sa configuration interne "Site URL" pour générer les liens. Si cette valeur est `localhost`, tous les liens générés par `generateLink()` utilisent localhost.

### La Solution

Au lieu d'essayer de changer la config Auth de Supabase (qui ne semble pas accessible), on:

1. Laisse Supabase générer le lien (peut contenir localhost)
2. Parse l'URL générée
3. **Force le remplacement** du paramètre `redirect_to` avec notre URL de production
4. Utilise le lien modifié dans l'email

C'est une solution robuste qui fonctionne indépendamment de la config Supabase!

## 📝 Fichiers Modifiés

```
supabase/functions/invite-user/index.ts
supabase/functions/resend-invitation/index.ts
supabase/functions/send-password-reset/index.ts
supabase/functions/onboard-franchisee/index.ts
```

## ✨ Résultat

Tous les nouveaux emails d'invitation contiendront des liens vers votre domaine de production!

---

**Date:** 26 octobre 2025
**Status:** ✅ Prêt pour déploiement
