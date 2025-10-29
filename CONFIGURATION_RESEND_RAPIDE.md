# Configuration Rapide de Resend - 5 Minutes

Ce guide vous permet de configurer rapidement l'envoi d'emails pour résoudre l'erreur : **"La garantie a été créée mais l'email de confirmation n'a pas pu être envoyé."**

## Problème

L'erreur se produit parce que la clé API Resend n'est pas configurée dans Supabase. Sans cette clé, le système ne peut pas envoyer d'emails aux clients.

## Solution en 3 Étapes (5 minutes)

### Étape 1: Créer un Compte Resend (2 minutes)

1. Allez sur [https://resend.com/signup](https://resend.com/signup)
2. Créez un compte gratuit (100 emails/jour, 3000/mois)
3. Confirmez votre email

### Étape 2: Obtenir la Clé API (1 minute)

1. Connectez-vous à Resend
2. Allez dans [API Keys](https://resend.com/api-keys)
3. Cliquez sur **"Create API Key"**
4. Donnez-lui un nom (ex: "Pro-Remorque Production")
5. Copiez la clé (commence par `re_...`)

**IMPORTANT:** Sauvegardez cette clé quelque part de sûr - vous ne pourrez plus la voir après!

### Étape 3: Configurer Supabase (2 minutes)

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** (icône engrenage en bas à gauche)
4. Cliquez sur **Edge Functions** dans le menu de gauche
5. Cliquez sur **Manage secrets**
6. Ajoutez 3 secrets:

**Secret 1:**
```
Name: RESEND_API_KEY
Value: [collez votre clé API re_xxxxx...]
```

**Secret 2:**
```
Name: FROM_EMAIL
Value: noreply@locationproremorque.ca
```

**Secret 3:**
```
Name: FROM_NAME
Value: Location Pro-Remorque
```

7. Cliquez sur **Save** pour chaque secret

### Étape 4: Redéployer les Edge Functions (30 secondes)

Dans votre terminal, exécutez:

```bash
npx supabase functions deploy send-email
```

## Test de Confirmation

1. Créez une nouvelle garantie dans le système
2. Vérifiez que l'email est envoyé avec succès
3. Vous devriez voir le message: **"✓ Email envoyé au client"**

## ⚠️ Note Importante sur l'Email FROM_EMAIL

L'adresse `noreply@locationproremorque.ca` ne fonctionnera PAS immédiatement car le domaine n'est pas encore vérifié dans Resend.

### Option Temporaire pour Tests (Recommandé pour démarrer)

Utilisez l'adresse de test de Resend:

```
FROM_EMAIL: onboarding@resend.dev
```

Cette adresse fonctionne immédiatement sans configuration DNS. **Parfait pour les tests!**

### Configuration Permanente (Pour Production)

Pour utiliser votre propre domaine `locationproremorque.ca`:

1. Allez dans [Resend Domains](https://resend.com/domains)
2. Cliquez sur **"Add Domain"**
3. Entrez: `locationproremorque.ca`
4. Resend vous donnera 3 enregistrements DNS CNAME à ajouter
5. Connectez-vous chez votre fournisseur de domaine (GoDaddy, Cloudflare, etc.)
6. Ajoutez les 3 enregistrements DNS:
   - `resend._domainkey.locationproremorque.ca`
   - `resend2._domainkey.locationproremorque.ca`
   - `resend3._domainkey.locationproremorque.ca`
7. Attendez 5-30 minutes pour la propagation DNS
8. Retournez dans Resend et cliquez sur **"Verify"**
9. Une fois vérifié, changez FROM_EMAIL à `noreply@locationproremorque.ca`

## Système de File d'Attente Automatique

Le système inclut maintenant une file d'attente automatique pour les emails:

- **Auto-retry:** Si un email échoue, il sera automatiquement renvoyé 3 fois
- **Délais intelligents:** 1 minute, 5 minutes, puis 15 minutes entre les tentatives
- **Interface de gestion:** Allez dans **Paramètres > File d'attente Emails** pour voir et gérer les emails en attente
- **Renvoi manuel:** Vous pouvez manuellement renvoyer n'importe quel email échoué

## Que Se Passe-t-il Maintenant?

### ✅ Si la Configuration est Réussie

- Les emails de confirmation de garantie sont envoyés automatiquement
- Les clients reçoivent leurs contrats par email
- Le système affiche: **"✓ Email envoyé au client"**
- Les emails échoués sont automatiquement renvoyés

### ⚠️ Si les Emails N'Arrivent Toujours Pas

Vérifiez ces points:

1. **Logs Supabase:**
   - Allez dans **Logs** > **Edge Functions**
   - Cherchez les messages de l'Edge Function `send-email`
   - Vous devriez voir: `"RESEND_API_KEY is configured"`

2. **Statut du Domaine:**
   - Si vous utilisez `noreply@locationproremorque.ca`, le domaine DOIT être vérifié dans Resend
   - Sinon, utilisez `onboarding@resend.dev` temporairement

3. **Vérifier la Clé API:**
   - Testez votre clé avec curl:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "votre@email.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

## Dépannage Rapide

### Erreur: "Domain not verified"

**Cause:** Vous utilisez `noreply@locationproremorque.ca` mais le domaine n'est pas vérifié.

**Solution:** Changez temporairement `FROM_EMAIL` à `onboarding@resend.dev`

### Erreur: "Invalid API key"

**Cause:** La clé API est incorrecte ou expirée.

**Solution:**
1. Générez une nouvelle clé dans [Resend API Keys](https://resend.com/api-keys)
2. Mettez à jour le secret `RESEND_API_KEY` dans Supabase
3. Redéployez: `npx supabase functions deploy send-email`

### Erreur: "Rate limit exceeded"

**Cause:** Vous avez dépassé la limite gratuite (100 emails/jour).

**Solution:**
- Attendez 24h ou passez au plan payant de Resend
- Plan gratuit: 100 emails/jour, 3000/mois
- Plan payant: À partir de $20/mois pour 50,000 emails

## Support

**Besoin d'aide?**

1. Vérifiez les logs Supabase: Dashboard > Logs > Edge Functions
2. Consultez la [Documentation Resend](https://resend.com/docs)
3. Vérifiez le composant de gestion: **Paramètres > File d'attente Emails**

## Checklist de Vérification

- [ ] Compte Resend créé
- [ ] Clé API générée et sauvegardée
- [ ] Secret `RESEND_API_KEY` ajouté dans Supabase
- [ ] Secret `FROM_EMAIL` ajouté (onboarding@resend.dev pour tests)
- [ ] Secret `FROM_NAME` ajouté
- [ ] Edge Functions redéployées
- [ ] Test de création de garantie réussi
- [ ] Email de confirmation reçu

## Prochaines Étapes

Une fois que les emails fonctionnent avec `onboarding@resend.dev`:

1. Configurez votre domaine personnalisé (instructions ci-dessus)
2. Mettez à jour `FROM_EMAIL` à `noreply@locationproremorque.ca`
3. Testez à nouveau

**Félicitations! Votre système d'envoi d'emails est maintenant opérationnel!**
