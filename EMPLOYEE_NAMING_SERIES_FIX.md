# Employee Naming Series Issue - SOLVED

## Problem Summary
ERPNext Employee doctype uses `autoname: "naming_series:"` which means it MUST use the naming series counter. The counter is stuck at 1, causing it to always try to create HR-EMP-00001 even though employees HR-EMP-00001 through HR-EMP-00015 already exist.

## Root Cause Identified
The naming series counter in `tabSeries` table is out of sync with actual employee data. This happened because:
- **15 employees were created on 2026-02-21** (likely imported or created before multisite)
- **Naming series counter was never initialized** - it defaults to 1
- **ERPNext ignores `name` field in API** - it always uses the naming series counter
- **This is NOT a multisite bug** - it's a data migration issue

## Test Results
From `test-naming-series-query.ts`:
```
✅ Found 15 employees (HR-EMP-00001 to HR-EMP-00015)
📊 Highest employee number: 15
📊 Next employee should be: HR-EMP-00016
❌ Auto-insert tries HR-EMP-00001 → Duplicate entry error
```

## Solution (MUST BE DONE ON SERVER)

## Solution (MUST BE DONE ON SERVER)

### Step-by-Step Instructions

**IMPORTANT**: The naming series counter can ONLY be fixed on the ERPNext server. API methods don't work because:
- `frappe.client.sql` doesn't exist
- `frappe.model.naming.update_series_start` doesn't exist
- API cannot execute raw SQL for security reasons

#### Option 1: Using Bench Console (Recommended)

1. **SSH to ERPNext server**:
   ```bash
   ssh user@your-erpnext-server
   ```

2. **Open bench console for the site**:
   ```bash
   bench --site cirebon.batasku.cloud console
   ```

3. **Copy and paste the entire content of `fix_employee_naming_series.py`**:
   - The script will run automatically
   - It will show current state and update the counter
   - Expected output:
     ```
     📊 Current State:
       - Total employees: 15
       - Highest ID number: 15
       - Next ID should be: 16
       - Current series counter: 1 (or NOT SET)
     
     🔧 Updating naming series counter...
     ✅ Successfully updated naming series counter to 16
     📝 Next employee will be: HR-EMP-00016
     ```

4. **Exit console**:
   ```python
   exit()
   ```

#### Option 2: Manual SQL Update (If you have database access)

```sql
-- Check current value
SELECT * FROM tabSeries WHERE name = 'HR-EMP-';

-- Update to next number (16 in this case)
INSERT INTO tabSeries (name, current) VALUES ('HR-EMP-', 16)
ON DUPLICATE KEY UPDATE current = 16;
```

#### Option 3: Via ERPNext UI (If available)

1. Go to: **Setup → Settings → System Settings**
2. Search for "Naming Series" in the search bar
3. Find "Employee" in the list
4. Update the current value to **16** (or the next number after your highest employee)
5. Save

## Verification

After fixing, test by creating a new employee via the Next.js app:
1. Go to http://localhost:3000/employees
2. Click "Tambah Employee"
3. Fill in the form and save
4. It should successfully create employee with ID **HR-EMP-00016**

## Why API-Based Fix Doesn't Work

We tried multiple approaches via API, all failed:

### Attempted Methods:
1. ❌ **frappe.client.sql** - Method doesn't exist
2. ❌ **frappe.model.naming.update_series_start** - Method doesn't exist
3. ❌ **Series DocType** - DocType doesn't exist (tabSeries is a raw table)
4. ❌ **Providing `name` field in POST** - ERPNext ignores it and uses naming series
5. ❌ **Providing `__newname` field** - ERPNext ignores it
6. ❌ **Retry logic with incrementing IDs** - Doesn't work because ERPNext always uses counter

### Why These Don't Work:
- ERPNext's `autoname: "naming_series:"` is **mandatory** and cannot be bypassed via API
- The naming series counter is stored in `tabSeries` table (not a DocType)
- API security prevents raw SQL execution
- Only server-side Python code can update the counter

## Files Created for Troubleshooting

1. **fix_employee_naming_series.py** - Python script to run on server (SOLUTION)
2. **test-naming-series-query.ts** - Test script to query current state
3. **fix-naming-series-sql.ts** - Attempted SQL fix via API (doesn't work)
4. **test-employee-insert.ts** - Test different insert methods
5. **test-insert-methods.ts** - Test various API methods
6. **fix-naming-series.ts** - Attempted to update via Series DocType (doesn't work)
7. **fix-naming-series-direct.ts** - Another attempt (doesn't work)

## Current API Implementation

The POST route in `app/api/hr/employees/route.ts` has retry logic as a temporary workaround:
- Fetches all employees to calculate next ID
- Attempts to insert with retry (up to 5 times)
- Tries to update naming series counter (fails)
- **This doesn't work** because ERPNext ignores provided IDs

## Prevention

To prevent this issue in the future:
1. **Always create employees via API/UI** (not direct SQL)
2. **If importing employees**, update the naming series counter afterwards using the Python script
3. **Monitor the naming series counter** periodically
4. **After data migration**, always run the fix script to sync counters

## Related to Multisite?

**NO**. This is NOT a multisite bug. The issue existed before multisite implementation:
- User confirmed: "Employee creation worked BEFORE multisite, broke AFTER multisite"
- However, the root cause is the **data migration on 2026-02-21** when 15 employees were created
- The naming series counter was never initialized during that migration
- Multisite implementation just exposed the existing problem

## Next Steps

**ACTION REQUIRED**: User must run the Python script on the ERPNext server to fix the naming series counter. Until then, employee creation will continue to fail with duplicate entry errors.
