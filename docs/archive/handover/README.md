# Pro-Remorque Operations Handover Package

**Version:** 1.0.0
**Last Updated:** 2025-10-26
**Status:** Production Ready

## 📦 Package Contents

This handover package contains all operational scripts, runbooks, and documentation needed to independently manage Pro-Remorque deployments, backups, and incident response.

```
handover/
├── scripts/
│   ├── backup-db.sh         # Database backup to S3
│   ├── restore-db.sh        # Database restore from S3 (STAGING ONLY)
│   ├── deploy.sh            # Build and deploy application
│   └── rollback.sh          # Rollback to previous release
├── runbooks/
│   └── runbook-site-down.md # Site down / incident response runbook
├── acceptance/
│   └── smoke-tests.sh       # Automated smoke tests
├── tests/
│   └── (test logs and evidence)
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites

Install the following tools on your operations machine:

```bash
# PostgreSQL client tools
brew install postgresql  # macOS
apt-get install postgresql-client  # Ubuntu/Debian

# AWS CLI
brew install awscli  # macOS
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"  # Linux

# Node.js 18+
brew install node@18  # macOS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -  # Ubuntu/Debian

# Supabase CLI (optional, for migrations)
npm install -g supabase
```

### Environment Setup

Create a `.env.operations` file with your credentials:

```bash
# Database
DB_URL="postgresql://user:password@host:5432/dbname"
TARGET_DB_URL="postgresql://user:password@staging-host:5432/dbname"  # STAGING ONLY

# AWS S3
S3_BUCKET="pro-remorque-backups"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-role-key"

# Deployment
DEPLOY_TOKEN="your-vercel-or-cloudflare-token"
APP_URL="https://staging.pro-remorque.com"  # or production URL
```

**Load environment:**
```bash
source .env.operations
```

---

## 📚 Operations Guide

### 1. Database Backup

**Purpose:** Create a backup of the database and upload to S3

**Usage:**
```bash
cd /path/to/pro-remorque
./handover/scripts/backup-db.sh --env staging
```

**Options:**
- `--env staging|production` - Environment to backup (production requires approval)

**Output:**
- Backup file in S3: `s3://<bucket>/pro-remorque/backups/<env>/YYYY-MM-DD/<file>.sql.gz`
- Checksum file: `<file>.sql.gz.sha256`
- Local log with backup details

**Exit Codes:**
- `0` - Success
- `1` - Invalid arguments
- `2` - Missing prerequisites
- `3` - Database connection error
- `4` - Backup failed
- `5` - S3 upload failed

**Example Output:**
```
[INFO] Pro-Remorque Database Backup
[INFO] Environment: staging
[INFO] Backup created successfully. Size: 245M
[INFO] Checksum: a1b2c3d4...
[INFO] S3 location: s3://bucket/pro-remorque/backups/staging/2025-10-26/backup_staging_20251026_143000.sql.gz
```

**Schedule Recommended:**
- Production: Daily at 2 AM UTC
- Staging: Weekly or before major changes

---

### 2. Database Restore

**⚠️ WARNING: STAGING ONLY - DO NOT RUN ON PRODUCTION**

**Purpose:** Restore database from S3 backup

**Usage:**
```bash
# Restore latest backup
./handover/scripts/restore-db.sh --env staging --latest

# Restore specific backup
./handover/scripts/restore-db.sh --env staging --backup-file backup_staging_20251026_143000.sql.gz
```

**Safety Features:**
- Blocks production restores by default
- Requires explicit confirmation before proceeding
- Verifies checksums before restore
- Runs smoke tests after restore

**Exit Codes:**
- `0` - Success
- `1` - Production environment detected (blocked)
- `2` - Missing prerequisites
- `4` - Backup download failed
- `5` - Checksum verification failed
- `6` - Restore failed
- `7` - Smoke tests failed

---

### 3. Deployment

**Purpose:** Build and deploy application to staging or production

**Usage:**
```bash
# Deploy to staging
./handover/scripts/deploy.sh --env staging

# Deploy to production (requires approval)
./handover/scripts/deploy.sh --env production

# Deploy specific commit
./handover/scripts/deploy.sh --env staging --commit abc123
```

**Options:**
- `--env staging|production` - Target environment
- `--skip-build` - Skip build step (use existing dist/)
- `--skip-migrations` - Skip database migrations
- `--skip-tests` - Skip smoke tests (not recommended)
- `--commit <hash>` - Deploy specific commit

**Process:**
1. Check prerequisites (Node.js, git, etc.)
2. Install dependencies (`npm ci`)
3. Build application (`npm run build`)
4. Run migrations dry-run
5. Apply migrations
6. Deploy to platform (Vercel/Cloudflare)
7. Run smoke tests

**Exit Codes:**
- `0` - Success
- `1` - Invalid arguments or cancelled
- `2` - Missing prerequisites
- `3` - Build failed
- `4` - Migrations failed
- `5` - Deployment failed
- `6` - Smoke tests failed

---

### 4. Rollback

**Purpose:** Revert to previous release

**Usage:**
```bash
# Rollback to previous release
./handover/scripts/rollback.sh --env staging

# Rollback to specific commit
./handover/scripts/rollback.sh --env staging --to-commit abc123
```

**Options:**
- `--env staging|production` - Target environment
- `--to-commit <hash>` - Specific commit to rollback to
- `--skip-tests` - Skip smoke tests (not recommended)

**Process:**
1. Save current state (creates backup tag)
2. Find previous release (tag or commit)
3. Show diff of changes to be reverted
4. Checkout target commit
5. Rebuild application
6. Redeploy
7. Run smoke tests

**Exit Codes:**
- `0` - Success
- `1` - Invalid arguments or cancelled
- `2` - Missing prerequisites
- `3` - Git checkout failed
- `4` - Build failed
- `5` - Deployment failed
- `6` - Smoke tests failed

**When to Rollback:**
- Site completely down after recent deployment
- Critical feature broken after deployment
- Performance severely degraded after deployment

**When NOT to Rollback:**
- Infrastructure issues (DNS, CDN, Supabase)
- Database issues (rollback won't fix DB problems)
- Issues existed before recent deployment

---

### 5. Smoke Tests

**Purpose:** Validate application health and basic functionality

**Usage:**
```bash
# Test default URL (localhost)
./handover/acceptance/smoke-tests.sh

# Test specific environment
APP_URL=https://staging.pro-remorque.com ./handover/acceptance/smoke-tests.sh
```

**Tests Performed:**
1. Health check endpoint (`/api/health`)
2. Frontend loads
3. Supabase connection
4. Static assets load
5. Database read access
6. API response time (< 3 seconds)

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

**When to Run:**
- After deployment
- After rollback
- After database restore
- During incident response
- As part of monitoring

---

## 🚨 Incident Response

### Site Down Runbook

**Location:** `handover/runbooks/runbook-site-down.md`

**Quick Reference:**

1. **Check health endpoint:**
   ```bash
   curl https://pro-remorque.com/api/health
   ```

2. **If recent deployment, consider rollback:**
   ```bash
   ./handover/scripts/rollback.sh --env production
   ```

3. **Run smoke tests to verify:**
   ```bash
   APP_URL=https://pro-remorque.com ./handover/acceptance/smoke-tests.sh
   ```

4. **Communicate status to stakeholders** (see templates in runbook)

**Full Runbook Sections:**
- Symptoms identification
- Quick diagnostic checks
- Diagnostic commands for frontend/backend/database
- Immediate mitigation strategies
- Rollback decision tree
- Communication templates
- Post-incident checklist

---

## 🔐 Security & Permissions

### Required AWS Permissions

**For S3 backups:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::pro-remorque-backups/*",
        "arn:aws:s3:::pro-remorque-backups"
      ]
    }
  ]
}
```

### Required Database Permissions

**For backups:**
- `pg_dump` access (read-only)
- SELECT on all tables

**For restores (STAGING ONLY):**
- Full database access
- CREATE/DROP tables
- ALTER permissions

### Deployment Permissions

**Vercel:**
- Deploy access to project
- Environment variable read access

**Cloudflare:**
- Pages write access
- DNS read access (for verification)

---

## 📊 Monitoring & Alerts

### Recommended Alerts

1. **Health Check Failure**
   - Check: `curl https://pro-remorque.com/api/health`
   - Frequency: Every 1 minute
   - Alert on: 3 consecutive failures

2. **High Error Rate**
   - Metric: 4xx/5xx responses
   - Threshold: > 5% of requests
   - Alert on: Sustained for 5 minutes

3. **Slow Response Time**
   - Metric: p95 response time
   - Threshold: > 3 seconds
   - Alert on: Sustained for 5 minutes

4. **Database Connection Issues**
   - Check: Supabase connection
   - Alert on: Connection failures

### Monitoring Dashboard

**Suggested Metrics:**
- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- Database query time
- Active connections
- Deployment frequency
- Backup success rate

---

## 📝 Best Practices

### Daily Operations

1. **Monitor backups:**
   - Verify daily backup completed
   - Check S3 for backup files
   - Verify backup size is reasonable

2. **Review logs:**
   - Check for errors or warnings
   - Monitor database slow queries
   - Check deployment logs

3. **Test smoke tests:**
   - Run manually once per day
   - Verify all tests pass
   - Investigate any failures

### Weekly Operations

1. **Test restore process:**
   - Restore latest backup to staging
   - Verify data integrity
   - Run full smoke tests

2. **Review incidents:**
   - Document any issues encountered
   - Update runbooks if needed
   - Share learnings with team

3. **Cleanup old backups:**
   - Review S3 backup retention
   - Delete backups older than retention policy

### Before Major Changes

1. **Create backup:**
   ```bash
   ./handover/scripts/backup-db.sh --env production
   ```

2. **Test in staging:**
   ```bash
   # Deploy to staging
   ./handover/scripts/deploy.sh --env staging

   # Run tests
   APP_URL=https://staging.pro-remorque.com ./handover/acceptance/smoke-tests.sh
   ```

3. **Plan rollback strategy:**
   - Document current commit hash
   - Verify rollback script works
   - Communicate maintenance window

---

## 🆘 Troubleshooting

### Script Fails with "Permission Denied"

**Problem:** Script is not executable

**Solution:**
```bash
chmod +x handover/scripts/*.sh
chmod +x handover/acceptance/*.sh
```

### "pg_dump: command not found"

**Problem:** PostgreSQL client tools not installed

**Solution:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Verify
pg_dump --version
```

### "AWS credentials not found"

**Problem:** AWS CLI not configured

**Solution:**
```bash
# Set environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"

# Or use AWS configure
aws configure
```

### Smoke Tests Fail After Deployment

**Problem:** Application not healthy

**Actions:**
1. Check deployment logs
2. Verify environment variables set correctly
3. Check Supabase status
4. Consider rollback if persistent

### Backup File Not Found in S3

**Problem:** Backup upload failed or wrong path

**Solution:**
```bash
# List recent backups
aws s3 ls s3://pro-remorque-backups/pro-remorque/backups/staging/ --recursive

# Check backup script logs for errors
./handover/scripts/backup-db.sh --env staging 2>&1 | tee backup.log
```

---

## 📞 Support Contacts

### Internal Team
- **DevOps Lead:** [Name] - [Email]
- **Database Admin:** [Name] - [Email]
- **CTO:** [Name] - [Email]

### External Services
- **Supabase Support:** support@supabase.io
- **Vercel Support:** [Contact info]
- **AWS Support:** [Account-specific]

### Emergency Escalation

1. Check runbook first
2. Try rollback if recent deployment
3. Contact DevOps Lead
4. Escalate to CTO if > 30 min outage

---

## 📄 Additional Documentation

- **Site Down Runbook:** `handover/runbooks/runbook-site-down.md`
- **Test Evidence:** `handover/tests/` (logs and screenshots)
- **Design Tokens:** `DESIGN_TOKENS_GUIDE.md`
- **Branding Guide:** `BRANDING_PRO_REMORQUE_COMPLETE.md`

---

## ✅ Handover Checklist

Before going live with this package, ensure:

- [ ] All scripts tested in staging
- [ ] Environment variables documented and set
- [ ] AWS S3 bucket created and accessible
- [ ] Backup retention policy configured
- [ ] Monitoring and alerts configured
- [ ] Team trained on scripts and runbooks
- [ ] Emergency contacts updated
- [ ] Postmortem process documented
- [ ] First backup successfully created
- [ ] Restore tested in staging
- [ ] Smoke tests passing
- [ ] Rollback tested in staging

---

**Last Updated:** 2025-10-26
**Package Version:** 1.0.0
**Maintained By:** Pro-Remorque Operations Team
