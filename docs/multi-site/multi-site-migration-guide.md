# Multi-Site Migration Guide

This guide explains how to migrate from a single-site ERPNext setup to the new multi-site configuration, and how to troubleshoot common issues.

## Overview

The multi-site support feature allows a single Next.js deployment to connect to multiple ERPNext backend instances. The migration from single-site to multi-site is **fully automatic** and requires no manual intervention.

## Automatic Migration

### What Happens Automatically

When you start the application for the first time after upgrading:

1. **Detection**: The system detects legacy environment variables (`ERPNEXT_API_URL`, `ERP_API_KEY`, `ERP_API_SECRET`)
2. **Migration**: Automatically creates a new site configuration from these variables
3. **Persistence**: Saves the configuration to browser localStorage
4. **Activation**: Sets the migrated site as the default active site
5. **Completion**: Marks migration as complete to prevent duplicate migrations

### Migration Logs

Check the browser console for migration logs:

```
[SiteProvider] Initializing sites...
[Migration] Starting migration check...
[Migration] Legacy configuration detected, migrating...
[Migration] Successfully migrated site: legacy-site
[SiteProvider] Migration completed successfully: legacy-site
[SiteProvider] Active site set: legacy-site
[SiteProvider] Initialization complete
```

## Manual Migration (Optional)

If you prefer to manually configure multi-site from the start, follow these steps:

### Step 1: Update Environment Variables

Choose one of two configuration formats:

#### Option A: Multi-Site JSON Format (Recommended)

Add to your `.env.local` file:

```bash
ERPNEXT_SITES='[
  {
    "name": "bac-production",
    "displayName": "BAC Production",
    "apiUrl": "https://bac.batasku.cloud",
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret",
    "isDefault": true
  },
  {
    "name": "demo-site",
    "displayName": "Demo Site",
    "apiUrl": "https://demo.batasku.cloud",
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret"
  }
]'

# Optional: Specify default site
ERPNEXT_DEFAULT_SITE=bac-production
```

#### Option B: Legacy Single-Site Format (Auto-migrates)

Keep your existing configuration:

```bash
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here
```

This will be automatically migrated to multi-site format on first load.

### Step 2: Restart Application

```bash
pnpm dev
```

The application will automatically detect and configure sites based on your environment variables.

### Step 3: Verify Migration

1. Open the application in your browser
2. Check the navigation bar for the site selector dropdown
3. Verify your site appears in the dropdown
4. Check browser console for migration logs

## Configuration Management

### Adding Sites via UI

After initial setup, you can add more sites through the UI:

1. Navigate to **Settings > Sites** (or `/settings/sites`)
2. Click **Add Site** button
3. Fill in the form:
   - **Display Name**: User-friendly name (e.g., "BAC Production")
   - **Site Name**: Unique identifier in kebab-case (e.g., "bac-production")
   - **API URL**: Full ERPNext URL (e.g., "https://bac.batasku.cloud")
   - **API Key**: Your ERPNext API key
   - **API Secret**: Your ERPNext API secret
   - **Set as default**: Check to make this the default site
4. Click **Test Connection** to verify credentials
5. Click **Add Site** to save

### Editing Sites

1. Go to **Settings > Sites**
2. Click **Edit** next to the site you want to modify
3. Update the fields
4. Click **Test Connection** to verify changes
5. Click **Update Site** to save

### Deleting Sites

1. Go to **Settings > Sites**
2. Click **Delete** next to the site you want to remove
3. Confirm deletion in the dialog

**Warning**: You cannot delete the currently active site. Switch to another site first.

## Switching Between Sites

### Using the Site Selector

1. Click the site selector dropdown in the navigation bar
2. Select the site you want to switch to
3. The application will:
   - Clear cached data
   - Switch to the new site
   - Reload data from the new backend

### Site Selector Features

- **Active Site Indicator**: Shows which site is currently active
- **Health Status**: Displays online/offline status for each site
- **Response Time**: Shows connection speed (when online)
- **Keyboard Navigation**: Use arrow keys, Enter, and Escape

## Environment Variable Reference

### Multi-Site Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ERPNEXT_SITES` | No | JSON array of site configurations | See examples above |
| `ERPNEXT_DEFAULT_SITE` | No | Site name to use as default | `bac-production` |

### Legacy Single-Site Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ERPNEXT_API_URL` | Yes | ERPNext backend URL | `http://localhost:8000` |
| `ERP_API_KEY` | Yes | API key for authentication | `your_api_key` |
| `ERP_API_SECRET` | Yes | API secret for authentication | `your_api_secret` |

## Migration Scenarios

### Scenario 1: Local Development

**Before** (single-site):
```bash
ERPNEXT_API_URL=http://batasku.local:8000
ERP_API_KEY=dev_key
ERP_API_SECRET=dev_secret
```

**After** (automatic migration):
- Site created: `batasku-local`
- Display name: `Batasku Local`
- Marked as default
- Saved to localStorage

**Adding more sites**:
```bash
ERPNEXT_SITES='[
  {
    "name": "batasku-local",
    "displayName": "Batasku Local",
    "apiUrl": "http://batasku.local:8000",
    "apiKey": "dev_key",
    "apiSecret": "dev_secret",
    "isDefault": true
  },
  {
    "name": "demo-local",
    "displayName": "Demo Local",
    "apiUrl": "http://demo.batasku.local:8000",
    "apiKey": "demo_key",
    "apiSecret": "demo_secret"
  }
]'
```

### Scenario 2: Production Deployment

**Before** (single-site):
```bash
ERPNEXT_API_URL=https://bac.batasku.cloud
ERP_API_KEY=prod_key
ERP_API_SECRET=prod_secret
```

**After** (multi-site):
```bash
ERPNEXT_SITES='[
  {
    "name": "bac-production",
    "displayName": "BAC Production",
    "apiUrl": "https://bac.batasku.cloud",
    "apiKey": "prod_key",
    "apiSecret": "prod_secret",
    "isDefault": true
  },
  {
    "name": "cirebon",
    "displayName": "Cirebon",
    "apiUrl": "https://cirebon.batasku.cloud",
    "apiKey": "cirebon_key",
    "apiSecret": "cirebon_secret"
  },
  {
    "name": "cv-cirebon",
    "displayName": "CV Cirebon",
    "apiUrl": "https://cvcirebon.batasku.cloud",
    "apiKey": "cv_key",
    "apiSecret": "cv_secret"
  },
  {
    "name": "demo",
    "displayName": "Demo Site",
    "apiUrl": "https://demo.batasku.cloud",
    "apiKey": "demo_key",
    "apiSecret": "demo_secret"
  }
]'

ERPNEXT_DEFAULT_SITE=bac-production
```

### Scenario 3: Staging Environment

Use `.env.staging.local` to override staging defaults:

```bash
ERPNEXT_SITES='[
  {
    "name": "staging-bac",
    "displayName": "BAC Staging",
    "apiUrl": "https://staging-bac.batasku.cloud",
    "apiKey": "staging_key",
    "apiSecret": "staging_secret",
    "isDefault": true
  }
]'
```

## Troubleshooting

### Issue: Migration Not Running

**Symptoms**: Legacy environment variables still in use, no migration logs

**Causes**:
- Sites already configured in localStorage
- Migration already completed

**Solutions**:
1. Check browser localStorage for `erpnext-sites` key
2. Check for `erpnext-migration-status` key
3. Clear localStorage to force re-migration:
   ```javascript
   localStorage.removeItem('erpnext-sites');
   localStorage.removeItem('erpnext-migration-status');
   ```
4. Refresh the page

### Issue: "No sites configured" Error

**Symptoms**: Error message on app load, no sites available

**Causes**:
- No environment variables configured
- Invalid JSON in `ERPNEXT_SITES`
- Missing required fields

**Solutions**:
1. Check `.env.local` file exists and has correct variables
2. Validate JSON format in `ERPNEXT_SITES`:
   ```bash
   echo $ERPNEXT_SITES | jq .
   ```
3. Ensure all required fields present: `name`, `displayName`, `apiUrl`, `apiKey`, `apiSecret`
4. Check browser console for detailed error messages

### Issue: Site Connection Failed

**Symptoms**: "Offline" status in site selector, connection test fails

**Causes**:
- ERPNext server not running
- Incorrect API URL
- Network connectivity issues
- CORS configuration issues

**Solutions**:
1. Verify ERPNext server is running:
   ```bash
   curl https://your-erpnext-url/api/method/ping
   ```
2. Check API URL format (must include protocol: `http://` or `https://`)
3. Verify network connectivity
4. Check ERPNext CORS settings if accessing from different domain

### Issue: Authentication Failed

**Symptoms**: 401 errors, "Authentication failed" messages

**Causes**:
- Invalid API key or secret
- API key disabled in ERPNext
- Session expired

**Solutions**:
1. Verify API credentials in ERPNext:
   - Go to User Menu > API Access
   - Check if API key is active
   - Regenerate keys if needed
2. Update credentials in site configuration
3. Test connection using "Test Connection" button
4. Check browser console for detailed error messages

### Issue: Data from Wrong Site

**Symptoms**: Seeing data from different site than selected

**Causes**:
- Cache not cleared on site switch
- Multiple browser tabs with different sites

**Solutions**:
1. Refresh the page after switching sites
2. Close other tabs with the application open
3. Clear browser cache and localStorage:
   ```javascript
   sessionStorage.clear();
   location.reload();
   ```

### Issue: Site Selector Not Visible

**Symptoms**: Cannot see site selector in navigation

**Causes**:
- Only one site configured
- Screen size too small (mobile)
- Component not rendered

**Solutions**:
1. Check if multiple sites are configured
2. On mobile, open the hamburger menu to see site selector
3. Check browser console for React errors
4. Verify `SiteProvider` is wrapping the app in `layout.tsx`

### Issue: Cannot Delete Site

**Symptoms**: Delete button disabled or error when deleting

**Causes**:
- Trying to delete the active site
- Site is marked as default

**Solutions**:
1. Switch to a different site first
2. Remove default flag from another site if needed
3. Ensure at least one site remains configured

## Best Practices

### Development

1. **Use separate sites for each environment**:
   - `dev-local` for local development
   - `staging` for staging environment
   - `production` for production

2. **Test connection before saving**:
   - Always use "Test Connection" button
   - Verify credentials are correct
   - Check ERPNext server is accessible

3. **Use meaningful names**:
   - Display Name: User-friendly (e.g., "BAC Production")
   - Site Name: Technical identifier (e.g., "bac-production")

### Production

1. **Use environment variables for credentials**:
   - Never commit `.env.local` files
   - Use `.env.production.local` for production secrets
   - Keep credentials in secure vault

2. **Set a default site**:
   - Use `ERPNEXT_DEFAULT_SITE` or `isDefault: true`
   - Ensures consistent behavior on first load

3. **Monitor site health**:
   - Check site selector for offline sites
   - Set up alerts for connection failures
   - Review error logs regularly

4. **Document site configurations**:
   - Maintain list of all sites
   - Document purpose of each site
   - Keep credentials updated

### Security

1. **Protect API credentials**:
   - Use strong, unique API keys
   - Rotate credentials regularly
   - Never expose in client-side code

2. **Use HTTPS in production**:
   - Always use `https://` URLs
   - Verify SSL certificates
   - Enable HSTS headers

3. **Limit API key permissions**:
   - Create dedicated API users in ERPNext
   - Grant minimum required permissions
   - Audit API key usage

## Rollback Procedure

If you need to rollback to single-site configuration:

### Step 1: Remove Multi-Site Configuration

```bash
# Remove from .env.local
# Delete or comment out:
# ERPNEXT_SITES='...'
# ERPNEXT_DEFAULT_SITE=...
```

### Step 2: Restore Legacy Configuration

```bash
# Add to .env.local
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
```

### Step 3: Clear Browser Storage

```javascript
// In browser console:
localStorage.removeItem('erpnext-sites');
localStorage.removeItem('erpnext-migration-status');
localStorage.removeItem('erpnext-active-site');
```

### Step 4: Restart Application

```bash
pnpm dev
```

The application will use the legacy single-site configuration.

## Getting Help

### Check Logs

1. **Browser Console**: Check for migration and initialization logs
2. **Network Tab**: Verify API requests are going to correct URLs
3. **Application Tab**: Inspect localStorage for site configurations

### Common Log Messages

**Success**:
```
[Migration] Successfully migrated site: legacy-site
[SiteProvider] Active site set: bac-production
```

**Warnings**:
```
[Migration] No legacy configuration found
[SiteProvider] No sites configured after initialization
```

**Errors**:
```
[Migration] Migration failed: Invalid URL format
[SiteProvider] Failed to initialize sites: ...
```

### Support Resources

- **Documentation**: Check `docs/multi-site-*.md` files
- **API Routes Guide**: See `docs/multi-site-api-routes.md`
- **Environment Config**: See `docs/multi-site-environment-configuration.md`
- **GitHub Issues**: Report bugs and request features

## Migration Checklist

Use this checklist to ensure smooth migration:

- [ ] Backup current `.env` files
- [ ] Review current ERPNext configuration
- [ ] Decide on multi-site or single-site approach
- [ ] Update environment variables if using multi-site
- [ ] Test connection to all ERPNext instances
- [ ] Start application and verify migration logs
- [ ] Check site selector appears in navigation
- [ ] Test switching between sites (if multi-site)
- [ ] Verify data loads correctly from each site
- [ ] Test all critical workflows (invoices, orders, etc.)
- [ ] Monitor error logs for issues
- [ ] Document site configurations for team
- [ ] Update deployment scripts if needed
- [ ] Train users on site selector (if applicable)

## Frequently Asked Questions

### Q: Do I need to migrate to multi-site?

**A**: No, single-site configuration continues to work. The system automatically migrates your configuration but you can continue using just one site.

### Q: Can I mix environment variables and UI configuration?

**A**: Yes, sites from `ERPNEXT_SITES` are loaded on startup, and you can add more sites via the UI. All sites are stored in localStorage.

### Q: What happens to my data during migration?

**A**: No data is modified. Migration only creates a new site configuration from your environment variables. All ERPNext data remains unchanged.

### Q: Can I use different API keys for different sites?

**A**: Yes, each site has its own `apiKey` and `apiSecret`. This allows connecting to different ERPNext instances with different credentials.

### Q: How do I get API credentials from ERPNext?

**A**: In ERPNext, go to User Menu > API Access > Generate Keys. Copy the API Key and API Secret to your site configuration.

### Q: Can I switch sites without losing my work?

**A**: Switching sites clears the cache but doesn't affect saved data. Save your work before switching sites to avoid losing unsaved changes.

### Q: Is multi-site supported in all browsers?

**A**: Yes, multi-site uses localStorage which is supported in all modern browsers (Chrome, Firefox, Safari, Edge).

### Q: Can I use multi-site with mobile devices?

**A**: Yes, the site selector is responsive and works on mobile devices. Access it through the hamburger menu on small screens.

### Q: How do I deploy multi-site to production?

**A**: Set `ERPNEXT_SITES` in your production environment variables or `.env.production.local` file. The application will automatically load sites on startup.

### Q: Can I have different sites for different companies?

**A**: Yes, each site can connect to a different ERPNext instance, which can have different companies configured.
