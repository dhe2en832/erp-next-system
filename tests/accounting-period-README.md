# Accounting Period Property Tests

## Overview

This directory contains property-based tests for the Accounting Period Closing feature.

## Test: Period Creation Round-Trip (Property 3)

**File:** `accounting-period-creation-roundtrip.test.ts`

**Feature:** accounting-period-closing, Property 3: Period Creation Round-Trip

**Task:** 2.2 - Buat property test untuk data model consistency

**Validates:** Requirements 1.4

### Property Description

For any valid period creation request, creating a period and then retrieving it should return a period object containing all specified attributes (period_name, company, start_date, end_date, period_type, status).

### Test Strategy

1. Generate random period creation requests with:
   - Random period type (Monthly, Quarterly, Yearly)
   - Random dates within 2024-2025
   - Random remarks (50% chance)
   - Status set to 'Open' (default)
2. Create period via ERPNext API
3. Retrieve period from database
4. Verify all attributes match:
   - period_name
   - company
   - start_date
   - end_date
   - period_type
   - status (should be 'Open')
   - remarks (if provided)
5. Cleanup: Delete test period
6. Repeat 100 times

### Prerequisites

1. **ERPNext Server Running**
   - Ensure your ERPNext instance is running
   - Default URL: http://localhost:8000

2. **API Credentials**
   - Set ERP_API_KEY and ERP_API_SECRET in .env.local file
   - Set ERP_DEFAULT_COMPANY (default: "Berkat Abadi Cirebon")

3. **Accounting Period DocType Installed**
   - The custom DocType must be installed in ERPNext
   - Run: `cd erpnext-dev && bench --site batasku.local migrate`
   - Verify: Check if "Accounting Period" appears in ERPNext DocType list

4. **Company Exists**
   - The company specified in ERP_DEFAULT_COMPANY must exist in ERPNext
   - Default: "Berkat Abadi Cirebon"

### Running the Test

```bash
npm run test:accounting-period-roundtrip
```

### Expected Output

```
============================================================
🧪 Property Test: Period Creation Round-Trip
   Feature: accounting-period-closing, Property 3
   Task 2.2: Data model consistency test
   Validates: Requirements 1.4
============================================================

✅ API credentials configured
   API URL: http://localhost:8000
   Company: Berkat Abadi Cirebon

🔍 Checking if Accounting Period DocType exists...
✅ Accounting Period DocType found
   Running 100 iterations...

✅ Iteration 10/100 - 10 passed, 0 failed
✅ Iteration 20/100 - 20 passed, 0 failed
...
✅ Iteration 100/100 - 100 passed, 0 failed

============================================================
📊 Test Results
============================================================
Total iterations: 100
Passed: 100 (100.0%)
Failed: 0 (0.0%)

✅ Property Test PASSED
   All period attributes persisted correctly
   Data model consistency verified
```

### Troubleshooting

#### Error: API credentials not configured
```
❌ Error: API credentials not configured
   Please set ERP_API_KEY and ERP_API_SECRET in .env file
```
**Solution:** Create .env.local file with your ERPNext API credentials.

#### Error: Accounting Period DocType not found
```
❌ Error: Accounting Period DocType not found
   Please ensure the DocType has been created in ERPNext
   Run: cd erpnext-dev && bench --site batasku.local migrate
```
**Solution:** Install the custom DocType by running bench migrate.

#### Error: Company not found
```
❌ Failed to create period: Could not find Company: XXX
```
**Solution:** 
- Check that the company exists in ERPNext
- Update ERP_DEFAULT_COMPANY in .env.local to match an existing company
- Or create the company in ERPNext

#### Error: BrokenPipeError
This error usually indicates a validation error in the Python controller. Check:
1. All required fields are being sent (period_name, company, start_date, end_date, status)
2. The dates are valid (start_date < end_date)
3. No overlapping periods exist
4. The company exists in ERPNext

### Debug Script

A debug script is available to test period creation manually:

```bash
npx ts-node --project tsconfig.scripts.json tests/debug-accounting-period.ts
```

This will:
1. Create a single test period
2. Show the full request and response
3. Retrieve the period
4. Clean up

### Test Implementation Notes

- The test uses the same pattern as existing property tests (tax-template-persistence.test.ts)
- Each iteration creates a unique period name to avoid conflicts
- Cleanup is performed in a finally block to ensure test periods are deleted
- The test validates that the default status is 'Open' (Requirement 1.5)
- Random data generation ensures wide coverage of input space

### Related Files

- Spec: `.kiro/specs/accounting-period-closing/`
- Design: `.kiro/specs/accounting-period-closing/design.md`
- Requirements: `.kiro/specs/accounting-period-closing/requirements.md`
- Tasks: `.kiro/specs/accounting-period-closing/tasks.md`
- DocType JSON: `batasku_custom/batasku_custom/doctype/accounting_period/accounting_period.json`
- Python Controller: `batasku_custom/batasku_custom/doctype/accounting_period/accounting_period.py`

---

**Created:** 2025-02-20  
**Task:** 2.2 - Buat property test untuk data model consistency  
**Status:** Implemented (requires DocType installation to run)
