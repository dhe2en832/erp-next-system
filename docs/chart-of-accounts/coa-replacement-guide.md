# Chart of Accounts Replacement Guide

## Overview

This guide provides step-by-step instructions for safely replacing and updating the Chart of Accounts (COA) for Berkat Abadi Cirebon in the ERPNext system. The replacement process migrates from the existing accounts to a properly structured 143-account system while maintaining data integrity and preserving all existing transactions.

### Key Features

- **Safe Update Strategy**: Updates existing accounts instead of deleting them
- **No Data Loss**: Preserves all existing transactions and system references
- **Idempotent**: Can be run multiple times safely
- **Comprehensive Verification**: Validates the complete COA structure after replacement
- **Detailed Logging**: Tracks all changes for audit and troubleshooting

### Target Audience

This guide is intended for:
- System administrators
- Technical users with command-line experience
- ERPNext administrators responsible for financial configuration

## Prerequisites

### System Requirements

1. **Node.js**: Version 18 or higher
2. **pnpm**: Package manager installed
3. **ERPNext**: Running instance with API access
4. **Access**: Administrator credentials for ERPNext

### Environment Setup

1. **Environment Variables**: Configure `.env.local` file in the project root:

```bash
# ERPNext API Configuration
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here
```

2. **Verify Environment Variables**:

```bash
cat .env.local | grep ERP_
```

Expected output:
```
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=abc123...
ERP_API_SECRET=xyz789...
```

### Data Preparation

1. **COA Data File**: Ensure `scripts/new-coa-data.json` exists with 143 accounts
2. **Backup**: Create a backup of your ERPNext database before proceeding

```bash
# Example backup command (adjust for your setup)
bench --site your-site backup
```

### API Credentials

To obtain API credentials:

1. Log in to ERPNext as Administrator
2. Go to: **User Menu → API Access → Generate Keys**
3. Copy the API Key and API Secret
4. Add them to `.env.local`

## Preparation Steps

### Step 1: Validate COA Data File

Before running the replacement, validate the data file to catch any issues early.

**Command**:
```bash
pnpm validate-coa-data
```

**What it checks**:
- Valid JSON structure
- All required fields present (account_number, account_name, company, etc.)
- No duplicate account numbers
- No circular references in hierarchy
- Valid root types (Asset, Liability, Equity, Income, Expense)
- Valid currency codes (ISO 4217)
- Account type compatibility with root type

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║  COA Data Pre-flight Validation                            ║
╚════════════════════════════════════════════════════════════╝

📂 Validating file: scripts/new-coa-data.json

1️⃣  Checking file exists...
   ✅ File found
2️⃣  Parsing JSON...
   ✅ Valid JSON structure
3️⃣  Validating data structure...
   ✅ Found 143 accounts
4️⃣  Validating required fields...
   ✅ All required fields present
5️⃣  Checking for duplicate account numbers...
   ✅ All account numbers are unique
6️⃣  Validating root types...
   ✅ All root types are valid
7️⃣  Validating currency codes...
   ✅ All currency codes are valid
8️⃣  Validating account_type compatibility...
   ✅ All account_type values are compatible with root_type
9️⃣  Checking for circular references...
   ✅ No circular references found
🔟 Validating hierarchy sorting...
   ✅ Hierarchy can be sorted successfully

╔════════════════════════════════════════════════════════════╗
║  ✅ VALIDATION PASSED                                       ║
║                                                            ║
║  The COA data file is valid and ready for use.             ║
║  You can now run: pnpm update-coa                          ║
╚════════════════════════════════════════════════════════════╝
```

**If Validation Fails**:
- Review the error messages
- Fix issues in `scripts/new-coa-data.json`
- Run validation again until it passes

### Step 2: Preview Changes (Dry Run)

Preview what changes will be made without actually applying them.

**Command**:
```bash
pnpm tsx scripts/update-coa.ts --dry-run
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║  Complete Chart of Accounts Replacement                   ║
║  Berkat Abadi Cirebon                                      ║
╚════════════════════════════════════════════════════════════╝

🔍 DRY RUN MODE - No changes will be applied

🔐 Validating environment configuration...
✅ API URL: http://localhost:8000
✅ API credentials configured

🔌 Initializing ERPNext client...
✅ Client initialized

🔗 Testing connection to ERPNext...
✅ Connection successful

🔍 DRY RUN: Skipping actual COA replacement

In normal mode, this script would:
  1. Load COA data from scripts/new-coa-data.json
  2. Validate and sort accounts by hierarchy
  3. Create or update 143 accounts
  4. Generate processing summary
  5. Save change log to scripts/coa-replacement-log.json

To execute the replacement, run without --dry-run flag:
  pnpm tsx scripts/update-coa.ts
```

### Step 3: Check Current COA State

Optionally, verify the current state of your COA before making changes.

**Command**:
```bash
pnpm verify-coa
```

This will show you the current account structure and identify any existing issues.

## Execution Steps

### Step 1: Run COA Replacement

Execute the main replacement script to update your Chart of Accounts.

**Command**:
```bash
pnpm update-coa
```

**Process Flow**:
1. Validates environment configuration
2. Tests connection to ERPNext
3. Loads COA data from `scripts/new-coa-data.json`
4. Validates and sorts accounts by hierarchy
5. Processes each account (create or update)
6. Generates processing summary
7. Saves change log to `scripts/coa-replacement-log.json`

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║  Complete Chart of Accounts Replacement                   ║
║  Berkat Abadi Cirebon                                      ║
╚════════════════════════════════════════════════════════════╝

🔐 Validating environment configuration...
✅ API URL: http://localhost:8000
✅ API credentials configured

🔌 Initializing ERPNext client...
✅ Client initialized

🔗 Testing connection to ERPNext...
✅ Connection successful

⚙️  Initializing COA Manager...
✅ Manager initialized

📂 Loading COA data from: scripts/new-coa-data.json
✅ Loaded 143 accounts

🔍 Validating COA data...
✅ Validation passed

🔄 Sorting accounts by hierarchy...
✅ Sorted 143 accounts

📝 Processing accounts...
   Progress: 10/143 processed
   Progress: 20/143 processed
   Progress: 30/143 processed
   ...
   Progress: 140/143 processed
✅ Processing complete

╔════════════════════════════════════════════════════════════╗
║  Processing Summary                                        ║
╚════════════════════════════════════════════════════════════╝

📊 Results:
   Total accounts: 143
   ✅ Created: 39
   🔄 Updated: 104
   ⏭️  Skipped: 0
   ❌ Failed: 0

📝 Generating change log...
✅ Change log saved to: scripts/coa-replacement-log.json

╔════════════════════════════════════════════════════════════╗
║  Execution Complete                                        ║
╚════════════════════════════════════════════════════════════╝

⏱️  Total execution time: 45.23s

✅ All accounts processed successfully!

Next steps:
  1. Review the change log: scripts/coa-replacement-log.json
  2. Run verification: pnpm tsx scripts/verify-coa.ts
  3. Update company default accounts if needed
```

### Step 2: Review Change Log

After execution, review the detailed change log to see what was modified.

**File Location**: `scripts/coa-replacement-log.json`

**Command**:
```bash
cat scripts/coa-replacement-log.json | less
```

**Change Log Structure**:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "duration_ms": 45230,
  "summary": {
    "total_accounts": 143,
    "created": 39,
    "updated": 104,
    "skipped": 0,
    "failed": 0
  },
  "errors": [],
  "execution_time": "2024-01-15T10:30:45.123Z",
  "data_file": "/path/to/scripts/new-coa-data.json",
  "api_url": "http://localhost:8000"
}
```

## Verification Steps

### Step 1: Run Verification Script

Verify that the COA replacement was successful and all accounts are correctly configured.

**Command**:
```bash
pnpm verify-coa
```

**What it verifies**:
- All 143 expected accounts exist
- Hierarchy integrity (valid parent-child relationships)
- No orphaned accounts (invalid parent references)
- No ledger accounts with children
- All leaf accounts are ledgers
- Account counts by root_type, account_type, and currency

**Expected Output (Success)**:
```
╔════════════════════════════════════════════════════════════╗
║  Chart of Accounts Verification                           ║
║  Berkat Abadi Cirebon                                      ║
╚════════════════════════════════════════════════════════════╝

🔐 Validating environment configuration...
✅ API URL: http://localhost:8000
✅ API credentials configured

🔌 Initializing ERPNext client...
✅ Client initialized

🔗 Testing connection to ERPNext...
✅ Connection successful

📂 Loading expected account numbers...
✅ Loaded 143 expected accounts

⚙️  Initializing Verification Reporter...
✅ Reporter initialized

🔍 Running verification checks...
   This may take a moment...

╔════════════════════════════════════════════════════════════╗
║  COA Verification Report                                   ║
║  Company: Berkat Abadi Cirebon                            ║
╚════════════════════════════════════════════════════════════╝

📊 Account Summary:
   Total accounts: 143
   
   By Root Type:
   - Asset: 45
   - Liability: 18
   - Equity: 8
   - Income: 12
   - Expense: 60
   
   By Account Type:
   - Bank: 3
   - Cash: 2
   - Receivable: 2
   - Payable: 3
   - Stock: 1
   - Tax: 4
   - Fixed Asset: 5
   - Accumulated Depreciation: 4
   - Income Account: 2
   - Expense Account: 25
   - Cost of Goods Sold: 2
   - Depreciation: 3
   
   By Currency:
   - IDR: 140
   - USD: 2
   - SGD: 1

✅ All 143 expected accounts exist

✅ No orphaned accounts found

✅ No hierarchy errors detected

✅ All ledger accounts have no children

✅ All leaf accounts are ledgers

╔════════════════════════════════════════════════════════════╗
║  ✅ VERIFICATION PASSED                                     ║
╚════════════════════════════════════════════════════════════╝

⏱️  Verification completed in 3.45s

✅ All verification checks passed!

The Chart of Accounts has been successfully verified.
All 143 expected accounts exist with correct hierarchy.
```

### Step 2: Manual Verification in ERPNext

1. Log in to ERPNext
2. Go to: **Accounting → Chart of Accounts**
3. Select company: **Berkat Abadi Cirebon**
4. Verify the account structure visually
5. Check key accounts:
   - Bank accounts (1110.xxx)
   - Cash accounts (1120.xxx)
   - Receivables (1210.xxx)
   - Payables (2110.xxx)
   - Hutang Komisi Sales (2150)

### Step 3: Test Transactions

Create a test transaction to ensure accounts work correctly:

1. Create a test Journal Entry
2. Select accounts from the new COA
3. Submit the entry
4. Verify GL Entries are created correctly
5. Cancel and delete the test entry

## Safety Measures

### No Account Deletion

The replacement process **never deletes accounts**. This ensures:
- Existing transactions remain intact
- Company default accounts continue to work
- Payment mode accounts are preserved
- Tax template accounts remain functional

### Transaction Preservation

- Accounts with existing transactions are updated carefully
- The `is_group` property is only changed if no transactions exist
- All GL Entry, Journal Entry, and Payment Entry references are preserved

### Idempotent Execution

The script can be run multiple times safely:
- Already created accounts are detected and skipped
- Already updated accounts are skipped if properties match
- Partial completion is handled gracefully
- Account numbers are used as idempotency keys

### Rollback Procedures

If issues occur after replacement:

1. **Review Change Log**: Check `scripts/coa-replacement-log.json` for details
2. **Identify Problem Accounts**: Use verification report to find issues
3. **Manual Correction**: Update accounts manually in ERPNext if needed
4. **Database Restore**: Restore from backup if critical issues occur

**Manual Account Correction**:
```bash
# Example: Fix a specific account
# 1. Log in to ERPNext
# 2. Go to: Accounting → Chart of Accounts
# 3. Find the account by account number
# 4. Click Edit
# 5. Correct the properties
# 6. Save
```

**Database Restore** (if needed):
```bash
# Restore from backup (adjust for your setup)
bench --site your-site restore /path/to/backup.sql.gz
```

### Error Handling

The script handles errors gracefully:
- API errors are logged and processing continues
- Failed accounts are tracked in the change log
- Summary shows counts of failed operations
- Exit code indicates success (0) or failure (1)

## Troubleshooting

### Common Issues

#### Issue 1: Connection Failed

**Symptom**:
```
❌ Failed to connect to ERPNext: ECONNREFUSED
```

**Solutions**:
1. Verify ERPNext is running: `bench status`
2. Check API URL in `.env.local`
3. Test connection: `curl http://localhost:8000/api/method/ping`
4. Verify firewall settings

#### Issue 2: Authentication Failed

**Symptom**:
```
❌ Failed to connect to ERPNext: 401 Unauthorized
```

**Solutions**:
1. Verify API credentials in `.env.local`
2. Regenerate API keys in ERPNext
3. Check user has Administrator role
4. Ensure API access is enabled for the user

#### Issue 3: Validation Failed

**Symptom**:
```
❌ VALIDATION FAILED
   • Duplicate account_number "1110.001" found at indices: 5, 12
```

**Solutions**:
1. Review error messages from validation script
2. Fix issues in `scripts/new-coa-data.json`
3. Common fixes:
   - Remove duplicate account numbers
   - Fix circular parent references
   - Correct invalid root types
   - Fix account_type compatibility
4. Run validation again: `pnpm validate-coa-data`

#### Issue 4: Some Accounts Failed

**Symptom**:
```
⚠️  Some accounts failed to process. Review the change log for details.
   Log file: scripts/coa-replacement-log.json
```

**Solutions**:
1. Review change log: `cat scripts/coa-replacement-log.json`
2. Check `errors` array for details
3. Common causes:
   - Parent account doesn't exist
   - Account has transactions and needs is_group change
   - Invalid account properties
4. Fix issues and run script again (idempotent)

#### Issue 5: Verification Failed

**Symptom**:
```
❌ Verification failed!

Missing Accounts (2):
   - 1140.001 (Sewa Dibayar Dimuka)
   - 5280.000 (Beban Lain-lain)
```

**Solutions**:
1. Review verification report for specific issues
2. For missing accounts:
   - Check if they failed during processing
   - Review change log for errors
   - Run update script again
3. For hierarchy errors:
   - Fix parent references manually in ERPNext
   - Update `new-coa-data.json` if needed
4. For ledger accounts with children:
   - Convert to group account or move children
5. Run verification again after fixes

#### Issue 6: Slow Performance

**Symptom**:
- Script takes longer than 3 minutes
- Progress updates are slow

**Solutions**:
1. Check ERPNext server load
2. Verify network latency
3. Check database performance
4. Consider running during off-peak hours
5. Review ERPNext logs for slow queries

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**:
   - Change log: `scripts/coa-replacement-log.json`
   - ERPNext logs: `bench logs`
   - Script output: Review console output

2. **Verify Prerequisites**:
   - Node.js version: `node --version` (should be 18+)
   - pnpm installed: `pnpm --version`
   - ERPNext running: `bench status`
   - API credentials valid

3. **Review Documentation**:
   - Design document: `.kiro/specs/complete-coa-replacement/design.md`
   - Requirements: `.kiro/specs/complete-coa-replacement/requirements.md`
   - Script source code: `scripts/update-coa.ts`

4. **Contact Support**:
   - Provide change log file
   - Include verification report
   - Share error messages
   - Describe steps taken

## Next Steps After Successful Replacement

### 1. Update Company Default Accounts

Some company default accounts may need to be updated to reference new COA accounts.

**Steps**:
1. Log in to ERPNext as Administrator
2. Go to: **Accounting → Company → Berkat Abadi Cirebon**
3. Review and update default accounts:
   - Default Bank Account
   - Default Cash Account
   - Default Receivable Account
   - Default Payable Account
   - Default Income Account
   - Default Expense Account
   - Cost Center
4. Save changes

### 2. Update Payment Modes

Verify payment modes reference correct accounts.

**Steps**:
1. Go to: **Accounting → Payment Mode**
2. For each payment mode:
   - Check Default Account
   - Update if needed to reference new COA accounts
3. Save changes

### 3. Update Tax Templates

Verify tax templates reference correct accounts.

**Steps**:
1. Go to: **Accounting → Sales Taxes and Charges Template**
2. For each template:
   - Check Account Head for each row
   - Update if needed
3. Repeat for **Purchase Taxes and Charges Template**

### 4. Test Financial Operations

Perform end-to-end testing:

1. **Create Sales Invoice**:
   - Verify accounts are populated correctly
   - Submit and check GL Entries
   - Cancel to clean up

2. **Create Purchase Invoice**:
   - Verify accounts are populated correctly
   - Submit and check GL Entries
   - Cancel to clean up

3. **Create Payment Entry**:
   - Verify bank/cash accounts work
   - Submit and check GL Entries
   - Cancel to clean up

4. **Create Journal Entry**:
   - Test various account combinations
   - Verify multi-currency accounts work
   - Submit and check GL Entries
   - Cancel to clean up

### 5. Generate Financial Reports

Verify reports work correctly with new COA:

1. **Trial Balance**: Accounting → Trial Balance
2. **Balance Sheet**: Accounting → Balance Sheet
3. **Profit and Loss**: Accounting → Profit and Loss Statement
4. **General Ledger**: Accounting → General Ledger

### 6. Document Changes

Create internal documentation:

1. List of new accounts created
2. List of accounts updated
3. Changes to company defaults
4. Changes to payment modes
5. Changes to tax templates
6. Date of replacement
7. Person responsible

### 7. Train Users

Inform and train users on:

1. New account structure
2. Changes to account numbers
3. New accounts available
4. Multi-currency accounts (if applicable)
5. Any workflow changes

## Command Reference

### Quick Commands

```bash
# Validate COA data file
pnpm validate-coa-data

# Preview changes (dry run)
pnpm tsx scripts/update-coa.ts --dry-run

# Execute COA replacement
pnpm update-coa

# Verify COA after replacement
pnpm verify-coa

# View change log
cat scripts/coa-replacement-log.json | less

# Check ERPNext status
bench status

# View ERPNext logs
bench logs
```

### File Locations

```
scripts/
├── new-coa-data.json              # Input: 143 accounts
├── update-coa.ts                  # Main replacement script
├── verify-coa.ts                  # Verification script
├── validate-coa-data.ts           # Validation script
├── coa-replacement-log.json       # Output: Change log
└── lib/
    ├── coa-manager.ts             # COA orchestration
    ├── account-processor.ts       # Account operations
    ├── hierarchy-validator.ts     # Hierarchy validation
    └── verification-reporter.ts   # Verification reporting
```

### Environment Variables

```bash
# Required in .env.local
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here
```

## Best Practices

1. **Always Backup First**: Create database backup before running replacement
2. **Validate Before Executing**: Run validation script to catch issues early
3. **Use Dry Run**: Preview changes before applying them
4. **Run During Off-Peak**: Execute during low-usage periods
5. **Verify After Execution**: Always run verification script after replacement
6. **Review Change Log**: Check what was changed for audit trail
7. **Test Thoroughly**: Test financial operations after replacement
8. **Document Changes**: Keep records of what was modified
9. **Train Users**: Inform users of changes to account structure
10. **Monitor Performance**: Watch for any performance issues after replacement

## Conclusion

The Chart of Accounts replacement process is designed to be safe, reliable, and idempotent. By following this guide, you can successfully migrate to the new 143-account structure while preserving all existing data and maintaining system integrity.

For questions or issues, refer to the troubleshooting section or contact your system administrator.
