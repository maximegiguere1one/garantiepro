# 📧 Configuration Complète de Resend pour l'Envoi d'Emails

**Date**: 11 novembre 2025
**Status**: Guide de configuration complet
**Version**: 1.0

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Étape 1: Créer un compte Resend](#étape-1-créer-un-compte-resend)
4. [Étape 2: Configurer le domaine](#étape-2-configurer-le-domaine)
5. [Étape 3: Générer la clé API](#étape-3-générer-la-clé-api)
6. [Étape 4: Configurer Supabase](#étape-4-configurer-supabase)
7. [Étape 5: Tester la configuration](#étape-5-tester-la-configuration)
8. [Dépannage](#dépannage)
9. [Utilisation dans l'application](#utilisation-dans-lapplication)

---

## Vue d'ensemble

Le système d'emails de Pro-Remorque utilise **Resend** comme service d'envoi d'emails via une **Edge Function Supabase**. Cette configuration permet :

- ✅ Envoi d'emails transactionnels professionnels
- ✅ Confirmations de garantie
- ✅ Notifications de réclamations
- ✅ Emails de rappel d'expiration
- ✅ Gestion des erreurs et retry automatique
- ✅ Rate limiting pour éviter l'abus

### Architecture

```
Application Frontend
    ↓
EmailService (src/services/EmailService.ts)
    ↓
Edge Function "send-email" (Supabase)
    ↓
Resend API
    ↓
Email délivré au destinataire
```

---

## Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte Supabase avec le projet Pro-Remorque actif
- ✅ Accès au DNS du domaine `garantieproremorque.com`
- ✅ Droits d'administration sur le projet Supabase
- ⏱️ 15-30 minutes pour compléter la configuration

---

## Étape 1: Créer un compte Resend

### 1.1 Inscription

1. Allez sur [https://resend.com](https://resend.com)
2. Cliquez sur "Sign Up" (Inscription)
3. Créez un compte avec votre email professionnel
4. Vérifiez votre email (un lien de confirmation sera envoyé)

### 1.2 Plan gratuit

Le plan gratuit de Resend inclut :
- 3,000 emails par mois
- 100 emails par jour
- Tous les domaines que vous possédez
- Support par email

**C'est suffisant pour démarrer !** Vous pourrez upgrader plus tard si nécessaire.

---

## Étape 2: Configurer le domaine

### 2.1 Ajouter le domaine dans Resend

1. Dans le dashboard Resend, allez dans **Domains** (menu de gauche)
2. Cliquez sur **"Add Domain"**
3. Entrez : `garantieproremorque.com`
4. Cliquez sur **"Add"**

### 2.2 Configuration DNS

Resend va afficher les enregistrements DNS à ajouter. Vous devez ajouter **3 types d'enregistrements** :

#### A. Enregistrement SPF (TXT)

```
Type: TXT
Nom: @
Valeur: v=spf1 include:_spf.resend.com ~all
TTL: 3600 (ou Auto)
```

**But**: Permet à Resend d'envoyer des emails pour votre domaine

#### B. Enregistrements DKIM (CNAME)

Resend génère 2 enregistrements DKIM uniques pour votre domaine :

```
Type: CNAME
Nom: resend._domainkey
Valeur: resend1.resend.com (exemple - utilisez la valeur fournie)
TTL: 3600

Type: CNAME
Nom: resend2._domainkey
Valeur: resend2.resend.com (exemple - utilisez la valeur fournie)
TTL: 3600
```

**But**: Authentification cryptographique des emails

#### C. Enregistrement DMARC (TXT)

```
Type: TXT
Nom: _dmarc
Valeur: v=DMARC1; p=none; rua=mailto:dmarc@garantieproremorque.com
TTL: 3600
```

**But**: Politique de gestion des emails non authentifiés

### 2.3 Ajouter les enregistrements DNS

**Où ajouter ces enregistrements ?**

Cela dépend de votre hébergeur DNS :
- **Cloudflare**: DNS → Add Record
- **GoDaddy**: DNS Management → Add DNS Record
- **OVH**: Zone DNS → Ajouter une entrée
- **Google Domains**: DNS → Custom Records → Manage Custom Records

**⏱️ Temps de propagation**: 5 minutes à 48 heures (généralement 15-30 minutes)

### 2.4 Vérifier la configuration DNS

1. Retournez dans Resend Dashboard → Domains
2. Cliquez sur **"Verify"** à côté de votre domaine
3. Attendez que le statut passe à **"Verified" ✅**

**⚠️ Important**: Vous ne pourrez PAS envoyer d'emails tant que le domaine n'est pas vérifié !

---

## Étape 3: Générer la clé API

### 3.1 Créer une clé API

1. Dans Resend Dashboard, allez dans **API Keys** (menu de gauche)
2. Cliquez sur **"Create API Key"**
3. Donnez un nom : `Pro-Remorque Production`
4. Permissions : Sélectionnez **"Sending Access"** (ou "Full Access")
5. Cliquez sur **"Add"**

### 3.2 Copier la clé API

⚠️ **CRITIQUE** : La clé API s'affiche **UNE SEULE FOIS** !

```
re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Commence par `re_`
- Copiez-la immédiatement dans un endroit sûr
- Ne la partagez JAMAIS publiquement
- Ne la commitez JAMAIS dans Git

---

## Étape 4: Configurer Supabase

### 4.1 Ajouter le secret RESEND_API_KEY

1. Allez dans votre projet Supabase : [https://supabase.com/dashboard/project/fkxldrkkqvputdgfpayi](https://supabase.com/dashboard/project/fkxldrkkqvputdgfpayi)

2. Naviguez vers : **Project Settings** (icône engrenage en bas à gauche)

3. Allez dans : **Edge Functions** → **Manage secrets**

4. Cliquez sur **"Add a new secret"**

5. Remplissez :
   ```
   Name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. Cliquez sur **"Add Secret"**

### 4.2 Vérifier que l'Edge Function est déployée

L'Edge Function `send-email` est déjà déployée et active. Vous pouvez le vérifier :

1. Dans Supabase Dashboard → **Edge Functions**
2. Vous devriez voir `send-email` avec le statut **"Deployed"** ✅

### 4.3 Pas besoin de redéployer

Les secrets sont automatiquement disponibles pour toutes les Edge Functions. **Aucun redéploiement n'est nécessaire** après l'ajout d'un secret.

---

## Étape 5: Tester la configuration

### 5.1 Test via l'interface web

1. Ouvrez votre navigateur
2. Allez sur : `https://www.garantieproremorque.com/_test/test-email-configuration.html`
3. Connectez-vous à l'application si ce n'est pas déjà fait
4. Cliquez sur **"Vérifier la configuration"**
   - ✅ Devrait afficher "Configuration valide"
5. Entrez votre email dans le champ
6. Cliquez sur **"Envoyer un email de test"**
7. Vérifiez votre boîte de réception (et spam)

### 5.2 Test via la console navigateur

Ouvrez la console (F12) et exécutez :

```javascript
// Test de configuration
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'votre@email.com',
    subject: 'Test',
    body: 'Email de test',
    checkConfigOnly: true
  }
});
console.log('Config:', data);

// Test d'envoi
const result = await supabase.functions.invoke('send-email', {
  body: {
    to: 'votre@email.com',
    subject: 'Test Pro-Remorque',
    body: 'Ceci est un test d\'envoi d\'email.'
  }
});
console.log('Result:', result);
```

### 5.3 Vérifier les logs

1. Dans Supabase Dashboard → **Edge Functions** → **send-email**
2. Cliquez sur l'onglet **"Logs"**
3. Vous devriez voir les requêtes d'envoi avec leurs résultats

---

## Dépannage

### ❌ Erreur: "RESEND_API_KEY not configured"

**Cause**: Le secret n'est pas configuré dans Supabase

**Solution**:
1. Vérifiez que vous avez bien ajouté le secret dans Supabase
2. Vérifiez le nom exact : `RESEND_API_KEY` (sensible à la casse)
3. Attendez 1-2 minutes après l'ajout du secret

### ❌ Erreur: "Domain not verified"

**Cause**: Le domaine n'est pas vérifié dans Resend

**Solution**:
1. Allez dans Resend Dashboard → Domains
2. Vérifiez que le statut est "Verified"
3. Si "Pending", vérifiez vos enregistrements DNS
4. Utilisez des outils comme [MXToolbox](https://mxtoolbox.com/) pour vérifier les DNS

### ❌ Erreur: "Invalid API key"

**Cause**: La clé API est incorrecte ou expirée

**Solution**:
1. Générez une nouvelle clé API dans Resend
2. Mettez à jour le secret dans Supabase
3. Réessayez

### ❌ Erreur: "Rate limit exceeded"

**Cause**: Trop d'emails envoyés en peu de temps

**Solution**:
1. Attendez quelques minutes
2. Le système a un rate limiter intégré (max 10 emails/minute par destinataire)
3. Si nécessaire, upgrader votre plan Resend

### ❌ L'email arrive dans le spam

**Causes possibles**:
- DMARC non configuré correctement
- Contenu suspect (trop de liens, mots-clés spam)
- Domaine récent sans réputation

**Solutions**:
1. Vérifiez tous les enregistrements DNS (SPF, DKIM, DMARC)
2. Assurez-vous que le contenu est professionnel
3. Ajoutez un lien de désinscription
4. Construisez progressivement votre réputation d'envoi

### 📊 Vérifier la santé du système

Visitez : `https://www.garantieproremorque.com/_test/test-email-configuration.html`

Cette page effectue tous les tests automatiquement et donne des recommandations.

---

## Utilisation dans l'application

### 1. Envoi d'email simple

```typescript
import { sendEmail } from '../lib/email-utils';

const result = await sendEmail({
  to: 'client@example.com',
  subject: 'Confirmation de garantie',
  body: 'Votre garantie a été créée avec succès.'
});

if (result.success) {
  console.log('Email envoyé !');
} else {
  console.error('Erreur:', result.userMessage);
}
```

### 2. Email de confirmation de garantie

```typescript
import { sendWarrantyCreatedEmail } from '../lib/email-utils';

await sendWarrantyCreatedEmail(
  'client@example.com',    // Email du client
  'Jean Dupont',           // Nom du client
  'WAR-2025-001',          // Numéro de contrat
  {},                      // Données additionnelles (optionnel)
  'fr'                     // Langue (fr ou en)
);
```

### 3. Email de mise à jour de réclamation

```typescript
import { sendClaimStatusEmail } from '../lib/email-utils';

await sendClaimStatusEmail(
  'client@example.com',
  'Jean Dupont',
  'CLM-2025-001',
  'approved',              // statut: submitted, under_review, approved, denied, completed
  'fr'
);
```

### 4. Email de rappel d'expiration

```typescript
import { sendWarrantyExpirationReminder } from '../lib/email-utils';

await sendWarrantyExpirationReminder(
  'client@example.com',
  'Jean Dupont',
  'WAR-2025-001',
  30,                      // Jours restants
  'fr'
);
```

---

## 📊 Monitoring et Analytics

### Dashboard Resend

Accédez à [https://resend.com/emails](https://resend.com/emails) pour voir :

- 📨 Tous les emails envoyés
- ✅ Taux de délivrabilité
- 📈 Statistiques d'envoi
- 🚫 Emails bloqués ou rejetés
- 📊 Graphiques d'utilisation

### Logs Supabase

Accédez aux logs dans Supabase Dashboard → Edge Functions → send-email → Logs

### Base de données

Tous les emails sont enregistrés dans la table `notifications` :

```sql
SELECT
  recipient_email,
  subject,
  status,
  sent_at,
  error_message
FROM notifications
WHERE type = 'email'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ **Ne jamais** exposer la clé API Resend dans le code frontend
2. ✅ **Toujours** passer par l'Edge Function pour envoyer des emails
3. ✅ **Valider** l'authentification avant d'envoyer un email
4. ✅ **Utiliser** le rate limiter pour éviter l'abus
5. ✅ **Logger** tous les envois pour audit
6. ✅ **Surveiller** les erreurs et les rejets

### Rate Limiting

Le système intègre un rate limiter :
- Max 10 emails par minute par destinataire
- Max 100 emails par heure au total
- Protection contre le spam et l'abus

---

## 📝 Checklist de configuration

Utilisez cette checklist pour vérifier que tout est en place :

- [ ] Compte Resend créé et vérifié
- [ ] Domaine `garantieproremorque.com` ajouté dans Resend
- [ ] Enregistrement SPF ajouté dans DNS
- [ ] Enregistrements DKIM ajoutés dans DNS
- [ ] Enregistrement DMARC ajouté dans DNS
- [ ] Domaine vérifié dans Resend (statut "Verified")
- [ ] Clé API générée dans Resend
- [ ] Secret `RESEND_API_KEY` ajouté dans Supabase
- [ ] Test de configuration réussi
- [ ] Email de test envoyé et reçu
- [ ] Vérification des logs sans erreur

---

## 🆘 Support

### Ressources

- **Documentation Resend**: [https://resend.com/docs](https://resend.com/docs)
- **Documentation Supabase Edge Functions**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **Support Resend**: [support@resend.com](mailto:support@resend.com)

### Outil de diagnostic

En cas de problème, utilisez toujours l'outil de diagnostic :

```
https://www.garantieproremorque.com/_test/test-email-configuration.html
```

Cet outil vous donnera des informations précises sur l'état de la configuration et des suggestions pour résoudre les problèmes.

---

## ✅ Résumé

Une fois la configuration terminée, vous aurez :

1. ✅ Un système d'envoi d'emails professionnel et fiable
2. ✅ Des emails authentifiés avec SPF, DKIM et DMARC
3. ✅ Une bonne délivrabilité (évite le spam)
4. ✅ Des logs et monitoring complets
5. ✅ Protection contre l'abus avec rate limiting
6. ✅ Conformité avec les meilleures pratiques

**Le système est maintenant prêt pour la production ! 🚀**

---

**Dernière mise à jour**: 11 novembre 2025
**Maintenu par**: Équipe Pro-Remorque
**Version**: 1.0
