# Property-Based Tests for Discount and Tax Implementation

This directory contains property-based tests for validating the discount and tax implementation in ERPNext.

## Overview

Property-based testing validates universal properties that should hold true across all inputs, rather than testing specific examples. This approach helps catch edge cases and ensures correctness across a wide range of scenarios.

## Available Tests

### 1. Tax Template Persistence Test (Task 1.7)

**File:** `tax-template-persistence.test.ts`

**Property:** Round-trip persistence property
- Create a tax template with random data
- Save to database
- Retrieve from database
- Verify all fields match original data

**Validates:** Requirements 1.5

**Run:**
```bash
npm run test:tax-template-persistence
```

**Expected Output:**
```
============================================================
🧪 Property Test: Tax Template Persistence
   Task 1.7: Round-trip property test
   Validates: Requirements 1.5
============================================================

✅ API credentials configured
   API URL: http://localhost:8000
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
   All tax templates persisted correctly
```

## Prerequisites

1. **ERPNext Server Running**
   - Ensure your ERPNext instance is running
   - Default URL: http://localhost:8000

2. **API Credentials**
   - Set ERP_API_KEY and ERP_API_SECRET in .env file

3. **Chart of Accounts**
   - Required accounts must exist:
     - 2210 - Hutang PPN - BAC
     - 2230 - Hutang PPh 23 - BAC
     - 2240 - Hutang PPh 4(2) Final - BAC
     - 1410 - Pajak Dibayar Dimuka - BAC

## Running Tests

### Run All Tests
```bash
npm run test:tax-template-persistence
```

### Run with Verbose Output
```bash
npm run test:tax-template-persistence 2>&1 | tee test-results.log
```

## Test Strategy

### Property 17: Tax Template Persistence

**Hypothesis:** Any tax template created and saved should be retrievable with all fields intact.

**Test Strategy:**
1. Generate random tax template data:
   - Random rate (10%, 11%, 12%, 15%, 20%, 2%, 1.5%)
   - Random account from valid accounts
   - Unique title for each iteration
2. Create template via API
3. Retrieve template via API
4. Compare all fields:
   - Title
   - Company
   - Rate (with 0.01 tolerance for floating point)
   - Account head
   - Description
5. Cleanup: Delete test template
6. Repeat 100 times

**Success Criteria:**
- All 100 iterations pass
- All fields match exactly (within tolerance)
- No data corruption or loss

## Troubleshooting

### Error: API credentials not configured
```
❌ Error: API credentials not configured
   Please set ERP_API_KEY and ERP_API_SECRET in .env file
```
**Solution:** Create .env file with your ERPNext API credentials.

### Error: Account not found
```
❌ Failed to create template: Account not found
```
**Solution:** Ensure all required accounts exist in Chart of Accounts.

### Test Failures
If tests fail:
1. Check ERPNext logs for errors
2. Verify database connectivity
3. Ensure no concurrent modifications
4. Check for data validation rules in ERPNext

## Future Tests

Additional property tests to be implemented:

- **Property 1:** GL Entry Balanced (Task 6.11)
- **Property 2:** Grand Total Calculation Accuracy (Task 6.12)
- **Property 11:** Invoice Cancellation Reversal (Task 6.13)
- **Property 15:** Real-time Calculation Consistency (Task 9.6)
- **Property 25:** Tax Template Active Filter (Task 5.2)

## Related Documentation

- Full specification: `.kiro/specs/discount-and-tax-implementation/`
- Design document: `.kiro/specs/discount-and-tax-implementation/design.md`
- Requirements: `.kiro/specs/discount-and-tax-implementation/requirements.md`

## Support

For issues or questions:
1. Check ERPNext logs
2. Review test output for specific error messages
3. Verify prerequisites are met
4. Check API connectivity

---

**Created:** 2024-01-15  
**Task:** 1.7 - Write property test untuk Tax Template persistence  
**Status:** Completed
