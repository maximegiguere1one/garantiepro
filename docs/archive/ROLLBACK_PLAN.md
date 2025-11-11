# 🚨 Rollback Plan - Auth & Service Worker Fixes

**Branch:** `fix/supabase-auth-sw-timeouts`
**Date:** November 9, 2025
**Criticality:** HIGH - Auth system changes

---

## 📋 Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All tests pass locally (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Staging tests completed successfully
- [ ] Service Worker unregistered on test devices
- [ ] Backup of production database taken
- [ ] Rollback branch tagged: `git tag pre-auth-fix-backup`

---

## 🔙 Immediate Rollback (< 5 minutes)

### Step 1: Revert Git Changes

```bash
# On production server or CI/CD
git fetch origin
git checkout main
git reset --hard pre-auth-fix-backup  # Use the backup tag
git push origin main --force-with-lease

# Or if deployed from PR
git revert <merge-commit-sha> --no-edit
git push origin main
```

### Step 2: Clear Service Worker on Client Side

**Critical:** Notify users to clear Service Worker

Create emergency notification in app:
```typescript
// Add to main.tsx or App.tsx temporarily
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('Emergency SW unregister');
    });
  });
  window.location.reload();
}
```

### Step 3: Deploy Rollback Build

```bash
npm install  # Restore old dependencies if needed
npm run build
# Deploy to production
```

### Step 4: Verify Rollback

- [ ] Login works on production
- [ ] No console errors
- [ ] Network tab shows auth/v1/token returns 200
- [ ] Service Worker unregistered on test devices

**Estimated Time:** 5-10 minutes

---

## 🔧 Partial Rollback (Keep Some Fixes)

If only Service Worker is problematic:

### Option A: Disable Service Worker Only

```javascript
// In public/service-worker.js - emergency bypass
self.addEventListener('fetch', (event) => {
  // EMERGENCY: Pass all requests through
  event.respondWith(fetch(event.request));
});
```

### Option B: Revert Only SW Changes

```bash
git checkout pre-auth-fix-backup -- public/service-worker.js
git commit -m "emergency: revert service worker changes"
git push origin main
```

---

## 📊 Monitoring During Rollback

### Metrics to Watch

1. **Auth Success Rate**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as recent_signins
   FROM profiles
   WHERE last_sign_in_at > NOW() - INTERVAL '5 minutes';
   ```

2. **Error Logs**
   ```sql
   SELECT level, message, COUNT(*)
   FROM error_logs
   WHERE ts > NOW() - INTERVAL '10 minutes'
   GROUP BY level, message
   ORDER BY COUNT(*) DESC;
   ```

3. **Service Worker Status**
   - Check browser DevTools → Application → Service Workers
   - Should show "Stopped" or no registration

### Expected Results After Rollback

- ✅ Auth success rate returns to baseline (>95%)
- ✅ No "url is not defined" errors
- ✅ Response times for auth/v1/token < 2s
- ✅ Zero timeout errors

---

## 🐛 Common Issues & Quick Fixes

### Issue 1: Service Worker Cache Persists

**Symptom:** Users still see old behavior after rollback

**Fix:**
```javascript
// Emergency cache clear
if ('serviceWorker' in navigator && 'caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}
```

**Communication to users:**
"Please clear your browser cache: Ctrl+Shift+Delete → Cached images and files"

### Issue 2: localStorage Corruption

**Symptom:** Users can't login after rollback

**Fix:**
```javascript
// Clear auth storage
localStorage.removeItem('supabase.auth.token');
localStorage.removeItem('active_organization_id');
window.location.reload();
```

### Issue 3: Timeout Errors Persist

**Symptom:** GET_SESSION_TIMEOUT errors in production

**Quick Fix:**
```typescript
// In environment-detection.ts - increase timeouts temporarily
export function getOptimalTimeouts() {
  return {
    sessionTimeout: 30000,  // Increase from 15s to 30s
    profileTimeout: 40000,  // Increase from 20s to 40s
  };
}
```

---

## 📞 Emergency Contacts

### Technical Team
- **On-call Engineer:** [Your contact]
- **DBA:** [Database admin contact]
- **DevOps:** [Infrastructure contact]

### Communication Plan

**If rollback is needed:**

1. **Post in #engineering Slack:**
   ```
   🚨 ROLLING BACK auth fixes due to [specific issue]
   - ETA: 10 minutes
   - Impact: Users may need to re-login
   - Status updates every 5 min
   ```

2. **Update Status Page:**
   - Mark auth as "Degraded"
   - Post rollback progress
   - Mark "Resolved" once complete

3. **User Communication:**
   ```
   We've identified an issue with authentication.
   Please clear your browser cache if you experience login issues.
   - Chrome: Ctrl+Shift+Delete
   - Clear "Cached images and files"
   - Reload the page
   ```

---

## 🔍 Post-Rollback Analysis

### Data to Collect

1. **Error Logs (5 min before/after)**
   ```bash
   # Export logs
   supabase db export error_logs --output rollback-errors.csv \
     --filter "ts > '2025-11-09 10:00:00'"
   ```

2. **Network Traces**
   - Save HAR files from failed sessions
   - Check Service Worker logs
   - Review Network tab for auth/v1/token

3. **Browser Console Logs**
   - Screenshot any errors
   - Note browser versions affected

### Root Cause Analysis Questions

- [ ] Which change caused the issue? (SW, timeout-fetch, auth context)
- [ ] Was it environment-specific? (prod only, specific browsers)
- [ ] Did tests miss something? (add new test cases)
- [ ] Can we fix forward instead of rollback?

---

## ✅ Rollback Success Criteria

**Verify these before considering rollback complete:**

- [ ] Login success rate > 95%
- [ ] No timeout errors in last 10 minutes
- [ ] Service Worker unregistered on all test devices
- [ ] Error logs show no auth-related issues
- [ ] Database queries perform normally
- [ ] Users report no issues on support channels

---

## 🔄 Re-Deployment Plan (After Fix)

When ready to re-deploy:

1. **Fix the issue** in new branch
2. **Add regression test** for the specific failure
3. **Test in staging** for 24 hours
4. **Gradual rollout:**
   - 10% of users for 1 hour
   - 50% of users for 4 hours
   - 100% if no issues

5. **Monitor closely:**
   - Real-time error dashboard
   - User feedback channels
   - Performance metrics

---

## 📚 Files Modified (For Reference)

If you need to restore specific files:

```bash
# Core files changed
git checkout pre-auth-fix-backup -- src/lib/timeout-fetch.ts
git checkout pre-auth-fix-backup -- src/lib/log-sinks.ts
git checkout pre-auth-fix-backup -- src/lib/supabase.ts
git checkout pre-auth-fix-backup -- src/contexts/AuthContext.tsx
git checkout pre-auth-fix-backup -- src/contexts/OrganizationContext.tsx
git checkout pre-auth-fix-backup -- public/service-worker.js
```

---

## 🎯 Prevention for Next Time

**Pre-deployment requirements (add to checklist):**

1. [ ] Feature flag for new auth code
2. [ ] Canary deployment (10% traffic first)
3. [ ] Automated rollback trigger (if errors > threshold)
4. [ ] Load testing with realistic traffic
5. [ ] Browser compatibility testing (Chrome, Firefox, Safari)
6. [ ] Mobile testing (iOS, Android)

---

**Last Updated:** November 9, 2025
**Version:** 1.0
**Owner:** Senior Engineering Team

---

## Quick Reference Commands

```bash
# Emergency rollback
git reset --hard pre-auth-fix-backup && git push --force-with-lease

# Check auth status
curl -X POST https://your-app.com/auth/v1/token -H "Content-Type: application/json"

# Unregister SW (browser console)
navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))

# View recent errors (Supabase CLI)
supabase db query "SELECT * FROM error_logs WHERE ts > NOW() - INTERVAL '10 minutes' ORDER BY ts DESC LIMIT 20"
```

---

**🚨 In case of emergency, stay calm and follow this plan step by step.**
