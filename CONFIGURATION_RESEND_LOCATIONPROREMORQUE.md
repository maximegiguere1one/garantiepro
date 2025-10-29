# Configuration Resend pour Location Pro-Remorque

**Date:** 4 Octobre 2025
**Domaine vérifié:** locationproremorque.ca
**Email expéditeur:** info@locationproremorque.ca
**Nom entreprise:** Location Pro-Remorque

---

## ✅ Étapes Complétées

### 1. Configuration du Code
- ✅ Email par défaut mis à jour: `info@locationproremorque.ca`
- ✅ Nom par défaut mis à jour: `Location Pro-Remorque`
- ✅ Edge Function `send-email` redéployée
- ✅ Base de données mise à jour avec les nouvelles valeurs

### 2. Domaine Resend
- ✅ Domaine à ajouter dans Resend: `locationproremorque.ca` (domaine racine)
- 🔄 En attente de vérification DNS (vous êtes en train de faire ça)

---

## 📋 Prochaines Étapes - Configuration Resend

### Étape 1: Vérifier votre Domaine dans Resend

Vous devez ajouter les enregistrements DNS suivants chez votre fournisseur de domaine (exemple: GoDaddy, Cloudflare, etc.):

#### A. Enregistrement SPF
```
Type: TXT
Nom: @ (ou locationproremorque.ca)
Valeur: v=spf1 include:amazonses.com ~all
```

#### B. Enregistrement DKIM (3 enregistrements)
Resend vous donnera 3 enregistrements CNAME comme ceci:
```
Type: CNAME
Nom: resend._domainkey.locationproremorque.ca
Valeur: [fourni par Resend]

Type: CNAME
Nom: resend2._domainkey.locationproremorque.ca
Valeur: [fourni par Resend]

Type: CNAME
Nom: resend3._domainkey.locationproremorque.ca
Valeur: [fourni par Resend]
```

#### C. Vérification du Domaine
Une fois les enregistrements DNS ajoutés:
1. Attendez 15 minutes à 2 heures pour la propagation DNS
2. Retournez dans Resend Dashboard > Domains
3. Cliquez sur "Verify" à côté de votre domaine
4. Le statut devrait passer à "Verified" ✅

---

### Étape 2: Obtenir votre Clé API Resend

1. Allez sur https://resend.com/api-keys
2. Cliquez sur "Create API Key"
3. Nom: `Location Pro-Remorque Production`
4. Permissions: **Full access** (ou au minimum "Sending access")
5. Cliquez sur "Create"
6. **IMPORTANT:** Copiez la clé immédiatement (elle commence par `re_`)
   - Elle ressemble à: `re_123abc456def789ghi012jkl345mno678`
7. Gardez cette clé en sécurité - elle ne sera plus visible après

---

### Étape 3: Configurer les Secrets Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu latéral: **Settings** > **Edge Functions**
4. Trouvez la section **Secrets** ou **Environment Variables**
5. Ajoutez **3 secrets** (cliquez sur "Add secret" pour chacun):

#### Secret 1: RESEND_API_KEY
```
Nom: RESEND_API_KEY
Valeur: re_votre_cle_api_ici
```
Collez la clé API que vous avez copiée de Resend.

#### Secret 2: FROM_EMAIL
```
Nom: FROM_EMAIL
Valeur: info@locationproremorque.ca
```
C'est l'email qui apparaîtra comme expéditeur.

#### Secret 3: FROM_NAME
```
Nom: FROM_NAME
Valeur: Location Pro-Remorque
```
C'est le nom qui apparaîtra comme expéditeur.

6. Cliquez sur **Save** ou **Apply** pour chaque secret

**Note:** Les secrets sont disponibles immédiatement, pas besoin de redéployer les fonctions.

---

### Étape 4: Tester l'Envoi d'Email

#### A. Dans votre Application
1. Connectez-vous à votre application
2. Allez dans **Paramètres** > **Notifications**
3. Section "Test de Configuration"
4. Entrez votre adresse email
5. Cliquez sur **"Tester l'envoi d'email"**

#### B. Résultat Attendu
✅ **Succès:**
```
"Email de test envoyé avec succès! Vérifiez votre boîte de réception."
```

❌ **Échec possible:**
```
"Domain locationproremorque.ca is not verified"
→ Solution: Terminez la vérification DNS (Étape 1)

"Invalid API key"
→ Solution: Vérifiez que vous avez copié la clé complète

"RESEND_API_KEY is missing"
→ Solution: Vérifiez les secrets Supabase (Étape 3)
```

#### C. Vérifier la Réception
1. Ouvrez votre boîte email
2. Cherchez un email de: **Location Pro-Remorque <info@locationproremorque.ca>**
3. Sujet: "Test de Configuration Email"
4. Si vous ne le voyez pas, vérifiez vos **spams**

---

## 🔍 Dépannage

### Problème: "Domain not verified"
**Cause:** Les enregistrements DNS ne sont pas encore propagés ou incorrects

**Solutions:**
1. Vérifiez que vous avez ajouté le domaine RACINE dans Resend: `locationproremorque.ca` (PAS `info.locationproremorque.ca`)
2. Vérifiez que vous avez ajouté TOUS les enregistrements DNS (SPF + 3 DKIM)
3. Vérifiez qu'il n'y a pas de faute de frappe dans les enregistrements DNS
4. Attendez 15-30 minutes de plus pour la propagation DNS
5. Utilisez https://dnschecker.org pour vérifier la propagation
6. Vérifiez dans Resend Dashboard que le statut est "Verified"

### Problème: Email reçu dans les spams
**Cause:** Domaine nouvellement vérifié, faible réputation initiale

**Solutions:**
1. C'est normal pour les premiers emails
2. Dans votre boîte email, marquez l'email comme "Not spam"
3. Ajoutez info@locationproremorque.ca à vos contacts
4. La réputation s'améliorera avec le temps (7-14 jours)

### Problème: "Invalid API key"
**Cause:** Clé API incorrecte ou expirée

**Solutions:**
1. Retournez sur https://resend.com/api-keys
2. Vérifiez que la clé est "Active" (pas révoquée)
3. Si nécessaire, créez une nouvelle clé
4. Mettez à jour le secret `RESEND_API_KEY` dans Supabase

### Problème: "Rate limit exceeded"
**Cause:** Vous avez dépassé la limite gratuite (100 emails/jour)

**Solutions:**
1. Attendez 24h pour le reset
2. Ou passez au plan payant Resend si nécessaire

---

## 📊 Limites du Plan Gratuit Resend

**Plan Gratuit:**
- ✅ 3,000 emails/mois
- ✅ 100 emails/jour
- ✅ 1 domaine vérifié
- ✅ Support API complet
- ✅ Analyses et statistiques

**Si vous dépassez:**
- Considérez le plan Pro: 20$/mois pour 50,000 emails

---

## 📧 Emails Automatiques Configurés

Une fois Resend configuré, ces emails seront envoyés automatiquement:

### 1. Bienvenue Client
**Quand:** Nouvelle garantie créée
**À:** Client
**De:** Location Pro-Remorque <info@locationproremorque.ca>
**Contenu:** Confirmation d'achat, numéro de contrat, détails garantie

### 2. Réclamation Soumise
**Quand:** Client soumet une réclamation
**À:** Client + Équipe opérations
**De:** Location Pro-Remorque <info@locationproremorque.ca>
**Contenu:** Confirmation réception, numéro de réclamation, délai traitement

### 3. Réclamation Approuvée
**Quand:** Réclamation approuvée
**À:** Client
**De:** Location Pro-Remorque <info@locationproremorque.ca>
**Contenu:** Lettre d'approbation, montant approuvé, prochaines étapes

### 4. Réclamation Refusée
**Quand:** Réclamation refusée
**À:** Client
**De:** Location Pro-Remorque <info@locationproremorque.ca>
**Contenu:** Explication du refus, références au contrat

### 5. Garantie Expire Bientôt
**Quand:** 30 jours avant expiration (configurable)
**À:** Client
**De:** Location Pro-Remorque <info@locationproremorque.ca>
**Contenu:** Rappel expiration, option de renouvellement

---

## ✅ Checklist Finale

Avant de considérer la configuration terminée:

- [ ] Domaine vérifié dans Resend (statut: Verified)
- [ ] Clé API Resend obtenue et copiée
- [ ] 3 secrets configurés dans Supabase:
  - [ ] RESEND_API_KEY
  - [ ] FROM_EMAIL = info@locationproremorque.ca
  - [ ] FROM_NAME = Location Pro-Remorque
- [ ] Test d'email envoyé avec succès
- [ ] Email de test reçu dans la boîte de réception
- [ ] Email provient bien de "Location Pro-Remorque <info@locationproremorque.ca>"

---

## 🎯 État Actuel

### Ce qui est DÉJÀ fait:
✅ Code mis à jour avec info@locationproremorque.ca
✅ Edge Function redéployée
✅ Base de données mise à jour
✅ Nom entreprise: Location Pro-Remorque

### Ce qu'il vous reste à faire:
🔄 **Vérifier le domaine dans Resend** (enregistrements DNS)
⏳ **Obtenir la clé API Resend** (une fois domaine vérifié)
⏳ **Configurer les 3 secrets dans Supabase**
⏳ **Tester l'envoi d'email**

**Temps estimé:** 15-30 minutes (+ temps de propagation DNS)

---

## 💡 Conseil Important

**Ne testez PAS l'envoi d'email tant que:**
1. Le domaine n'est pas vérifié dans Resend (statut "Verified")
2. Vous n'avez pas configuré les 3 secrets dans Supabase

Sinon vous obtiendrez l'erreur "Domain not verified".

---

## 🆘 Besoin d'Aide?

### Ressources Officielles
- Documentation Resend: https://resend.com/docs
- Dashboard Resend: https://resend.com/domains
- Support Resend: support@resend.com

### Vérifications
1. **DNS propagation:** https://dnschecker.org
2. **Logs Supabase:** Dashboard > Edge Functions > send-email > Logs
3. **Console navigateur:** F12 > Console (pour voir les erreurs détaillées)

---

**Dernière mise à jour:** 4 Octobre 2025
**Statut:** ⏳ En attente de configuration utilisateur
