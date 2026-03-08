# Back Button After Form Submission - Bug Exploration Results

## Test Execution Summary

**Test File:** `tests/back-button-after-form-submission-bug-exploration.pbt.test.ts`

**Test Command:** `npm run test:back-button-bug-exploration`

**Test Status:** ✗ FAILED (Expected - confirms bug exists)

**Date:** 2024-03-06

## Test Results

- **Total Tests:** 6
- **Passed:** 0
- **Failed:** 6
- **Counterexamples Found:** 14

## Bug Confirmation

The test successfully confirmed the bug exists across **10 out of 10** tested form components:

### Pattern A: PrintDialog Forms (6 forms)
All forms using PrintDialog with `router.push()` in onClose callback:

1. **Sales Order** - `app/sales-order/soMain/component.tsx`
2. **Delivery Note** - `app/delivery-note/dnMain/component.tsx`
3. **Sales Invoice** - `app/invoice/siMain/component.tsx`
4. **Purchase Order** - `app/purchase-orders/poMain/component.tsx`
5. **Purchase Receipt** - `app/purchase-receipts/prMain/component.tsx`
6. **Purchase Invoice** - `app/purchase-invoice/piMain/component.tsx`

**Pattern:** `onClose={() => { setShowPrintDialog(false); router.push('/list-page'); }}`

**Issue:** After successful form submission and closing the print dialog, the form page remains in browser history, allowing users to navigate back to it.

### Pattern B: Direct router.push() Forms (4 forms)
All forms using direct `router.push()` in success handlers:

7. **Supplier** - `app/suppliers/suppMain/component.tsx`
8. **Stock Entry** - `app/stock-entry/seMain/component.tsx`
9. **Stock Reconciliation** - `app/stock-reconciliation/srMain/component.tsx`
10. **Warehouse** - `app/warehouse/whMain/component.tsx`

**Pattern:** `setTimeout(() => router.push('/list-page'), 1500)` or direct `router.push('/list-page')`

**Issue:** After successful form submission, the form page remains in browser history, allowing users to navigate back to it.

## Root Cause Analysis

### Pattern A: PrintDialog onClose
- **Location:** PrintDialog component's onClose callback
- **Current Code:** `router.push('/list-page')`
- **Problem:** Adds form page to browser history
- **Fix Required:** Change to `router.replace('/list-page')`

### Pattern B: Direct Success Handler
- **Location:** Form submission success handler (after setSuccessMessage)
- **Current Code:** `router.push('/list-page')` or `setTimeout(() => router.push('/list-page'), delay)`
- **Problem:** Adds form page to browser history
- **Fix Required:** Change to `router.replace('/list-page')`

## Impact

### User Experience Issues
1. **Confusion:** Users can click back button and see the form they just submitted
2. **Stale Data:** Form displays old data from the submission
3. **Duplicate Risk:** Users might attempt to resubmit the same data
4. **Workflow Disruption:** Unexpected navigation behavior breaks user flow

### Affected Modules
- **Sales Module:** 3 forms (Sales Order, Delivery Note, Sales Invoice)
- **Purchase Module:** 3 forms (Purchase Order, Purchase Receipt, Purchase Invoice)
- **Inventory Module:** 2 forms (Stock Entry, Stock Reconciliation)
- **Master Data Module:** 2 forms (Supplier, Warehouse)

## Expected Behavior After Fix

1. After successful form submission, `router.replace()` should be used
2. Form page should be removed from browser history
3. Back button should navigate to the page **before** the form (typically list page or dashboard)
4. Users should **not** be able to return to submitted form pages via back button

## Preservation Requirements

The following navigation patterns must remain unchanged:
- ✓ Cancel buttons should continue to use `router.back()` or `router.push()`
- ✓ Validation failures should keep user on form page
- ✓ Navigation TO forms should continue to use `router.push()`
- ✓ Back button should work normally before submission
- ✓ Authentication redirects should continue to use `router.replace()`

## Next Steps

1. **Task 2:** Write preservation property tests (before implementing fix)
2. **Task 3:** Implement fixes for all affected forms
   - 3.1: Verify redirect patterns in unconfirmed files
   - 3.2: Update Pattern A files (PrintDialog forms)
   - 3.3: Update Pattern B files (direct router.push forms)
   - 3.4: Verify bug exploration test passes after fix
   - 3.5: Verify preservation tests still pass
3. **Task 4:** Create best practices documentation
4. **Task 5:** Final checkpoint - ensure all tests pass

## Test Validation

This test will be re-run after implementing fixes to confirm:
- All 6 test properties pass
- No counterexamples are found
- Forms correctly use `router.replace()` after submission
- Back button navigation works as expected

## Additional Forms to Verify

The bugfix spec mentions additional forms that need verification:
- Items
- Customers
- Sales Persons
- Payment Terms
- Users
- Journal Entry
- Payment
- Sales Return
- Credit Memo
- Kas Masuk
- Kas Keluar
- Commission Payment
- Employees

These should be checked in Task 3.1 to determine their redirect patterns.
