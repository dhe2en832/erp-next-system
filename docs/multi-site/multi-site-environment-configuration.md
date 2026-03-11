# Multi-Site Environment Configuration

This document explains how to configure the Next.js ERP system to connect to multiple ERPNext backend instances.

## Overview

The system supports two configuration formats:

1. **Legacy Single-Site Format** (backward compatible)
2. **Multi-Site Format** (recommended for multiple ERPNext instances)

## Configuration Formats

### Option 1: Multi-Site Configuration (Recommended)

Use the `ERPNEXT_SITES` environment variable with a JSON array of site configurations:

```bash
ERPNEXT_SITES='[
  {
    "name": "bac-production",
    "displayName": "BAC Production",
    "apiUrl": "https://bac.batasku.cloud",
    "apiKey": "your_api_key_here",
    "apiSecret": "your_api_secret_here",
    "isDefault": true
  },
  {
    "name": "demo-site",
    "displayName": "Demo Site",
    "apiUrl": "https://demo.batasku.cloud",
    "apiKey": "your_api_key_here",
    "apiSecret": "your_api_secret_here"
  },
  {
    "name": "cirebon",
    "displayName": "Cirebon",
    "apiUrl": "https://cirebon.batasku.cloud",
    "apiKey": "your_api_key_here",
    "apiSecret": "your_api_secret_here"
  },
  {
    "name": "cv-cirebon",
    "displayName": "CV Cirebon",
    "apiUrl": "https://cvcirebon.batasku.cloud",
    "apiKey": "your_api_key_here",
    "apiSecret": "your_api_secret_here"
  }
]'
```

**Optional**: Specify a default site:
```bash
ERPNEXT_DEFAULT_SITE=bac-production
```

### Option 2: Legacy Single-Site Format (Backward Compatible)

For single ERPNext instance deployments:

```bash
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here
```

## Site Configuration Fields

Each site configuration requires:

- **name** (required): Internal identifier (kebab-case, e.g., "bac-production")
- **displayName** (required): User-friendly name shown in UI (e.g., "BAC Production")
- **apiUrl** (required): ERPNext backend URL (must be http:// or https://)
- **apiKey** (required): API key for authentication
- **apiSecret** (required): API secret for authentication
- **isDefault** (optional): Set to `true` to make this the default site

## Priority Rules

When both formats are present:

1. **Multi-site configuration takes precedence** over legacy format
2. If `ERPNEXT_DEFAULT_SITE` is set, that site becomes the default
3. If no default is specified, the first site marked with `isDefault: true` is used
4. If no site is marked as default, the first site in the array is used

## Migration from Single-Site to Multi-Site

The system automatically migrates legacy single-site configurations:

1. Detects `ERPNEXT_API_URL`, `ERP_API_KEY`, and `ERP_API_SECRET`
2. Creates a site configuration from these values
3. Generates a site name from the URL (e.g., "bac-batasku" from "https://bac.batasku.cloud")
4. Marks the migrated site as default

**No manual intervention required** - existing deployments continue to work.

## Validation

The system validates:

- ✅ URL format (must be http:// or https://)
- ✅ Required fields (name, displayName, apiUrl, apiKey, apiSecret)
- ✅ JSON syntax for multi-site configuration
- ✅ At least one valid site configuration exists

Invalid configurations are logged and skipped.

## Examples

### Local Development

```bash
ERPNEXT_SITES='[
  {
    "name": "batasku-local",
    "displayName": "Batasku Local",
    "apiUrl": "http://batasku.local:8000",
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret",
    "isDefault": true
  },
  {
    "name": "demo-local",
    "displayName": "Demo Local",
    "apiUrl": "http://demo.batasku.local:8000",
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret"
  }
]'
```

### Production (4 Sites)

```bash
ERPNEXT_SITES='[
  {
    "name": "bac-production",
    "displayName": "BAC Production",
    "apiUrl": "https://bac.batasku.cloud",
    "apiKey": "prod_key_1",
    "apiSecret": "prod_secret_1",
    "isDefault": true
  },
  {
    "name": "demo-site",
    "displayName": "Demo Site",
    "apiUrl": "https://demo.batasku.cloud",
    "apiKey": "prod_key_2",
    "apiSecret": "prod_secret_2"
  },
  {
    "name": "cirebon",
    "displayName": "Cirebon",
    "apiUrl": "https://cirebon.batasku.cloud",
    "apiKey": "prod_key_3",
    "apiSecret": "prod_secret_3"
  },
  {
    "name": "cv-cirebon",
    "displayName": "CV Cirebon",
    "apiUrl": "https://cvcirebon.batasku.cloud",
    "apiKey": "prod_key_4",
    "apiSecret": "prod_secret_4"
  }
]'

ERPNEXT_DEFAULT_SITE=bac-production
```

## Testing

Run the environment configuration tests:

```bash
pnpm test:env-config
```

This validates:
- URL parsing and validation
- Site ID generation
- Legacy configuration detection and migration
- Multi-site JSON parsing
- Environment variable priority
- Default site selection

## API Reference

The environment configuration module (`lib/env-config.ts`) provides:

- `loadSitesFromEnvironment()` - Load all site configurations
- `validateEnvironmentConfig()` - Validate environment variables
- `migrateLegacyConfig()` - Migrate from legacy format
- `getDefaultSite()` - Get the default site
- `validateSiteConfig()` - Validate a single site configuration

## Troubleshooting

### No sites loaded

**Problem**: Application shows "No site configuration found"

**Solution**: Ensure either:
- `ERPNEXT_SITES` is set with valid JSON, OR
- All three legacy variables are set: `ERPNEXT_API_URL`, `ERP_API_KEY`, `ERP_API_SECRET`

### Invalid JSON error

**Problem**: "Failed to parse ERPNEXT_SITES"

**Solution**: 
- Validate JSON syntax using a JSON validator
- Ensure proper escaping of quotes in shell
- Use single quotes around the JSON string in bash

### Site not appearing

**Problem**: Site is in `ERPNEXT_SITES` but doesn't appear

**Solution**: Check validation errors in console logs. Common issues:
- Invalid URL format (must start with http:// or https://)
- Missing required fields
- Empty values for required fields

## Security Notes

- Store API keys and secrets securely
- Use `.env.local` for local development (not committed to git)
- Use environment-specific files for staging/production
- Never commit actual credentials to version control
- Rotate API keys regularly
