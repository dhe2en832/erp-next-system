# Installation Guide: Accounting Period Closing

## Overview

This guide provides step-by-step instructions for installing and configuring the Accounting Period Closing feature in your ERP system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Installation (ERPNext)](#backend-installation-erpnext)
3. [Frontend Installation (Next.js)](#frontend-installation-nextjs)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**ERPNext Backend:**
- ERPNext version 14.x or 15.x
- Python 3.8+
- MariaDB 10.3+
- Frappe Framework

**Next.js Frontend:**
- Node.js 18+
- npm or yarn
- Next.js 16.1.6+
- React 19.2.3+

### Required Access

- SSH access to ERPNext server
- ERPNext System Manager role
- Database access (for verification)
- Git access to repository

### Dependencies

```json
{
  "next": "^16.1.6",
  "react": "^19.2.3",
  "zod": "^3.22.0",
  "tailwindcss": "^4.0.0"
}
```

---

## Backend Installation (ERPNext)

### Step 1: Install Custom App (batasku_custom)

#### 1.1 Navigate to Frappe Bench

```bash
cd /path/to/frappe-bench
```

#### 1.2 Check if batasku_custom App Exists

```bash
bench list-apps
```

If `batasku_custom` is not listed, you need to create it:

```bash
bench new-app batasku_custom
```

#### 1.3 Install App to Site

```bash
bench --site [your-site-name] install-app batasku_custom
```

Replace `[your-site-name]` with your actual site name (e.g., `batasku.local`).

### Step 2: Create DocTypes

The DocType JSON files should be located in:
```
apps/batasku_custom/batasku_custom/batasku_custom/doctype/
```

#### 2.1 Accounting Period DocType

Create directory:
```bash
mkdir -p apps/batasku_custom/batasku_custom/batasku_custom/doctype/accounting_period
```

Create files:
- `accounting_period.json` - DocType definition
- `accounting_period.py` - Python controller
- `__init__.py` - Python package marker

**accounting_period.json** (key fields):
```json
{
  "doctype": "DocType",
  "name": "Accounting Period",
  "module": "Batasku Custom",
  "fields": [
    {
      "fieldname": "period_name",
      "fieldtype": "Data",
      "label": "Period Name",
      "reqd": 1
    },
    {
      "fieldname": "company",
      "fieldtype": "Link",
      "options": "Company",
      "reqd": 1
    },
    {
      "fieldname": "start_date",
      "fieldtype": "Date",
      "reqd": 1
    },
    {
      "fieldname": "end_date",
      "fieldtype": "Date",
      "reqd": 1
    },
    {
      "fieldname": "status",
      "fieldtype": "Select",
      "options": "Open\\nClosed\\nPermanently Closed",
      "default": "Open"
    }
  ]
}
```

#### 2.2 Period Closing Log DocType

Create directory:
```bash
mkdir -p apps/batasku_custom/batasku_custom/batasku_custom/doctype/period_closing_log
```

Create files similar to Accounting Period.

#### 2.3 Period Closing Config DocType

Create directory:
```bash
mkdir -p apps/batasku_custom/batasku_custom/batasku_custom/doctype/period_closing_config
```

This is a Single DocType (issingle: 1).

### Step 3: Update hooks.py

Edit `apps/batasku_custom/batasku_custom/hooks.py`:

```python
# Add fixtures
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                # Add custom field names if any
            ]]
        ]
    }
]

# Add doc_events for transaction restrictions (optional)
doc_events = {
    "Journal Entry": {
        "before_insert": "batasku_custom.accounting_period.validate_closed_period",
        "before_save": "batasku_custom.accounting_period.validate_closed_period",
    },
    "Sales Invoice": {
        "before_insert": "batasku_custom.accounting_period.validate_closed_period",
        "before_save": "batasku_custom.accounting_period.validate_closed_period",
    },
    # Add other doctypes as needed
}
```

### Step 4: Run Migration

```bash
# Clear cache
bench --site [your-site-name] clear-cache

# Run migrate to create DocTypes
bench --site [your-site-name] migrate

# Restart bench
bench restart
```

### Step 5: Verify DocTypes Created

```bash
# Open bench console
bench --site [your-site-name] console

# In Python console:
>>> frappe.get_doc("DocType", "Accounting Period")
>>> frappe.get_doc("DocType", "Period Closing Log")
>>> frappe.get_doc("DocType", "Period Closing Config")
```

If no errors, DocTypes are created successfully.

### Step 6: Create Initial Configuration

```bash
bench --site [your-site-name] console
```

```python
# Create Period Closing Config
config = frappe.get_doc({
    "doctype": "Period Closing Config",
    "retained_earnings_account": "3600 - Retained Earnings - COMPANY",
    "enable_draft_transaction_check": 1,
    "enable_unposted_transaction_check": 1,
    "enable_bank_reconciliation_check": 1,
    "enable_sales_invoice_check": 1,
    "enable_purchase_invoice_check": 1,
    "enable_inventory_check": 1,
    "enable_payroll_check": 1,
    "closing_role": "Accounts Manager",
    "reopen_role": "Accounts Manager",
    "reminder_days_before_end": 3,
    "escalation_days_after_end": 7,
    "enable_email_notifications": 1
})
config.insert()
frappe.db.commit()
```

---

## Frontend Installation (Next.js)

### Step 1: Clone Repository

```bash
git clone [repository-url]
cd erp-next-system
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Configure Environment Variables

Create `.env.local` file:

```env
# ERPNext Configuration
ERPNEXT_URL=http://localhost:8000
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

**Important**: Replace `your_api_key_here` and `your_api_secret_here` with actual ERPNext API credentials.

### Step 4: Verify File Structure

Ensure the following directories exist:

```
erp-next-system/
├── app/
│   ├── accounting-period/
│   │   ├── components/
│   │   ├── [name]/
│   │   ├── close/
│   │   ├── dashboard/
│   │   ├── create/
│   │   ├── reports/
│   │   ├── audit-log/
│   │   ├── settings/
│   │   └── page.tsx
│   └── api/
│       └── accounting-period/
│           ├── periods/
│           ├── validate/
│           ├── close/
│           ├── reopen/
│           ├── permanent-close/
│           ├── reports/
│           ├── audit-log/
│           └── config/
├── lib/
│   ├── erpnext.ts
│   ├── accounting-period-*.ts
│   └── ...
├── types/
│   └── accounting-period.ts
└── tests/
    └── accounting-period-*.test.ts
```

### Step 5: Build and Start

**Development:**
```bash
npm run dev
# or
yarn dev
```

**Production:**
```bash
npm run build
npm start
# or
yarn build
yarn start
```

### Step 6: Verify Frontend Access

1. Open browser: `http://localhost:3000`
2. Navigate to `/accounting-period`
3. You should see the period management dashboard

---

## Configuration

### 1. ERPNext API Credentials

#### Generate API Key and Secret

1. Login to ERPNext as System Manager
2. Go to: **User** → Select your user
3. Click **API Access** section
4. Click **Generate Keys**
5. Copy API Key and API Secret
6. Add to `.env.local` file

#### Test API Connection

```bash
curl -X GET "http://localhost:8000/api/resource/Company" \
  -H "Authorization: token [api_key]:[api_secret]"
```

### 2. Period Closing Config

Access: `/accounting-period/settings`

Configure:
- Retained Earnings Account
- Validation checks (enable/disable)
- Role assignments
- Notification settings

### 3. User Roles

Assign roles to users in ERPNext:

1. Go to **User** → Select user
2. Add roles:
   - **Accounts Manager**: For closing and reopening periods
   - **System Manager**: For permanent closing and configuration

### 4. Email Notifications (Optional)

Configure email settings in ERPNext:
1. Go to **Email Domain**
2. Configure SMTP settings
3. Test email sending

---

## Verification

### Backend Verification

#### 1. Check DocTypes

```bash
bench --site [your-site-name] console
```

```python
# List all custom DocTypes
frappe.get_all("DocType", filters={"module": "Batasku Custom"})

# Check specific DocType
doc = frappe.get_doc("DocType", "Accounting Period")
print(doc.as_dict())
```

#### 2. Check Permissions

```python
# Check if user has permissions
frappe.has_permission("Accounting Period", "read", user="user@example.com")
frappe.has_permission("Accounting Period", "write", user="user@example.com")
```

#### 3. Test API Endpoints

```bash
# List periods
curl -X GET "http://localhost:8000/api/resource/Accounting Period" \
  -H "Authorization: token [api_key]:[api_secret]"

# Get config
curl -X GET "http://localhost:8000/api/resource/Period Closing Config/Period Closing Config" \
  -H "Authorization: token [api_key]:[api_secret]"
```

### Frontend Verification

#### 1. Check Pages Load

- `/accounting-period` - Dashboard
- `/accounting-period/create` - Create period form
- `/accounting-period/settings` - Configuration
- `/accounting-period/audit-log` - Audit log

#### 2. Test API Integration

Open browser console and run:

```javascript
// Test list periods
fetch('/api/accounting-period/periods')
  .then(r => r.json())
  .then(console.log);

// Test get config
fetch('/api/accounting-period/config')
  .then(r => r.json())
  .then(console.log);
```

#### 3. Create Test Period

1. Go to `/accounting-period/create`
2. Fill form:
   - Period Name: "Test Period"
   - Company: Select company
   - Start Date: 01/01/2024
   - End Date: 31/01/2024
   - Period Type: Monthly
3. Click "Create Period"
4. Verify period appears in dashboard

#### 4. Run Validation

1. Go to period detail page
2. Click "Close Period"
3. Verify validation runs
4. Check validation results display correctly

### Test Suite Verification

```bash
# Run all tests
npm test

# Run specific test suite
npm test accounting-period

# Run with coverage
npm test -- --coverage
```

Expected: All tests should pass.

---

## Troubleshooting

### Common Issues

#### 1. DocTypes Not Created

**Symptom**: Error "DocType Accounting Period not found"

**Solution**:
```bash
# Clear cache and migrate again
bench --site [your-site-name] clear-cache
bench --site [your-site-name] migrate --force
bench restart
```

#### 2. API Connection Failed

**Symptom**: Frontend shows "Failed to fetch periods"

**Solution**:
- Check ERPNext is running: `bench start`
- Verify API credentials in `.env.local`
- Check CORS settings in ERPNext
- Test API with curl

#### 3. Permission Denied

**Symptom**: "Insufficient permissions" error

**Solution**:
- Verify user has correct roles
- Check DocType permissions in ERPNext
- Assign "Accounts Manager" role to user

#### 4. Module Not Found

**Symptom**: "Module Batasku Custom not found"

**Solution**:
```bash
# Ensure app is installed
bench --site [your-site-name] install-app batasku_custom

# Check modules.txt
cat apps/batasku_custom/batasku_custom/modules.txt
# Should contain: Batasku Custom
```

#### 5. Frontend Build Errors

**Symptom**: Build fails with TypeScript errors

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### 6. Database Migration Errors

**Symptom**: Migration fails with SQL errors

**Solution**:
```bash
# Check database connection
bench --site [your-site-name] mariadb

# Check for conflicting DocTypes
SELECT name FROM tabDocType WHERE name LIKE '%Accounting Period%';

# If conflicts exist, drop and recreate
# (CAUTION: This will delete data)
```

### Getting Help

If issues persist:

1. Check logs:
   ```bash
   # ERPNext logs
   tail -f sites/[your-site-name]/logs/web.log
   
   # Next.js logs
   # Check terminal output
   ```

2. Enable debug mode:
   ```bash
   # ERPNext
   bench --site [your-site-name] set-config developer_mode 1
   
   # Next.js
   # Set NODE_ENV=development in .env.local
   ```

3. Contact support or create issue in repository

---

## Post-Installation Steps

### 1. Create Initial Periods

Create periods for current fiscal year:
1. Go to `/accounting-period/create`
2. Create monthly periods for the year
3. Verify all periods created successfully

### 2. Configure Notifications

1. Go to `/accounting-period/settings`
2. Set reminder days (default: 3)
3. Set escalation days (default: 7)
4. Enable email notifications

### 3. Train Users

1. Share user guide with accounting team
2. Conduct training session
3. Create test periods for practice
4. Document company-specific procedures

### 4. Setup Monitoring

1. Configure error tracking (Sentry, etc.)
2. Setup performance monitoring
3. Configure audit log retention
4. Setup backup procedures

### 5. Security Review

1. Review user permissions
2. Verify role assignments
3. Test transaction restrictions
4. Review audit log access

---

## Upgrade Guide

### Upgrading from Previous Version

1. **Backup Database**
   ```bash
   bench --site [your-site-name] backup
   ```

2. **Pull Latest Code**
   ```bash
   git pull origin main
   ```

3. **Update Dependencies**
   ```bash
   npm install
   ```

4. **Run Migrations**
   ```bash
   bench --site [your-site-name] migrate
   ```

5. **Rebuild Frontend**
   ```bash
   npm run build
   ```

6. **Restart Services**
   ```bash
   bench restart
   pm2 restart all  # If using PM2
   ```

7. **Verify Upgrade**
   - Test all major features
   - Check for errors in logs
   - Verify data integrity

---

## Rollback Procedure

If installation fails or causes issues:

### 1. Restore Database

```bash
# List available backups
bench --site [your-site-name] list-backups

# Restore from backup
bench --site [your-site-name] restore [backup-file]
```

### 2. Uninstall App

```bash
bench --site [your-site-name] uninstall-app batasku_custom
```

### 3. Revert Frontend

```bash
git checkout [previous-commit]
npm install
npm run build
```

---

## Appendix

### A. Required Permissions

| DocType | Read | Write | Create | Delete |
|---------|------|-------|--------|--------|
| Accounting Period | Accounts User | Accounts Manager | Accounts Manager | System Manager |
| Period Closing Log | Accounts Manager | System Manager | System | System |
| Period Closing Config | Accounts Manager | System Manager | System Manager | System Manager |

### B. Database Schema

**Accounting Period Table:**
```sql
CREATE TABLE `tabAccounting Period` (
  `name` varchar(140) PRIMARY KEY,
  `period_name` varchar(140),
  `company` varchar(140),
  `start_date` date,
  `end_date` date,
  `status` varchar(140),
  `closed_by` varchar(140),
  `closed_on` datetime,
  ...
);
```

### C. API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/accounting-period/periods` | GET | List periods |
| `/api/accounting-period/periods` | POST | Create period |
| `/api/accounting-period/periods/[name]` | GET | Get period details |
| `/api/accounting-period/validate` | POST | Run validations |
| `/api/accounting-period/close` | POST | Close period |
| `/api/accounting-period/reopen` | POST | Reopen period |
| `/api/accounting-period/permanent-close` | POST | Permanent close |
| `/api/accounting-period/config` | GET/PUT | Manage config |

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: ERP Development Team
