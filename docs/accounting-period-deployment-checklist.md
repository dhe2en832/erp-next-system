# Deployment Checklist: Accounting Period Closing

## Overview

This checklist ensures a smooth and safe deployment of the Accounting Period Closing feature to production.

---

## Pre-Deployment Checklist

### 1. Code Review ✓

- [ ] All code reviewed and approved
- [ ] No console.log or debug statements in production code
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Code follows project conventions

### 2. Testing ✓

- [ ] All unit tests passing
- [ ] All property-based tests passing
- [ ] All integration tests passing
- [ ] E2E tests completed successfully
- [ ] Manual testing completed
- [ ] Performance tests passed (closing < 30s, validation < 10s)
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified

### 3. Documentation ✓

- [ ] API documentation complete
- [ ] User guide created
- [ ] Installation guide ready
- [ ] Deployment checklist prepared
- [ ] README files updated
- [ ] Changelog updated

### 4. Security Review ✓

- [ ] Input sanitization implemented
- [ ] CSRF protection configured
- [ ] Role-based access control tested
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Sensitive data not exposed in logs
- [ ] API keys and secrets secured

### 5. Database Preparation ✓

- [ ] Database backup created
- [ ] Migration scripts tested
- [ ] Rollback procedure documented
- [ ] Database indexes optimized
- [ ] Data integrity verified

### 6. Environment Configuration ✓

- [ ] Production environment variables configured
- [ ] ERPNext API credentials secured
- [ ] SMTP settings configured (for notifications)
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Logging configured
- [ ] Monitoring configured

---

## Deployment Steps

### Phase 1: Backend Deployment (ERPNext)

#### Step 1: Backup

- [ ] Create full database backup
  ```bash
  bench --site [site-name] backup --with-files
  ```
- [ ] Verify backup file created
- [ ] Store backup in secure location
- [ ] Document backup location and timestamp

#### Step 2: Install Custom App

- [ ] Navigate to frappe-bench directory
- [ ] Pull latest code from repository
- [ ] Install batasku_custom app
  ```bash
  bench --site [site-name] install-app batasku_custom
  ```
- [ ] Verify app installed successfully

#### Step 3: Run Migrations

- [ ] Clear cache
  ```bash
  bench --site [site-name] clear-cache
  ```
- [ ] Run migrations
  ```bash
  bench --site [site-name] migrate
  ```
- [ ] Verify DocTypes created:
  - Accounting Period
  - Period Closing Log
  - Period Closing Config
- [ ] Check for migration errors in logs

#### Step 4: Create Initial Configuration

- [ ] Open bench console
- [ ] Create Period Closing Config document
- [ ] Set retained earnings account
- [ ] Configure validation checks
- [ ] Set role assignments
- [ ] Configure notification settings
- [ ] Verify configuration saved

#### Step 5: Restart Services

- [ ] Restart bench
  ```bash
  bench restart
  ```
- [ ] Verify ERPNext accessible
- [ ] Check for errors in logs

### Phase 2: Frontend Deployment (Next.js)

#### Step 1: Build Application

- [ ] Pull latest code from repository
- [ ] Install dependencies
  ```bash
  npm install --production
  ```
- [ ] Build application
  ```bash
  npm run build
  ```
- [ ] Verify build successful (no errors)

#### Step 2: Configure Environment

- [ ] Create/update `.env.production` file
- [ ] Set ERPNEXT_URL
- [ ] Set API credentials (ERP_API_KEY, ERP_API_SECRET)
- [ ] Set NEXT_PUBLIC_API_URL
- [ ] Verify all required env vars set

#### Step 3: Deploy Application

**Option A: PM2 (Recommended)**
```bash
pm2 start npm --name "erp-frontend" -- start
pm2 save
```

**Option B: Docker**
```bash
docker build -t erp-frontend .
docker run -d -p 3000:3000 erp-frontend
```

**Option C: Vercel/Netlify**
- Follow platform-specific deployment guide

- [ ] Application deployed
- [ ] Application accessible at production URL
- [ ] No errors in startup logs

#### Step 4: Configure Reverse Proxy (if applicable)

- [ ] Configure Nginx/Apache
- [ ] Setup SSL certificate
- [ ] Configure domain routing
- [ ] Test HTTPS access

### Phase 3: Verification

#### Step 1: Smoke Tests

- [ ] Access production URL
- [ ] Login with test account
- [ ] Navigate to `/accounting-period`
- [ ] Dashboard loads correctly
- [ ] No console errors

#### Step 2: API Connectivity

- [ ] Test list periods endpoint
- [ ] Test get config endpoint
- [ ] Verify ERPNext connection working
- [ ] Check API response times

#### Step 3: Feature Testing

- [ ] Create test period
- [ ] Run validation on test period
- [ ] View period details
- [ ] Check audit log
- [ ] Access configuration page
- [ ] Test notifications (if enabled)

#### Step 4: Permission Testing

- [ ] Login as Accounts Manager
- [ ] Verify can create periods
- [ ] Verify can close periods
- [ ] Login as Accounts User
- [ ] Verify read-only access
- [ ] Login as System Manager
- [ ] Verify full access

#### Step 5: Performance Testing

- [ ] Test with 100+ periods
- [ ] Measure page load times
- [ ] Test validation with large dataset
- [ ] Verify acceptable performance

---

## Post-Deployment Checklist

### 1. Monitoring Setup ✓

- [ ] Error tracking active (Sentry, etc.)
- [ ] Performance monitoring configured
- [ ] Uptime monitoring configured
- [ ] Alert notifications configured
- [ ] Log aggregation configured

### 2. Backup Verification ✓

- [ ] Automated backup configured
- [ ] Backup schedule verified
- [ ] Backup restoration tested
- [ ] Backup retention policy set

### 3. Documentation ✓

- [ ] Deployment notes documented
- [ ] Known issues documented
- [ ] Rollback procedure documented
- [ ] Support contacts documented

### 4. User Communication ✓

- [ ] Stakeholders notified of deployment
- [ ] User guide shared with accounting team
- [ ] Training session scheduled
- [ ] Support channel communicated

### 5. Scheduled Jobs ✓

- [ ] Notification cron job configured
- [ ] Backup cron job configured
- [ ] Verify cron jobs running
- [ ] Test notification delivery

---

## Rollback Procedure

### When to Rollback

Rollback if:
- Critical bugs discovered
- Data integrity issues
- Performance degradation
- Security vulnerabilities
- User-blocking issues

### Rollback Steps

#### 1. Stop Services

```bash
# Stop Next.js
pm2 stop erp-frontend

# Stop ERPNext (if needed)
bench --site [site-name] disable-maintenance-mode
```

#### 2. Restore Database

```bash
# List backups
bench --site [site-name] list-backups

# Restore from backup
bench --site [site-name] restore [backup-file]
```

#### 3. Uninstall App (if needed)

```bash
bench --site [site-name] uninstall-app batasku_custom
```

#### 4. Revert Frontend

```bash
# Checkout previous version
git checkout [previous-tag]

# Rebuild
npm install
npm run build

# Restart
pm2 restart erp-frontend
```

#### 5. Verify Rollback

- [ ] Application accessible
- [ ] Data intact
- [ ] No errors in logs
- [ ] Users can access system

#### 6. Communicate

- [ ] Notify stakeholders of rollback
- [ ] Document rollback reason
- [ ] Plan fix and re-deployment

---

## Monitoring Checklist (First 24 Hours)

### Hour 1

- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Verify no critical errors
- [ ] Check user activity

### Hour 4

- [ ] Review error tracking dashboard
- [ ] Check performance metrics
- [ ] Verify scheduled jobs ran
- [ ] Review user feedback

### Hour 12

- [ ] Comprehensive log review
- [ ] Performance analysis
- [ ] User satisfaction check
- [ ] Identify any issues

### Hour 24

- [ ] Full system health check
- [ ] Performance report
- [ ] User feedback summary
- [ ] Document lessons learned

---

## Known Issues and Workarounds

### Issue 1: [Example Issue]

**Description**: [Describe issue]

**Impact**: [Low/Medium/High]

**Workaround**: [Describe workaround]

**Fix ETA**: [Date]

---

## Support Contacts

### Technical Support

- **Primary**: [Name] - [Email] - [Phone]
- **Secondary**: [Name] - [Email] - [Phone]
- **On-Call**: [Rotation schedule]

### Business Support

- **Accounting Lead**: [Name] - [Email]
- **System Manager**: [Name] - [Email]

### Escalation Path

1. Technical Support
2. Development Team Lead
3. CTO/Technical Director

---

## Deployment Sign-Off

### Pre-Deployment Approval

- [ ] Development Team Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Security Review: _________________ Date: _______

### Deployment Execution

- [ ] Deployed By: _________________ Date: _______ Time: _______
- [ ] Verified By: _________________ Date: _______ Time: _______

### Post-Deployment Approval

- [ ] Technical Lead: _________________ Date: _______
- [ ] Business Owner: _________________ Date: _______
- [ ] System Manager: _________________ Date: _______

---

## Appendix

### A. Environment Variables

**Production Environment Variables:**
```env
ERPNEXT_URL=https://erp.company.com
ERPNEXT_API_URL=https://erp.company.com
ERP_API_KEY=[REDACTED]
ERP_API_SECRET=[REDACTED]
NEXT_PUBLIC_API_URL=https://app.company.com
NODE_ENV=production
SENTRY_DSN=[REDACTED]
```

### B. Server Specifications

**ERPNext Server:**
- CPU: [Specs]
- RAM: [Specs]
- Storage: [Specs]
- OS: [Version]

**Next.js Server:**
- CPU: [Specs]
- RAM: [Specs]
- Storage: [Specs]
- OS: [Version]

### C. Deployment Timeline

| Phase | Duration | Start Time | End Time |
|-------|----------|------------|----------|
| Pre-deployment checks | 2 hours | | |
| Backend deployment | 1 hour | | |
| Frontend deployment | 1 hour | | |
| Verification | 1 hour | | |
| Post-deployment | 1 hour | | |
| **Total** | **6 hours** | | |

### D. Rollback Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Decision to rollback | 15 min | |
| Stop services | 5 min | |
| Restore database | 30 min | Depends on size |
| Revert code | 15 min | |
| Restart services | 10 min | |
| Verification | 30 min | |
| **Total** | **~2 hours** | |

### E. Success Criteria

Deployment is considered successful if:

1. ✅ All smoke tests pass
2. ✅ No critical errors in logs
3. ✅ API response times < 500ms
4. ✅ All features functional
5. ✅ User permissions working correctly
6. ✅ No data integrity issues
7. ✅ Monitoring active and reporting
8. ✅ Backup verified
9. ✅ Users can access and use system
10. ✅ No rollback required within 24 hours

---

## Notes

**Deployment Date**: _________________

**Deployment Team**: _________________

**Special Considerations**: _________________

**Post-Deployment Actions**: _________________

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: ERP Development Team
