# Sales Invoice Not Saved Status Fix - Bugfix Design

## Overview

This bugfix addresses a cache synchronization issue where Sales Invoices created via the Next.js API display "Not Saved" status in the ERPNext UI, preventing Credit Note creation. The root cause is that `frappe.client.insert` saves the document to the database but does not update ERPNext's client-side form cache. The fix adds a subsequent call to `frappe.client.save` to synchronize the cache, mimicking the behavior of the ERPNext UI's "Save" button.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a Sales Invoice is created via Next.js API using `frappe.client.insert`
- **Property (P)**: The desired behavior - Sales Invoice displays "Draft" status in ERPNext UI and allows Credit Note creation
- **Preservation**: Existing Sales Invoice creation behavior via ERPNext UI and other API operations that must remain unchanged
- **frappe.client.insert**: ERPNext API method that creates a new document and saves it to the database
- **frappe.client.save**: ERPNext API method that saves a document and updates the client-side form cache
- **Form Cache**: ERPNext's client-side cache that stores document state for UI rendering and validation
- **docstatus**: ERPNext field indicating document workflow state (0=Draft, 1=Submitted, 2=Cancelled)

## Bug Details

### Fault Condition

The bug manifests when a Sales Invoice is created via the Next.js API route (`POST /api/sales/invoices`). The `frappe.client.insert` method successfully saves the document to the database with `docstatus=0` (Draft), but ERPNext's client-side form cache is not updated. When users open the invoice in ERPNext UI, the form checks the cache, finds no entry, and displays "Not Saved" status. This status blocks Credit Note creation because ERPNext validates that the source invoice must be in a "saved" state.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SalesInvoiceCreationRequest
  OUTPUT: boolean
  
  RETURN input.creationMethod == 'NextJS_API'
         AND input.apiMethod == 'frappe.client.insert'
         AND documentSavedToDatabase(input.invoiceName)
         AND NOT formCacheUpdated(input.invoiceName)
END FUNCTION
```

### Examples

- **Example 1**: User creates Sales Invoice "SI-2024-001" via Next.js UI → API calls `frappe.client.insert` → Database shows docstatus=0 (Draft) → User opens invoice in ERPNext UI → Status displays "Not Saved" → User attempts to create Credit Note → ERPNext blocks with error "Cannot create Credit Note for unsaved invoice"

- **Example 2**: User creates Sales Invoice "SI-2024-002" via Next.js UI → API calls `frappe.client.insert` → User manually opens invoice in ERPNext UI → User clicks "Save" button without changes → Status changes to "Draft" → User can now create Credit Note successfully

- **Example 3**: User creates Sales Invoice "SI-2024-003" directly in ERPNext UI → ERPNext calls both database save AND cache update → Status displays "Draft" immediately → Credit Note creation works without manual intervention

- **Edge Case**: User creates Sales Invoice via API → Cache update call fails due to network timeout → Document remains saved in database with "Not Saved" status in UI → User must manually click "Save" in ERPNext UI

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Sales Invoices created directly in ERPNext UI must continue to display "Draft" status correctly
- Sales Invoice submission via Next.js API must continue to update document status to "Submitted" correctly
- All Sales Invoice fields (custom_hpp_snapshot, custom_financial_cost_percent, custom_komisi_sales, debit_to, against_income_account, status, docstatus) must continue to persist correctly to the database
- Other CRUD operations (GET, PUT, DELETE) on Sales Invoices via Next.js API must continue to function without modification

**Scope:**
All Sales Invoice operations that do NOT involve creation via `frappe.client.insert` should be completely unaffected by this fix. This includes:
- Sales Invoices created directly in ERPNext UI
- Sales Invoice updates via API
- Sales Invoice deletion via API
- Sales Invoice submission via API
- Sales Invoice queries via API

## Hypothesized Root Cause

Based on the bug description and ERPNext architecture, the root cause is:

1. **Cache Synchronization Gap**: The `frappe.client.insert` method is designed for programmatic document creation and focuses on database persistence. It does not trigger the same cache update mechanisms that the ERPNext UI uses when a user clicks "Save".

2. **Form Cache Architecture**: ERPNext's client-side form system maintains a cache of document states to optimize UI rendering and enable client-side validation. When a document is created via UI, the form controller automatically updates this cache. API-created documents bypass this mechanism.

3. **Credit Note Validation Logic**: The Credit Note creation workflow validates that the source Sales Invoice is in a "saved" state by checking the form cache. If the cache entry is missing or stale, ERPNext interprets this as "Not Saved" even if the database record exists.

4. **Missing Cache Update Call**: The Next.js API implementation only calls `frappe.client.insert`, which is sufficient for database persistence but insufficient for full ERPNext integration. The fix requires an additional call to `frappe.client.save` to synchronize the cache.

## Correctness Properties

Property 1: Fault Condition - Sales Invoice Cache Synchronization

_For any_ Sales Invoice creation request via Next.js API where `frappe.client.insert` successfully creates the document, the fixed implementation SHALL call `frappe.client.save` to update ERPNext's form cache, ensuring the invoice displays "Draft" status in ERPNext UI and allows Credit Note creation.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-API Creation Behavior

_For any_ Sales Invoice creation that does NOT occur via Next.js API (e.g., direct creation in ERPNext UI), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for UI-based invoice creation and other API operations.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

The fix has been implemented in the Sales Invoice creation API route.

**File**: `erp-next-system/app/api/sales/invoices/route.ts`

**Function**: `POST` (Sales Invoice creation handler)

**Specific Changes**:

1. **Add Cache Update Call**: After successful `frappe.client.insert`, add a call to `frappe.client.save` with the created document's name and doctype.

2. **Non-Blocking Error Handling**: Wrap the cache update call in a try-catch block to ensure that cache update failures do not cause the entire API request to fail. The document is already saved to the database, so cache update is a "best effort" operation.

3. **Logging for Debugging**: Add console logs to track cache update success/failure, helping with troubleshooting in production.

4. **Minimal Payload**: The `frappe.client.save` call only needs the document name and doctype - it fetches the full document from the database and updates the cache.

5. **Preserve Response**: Return the original `frappe.client.insert` response to the client, ensuring backward compatibility with existing frontend code.

**Implementation Code**:
```typescript
// CRITICAL FIX: Force ERPNext to recognize document as "saved"
// After creating via API, ERPNext's form cache is not updated
// This causes "Not Saved" status which blocks Credit Note creation
// Solution: Call frappe.client.save to update cache
if (data.data && data.data.name) {
  try {
    console.log('Forcing document save to update ERPNext cache...');
    const saveUrl = `${baseUrl}/api/method/frappe.client.save`;
    const saveResponse = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doc: {
          doctype: 'Sales Invoice',
          name: data.data.name
        }
      })
    });

    if (saveResponse.ok) {
      console.log('✅ Document cache updated successfully');
    } else {
      console.warn('⚠️ Failed to update cache, but document is saved in database');
    }
  } catch (cacheError) {
    console.warn('⚠️ Cache update failed, but document is saved:', cacheError);
    // Don't fail the request - document is already saved
  }
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that Sales Invoices created via API display "Not Saved" status and block Credit Note creation.

**Test Plan**: Create Sales Invoices via Next.js API on UNFIXED code, then check the ERPNext UI status and attempt Credit Note creation. Document the failures to confirm the root cause.

**Test Cases**:
1. **API Creation Status Test**: Create Sales Invoice via Next.js API → Open in ERPNext UI → Verify status shows "Not Saved" (will fail on unfixed code - status should be "Draft")
2. **Credit Note Blocking Test**: Create Sales Invoice via Next.js API → Attempt to create Credit Note in ERPNext UI → Verify Credit Note creation is blocked (will fail on unfixed code - should succeed)
3. **Manual Save Workaround Test**: Create Sales Invoice via Next.js API → Open in ERPNext UI → Click "Save" without changes → Verify status changes to "Draft" → Verify Credit Note creation now works (will pass on unfixed code - confirms workaround)
4. **Database Persistence Test**: Create Sales Invoice via Next.js API → Query database directly → Verify docstatus=0 and all fields are saved correctly (will pass on unfixed code - confirms database is correct)

**Expected Counterexamples**:
- Sales Invoices created via API display "Not Saved" status in ERPNext UI despite docstatus=0 in database
- Credit Note creation fails with validation error for API-created invoices
- Possible causes: form cache not updated, cache entry missing, stale cache data

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (Sales Invoice creation via API), the fixed function produces the expected behavior (cache is updated, status is "Draft", Credit Note creation works).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := createSalesInvoice_fixed(input)
  ASSERT result.databaseSaved == true
  ASSERT result.cacheUpdated == true
  ASSERT getERPNextUIStatus(result.invoiceName) == "Draft"
  ASSERT canCreateCreditNote(result.invoiceName) == true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (Sales Invoice creation via ERPNext UI, other API operations), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT createSalesInvoice_original(input) = createSalesInvoice_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for UI-based creation and other operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **UI Creation Preservation**: Create Sales Invoice directly in ERPNext UI → Verify status is "Draft" → Verify Credit Note creation works → Compare with fixed code behavior (should be identical)
2. **API Update Preservation**: Create Sales Invoice via API (fixed) → Update via API → Verify update works correctly → Compare with unfixed code behavior (should be identical)
3. **API Submission Preservation**: Create Sales Invoice via API (fixed) → Submit via API → Verify docstatus changes to 1 → Compare with unfixed code behavior (should be identical)
4. **Field Persistence Preservation**: Create Sales Invoice via API (fixed) with custom fields → Query database → Verify all fields persisted correctly → Compare with unfixed code behavior (should be identical)

### Unit Tests

- Test that `frappe.client.save` is called after successful `frappe.client.insert`
- Test that cache update failure does not cause API request to fail
- Test that API response contains correct invoice data regardless of cache update result
- Test that cache update is only attempted when invoice creation succeeds
- Test that cache update uses correct document name and doctype

### Property-Based Tests

- Generate random Sales Invoice data and verify cache is updated for all API-created invoices
- Generate random invoice configurations and verify preservation of UI-based creation behavior
- Test that all non-creation API operations (GET, PUT, DELETE) continue to work across many scenarios
- Generate edge cases (network failures, timeout scenarios) and verify graceful degradation

### Integration Tests

- Test full flow: Create Sales Invoice via Next.js UI → Verify ERPNext UI shows "Draft" status → Create Credit Note → Verify Credit Note creation succeeds
- Test cache update failure scenario: Mock `frappe.client.save` to fail → Verify invoice is still created in database → Verify API returns success response
- Test concurrent invoice creation: Create multiple invoices simultaneously → Verify all caches are updated correctly
- Test cross-module integration: Create Sales Invoice via API → Link to Delivery Note → Verify all references are correct
