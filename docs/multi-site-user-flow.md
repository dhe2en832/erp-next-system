# Multi-Site User Flow

## Overview

This document describes the complete user flow for the multi-site support feature, from initial access to daily usage.

## User Flow Diagram

```
┌─────────────────┐
│  User visits    │
│  erp.batasku    │
│     .cloud      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Site Context   │
│   Initializes   │
│  (loads sites)  │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ Has active │ No
    │   site?    ├──────┐
    └─────┬──────┘      │
          │ Yes         │
          │             ▼
          │    ┌─────────────────┐
          │    │  /select-site   │
          │    │                 │
          │    │ • Show all sites│
          │    │ • Health status │
          │    │ • Select site   │
          │    └────────┬────────┘
          │             │
          │             │ Site selected
          │             │
          ▼             ▼
    ┌─────────────────────┐
    │     /login          │
    │                     │
    │ • Shows active site │
    │ • Login form        │
    │ • "Ganti Site" link │
    └──────────┬──────────┘
               │
               │ Login successful
               ▼
    ┌─────────────────────┐
    │  /select-company    │
    │                     │
    │ • Select company    │
    └──────────┬──────────┘
               │
               │ Company selected
               ▼
    ┌─────────────────────┐
    │    /dashboard       │
    │                     │
    │ • Site selector in  │
    │   navbar (optional) │
    │ • All features      │
    └─────────────────────┘
```

## Detailed Flow Steps

### 1. Initial Access (First Time User)

When a user first visits the application:

1. **Site Context Initialization**
   - System loads site configurations from localStorage
   - If no sites configured, loads from environment variables
   - Performs automatic migration from legacy single-site config if needed

2. **Site Selection Required**
   - If no active site is selected, user is redirected to `/select-site`
   - Page displays all configured sites with:
     - Site display name
     - Site URL
     - Health status (Online/Offline/Checking)
     - Response time (if available)

3. **User Selects Site**
   - User clicks on desired site
   - Site is saved as active site in localStorage
   - User clicks "Lanjutkan ke Login" button
   - Redirected to `/login` page

### 2. Login Flow

On the login page:

1. **Active Site Display**
   - Shows which site is currently active
   - Displays site name in a highlighted box

2. **Login Form**
   - User enters username/email and password
   - Credentials are sent to the active site's API

3. **Change Site Option**
   - "Ganti Site" link at bottom of form
   - Allows user to go back to site selection if needed

4. **After Successful Login**
   - User is redirected to `/select-company`
   - Company selection works as before

### 3. Daily Usage (Returning User)

For returning users:

1. **Automatic Site Restoration**
   - Last selected site is automatically loaded
   - User goes directly to login page
   - No need to select site again

2. **Site Switching (Optional)**
   - Site selector available in navbar (after login)
   - Can switch sites from Settings → Manajemen Sites
   - Switching sites clears cache and requires re-login

### 4. Site Management

Users can manage sites at `/settings/sites`:

1. **View All Sites**
   - List of all configured sites
   - Health status for each site
   - Edit/Delete options

2. **Add New Site**
   - Click "Tambah Site" button
   - Fill in site details:
     - Display Name
     - API URL
     - API Key
     - API Secret
     - Set as default (optional)
   - Test connection before saving

3. **Edit Existing Site**
   - Update site configuration
   - Re-test connection
   - Save changes

4. **Delete Site**
   - Remove site from configuration
   - Confirmation required

## Key Pages

### `/select-site`
- **Purpose**: Pre-login site selection
- **Visibility**: Public (no authentication required)
- **Features**:
  - List all configured sites
  - Show health status
  - Select active site
  - Link to site management

### `/login`
- **Purpose**: User authentication
- **Visibility**: Public (no authentication required)
- **Features**:
  - Display active site
  - Login form
  - Link to change site
  - Redirects to `/select-site` if no active site

### `/settings/sites`
- **Purpose**: Site configuration management
- **Visibility**: Authenticated users only
- **Features**:
  - CRUD operations for sites
  - Connection testing
  - Health monitoring

## Navigation Bar Behavior

The navbar is hidden on:
- `/login` - Login page
- `/select-site` - Site selection page
- `/select-company` - Company selection page

The navbar is visible on all other pages and includes:
- Active site indicator (desktop)
- Site selector dropdown (optional, for switching after login)
- Company selector
- User menu

## Site Health Monitoring

The system continuously monitors site health:

1. **Background Checks**
   - Every 60 seconds
   - Pings each site's API
   - Updates health status

2. **Health Indicators**
   - 🟢 Online - Site is reachable and responding
   - 🔴 Offline - Site is unreachable or not responding
   - ⚪ Checking - Health check in progress

3. **Response Time**
   - Displayed in milliseconds
   - Helps users choose fastest site

## Error Handling

### No Sites Configured
- Shows message: "No Sites Configured"
- Button to configure sites
- Redirects to `/settings/sites`

### Site Offline
- Warning badge on site selector
- User can still select offline site
- Login will fail with appropriate error message

### Authentication Failure
- Error message displayed on login page
- User can retry or change site

## Configuration

### Environment Variables

Sites can be configured via environment variables:

```bash
# Multi-site format (JSON array)
ERPNEXT_SITES='[
  {
    "name": "bac",
    "displayName": "BAC Batasku",
    "apiUrl": "https://bac.batasku.cloud",
    "apiKey": "...",
    "apiSecret": "...",
    "isDefault": true
  },
  {
    "name": "demo",
    "displayName": "Demo Batasku",
    "apiUrl": "https://demo.batasku.cloud",
    "apiKey": "...",
    "apiSecret": "..."
  }
]'

# Default site (optional)
ERPNEXT_DEFAULT_SITE=bac
```

### Legacy Single-Site Format

The system automatically migrates from legacy format:

```bash
ERPNEXT_API_URL=https://bac.batasku.cloud
ERP_API_KEY=...
ERP_API_SECRET=...
```

This is converted to a multi-site configuration with a single site named "default".

## User Experience Highlights

1. **Seamless for Single-Site Users**
   - If only one site configured, flow is nearly identical to before
   - Automatic migration from legacy config

2. **Clear Site Context**
   - Always shows which site is active
   - Visual indicators throughout the UI

3. **Flexible Site Switching**
   - Can switch before login (via `/select-site`)
   - Can switch after login (via navbar or settings)

4. **Health Awareness**
   - Real-time health status
   - Helps users avoid offline sites

5. **Easy Management**
   - Simple UI for adding/editing sites
   - Connection testing before saving
   - No need to edit environment variables

## Technical Notes

### Session Isolation
- Each site has its own session cookie
- Cookie format: `sid_${siteId}`
- Switching sites doesn't affect other site sessions

### Cache Isolation
- Session storage is cleared on site switch
- Prevents data leakage between sites
- Site configurations persist in localStorage

### Authentication
- Supports both API key and session-based auth
- Falls back to API key if session expires
- Site-specific credentials

## Future Enhancements

Potential improvements for future versions:

1. **Multi-Site Dashboard**
   - View data from multiple sites simultaneously
   - Aggregate reports across sites

2. **Site Groups**
   - Organize sites into groups
   - Quick switch between related sites

3. **Site Favorites**
   - Mark frequently used sites
   - Quick access from navbar

4. **Site Search**
   - Search sites by name or URL
   - Useful when many sites configured

5. **Site Sync Status**
   - Show last sync time
   - Indicate if data is stale
