# Guide de Configuration Resend pour l'Envoi d'Emails

## Problème Identifié

L'erreur **"Edge Function returned a non-2xx status code"** dans la page Paramètres > Notifications est causée par:

1. La clé API Resend (RESEND_API_KEY) n'est PAS configurée dans Supabase
2. L'Edge Function `send-email` ne peut pas envoyer d'emails sans cette clé
3. Elle retourne un statut HTTP 500 (erreur serveur)

## Solution: Configuration en 3 Étapes

### Étape 1: Créer un Compte Resend et Obtenir une Clé API

#### 1.1 Créer un compte Resend

1. Allez sur [https://resend.com/signup](https://resend.com/signup)
2. Créez votre compte avec votre email professionnel
3. Vérifiez votre email de confirmation

#### 1.2 Obtenir votre clé API

1. Une fois connecté, allez dans **[API Keys](https://resend.com/api-keys)**
2. Cliquez sur **"Create API Key"**
3. Donnez-lui un nom: `Pro-Remorque Production`
4. Sélectionnez les permissions: **"Sending access"** (Full access)
5. Cliquez sur **"Add"**
6. **IMPORTANT:** Copiez immédiatement la clé API (elle commence par `re_`)
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Vous ne pourrez plus la voir après avoir fermé la fenêtre!

#### 1.3 Vérifier votre domaine (CRITIQUE)

**IMPORTANT:** L'adresse par défaut `onboarding@resend.dev` ne fonctionne QUE pour les tests.

Pour l'environnement de production, vous DEVEZ vérifier votre propre domaine:

1. Allez dans **[Domains](https://resend.com/domains)**
2. Cliquez sur **"Add Domain"**
3. Entrez votre domaine: `pro-remorque.com` (ou votre domaine)
4. Resend vous donnera des enregistrements DNS à ajouter:
   - **MX Record** (pour recevoir)
   - **TXT Record (SPF)** (pour authentification d'envoi)
   - **CNAME/TXT Record (DKIM)** (pour signature d'email)
   - **TXT Record (DMARC)** (optionnel mais recommandé)

5. Ajoutez ces enregistrements dans votre gestionnaire DNS (GoDaddy, Cloudflare, etc.)
6. Attendez la vérification (peut prendre 15 min à 72h)
7. Une fois vérifié, vous verrez un badge **"Verified"** vert

**Exemple d'email vérifié:**
- Avant: `onboarding@resend.dev` (test seulement)
- Après: `noreply@pro-remorque.com` (production)

### Étape 2: Configurer les Secrets dans Supabase

#### 2.1 Accéder aux Secrets Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet (Pro-Remorque)
3. Dans le menu latéral gauche, allez à **Settings** (icône d'engrenage en bas)
4. Cliquez sur **Edge Functions** dans le sous-menu
5. Cherchez la section **"Secrets"** ou **"Environment Variables"**
6. Cliquez sur **"Add new secret"** ou **"Manage secrets"**

#### 2.2 Ajouter les Secrets Requis

Ajoutez les 3 secrets suivants:

**Secret 1: RESEND_API_KEY**
- Key: `RESEND_API_KEY`
- Value: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (votre clé API copiée depuis Resend)

**Secret 2: FROM_EMAIL**
- Key: `FROM_EMAIL`
- Value: `noreply@pro-remorque.com` (ou votre domaine vérifié)

**Secret 3: FROM_NAME**
- Key: `FROM_NAME`
- Value: `Pro-Remorque`

#### 2.3 Sauvegarder

1. Cliquez sur **"Save"** ou **"Add Secret"** pour chaque secret
2. Vérifiez que les 3 secrets sont bien listés

**IMPORTANT:** Vous n'avez PAS besoin de redéployer l'Edge Function après avoir ajouté des secrets. Ils sont immédiatement disponibles.

### Étape 3: Tester la Configuration

#### 3.1 Dans l'Application

1. Allez dans votre application: **Paramètres > Notifications**
2. Activez **"Notifications par email"**
3. Entrez votre adresse email de test
4. Cliquez sur le bouton vert **"Tester"**
5. Vous devriez voir: **"Email de test envoyé avec succès! Vérifiez votre boîte de réception."**
6. Vérifiez votre email (et le dossier spam si nécessaire)

#### 3.2 Vérifier les Logs (Si Problème)

Si l'erreur persiste, vérifiez les logs:

1. Dans Supabase Dashboard, allez à **Edge Functions**
2. Cliquez sur la fonction `send-email`
3. Allez dans l'onglet **"Logs"**
4. Recherchez les messages d'erreur récents

Les logs améliorés afficheront maintenant:
- `CRITICAL: RESEND_API_KEY not configured` (si la clé manque)
- `Resend API error response:` (si problème avec Resend)
- `Email sent successfully. Resend ID:` (si succès)

## Erreurs Communes et Solutions

### Erreur 1: "Email service not configured"

**Cause:** La clé RESEND_API_KEY n'est pas configurée dans Supabase

**Solution:** Suivez l'Étape 2 ci-dessus pour ajouter la clé

### Erreur 2: "Domain not verified" ou erreur 403 de Resend

**Cause:** Vous utilisez un email avec un domaine non vérifié

**Solution:**
- Vérifiez votre domaine dans Resend (Étape 1.3)
- OU utilisez temporairement `onboarding@resend.dev` pour les tests (ne fonctionne qu'en développement)

### Erreur 3: "Invalid API key" ou erreur 401

**Cause:** La clé API est incorrecte ou expirée

**Solution:**
- Générez une nouvelle clé API dans Resend
- Mettez à jour le secret RESEND_API_KEY dans Supabase
- Vérifiez qu'il n'y a pas d'espaces avant/après la clé

### Erreur 4: "Rate limit exceeded" ou erreur 429

**Cause:** Vous avez dépassé la limite d'envoi gratuite de Resend

**Solution:**
- Compte gratuit Resend: 100 emails/jour, 3,000 emails/mois
- Attendez 24h ou passez à un plan payant

## Vérification de la Configuration

Pour vérifier que tout est bien configuré, vérifiez:

1. **Dans Resend Dashboard:**
   - [ ] Compte créé et vérifié
   - [ ] Clé API créée et copiée
   - [ ] Domaine ajouté et vérifié (badge vert)
   - [ ] Enregistrements DNS configurés

2. **Dans Supabase Dashboard > Settings > Edge Functions > Secrets:**
   - [ ] RESEND_API_KEY = `re_xxxxx...`
   - [ ] FROM_EMAIL = `votre-email@votre-domaine.com`
   - [ ] FROM_NAME = `Pro-Remorque`

3. **Test Final:**
   - [ ] L'application peut envoyer un email de test sans erreur
   - [ ] L'email est reçu dans la boîte de réception
   - [ ] L'expéditeur affiché est correct

## Support Supplémentaire

Si vous rencontrez toujours des problèmes:

1. **Documentation Resend:** [https://resend.com/docs](https://resend.com/docs)
2. **Support Resend:** [https://resend.com/support](https://resend.com/support)
3. **Documentation Supabase Edge Functions:** [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

## Notes Importantes

- Les emails de test avec `onboarding@resend.dev` peuvent être bloqués par certains filtres anti-spam
- La vérification de domaine peut prendre jusqu'à 72 heures (généralement 15-30 minutes)
- Resend offre un plan gratuit généreux: 3,000 emails/mois, 100/jour
- Pour la production, un domaine vérifié est OBLIGATOIRE
- Les secrets Supabase sont immédiatement disponibles, pas besoin de redéployer
