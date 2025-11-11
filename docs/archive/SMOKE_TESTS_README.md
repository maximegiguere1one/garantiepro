# Pro-Remorque - Smoke Tests Automatisés

**Version:** 1.0.0
**Date:** 2025-10-26
**Environnement:** Staging (obligatoire)

---

## 📋 Vue d'Ensemble

Ce package fournit des smoke tests automatisés et idempotents pour l'API Pro-Remorque. Les tests sont conçus pour détecter rapidement les régressions critiques après chaque déploiement en staging.

### Objectifs

1. **Fail Fast** - Détecter les régressions immédiatement après déploiement
2. **Idempotence** - Tests réutilisables sans pollution de données
3. **CI/CD Ready** - Intégration GitHub Actions incluse
4. **Notifications** - Alertes Slack/Email en cas d'échec

---

## 📦 Contenu du Package

```
scripts/
├── smoke-tests.sh          # Script principal de tests
└── notify-on-fail.sh       # Script de notification (optionnel)

acceptance/
└── fixtures/
    └── warranty-min.json   # Données de test minimales

ci/
└── smoke-tests-workflow.yml  # Workflow GitHub Actions

handover/tests/
└── smoke-tests-*.log       # Logs d'exécution de preuve
```

---

## 🚀 Quick Start

### Prérequis

```bash
# Outils requis
curl --version   # HTTP client
jq --version     # JSON processor

# Installation si nécessaire
# macOS
brew install curl jq

# Ubuntu/Debian
sudo apt-get install curl jq

# Alpine
apk add curl jq
```

### Configuration Environnement

Créez un fichier `.env.smoke-tests`:

```bash
# API Configuration (REQUIRED)
STAGING_API_URL="https://api.staging.pro-remorque.com"
STAGING_API_KEY="your-supabase-anon-key"
STAGING_SERVICE_KEY="your-supabase-service-key"

# Test Configuration (OPTIONAL)
TEST_USER_EMAIL="smoke-test@example.com"
TEST_USER_PASSWORD="SmokeTest123!"
CLEANUP_ON_SUCCESS="true"
VERBOSE="false"

# Notifications (OPTIONAL)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
EMAIL_WEBHOOK_URL=""
PAGERDUTY_KEY=""
```

### Exécution Locale

```bash
# 1. Charger les variables d'environnement
source .env.smoke-tests

# 2. Lancer les tests
./scripts/smoke-tests.sh

# 3. Avec verbose
./scripts/smoke-tests.sh --verbose

# 4. Sans cleanup (pour debug)
./scripts/smoke-tests.sh --no-cleanup
```

---

## 📊 Tests Inclus

### 1. Health Check (Exit 10 si échec)
**Endpoint:** `GET /api/health`
**Vérifie:** API disponible et répond
**Timeout:** 10 secondes
**Retries:** 2 tentatives

### 2. Create Warranty - End-to-End (Exit 20 si échec)
**Endpoint:** `POST /rest/v1/warranties`
**Vérifie:** Création de garantie et lecture DB
**Données:** Fixture `warranty-min.json`
**ID unique:** `SMOKE-YYYYMMDD-HHMMSS`

### 3. Generate PDF Preview (Exit 30 si échec)
**Endpoint:** `GET /api/warranties/:id/pdf`
**Vérifie:** Génération PDF (> 10KB)
**Timeout:** 30 secondes

### 4. Signature Flow Stub (Exit 30 si échec)
**Endpoint:** `POST /api/warranties/:id/sign?mode=test`
**Vérifie:** Endpoint signature accessible
**Mode:** Test/simulation

### 5. File Upload (Exit 40 si échec)
**Endpoint:** `POST /api/warranties/:id/attachments`
**Vérifie:** Upload fichier et storage
**Taille:** < 1MB (test file)

### 6. Database Access (Exit 50 si échec)
**Endpoint:** `GET /rest/v1/profiles?select=id&limit=1`
**Vérifie:** Accès lecture DB via API
**Permissions:** Anon key suffisante

---

## 🔧 Variables d'Environnement

### Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `STAGING_API_URL` | URL de l'API staging | `https://api.staging.pro-remorque.com` |
| `STAGING_API_KEY` | Clé API Supabase (anon) | `eyJhbGciOiJIUzI1...` |
| `STAGING_SERVICE_KEY` | Clé service role (admin) | `eyJhbGciOiJIUzI1...` |

### Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `TEST_USER_EMAIL` | Email utilisateur test | `smoke-test@example.com` |
| `TEST_USER_PASSWORD` | Mot de passe test | `SmokeTest123!` |
| `CLEANUP_ON_SUCCESS` | Nettoyer données après succès | `true` |
| `VERBOSE` | Mode verbose (logs détaillés) | `false` |
| `SLACK_WEBHOOK_URL` | Webhook Slack pour notifications | *(vide)* |
| `EMAIL_WEBHOOK_URL` | Webhook email | *(vide)* |
| `PAGERDUTY_KEY` | Clé PagerDuty | *(vide)* |

---

## 🤖 Intégration CI/CD

### GitHub Actions

Copiez `ci/smoke-tests-workflow.yml` vers `.github/workflows/smoke-tests.yml`

**Configuration des Secrets:**

```bash
# Dans GitHub Repository Settings > Secrets and Variables > Actions
STAGING_API_URL          # URL de l'API staging
STAGING_API_KEY          # Clé Supabase anon
STAGING_SERVICE_KEY      # Clé Supabase service
SLACK_WEBHOOK_URL        # Webhook Slack (optionnel)
```

**Déclencheurs:**

1. **Après déploiement staging** - Automatique après workflow "Deploy to Staging"
2. **Quotidien (cron)** - Chaque jour à 6h UTC
3. **Manuel** - Via bouton "Run workflow" dans GitHub Actions

**Blocage Production:**

Le workflow peut bloquer le déploiement en production si les tests staging échouent (voir job `gate-production-deployment`).

### Autres CI (GitLab, CircleCI, etc.)

Adaptez le script pour votre CI:

```yaml
# Exemple GitLab CI
smoke-tests:
  stage: test
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq bash
  script:
    - chmod +x scripts/smoke-tests.sh
    - ./scripts/smoke-tests.sh
  variables:
    STAGING_API_URL: $STAGING_API_URL
    STAGING_API_KEY: $STAGING_API_KEY
  only:
    - main
```

---

## 📈 Exit Codes & Debugging

### Exit Codes

| Code | Signification | Action |
|------|---------------|--------|
| `0` | Tous les tests réussis | ✅ Aucune action |
| `10` | Health check échoué | 🔴 API down - vérifier déploiement |
| `20` | Create warranty échoué | 🔴 DB/API issue - vérifier logs |
| `30` | PDF/Signature échoué | 🟠 Service docs - vérifier workers |
| `40` | Upload fichier échoué | 🟠 Storage issue - vérifier S3/Supabase |
| `50` | Erreur misc | 🔴 Vérifier logs détaillés |

### Debugging

```bash
# Mode verbose
VERBOSE=true ./scripts/smoke-tests.sh

# Garder les données de test
./scripts/smoke-tests.sh --no-cleanup

# Vérifier logs détaillés
cat handover/tests/smoke-tests-YYYYMMDD-HHMMSS.log

# Test spécifique (modifier le script)
# Commenter les tests non nécessaires
```

### Logs Structurés

Les logs incluent:
- **Timestamp** de chaque étape
- **HTTP status codes** et response bodies
- **Test IDs** pour traçabilité
- **Duration** totale d'exécution

---

## 🔔 Notifications

### Slack

```bash
# Configurer webhook
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"

# Tester notification
./scripts/notify-on-fail.sh 20 smoke-tests.log
```

**Format du message:**
- 🚨 Alerte avec couleur (rouge = échec)
- Code d'erreur et message
- Résumé des tests
- Lien vers logs GitHub Actions

### Email (Optionnel)

Configurez `EMAIL_WEBHOOK_URL` pointant vers un service email (SendGrid, Mailgun, etc.)

### PagerDuty (Optionnel)

Pour les échecs critiques uniquement (codes 10 et 20):
```bash
export PAGERDUTY_KEY="your-integration-key"
```

---

## 🧹 Cleanup & Idempotence

### Stratégie de Cleanup

1. **IDs uniques** - Préfixe `SMOKE-YYYYMMDD-HHMMSS` pour traçabilité
2. **Auto-cleanup** - Suppression automatique après succès
3. **Mode no-cleanup** - Garder données pour debug (`--no-cleanup`)
4. **Cleanup manuel** - Si tests interrompus:

```bash
# Trouver les garanties de test
curl "$STAGING_API_URL/rest/v1/warranties?vin=like.SMOKE*" \
  -H "apikey: $STAGING_API_KEY"

# Supprimer manuellement
curl -X DELETE "$STAGING_API_URL/rest/v1/warranties?vin=like.SMOKE*" \
  -H "apikey: $STAGING_SERVICE_KEY"
```

### Prévention Pollution DB

- ✅ Préfixes identifiables (`SMOKE-*`)
- ✅ Notes explicites dans les données
- ✅ Cleanup automatique par défaut
- ✅ Timeouts pour éviter blocages

---

## 🔒 Sécurité & Permissions

### Permissions Minimales Requises

**Supabase Anon Key:**
- `SELECT` sur `profiles`, `warranties`
- `INSERT` sur `warranties`
- `POST` API endpoints (création)

**Supabase Service Key:**
- `DELETE` sur `warranties` (cleanup)
- Admin endpoints si nécessaire

### Bonnes Pratiques

1. **Jamais en production** - Tests staging uniquement
2. **Secrets sécurisés** - GitHub Secrets ou équivalent
3. **Rotation keys** - Renouveler clés régulièrement
4. **Logs sanitized** - Pas de secrets dans logs

---

## 📝 Exemple d'Exécution

### Succès

```
[INFO] Pro-Remorque API Smoke Tests
[INFO] Test ID: smoke-20251026-143000
[INFO] API URL: https://api.staging.pro-remorque.com
[INFO] ================================================

[TEST] 1. Health check
[PASS] 1. Health check

[TEST] 2. Create warranty (E2E)
[INFO] Warranty created successfully: ID=abc-123
[PASS] 2. Create warranty (E2E)

[TEST] 3. Generate PDF preview
[INFO] PDF generated successfully (45230 bytes)
[PASS] 3. Generate PDF preview

[TEST] 4. Signature flow (stub)
[INFO] Signature flow initiated successfully
[PASS] 4. Signature flow (stub)

[TEST] 5. File upload
[INFO] File uploaded successfully
[PASS] 5. File upload

[TEST] 6. Database read access
[INFO] Database read access successful
[PASS] 6. Database read access

[INFO] ================================================
[INFO] TEST SUMMARY
[INFO] ================================================
[INFO] Test ID:      smoke-20251026-143000
[INFO] Tests run:    6
[PASS] Tests passed: 6
[INFO] Duration:     12s
[INFO] ================================================
[PASS] ALL TESTS PASSED ✓
```

### Échec

```
[TEST] 1. Health check
[ERROR] Health check failed with HTTP 503
[ERROR] Response: {"error":"Service Unavailable"}
[FAIL] 1. Health check

[INFO] ================================================
[INFO] TEST SUMMARY
[INFO] ================================================
[FAIL] Tests failed: 1
[INFO] Duration:     3s
[INFO] ================================================

Exit code: 10
```

---

## 🆘 Troubleshooting

### Problème: "curl not found"
**Solution:** Installer curl
```bash
sudo apt-get install curl  # Ubuntu/Debian
brew install curl          # macOS
```

### Problème: "jq not found"
**Solution:** Installer jq
```bash
sudo apt-get install jq    # Ubuntu/Debian
brew install jq            # macOS
```

### Problème: "Health check failed (000)"
**Causes possibles:**
- API non déployée ou down
- URL incorrecte
- Problème réseau/firewall

**Debug:**
```bash
curl -v $STAGING_API_URL/api/health
```

### Problème: "Create warranty failed (401)"
**Causes possibles:**
- `STAGING_API_KEY` invalide ou manquante
- Permissions insuffisantes

**Debug:**
```bash
echo $STAGING_API_KEY  # Vérifier clé
```

### Problème: Tests lents (> 1 minute)
**Causes possibles:**
- Timeout réseau
- API surchargée

**Solution:**
```bash
# Augmenter timeout
export HTTP_TIMEOUT=30
```

---

## 📚 Ressources Additionnelles

- **Handover Package:** `handover/README.md`
- **Runbook Site Down:** `handover/runbooks/runbook-site-down.md`
- **Logs de Test:** `handover/tests/smoke-tests-*.log`

---

## ✅ Checklist d'Intégration

- [ ] Scripts téléchargés et exécutables (`chmod +x`)
- [ ] Variables d'environnement configurées (`.env.smoke-tests`)
- [ ] Tests exécutés manuellement avec succès
- [ ] Workflow CI copié dans `.github/workflows/`
- [ ] Secrets GitHub configurés
- [ ] Webhook Slack configuré (optionnel)
- [ ] Notifications testées
- [ ] Équipe formée sur interprétation des résultats
- [ ] Runbook incident à jour avec procédure smoke tests

---

## 🔄 Maintenance

### Mise à Jour des Tests

1. Modifier `scripts/smoke-tests.sh` pour nouveaux tests
2. Ajouter fixtures dans `acceptance/fixtures/`
3. Tester localement
4. Commit et push

### Révision Régulière

- **Mensuel:** Vérifier que tous les tests passent
- **Après migration:** Adapter tests aux nouveaux endpoints
- **Après incident:** Ajouter tests de régression

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-10-26
**Maintenu par:** Pro-Remorque DevOps Team
