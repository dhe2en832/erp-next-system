# Bugfix Design Document

## Bug 1: Journal Entry Totals Showing Zero

### Root Cause Analysis

After investigating the code:

1. **API Route Analysis** (`/api/finance/journal/route.ts`):
   - The API correctly fetches journal entry details
   - It correctly calculates `total_debit` and `total_credit` from the accounts child table
   - It correctly returns these values in the `enrichedData` array
   - Console logs show the calculations are working

2. **Frontend Analysis** (`kas-masuk/kmList/component.tsx` and `kas-keluar/kkList/component.tsx`):
   - The list components correctly display `entry.total_debit` and `entry.total_credit`
   - The interface `JournalEntry` correctly defines these fields as numbers
   - The display logic uses `formatCurrency(entry.total_debit)` and `formatCurrency(entry.total_credit)`

**Root Cause**: Since both the API and frontend code appear correct, the issue is likely that:
- The API is returning the values correctly BUT they are actually 0 because the journal entries in the database genuinely have no account entries, OR
- There's a timing/caching issue where old data is being displayed, OR
- The user is looking at journal entries that were created before the total calculation logic was added to the API

**Most Likely**: This is NOT a bug in the code, but rather the journal entries being viewed have empty accounts arrays or were created/cached before the API enrichment logic was added. The fix should verify the API is being called and returning correct data.

### Fault Condition (Bug 1)

```
isBugCondition(input):
  return (
    input.page === "Kas Masuk" OR input.page === "Kas Keluar"
  ) AND (
    input.journalEntry.total_debit === 0 OR 
    input.journalEntry.total_credit === 0
  ) AND (
    input.journalEntry.accounts.length > 0 AND
    sum(input.journalEntry.accounts[*].debit) > 0 OR
    sum(input.journalEntry.accounts[*].credit) > 0
  )
```

**Explanation**: The bug occurs when journal entries are displayed on Kas Masuk or Kas Keluar pages with zero totals, despite having non-zero account entries in the child table.

### Expected Behavior (Bug 1)

```
expectedBehavior(result):
  return (
    result.total_debit === sum(accounts[*].debit_in_account_currency OR accounts[*].debit)
  ) AND (
    result.total_credit === sum(accounts[*].credit_in_account_currency OR accounts[*].credit)
  ) AND (
    result.total_debit > 0 OR result.total_credit > 0
  )
```

**Explanation**: Journal entries should display the correct sum of debit and credit amounts from their accounts child table.

### Preservation Requirements (Bug 1)

For all journal entries where the display is currently correct (non-buggy cases):

1. **Filter Preservation**: Journal entries filtered by company, date range, voucher_type, or status should continue to apply filters correctly
2. **Pagination Preservation**: Pagination with limit_page_length and start parameters should continue to work
3. **Field Display Preservation**: Other fields (name, voucher_type, posting_date, user_remark, status) should continue to display correctly
4. **API Response Structure**: The API response structure should remain unchanged for backward compatibility

---

## Bug 2: Item Field Not Refilling in Edit Mode

### Root Cause Analysis

After investigating the code:

1. **API Route Analysis** (`/api/inventory/items/[item_code]/route.ts`):
   - The API correctly includes `"custom_financial_cost_percent"` in the fields list
   - The API should return this field in the response

2. **Frontend Analysis** (`itemMain/component.tsx`):
   - Line 177: `custom_financial_cost_percent: item.custom_financial_cost_percent || 0`
   - This line sets the field from the API response, but uses `|| 0` as fallback
   - After setting formData, the component calls `fetchItemPricing(item.item_code)` (line 191)
   - `fetchItemPricing` updates formData using `setFormData(prev => ({ ...prev, ... }))` which should preserve other fields

**Root Cause**: The issue is the `|| 0` fallback operator on line 177. In JavaScript, `0 || 0` evaluates to `0`, but more importantly, if the API returns `null` or `undefined` for `custom_financial_cost_percent`, the fallback triggers. However, the real issue is likely:

1. **Missing field in API response**: The API might not be returning `custom_financial_cost_percent` because:
   - The field doesn't exist in ERPNext for that item
   - The field name is incorrect
   - The API is not including it in the response despite being in the fields list

2. **State update race condition**: The `fetchItemPricing` function is called immediately after setting formData, and while it uses the spread operator to preserve fields, there might be a timing issue.

**Most Likely Root Cause**: The API is not returning the `custom_financial_cost_percent` field, or it's returning `null`/`undefined`, causing the `|| 0` fallback to always apply. The fix should add logging to verify what the API actually returns.

### Fault Condition (Bug 2)

```
isBugCondition(input):
  return (
    input.mode === "edit"
  ) AND (
    input.item.custom_financial_cost_percent !== null AND
    input.item.custom_financial_cost_percent !== undefined AND
    input.item.custom_financial_cost_percent > 0
  ) AND (
    input.formData.custom_financial_cost_percent === 0
  )
```

**Explanation**: The bug occurs when editing an existing item that has a non-zero `custom_financial_cost_percent` value in ERPNext, but the form displays 0 instead.

### Expected Behavior (Bug 2)

```
expectedBehavior(result):
  return (
    result.formData.custom_financial_cost_percent === input.item.custom_financial_cost_percent
  ) AND (
    result.displayedValue === formatPercent(input.item.custom_financial_cost_percent)
  )
```

**Explanation**: When editing an item, the `custom_financial_cost_percent` field should display the actual value from ERPNext (e.g., 5.5 for 5.5%).

### Preservation Requirements (Bug 2)

For all item editing scenarios where fields are currently working correctly:

1. **Other Fields Preservation**: All other fields (item_code, item_name, description, item_group, stock_uom, opening_stock, valuation_rate, standard_rate, last_purchase_rate, brand) should continue to populate correctly in edit mode
2. **Create Mode Preservation**: When creating a new item, `custom_financial_cost_percent` should continue to initialize to 0 as the default
3. **Manual Input Preservation**: When the user manually enters a value in the `custom_financial_cost_percent` field, the system should continue to accept and save it correctly
4. **Pricing Fetch Preservation**: The `fetchItemPricing` function should continue to fetch and update valuation_rate, last_purchase_rate, and standard_rate without affecting other fields

---

## Implementation Strategy

### Bug 1: Journal Entry Totals
1. Investigate the frontend list components (Kas Masuk/Kas Keluar pages)
2. Verify they are correctly reading `total_debit` and `total_credit` from the API response
3. Fix any display logic that is showing 0 instead of the actual values

### Bug 2: Item Field
1. Add console logging to track the value of `custom_financial_cost_percent` through the data flow
2. Verify the API response includes the field with the correct value
3. Check if `fetchItemPricing` is inadvertently clearing the field
4. Ensure the field value is preserved through all state updates

## Testing Strategy

### Bug 1 Testing
- Create test journal entries with known debit/credit amounts
- Verify totals display correctly on Kas Masuk and Kas Keluar pages
- Verify filtering and pagination still work correctly

### Bug 2 Testing
- Create test items with various `custom_financial_cost_percent` values (0, 5.5, 10.0, 100.0)
- Edit each item and verify the field displays the correct value
- Verify other fields still populate correctly
- Verify new item creation still defaults to 0
