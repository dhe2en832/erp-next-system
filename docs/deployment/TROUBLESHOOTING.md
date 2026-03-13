# Troubleshooting Guide

## Build Errors

### Error: Cannot find module 'debug-products/route.js'

**Symptom:**
```
.next/types/validator.ts:1403:39 - error TS2307: Cannot find module '../../app/api/analytics/debug-products/route.js'
```

**Cause:**
Old build artifacts in `.next/` directory referencing deleted debug routes.

**Solution:**
```bash
# On VPS, clean build artifacts before building
cd ~/erp-next-system
rm -rf .next .next.backup
git pull
npm run build:production
```

**Why this happens:**
- `.next/` directory is in `.gitignore` and not tracked by git
- Old TypeScript validation files may reference deleted routes
- Must manually clean `.next/` on deployment server

**Prevention:**
Always clean `.next/` directory on VPS before building after pulling changes that delete API routes.

---

## ESLint Warnings

### Warning: Unused eslint-disable directive

**Symptom:**
```
warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')
```

**Solution:**
```bash
# Automatically fix all unused directives
npx eslint --config eslint.config.production.mjs "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" --fix --max-warnings 10000
```

---

## Deployment Checklist

Before deploying to VPS:

1. **Clean build artifacts:**
   ```bash
   rm -rf .next .next.backup
   ```

2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

3. **Install dependencies (if package.json changed):**
   ```bash
   npm install
   ```

4. **Run production build:**
   ```bash
   npm run build:production
   ```

5. **Start production server:**
   ```bash
   npm run start:production
   ```

---

## Common Issues

### Issue: Build succeeds locally but fails on VPS

**Possible causes:**
1. Old `.next/` artifacts on VPS
2. Different Node.js versions
3. Missing environment variables
4. Insufficient memory

**Solution:**
```bash
# Check Node.js version (should match local)
node --version

# Clean and rebuild
rm -rf .next .next.backup node_modules
npm install
npm run build:production
```

### Issue: TypeScript errors about missing modules

**Solution:**
```bash
# Clean TypeScript cache and rebuild
rm -rf .next
npx tsc --noEmit
npm run build:production
```

---

## Environment Variables

Required variables in `.env.production`:
- `ERPNEXT_API_URL` - ERPNext backend URL
- `ERP_API_KEY` - API key for authentication
- `ERP_API_SECRET` - API secret for authentication

Verify with:
```bash
npm run validate:env
```

### Environment File Loading Order

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` - Base defaults (committed to git)
2. `.env.production` - Production defaults (committed to git)
3. `.env.local` - Local overrides (NOT committed, overrides all)
4. `.env.production.local` - Production local overrides (NOT committed)

**CRITICAL for VPS Production:**
- **DO NOT** use `.env.local` on VPS production servers
- `.env.local` will override `.env.production` and cause wrong default site
- Use `.env.production` only (already configured with correct defaults)
- If you need to override credentials, use `.env.production.local` (but don't commit it)

**Example Issue:**
```
# .env.production (correct default)
ERPNEXT_API_URL=https://demo.batasku.cloud

# .env.local on VPS (WRONG - overrides production)
ERPNEXT_API_URL=https://bac.batasku.cloud  ← This will be used instead!
```

**Solution:**
```bash
# On VPS, remove .env.local
cd ~/erp-next-system
rm -f .env.local
pnpm build:production
```
