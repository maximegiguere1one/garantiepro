# Guide de Correction du Système d'Envoi d'Emails de Garantie

## Problème Identifié

L'erreur **"La garantie a été créée mais l'email de confirmation n'a pas pu être envoyé"** était causée par plusieurs problèmes:

1. **Triggers de base de données défectueux** utilisant des colonnes inexistantes (`warranty_number`, `customer_name`, `vin`)
2. **Configuration Resend incomplète** - clé API manquante ou domaine non vérifié
3. **Absence de système de retry robuste** - les emails échoués n'étaient pas automatiquement retentés
4. **Schéma email_queue fragmenté** avec plusieurs versions conflictuelles

## Solutions Implémentées

### 1. Migration Base de Données (20251011200000_fix_email_system_complete.sql)

#### Corrections apportées:

- **Table email_queue recréée** avec schéma unifié et complet:
  ```sql
  - organization_id (multi-tenant)
  - to_email, from_email, subject, html_body
  - priority (low/normal/high/urgent)
  - status (queued/sending/sent/failed/cancelled)
  - attempts, max_retries, error_message
  - next_retry_at, sent_at, failed_at
  - metadata (jsonb pour données flexibles)
  ```

- **Triggers corrigés** pour utiliser les bonnes colonnes:
  - `notify_new_warranty()` - JOIN avec tables `customers` et `trailers`
  - `notify_new_claim()` - Récupération des données via relations
  - `notify_claim_status_update()` - Gestion robuste des erreurs

- **Fonctions helper créées**:
  - `queue_email()` - Ajouter un email dans la queue
  - `send_email_notification()` - Notifier utilisateurs selon préférences

- **Gestion d'erreurs robuste**:
  - Tous les triggers ont des blocs `EXCEPTION` pour ne jamais bloquer la création de garanties
  - Les erreurs sont loggées mais ne causent pas d'échec de transaction

### 2. Code Frontend Amélioré (NewWarranty.tsx)

#### Changements majeurs:

**AVANT** (Problématique):
```typescript
// Tentative d'envoi direct via API
const emailResponse = await fetch(...);
if (!emailResponse.ok) {
  // Essayer de mettre en queue en fallback
}
```

**APRÈS** (Fiable):
```typescript
// TOUJOURS mettre dans la queue d'abord
const { data: queueResult, error: queueError } = await supabase
  .from('email_queue')
  .insert({
    organization_id: warrantyData.organization_id,
    to_email: customerData.email,
    subject: '...',
    html_body: emailBodyHtml,
    priority: 'high',
    status: 'queued',
    max_retries: 5
  });
```

#### Templates d'email améliorés:

- **HTML professionnel** avec design responsive
- **Multilingue** (français/anglais) selon préférence client
- **Informations complètes**:
  - Détails de la garantie (numéro, dates, montant)
  - Informations véhicule (année, marque, modèle, VIN)
  - Droit de rétractation (10 jours) avec date limite
  - Coordonnées de support

### 3. Processeur de Queue Automatique (process-email-queue)

#### Edge Function créée:

**Fonctionnalités**:
- Traite automatiquement les emails en attente
- Priorité: `urgent > high > normal > low`
- Retry avec délais exponentiels:
  - Tentative 1: immédiat
  - Tentative 2: +1 minute
  - Tentative 3: +5 minutes
  - Tentative 4: +15 minutes
  - Tentative 5: +1 heure
  - Tentative 6+: +2 heures

**Sécurité**:
- Utilise `SUPABASE_SERVICE_ROLE_KEY` pour accès complet
- Rate limiting: 100ms entre chaque email
- Traite max 50 emails par invocation

**Gestion d'erreurs**:
- Erreurs Resend capturées et loggées
- Statut mis à jour: `sending → sent | retry | failed`
- Métadonnées enrichies (resend_id, timestamps)

## Configuration Requise

### 1. Secrets Supabase Edge Functions

Allez dans **Supabase Dashboard** > **Settings** > **Edge Functions** > **Secrets**:

```bash
# Obligatoire pour envoyer des emails
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Ces variables sont automatiquement configurées:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 2. Configuration Resend

#### Étape 1: Créer compte Resend
- Allez sur https://resend.com
- Créez un compte gratuit (100 emails/jour)
- Passez à un plan payant si nécessaire

#### Étape 2: Vérifier le domaine
- Allez dans **Domains** > **Add Domain**
- Entrez: `locationproremorque.ca`
- Ajoutez les enregistrements DNS suivants:

```
Type: TXT
Name: @
Value: resend-verification=xxxxxxxxxxxxx

Type: MX
Name: @
Priority: 10
Value: feedback-smtp.resend.com

Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

**Important**: Le statut doit être **"Verified"** (peut prendre quelques minutes)

#### Étape 3: Créer clé API
- Allez dans **API Keys** > **Create API Key**
- Permissions: **Sending access**
- Copiez la clé (elle ne sera affichée qu'une fois!)
- Ajoutez-la dans les secrets Supabase

### 3. Déploiement Edge Functions

```bash
# Déployer la fonction send-email (déjà existante)
supabase functions deploy send-email

# Déployer la nouvelle fonction process-email-queue
supabase functions deploy process-email-queue

# Vérifier le déploiement
supabase functions list
```

### 4. Configuration Cron (Optionnel)

Pour traiter automatiquement la queue toutes les minutes:

```sql
-- Dans Supabase Dashboard > Database > Cron Jobs
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *', -- Chaque minute
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue',
      headers:=jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
      body:='{}'::jsonb
    )
  $$
);
```

## Appliquer les Corrections

### Étape 1: Appliquer la migration

```bash
# Dans votre terminal
cd /path/to/project
supabase db push
```

Ou via Supabase Dashboard:
1. Allez dans **SQL Editor**
2. Copiez le contenu de `supabase/migrations/20251011200000_fix_email_system_complete.sql`
3. Exécutez le script

### Étape 2: Vérifier les secrets

```bash
# Lister les secrets configurés
supabase secrets list

# Définir le secret RESEND_API_KEY si manquant
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Étape 3: Déployer les fonctions

```bash
# Déployer process-email-queue
supabase functions deploy process-email-queue
```

### Étape 4: Tester le système

```bash
# Invoquer manuellement le processeur de queue
supabase functions invoke process-email-queue

# Vérifier les logs
supabase functions logs process-email-queue --tail
```

## Tester le Système Complet

### Test 1: Créer une garantie

1. Connectez-vous à l'application
2. Allez dans **Nouvelle vente**
3. Remplissez tous les champs requis
4. Signez le contrat
5. Vérifiez le message de succès

**Résultat attendu**:
```
Garantie créée avec succès!

Contrat: XXXX-XXXXX
Vente complétée en Xm XXs

✓ Client créé
✓ Remorque enregistrée
✓ Garantie activée
✓ Documents générés
✓ Contrat signé
✓ Email de confirmation programmé
```

### Test 2: Vérifier la queue

```sql
-- Dans SQL Editor
SELECT
  id,
  to_email,
  subject,
  status,
  attempts,
  error_message,
  created_at,
  next_retry_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu**:
- Statut: `queued` ou `sent`
- `attempts`: 0 si queued, 1+ si processing/sent
- `error_message`: NULL si pas d'erreur

### Test 3: Traiter manuellement la queue

```bash
# Invoquer le processeur
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Résultat attendu**:
```json
{
  "success": true,
  "stats": {
    "processed": 1,
    "sent": 1,
    "failed": 0,
    "retried": 0
  },
  "executionTime": 234
}
```

### Test 4: Vérifier l'email reçu

1. Vérifiez la boîte email du client
2. L'email doit contenir:
   - ✓ Sujet correct (français ou anglais)
   - ✓ Design professionnel HTML
   - ✓ Toutes les informations de la garantie
   - ✓ Droit de rétractation avec date limite
   - ✓ Informations véhicule

## Monitoring et Diagnostics

### Visualiser la queue d'emails

Créez une vue dans votre application:

```typescript
import { supabase } from './lib/supabase';

const { data: queue } = await supabase
  .from('email_queue')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);

// Afficher dans un tableau avec:
// - Destinataire
// - Sujet
// - Statut (avec badge coloré)
// - Tentatives
// - Erreur
// - Dates
// - Actions (Retry, Cancel, Delete)
```

### Logs des Edge Functions

```bash
# Suivre les logs en temps réel
supabase functions logs process-email-queue --tail

# Filtrer par erreurs uniquement
supabase functions logs process-email-queue | grep ERROR
```

### Statistiques Resend

- Dashboard Resend: https://resend.com/logs
- Voir les emails envoyés, bounces, complaints
- Métriques de délivrabilité

### Alertes recommandées

Configurez des alertes pour:
- **Emails en échec** > 10 par heure
- **Taux de bounce** > 5%
- **Queue size** > 100 emails
- **Temps de traitement** > 5 minutes

## Dépannage

### Problème: Emails restent en "queued"

**Causes possibles**:
1. Processeur de queue non déployé
2. Cron job non configuré
3. RESEND_API_KEY manquante

**Solution**:
```bash
# Vérifier les secrets
supabase secrets list

# Déployer le processeur
supabase functions deploy process-email-queue

# Invoquer manuellement
supabase functions invoke process-email-queue
```

### Problème: Status "failed" avec erreur

**Erreurs courantes**:

1. **"Domain not verified"**
   - Allez sur https://resend.com/domains
   - Vérifiez que le statut est "Verified"
   - Attendez la propagation DNS (jusqu'à 48h)

2. **"Invalid API key"**
   - Régénérez une nouvelle clé sur Resend
   - Mettez à jour le secret Supabase
   - Redéployez les fonctions

3. **"Rate limit exceeded"**
   - Passez à un plan supérieur sur Resend
   - Ou attendez la réinitialisation (minuit UTC)

### Problème: Triggers bloquent création garantie

**Symptôme**: Erreur lors de la signature du contrat

**Solution**: Les triggers ont maintenant des blocs EXCEPTION, ils ne peuvent plus bloquer. Si le problème persiste:

```sql
-- Désactiver temporairement les triggers
ALTER TABLE warranties DISABLE TRIGGER trigger_notify_new_warranty;

-- Réactiver après diagnostic
ALTER TABLE warranties ENABLE TRIGGER trigger_notify_new_warranty;
```

## Maintenance

### Nettoyer les anciens emails

```sql
-- Supprimer les emails envoyés > 30 jours
DELETE FROM email_queue
WHERE status = 'sent'
AND sent_at < NOW() - INTERVAL '30 days';

-- Supprimer les emails échoués > 7 jours
DELETE FROM email_queue
WHERE status = 'failed'
AND failed_at < NOW() - INTERVAL '7 days';
```

### Réessayer les emails échoués

```sql
-- Remettre en queue les emails échoués (max 3 jours)
UPDATE email_queue
SET
  status = 'queued',
  attempts = 0,
  next_retry_at = NOW(),
  error_message = NULL
WHERE status = 'failed'
AND failed_at > NOW() - INTERVAL '3 days';
```

## Améliorations Futures

1. **Dashboard de monitoring**
   - Graphiques temps réel
   - Taux de succès/échec
   - Temps moyen de traitement

2. **Webhooks Resend**
   - Écouter les événements (delivered, bounced, complained)
   - Mettre à jour automatiquement les statuts

3. **Templates avancés**
   - Éditeur WYSIWYG
   - Variables dynamiques
   - A/B testing

4. **Priorité dynamique**
   - Emails urgents traités immédiatement
   - Emails marketing en batch

## Support

En cas de problème persistant:

1. Vérifiez les logs Edge Functions
2. Consultez la queue email_queue dans la DB
3. Vérifiez le dashboard Resend
4. Testez avec l'outil de test intégré

**Contacts**:
- Support Resend: https://resend.com/support
- Documentation Supabase: https://supabase.com/docs
