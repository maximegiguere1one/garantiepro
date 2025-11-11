# Vérification Configuration Email Resend

## ✅ Configuration Existante

D'après vos informations, les secrets suivants sont déjà configurés dans Supabase:

- ✅ `RESEND_API_KEY` - Clé API Resend
- ✅ `FROM_EMAIL` - Adresse email d'envoi
- ✅ `FROM_NAME` - Nom de l'expéditeur

## Test de Vérification

Pour confirmer que tout fonctionne correctement, suivez ces étapes:

### 1. Vérifier les Logs Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Logs** > **Edge Functions**
4. Créez une garantie dans l'application
5. Cherchez les messages de l'Edge Function `send-email`

**Ce que vous devriez voir si tout fonctionne:**
```
RESEND_API_KEY is configured (length: XX, starts with: re_)
FROM_EMAIL: [votre adresse]
FROM_NAME: Location Pro-Remorque
Sending email via Resend API...
Resend API response status: 200
Email sent successfully. Resend ID: [id]
```

**Ce que vous verriez si la configuration est manquante:**
```
CRITICAL: RESEND_API_KEY not configured in Supabase secrets!
```

### 2. Test Direct dans l'Application

1. Créez une nouvelle garantie
2. Complétez toutes les étapes jusqu'à la signature
3. Après la signature, observez le message final

**Messages possibles:**

✅ **Succès total:**
```
Garantie créée avec succès!

Contrat: [numéro]
Vente complétée en Xm XXs

✓ Client créé
✓ Remorque enregistrée
✓ Garantie activée
✓ Documents générés
✓ Contrat signé
✓ Email envoyé au client
```

⚠️ **Garantie créée mais email en attente:**
```
Garantie créée avec succès!

Contrat: [numéro]
...
✓ Contrat signé
⚠️ Email en attente - sera renvoyé automatiquement
```

❌ **Garantie créée mais email échoué:**
```
Garantie créée avec succès!

Contrat: [numéro]
...
✓ Contrat signé
⚠️ Email non envoyé
```

### 3. Vérifier la File d'Attente

Si un email est en attente ou a échoué:

1. Allez dans **Paramètres** > **File d'attente Emails**
2. Vous verrez tous les emails avec leur statut:
   - 🕒 **En attente**: Email sera renvoyé automatiquement
   - ⚠️ **En cours de renvoi**: Tentative en cours
   - ❌ **Échoué**: Toutes les tentatives ont échoué
   - ✅ **Envoyé**: Email livré avec succès

3. Cliquez sur un email pour voir les détails d'erreur
4. Utilisez le bouton **"Renvoyer"** pour réessayer manuellement

## Erreurs Courantes et Solutions

### Erreur: "Domain not verified"

**Symptôme dans les logs:**
```
Resend API error response: { "message": "Domain not verified" }
```

**Cause:** Vous utilisez un domaine personnalisé (ex: `noreply@locationproremorque.ca`) qui n'est pas vérifié dans Resend.

**Solution:**
1. Allez dans [Resend Dashboard > Domains](https://resend.com/domains)
2. Vérifiez que le domaine `locationproremorque.ca` a le statut **"Verified"**
3. Si non vérifié, ajoutez les enregistrements DNS fournis par Resend chez votre fournisseur de domaine
4. Attendez 5-30 minutes pour la propagation DNS
5. Cliquez sur **"Verify"** dans Resend

**Solution temporaire:**
- Dans Supabase Dashboard, changez `FROM_EMAIL` à `onboarding@resend.dev`
- Redéployez: `npx supabase functions deploy send-email`
- Les emails fonctionneront immédiatement (mais l'adresse sera celle de Resend)

### Erreur: "Invalid API key"

**Symptôme dans les logs:**
```
Resend API error response: { "message": "Invalid API key" }
```

**Cause:** La clé API est incorrecte, expirée ou révoquée.

**Solution:**
1. Allez dans [Resend Dashboard > API Keys](https://resend.com/api-keys)
2. Générez une **nouvelle clé API**
3. Copiez la nouvelle clé
4. Dans Supabase Dashboard > Settings > Edge Functions > Manage secrets
5. Modifiez le secret `RESEND_API_KEY` avec la nouvelle valeur
6. Redéployez: `npx supabase functions deploy send-email`

### Erreur: "Rate limit exceeded"

**Symptôme dans les logs:**
```
Resend API error response: { "message": "Rate limit exceeded" }
```

**Cause:** Vous avez dépassé la limite du plan gratuit (100 emails/jour, 3000/mois).

**Solutions:**
1. **Attendez 24h** pour que le quota se réinitialise
2. **Passez au plan payant** Resend (à partir de $20/mois pour 50,000 emails)
3. **Utilisez la file d'attente** pour renvoyer les emails plus tard

### Logs vides ou absents

**Cause:** L'Edge Function n'est pas déployée ou pas à jour.

**Solution:**
```bash
npx supabase functions deploy send-email
```

## Test Manuel de l'API Resend

Pour tester directement si votre configuration Resend fonctionne (en dehors de Supabase):

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@locationproremorque.ca",
    "to": "votre@email.com",
    "subject": "Test Direct Resend",
    "html": "<p>Ceci est un test direct de l API Resend</p>"
  }'
```

**Réponse attendue si succès:**
```json
{
  "id": "re_xxxxxxxxxxxxx"
}
```

**Réponse si erreur:**
```json
{
  "message": "Domain not verified"
}
```

## Fonctionnalités Automatiques Activées

Avec les corrections appliquées, votre système dispose maintenant de:

### ✅ Auto-Retry Intelligent
- **1ère tentative:** Immédiate lors de la création de garantie
- **2ème tentative:** 1 minute après l'échec
- **3ème tentative:** 5 minutes après le 2ème échec
- **4ème tentative:** 15 minutes après le 3ème échec

### ✅ File d'Attente Persistante
- Les emails sont sauvegardés dans la base de données
- Même si l'application redémarre, les emails en attente seront renvoyés
- Processeur d'arrière-plan qui tourne toutes les minutes

### ✅ Interface de Gestion
- Accessible via **Paramètres > File d'attente Emails**
- Visualisation en temps réel
- Renvoi manuel possible
- Filtrage par statut

### ✅ Logs Détaillés
- Chaque tentative est loggée
- Messages d'erreur clairs et actionnables
- Suivi du nombre de tentatives

## Checklist de Vérification Finale

- [ ] Créer une garantie test complète
- [ ] Vérifier que le message inclut "✓ Email envoyé au client"
- [ ] Vérifier la réception de l'email dans la boîte mail
- [ ] Vérifier les logs Supabase (pas d'erreurs)
- [ ] Accéder à **Paramètres > File d'attente Emails**
- [ ] Confirmer qu'aucun email n'est en état "failed"

## Support

**Si les emails ne fonctionnent toujours pas après ces vérifications:**

1. Prenez une capture d'écran des logs Supabase
2. Notez le message d'erreur exact
3. Vérifiez le statut de votre domaine dans Resend Dashboard
4. Consultez la file d'attente dans l'application pour voir les détails d'erreur

**Ressources utiles:**
- [Documentation Resend](https://resend.com/docs)
- [Resend Status Page](https://status.resend.com)
- [Support Resend](https://resend.com/support)

## Résumé

✅ Secrets Resend déjà configurés dans Supabase
✅ Code amélioré avec système de retry automatique
✅ Interface de gestion des emails échoués disponible
✅ File d'attente persistante et processeur d'arrière-plan actifs

**Prochaine action:** Créez une garantie test pour vérifier que tout fonctionne!
