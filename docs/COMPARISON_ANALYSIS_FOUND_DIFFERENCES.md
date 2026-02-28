# Comparison Analysis: ERPNext UI vs Next.js Created Invoices

## Invoice Details

- **ACC-SINV-2026-00024**: Created from ERPNext UI (shows "Draft" ✅)
- **ACC-SINV-2026-00025**: Created from Next.js (shows "Not Saved" ❌)

## Critical Differences Found

### 1. Due Date ⚠️

| Field | ERPNext UI (00024) | Next.js (00025) | Impact |
|-------|-------------------|-----------------|--------|
| `due_date` | 2026-02-28 | 2026-03-29 | Different calculation |
| `posting_date` | 2026-02-28 | 2026-02-28 | Same |
| `payment_terms_template` | NET 30 | NET 30 | Same |

**Issue**: Next.js calculates due_date as posting_date + 30 days (2026-03-29), but ERPNext UI sets it to same as posting_date (2026-02-28). This suggests ERPNext UI might not be applying payment terms correctly, OR there's a different logic.

### 2. Item Pricing Differences ⚠️

| Field | ERPNext UI (00024) | Next.js (00025) | Impact |
|-------|-------------------|-----------------|--------|
| `rate` | 250,000 | 200,000 | Different price |
| `amount` | 2,500,000 | 2,000,000 | Different total |
| `grand_total` | 2,500,000 | 2,000,000 | Different invoice total |

**Note**: This is expected - different test data used for each invoice.

### 3. Item Commission Differences 🔴 CRITICAL

| Field | ERPNext UI (00024) | Next.js (00025) | Impact |
|-------|-------------------|-----------------|--------|
| `custom_komisi_sales` (item) | 0 | 208,000 | Next.js has commission |
| `custom_total_komisi_sales` (header) | 0 | 208,000 | Next.js has commission |

**Analysis**: 
- ERPNext UI invoice has NO commission (0) - this is WRONG
- Next.js invoice has commission (208,000) - this is CORRECT
- This suggests the Server Script "Nilai Komisi SI" is working correctly for Next.js but NOT for ERPNext UI

### 4. Item Custom Fields ✅ BOTH CORRECT

| Field | ERPNext UI (00024) | Next.js (00025) | Status |
|-------|-------------------|-----------------|--------|
| `custom_hpp_snapshot` | 148,000 | 148,000 | ✅ Same |
| `custom_financial_cost_percent` | 2.0 | 2.0 | ✅ Same |
| `incoming_rate` | 148,000 | 148,000 | ✅ Same |

**Result**: Both invoices have correct HPP and Financial Cost values at item level.

### 5. Header Custom Fields ✅ BOTH ZERO

| Field | ERPNext UI (00024) | Next.js (00025) | Status |
|-------|-------------------|-----------------|--------|
| `custom_hpp_snapshot` (header) | 0 | 0 | ✅ Same |
| `custom_persentase_komisi_si` (header) | 0 | 0 | ✅ Same |

**Result**: Both invoices have 0 at header level for these fields. This is NOT the cause of "Not Saved" status.

### 6. All Other Fields ✅ IDENTICAL

The following fields are IDENTICAL between both invoices:
- `docstatus`: 0 (Draft)
- `status`: "Draft"
- `debit_to`: "1131.0010 - Piutang Dagang - BAC"
- `against_income_account`: "4110.000 - Penjualan - BAC"
- `currency`: "IDR"
- `selling_price_list`: "Standard Jual"
- `payment_terms_template`: "NET 30"
- `company`: "Berkat Abadi Cirebon"
- `customer`: "D2362"
- All item fields (except rate/amount/commission)

## Conclusion

### ❌ HYPOTHESIS REJECTED: Header-level `custom_hpp_snapshot` is NOT the cause

Both invoices have 0 for header-level `custom_hpp_snapshot`, yet ERPNext UI invoice shows "Draft" correctly while Next.js invoice shows "Not Saved".

### 🔍 NEW FINDINGS

1. **Commission Calculation**: Next.js invoice has CORRECT commission (208,000), ERPNext UI invoice has WRONG commission (0). This suggests our Server Script is working for Next.js but not for ERPNext UI.

2. **All Critical Fields Are Identical**: 
   - `debit_to` ✅
   - `against_income_account` ✅
   - `custom_hpp_snapshot` (item) ✅
   - `custom_financial_cost_percent` (item) ✅
   - `status` ✅
   - `docstatus` ✅

3. **Due Date Calculation**: Different logic between ERPNext UI and Next.js, but this is unlikely to cause "Not Saved" status.

## Mystery Remains 🤔

**CRITICAL QUESTION**: If all fields are identical (except commission where Next.js is BETTER), why does Next.js invoice show "Not Saved" while ERPNext UI invoice shows "Draft"?

### Possible Explanations

#### Theory 1: Browser Cache / Session State
ERPNext UI might be setting some client-side state that's not reflected in database.

**Test**: 
1. Close ERPNext browser tab
2. Open new incognito window
3. Login to ERPNext
4. Open ACC-SINV-2026-00025 (Next.js invoice)
5. Check if it still shows "Not Saved"

#### Theory 2: Document Metadata Not in Database
ERPNext might store some metadata in Redis/cache that's not in MariaDB.

**Test**: Check ERPNext cache for document metadata.

#### Theory 3: Form Controller JavaScript Validation
ERPNext form controller might be checking something that's not in the database dump.

**Test**: Open browser console when viewing both invoices and check for JavaScript errors or warnings.

#### Theory 4: API Response Metadata
When ERPNext UI creates a document, the response might include metadata that gets cached in browser.

**Test**: Compare API responses when creating invoice via UI vs API.

#### Theory 5: Document Workflow State
There might be a workflow state field we're not checking.

**Test**: 
```sql
SELECT workflow_state FROM `tabSales Invoice` 
WHERE name IN ('ACC-SINV-2026-00024', 'ACC-SINV-2026-00025');
```

## Recommended Next Steps

### Step 1: Check Browser Behavior
1. Open ACC-SINV-2026-00025 in ERPNext UI
2. Open browser DevTools Console
3. Look for any JavaScript errors or warnings
4. Check Network tab for any failed API calls

### Step 2: Check Document via ERPNext API
```bash
# Get full document via ERPNext API
curl -X GET "http://localhost:8000/api/resource/Sales Invoice/ACC-SINV-2026-00025" \
  -H "Authorization: token {API_KEY}:{API_SECRET}" \
  | jq '.'
```

Compare with:
```bash
curl -X GET "http://localhost:8000/api/resource/Sales Invoice/ACC-SINV-2026-00024" \
  -H "Authorization: token {API_KEY}:{API_SECRET}" \
  | jq '.'
```

### Step 3: Check ERPNext Form Controller
Look at ERPNext source code:
- `frappe/public/js/frappe/form/form.js`
- Search for "Not Saved" or "unsaved" logic

### Step 4: Test Refresh Behavior
1. Refresh ERPNext page
2. Open ACC-SINV-2026-00025 again
3. Check if status changes

### Step 5: Check Workflow State
```sql
SELECT 
    name,
    workflow_state,
    status,
    docstatus
FROM `tabSales Invoice`
WHERE name IN ('ACC-SINV-2026-00024', 'ACC-SINV-2026-00025');
```

## Data Comparison Summary

### Header Level
```
Field                          | ERPNext UI (00024) | Next.js (00025) | Match
-------------------------------|-------------------|-----------------|-------
name                           | ACC-SINV-2026-00024 | ACC-SINV-2026-00025 | N/A
docstatus                      | 0                 | 0               | ✅
status                         | Draft             | Draft           | ✅
custom_hpp_snapshot (header)   | 0                 | 0               | ✅
custom_total_komisi_sales      | 0                 | 208,000         | ❌ (Next.js better)
due_date                       | 2026-02-28        | 2026-03-29      | ❌ (Different logic)
grand_total                    | 2,500,000         | 2,000,000       | ❌ (Different test data)
debit_to                       | 1131.0010...      | 1131.0010...    | ✅
against_income_account         | 4110.000...       | 4110.000...     | ✅
payment_terms_template         | NET 30            | NET 30          | ✅
```

### Item Level
```
Field                          | ERPNext UI (00024) | Next.js (00025) | Match
-------------------------------|-------------------|-----------------|-------
custom_hpp_snapshot            | 148,000           | 148,000         | ✅
custom_financial_cost_percent  | 2.0               | 2.0             | ✅
incoming_rate                  | 148,000           | 148,000         | ✅
custom_komisi_sales            | 0                 | 208,000         | ❌ (Next.js better)
rate                           | 250,000           | 200,000         | ❌ (Different test data)
amount                         | 2,500,000         | 2,000,000       | ❌ (Different test data)
```

## Conclusion

The database comparison shows that Next.js invoice is actually BETTER than ERPNext UI invoice (has correct commission), yet it shows "Not Saved" status. This strongly suggests the issue is NOT in the database but in:

1. **Browser/Client-side state**
2. **ERPNext form controller JavaScript logic**
3. **Document metadata not stored in database**
4. **Cache/session state**

We need to investigate the ERPNext UI behavior and JavaScript form controller to understand what triggers the "Not Saved" indicator.
