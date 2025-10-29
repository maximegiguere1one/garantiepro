# Runbook: Site Down / Service Outage

**Last Updated:** 2025-10-26
**Owner:** Operations Team
**Severity:** P0 - Critical

## Table of Contents
1. [Symptoms](#symptoms)
2. [Quick Checks](#quick-checks)
3. [Diagnostic Commands](#diagnostic-commands)
4. [Immediate Mitigation](#immediate-mitigation)
5. [Rollback Decision Tree](#rollback-decision-tree)
6. [Communication Templates](#communication-templates)
7. [Post-Incident Checklist](#post-incident-checklist)

---

## Symptoms

### User-Reported Issues
- ❌ "Website won't load" / "Connection timeout"
- ❌ "Can't create warranties"
- ❌ "PDF generation fails"
- ❌ "Login not working"
- ❌ 500 Internal Server Error pages

### Monitoring Alerts
- 🔴 Health check endpoint failing
- 🔴 High error rate (>5%)
- 🔴 Response time > 5 seconds
- 🔴 Database connection errors
- 🔴 API gateway errors

---

## Quick Checks

**Execute these checks in order (5 minutes max):**

### 1. Health Check Endpoint
```bash
# Check if site is responding
curl -I https://pro-remorque.com/api/health
# Expected: HTTP 200 OK

# Check detailed health
curl https://pro-remorque.com/api/health
# Expected: {"status":"healthy","database":"connected"}
```

**Status Indicators:**
- ✅ **200 OK** → Service running, check specific feature
- ❌ **502/503** → Backend down or overloaded
- ❌ **Timeout** → Network/DNS issue or complete outage
- ❌ **404** → Deployment issue (wrong build)

### 2. Deployment Platform Check

**For Vercel:**
```bash
# Check deployment status
vercel ls --token="$DEPLOY_TOKEN"

# Check recent deployments
vercel inspect <deployment-url> --token="$DEPLOY_TOKEN"
```

**For Cloudflare Pages:**
```bash
# Check pages status
wrangler pages deployment list --project-name=pro-remorque

# Check build logs
wrangler pages deployment tail
```

### 3. Database Connection Check
```bash
# Test database connection (requires psql and DB_URL)
psql "$SUPABASE_URL" -c "SELECT 1;"
# Expected: Returns "1"

# Check active connections
psql "$SUPABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"
```

### 4. Recent Changes Check
```bash
# Check recent deployments (last 24 hours)
git log --since="24 hours ago" --oneline

# Check if deployment happened recently
# Compare timestamps with incident start time
```

---

## Diagnostic Commands

### A. Frontend Diagnostics

```bash
# 1. Check if static assets are loading
curl -I https://pro-remorque.com/assets/index.js
# Expected: HTTP 200

# 2. Check browser console (if available)
# Open DevTools → Console → Look for errors

# 3. Check network requests
# Open DevTools → Network → Look for failed requests (red)
```

### B. Backend/API Diagnostics

```bash
# 1. Check API endpoints
curl -X GET "https://pro-remorque.com/api/warranties" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# 2. Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# 3. Check database queries (if access available)
psql "$SUPABASE_URL" -c "
  SELECT
    pid,
    now() - query_start AS duration,
    query
  FROM pg_stat_activity
  WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
  ORDER BY duration DESC
  LIMIT 10;
"
```

### C. Performance Diagnostics

```bash
# 1. Check response times
time curl https://pro-remorque.com/api/health
# Should be < 1 second

# 2. Check database performance
psql "$SUPABASE_URL" -c "
  SELECT
    schemaname,
    tablename,
    seq_scan,
    idx_scan,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
  FROM pg_stat_user_tables
  ORDER BY seq_scan DESC
  LIMIT 10;
"

# 3. Check for long-running transactions
psql "$SUPABASE_URL" -c "
  SELECT pid, age(clock_timestamp(), query_start), query
  FROM pg_stat_activity
  WHERE state != 'idle'
  AND age(clock_timestamp(), query_start) > interval '5 minutes'
  ORDER BY query_start;
"
```

### D. Logs Access

```bash
# Vercel logs (last 100 lines)
vercel logs <deployment-url> --token="$DEPLOY_TOKEN"

# Cloudflare Pages logs
wrangler pages deployment tail --project-name=pro-remorque

# Supabase logs (via dashboard)
# 1. Go to https://app.supabase.com/project/<project-id>/logs
# 2. Filter by time range around incident
# 3. Look for errors in API logs, Database logs
```

---

## Immediate Mitigation

### Scenario 1: Complete Site Down (502/503 errors)

**Symptoms:** No response from any endpoint, all users affected

**Actions:**
1. **Check deployment status** (1 min)
   ```bash
   vercel ls --token="$DEPLOY_TOKEN"
   ```

2. **If recent deployment found** → Consider immediate rollback
   - See [Rollback Decision Tree](#rollback-decision-tree)

3. **If no recent deployment** → Check infrastructure
   - Verify DNS: `dig pro-remorque.com`
   - Check CDN/proxy status
   - Check Supabase status: https://status.supabase.com

4. **Communication:** Send status update immediately (see templates below)

### Scenario 2: Specific Feature Failing (e.g., PDF generation)

**Symptoms:** Site loads, but specific functionality broken

**Actions:**
1. **Identify affected feature** (2 min)
   - Check error logs for specific endpoint
   ```bash
   # Example: Check PDF generation errors
   curl https://pro-remorque.com/api/generate-pdf -X POST \
     -H "Content-Type: application/json" \
     -d '{"warranty_id":"test"}' -v
   ```

2. **Check if workaround possible** (3 min)
   - Can users complete task another way?
   - Document workaround for support team

3. **Assess impact**
   - How many users affected?
   - Is this blocking critical workflows?

4. **Decide on fix approach**
   - Quick fix possible? → Deploy hotfix
   - Complex issue? → Disable feature + rollback

### Scenario 3: Database Connection Issues

**Symptoms:** Errors mentioning database, timeouts on data operations

**Actions:**
1. **Check database status** (1 min)
   ```bash
   psql "$SUPABASE_URL" -c "SELECT 1;"
   ```

2. **Check connection pool** (1 min)
   ```bash
   psql "$SUPABASE_URL" -c "
     SELECT count(*), state
     FROM pg_stat_activity
     GROUP BY state;
   "
   ```

3. **If connection pool exhausted**
   - Kill idle connections:
   ```bash
   psql "$SUPABASE_URL" -c "
     SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'idle'
     AND state_change < current_timestamp - INTERVAL '10 minutes';
   "
   ```

4. **If database offline**
   - Contact Supabase support immediately
   - Check https://status.supabase.com
   - Prepare to enable maintenance mode

### Scenario 4: Performance Degradation (slow but working)

**Symptoms:** Site responds but very slowly, timeouts intermittent

**Actions:**
1. **Check recent traffic spike** (1 min)
   - Check analytics for unusual traffic
   - Look for bot/scraper activity

2. **Check database queries** (2 min)
   ```bash
   # Find slow queries
   psql "$SUPABASE_URL" -c "
     SELECT query, calls, total_time, mean_time
     FROM pg_stat_statements
     ORDER BY mean_time DESC
     LIMIT 10;
   "
   ```

3. **Quick fixes**
   - Enable CDN caching more aggressively
   - Add database indexes if obvious missing
   - Scale up resources if available

---

## Rollback Decision Tree

### Should You Rollback?

```
START: Is the site completely down?
  ├─ YES → Was there a deployment in last 2 hours?
  │   ├─ YES → ROLLBACK IMMEDIATELY
  │   └─ NO  → Check infrastructure, DON'T rollback
  │
  └─ NO  → Is it a critical feature (login, create warranty)?
      ├─ YES → Was there a deployment in last 24 hours?
      │   ├─ YES → Review changes, likely ROLLBACK
      │   └─ NO  → DON'T rollback, investigate root cause
      │
      └─ NO  → Can users work around it?
          ├─ YES → DON'T rollback, schedule fix
          └─ NO  → Review impact, consider ROLLBACK
```

### Rollback Execution (STAGING FIRST!)

**⚠️ CRITICAL: Test rollback in STAGING before PRODUCTION**

```bash
# 1. STAGING rollback (test first!)
cd /path/to/pro-remorque
./handover/scripts/rollback.sh --env staging

# 2. Verify staging works
./handover/acceptance/smoke-tests.sh

# 3. If staging OK, rollback PRODUCTION
# REQUIRES CLIENT APPROVAL
./handover/scripts/rollback.sh --env production

# 4. Verify production
./handover/acceptance/smoke-tests.sh
```

**Rollback Risks:**
- ⚠️ Database migrations may not be reverted (manual fix needed)
- ⚠️ Users may lose recent data if DB schema changed
- ⚠️ Rolling back may not fix infrastructure issues

---

## Communication Templates

### 1. Initial Incident Notification

**Subject:** [INCIDENT] Pro-Remorque Service Disruption

```
🔴 INCIDENT ALERT

Status: Investigating
Affected Service: Pro-Remorque (pro-remorque.com)
Impact: [Complete Outage / Partial Outage / Specific Feature]
Start Time: [YYYY-MM-DD HH:MM UTC]

Description:
We are currently experiencing issues with [describe issue].
Users may experience [describe symptoms].

Current Actions:
- Investigating root cause
- [Specific action being taken]

Next Update: In 15 minutes or when resolved

Incident Commander: [Name]
Contact: [Email/Phone]
```

### 2. Progress Update

**Subject:** [UPDATE] Pro-Remorque Service Disruption

```
🟡 INCIDENT UPDATE

Status: [Investigating / Identified / Mitigating]
Duration: [X minutes/hours]

Update:
[Describe findings and actions taken]

Impact:
[Update on affected users/features]

Next Steps:
[Describe planned actions]

Next Update: In 15 minutes or when resolved
```

### 3. Resolution Notification

**Subject:** [RESOLVED] Pro-Remorque Service Disruption

```
✅ INCIDENT RESOLVED

Status: Resolved
Duration: [X minutes/hours]
Resolution Time: [YYYY-MM-DD HH:MM UTC]

Root Cause:
[Brief explanation of what caused the issue]

Resolution:
[Describe how it was fixed]

Impact Summary:
- Affected Users: [Estimate]
- Duration: [X minutes/hours]
- Features Affected: [List]

Follow-up Actions:
- [ ] Post-mortem scheduled for [Date]
- [ ] Monitoring enhanced for [X]
- [ ] Code fix deployed to prevent recurrence

We apologize for the inconvenience caused.

Incident Commander: [Name]
```

### 4. Client-Facing Status Page Update

```
🔴 Service Disruption - Investigating

We are aware of an issue affecting [specific functionality].
Our team is actively investigating and working on a resolution.

Status: Investigating
Affected: [Feature/Service]
Started: [Time]

Updates will be provided every 15 minutes.

Latest Update ([Time]):
[Brief status]
```

---

## Post-Incident Checklist

### Immediate (Within 1 hour of resolution)

- [ ] Verify all services are healthy
- [ ] Run smoke tests to confirm functionality
  ```bash
  ./handover/acceptance/smoke-tests.sh
  ```
- [ ] Monitor error rates for 30 minutes
- [ ] Send resolution notification to stakeholders
- [ ] Document incident timeline in shared doc

### Short-term (Within 24 hours)

- [ ] Schedule post-mortem meeting (within 48 hours)
- [ ] Collect all logs and metrics from incident
- [ ] Create incident report with:
  - Timeline of events
  - Root cause analysis
  - Actions taken
  - Impact assessment
- [ ] Identify immediate fixes/improvements needed
- [ ] Update runbook with lessons learned

### Post-Mortem Meeting Agenda

1. **Timeline Review** (10 min)
   - When was issue first detected?
   - What actions were taken and when?
   - When was it resolved?

2. **Root Cause Analysis** (15 min)
   - What was the immediate cause?
   - What were contributing factors?
   - Why didn't we catch this in staging/testing?

3. **Impact Assessment** (10 min)
   - How many users affected?
   - Duration of impact?
   - Business impact (lost sales, support burden)

4. **Action Items** (15 min)
   - Code fixes needed
   - Process improvements
   - Monitoring/alerting gaps
   - Documentation updates

5. **Prevention** (10 min)
   - How do we prevent this specific issue?
   - How do we catch similar issues earlier?
   - What needs to be automated?

### Long-term (Within 1 week)

- [ ] Implement fixes to prevent recurrence
- [ ] Add/improve monitoring for this failure mode
- [ ] Update deployment checklist if needed
- [ ] Train team on new procedures
- [ ] Add regression tests if applicable
- [ ] Update disaster recovery documentation

---

## Quick Reference Card

**Print this page and keep it accessible**

### Essential Commands

```bash
# Health check
curl https://pro-remorque.com/api/health

# Rollback (staging)
./handover/scripts/rollback.sh --env staging

# Smoke tests
./handover/acceptance/smoke-tests.sh

# Database check
psql "$SUPABASE_URL" -c "SELECT 1;"

# Recent deployments
git log --since="24 hours ago" --oneline
```

### Decision Matrix

| Symptom | First Action | Likely Fix |
|---------|--------------|------------|
| Complete site down | Check deployment | Rollback |
| 502/503 errors | Check backend | Restart/Rollback |
| DB connection errors | Check Supabase | Wait/Restart |
| Slow performance | Check queries | Optimize/Scale |
| Specific feature broken | Check logs | Hotfix/Rollback |

### Escalation Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| DevOps Lead | [Contact] | Infrastructure issues |
| Database Admin | [Contact] | Database problems |
| CTO | [Contact] | >30 min outage |
| Supabase Support | support@supabase.io | Database down |
| Vercel Support | [Contact] | Deployment issues |

### Important Links

- **Status Dashboard:** [URL]
- **Monitoring:** [URL]
- **Logs:** [URL]
- **Supabase Dashboard:** https://app.supabase.com
- **Deployment Platform:** [URL]

---

**Remember:**
- ⏱️ Speed matters, but accuracy matters more
- 📢 Communicate early and often
- 📊 Document everything as you go
- 🧪 Test fixes in staging first
- 🤝 Ask for help if needed

**Last Updated:** 2025-10-26
**Next Review:** 2025-11-26
