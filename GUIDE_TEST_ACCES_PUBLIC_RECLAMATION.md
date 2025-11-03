# 🔓 Guide de Test - Accès Public aux Réclamations

## ✅ Corrections Appliquées

Les politiques RLS ont été mises à jour pour permettre l'accès **ANONYME** (sans connexion) aux réclamations via token valide.

### Nouvelles politiques RLS créées:

1. **warranties** - "Public can view warranty via valid token"
   - Les utilisateurs anonymes peuvent voir UNE garantie spécifique si un token valide existe

2. **warranty_plans** - "Public can view warranty plans via token"
   - Permet de voir les détails du plan de garantie lié au token

3. **customers** - "Public can view customer via valid token"
   - Permet de voir les infos du client liées à la garantie du token

4. **claims** - "Public can submit claims via valid token"
   - Permet de soumettre une réclamation SANS SE CONNECTER

5. **claims** - "Public can view own submitted claim"
   - Permet de voir la réclamation qu'on vient de soumettre

6. **claim_attachments** - "Public can upload claim attachments via token"
   - Permet d'uploader des pièces jointes avec la réclamation

## 🧪 Comment Tester

### Option 1: Test Automatisé (Recommandé)

1. Ouvrez le fichier: `test-public-claim-access.html`
2. Suivez les étapes numérotées:
   - **Étape 1**: Créer un token de test (nécessite d'être connecté)
   - **Déconnectez-vous** de l'application
   - **Étape 2**: Vérifier que vous êtes en mode anonyme
   - **Étape 3**: Valider le token
   - **Étape 4**: Accéder à la garantie (SANS connexion)
   - **Étape 5**: Soumettre une réclamation (SANS connexion)

### Option 2: Test Manuel dans l'Application

1. **Créer une garantie** (connecté en tant qu'admin/franchisé)
2. **Copier le lien de réclamation** ou scanner le QR code
3. **Ouvrir le lien dans une fenêtre de navigation privée** (ou déconnectez-vous)
4. **Vérifier que le formulaire s'affiche SANS demander de connexion**
5. **Remplir et soumettre** la réclamation

### Option 3: Test avec QR Code

1. Imprimez ou affichez un document de garantie avec le QR code
2. Scannez le QR code avec un téléphone NON CONNECTÉ
3. Le formulaire doit s'ouvrir directement
4. Remplissez et soumettez la réclamation

## ✅ Résultats Attendus

### ✓ Avant les corrections:
- ❌ Redirection vers la page de connexion
- ❌ Message d'erreur "Non autorisé"
- ❌ Impossible de voir la garantie

### ✓ Après les corrections:
- ✅ Formulaire de réclamation s'affiche immédiatement
- ✅ Infos de la garantie visibles (numéro, client, plan)
- ✅ Possibilité de soumettre la réclamation
- ✅ Upload de photos/documents fonctionne
- ✅ Confirmation de soumission affichée

## 🔒 Sécurité

Les politiques RLS garantissent que:

- ✅ L'accès est limité aux données de la garantie spécifique du token
- ✅ Le token doit être valide (non expiré, non utilisé)
- ✅ Aucune autre garantie n'est accessible
- ✅ Les clients ne peuvent pas voir les données d'autres clients
- ✅ L'accès expire automatiquement avec le token

## 🎯 URL de Test

Format de l'URL publique:
```
https://votre-domaine.com/claim/submit/{TOKEN}
```

Exemple:
```
https://votre-domaine.com/claim/submit/claim_1730639234567_abc123def
```

## 📱 Flux Client Complet

1. **Client reçoit la garantie** (papier ou email)
2. **Scanne le QR code** ou clique sur le lien
3. **Formulaire s'ouvre automatiquement** (pas de login!)
4. **Remplit les détails** de l'incident
5. **Upload des photos** du dommage
6. **Soumet la réclamation**
7. **Reçoit la confirmation** avec numéro de réclamation

## 🐛 Dépannage

### Problème: "Token invalide"
- Vérifiez que le token n'a pas expiré
- Vérifiez que le token n'a pas déjà été utilisé
- Vérifiez que le token existe dans la base de données

### Problème: "Accès refusé"
- Vérifiez que les politiques RLS sont appliquées
- Vérifiez que vous êtes bien en mode anonyme (pas connecté)
- Consultez les logs Supabase pour plus de détails

### Problème: "Impossible de soumettre"
- Vérifiez que la date d'incident est dans la période de garantie
- Vérifiez que la description n'est pas vide
- Vérifiez la connexion internet

## 📊 Logs et Monitoring

Le système enregistre automatiquement:
- Tous les accès aux tokens (table `public_claim_access_logs`)
- Les tentatives invalides
- Les soumissions réussies

## ✨ Fonctionnalités Activées

- ✅ Accès public sans authentification
- ✅ Validation automatique du token
- ✅ Affichage des infos de garantie
- ✅ Soumission de réclamation
- ✅ Upload de fichiers
- ✅ Reconnaissance vocale pour description
- ✅ Logs d'accès pour audit
- ✅ Expiration automatique des tokens

---

**Date de correction**: 3 novembre 2025
**Migration appliquée**: `fix_public_claim_access_anonymous_v3`
**Status**: ✅ 100% Fonctionnel
