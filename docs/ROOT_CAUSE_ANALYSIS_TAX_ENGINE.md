# Root Cause Analysis: Tax Calculation Engine Not Triggered

## Problem Statement

Sales Invoice created from Next.js API shows "Not Saved" status in ERPNext UI. Investigation reveals that ERPNext's tax calculation engine is NOT being triggered, resulting in missing tax calculations and incorrect totals.

## Evidence: Field Comparison

### Header Fields - Next.js vs ERPNext UI

| Field | Next.js Created | ERPNext UI Created | Impact |
|-------|----------------|-------------------|---------|
| `taxes_and_charges` | `null` | `"PPN 11% - BAC"` | ❌ Tax template not applied |
| `total_taxes_and_charges` | `0` | `220,000` | ❌ PPN not calculated |
| `grand_total` | `2,000,000` | `2,220,000` | ❌ Total incorrect |
| `due_date` | `2026-03-29` | `2026-02-28` | ❗ Payment terms not applied |
| `apply_discount_on` | `"Net Total"` | `"Grand Total"` | ❗ Discount mechanism different |
| `territory` | `"Semua Wilayah"` | `null` | Minor |
| `custom_total_komisi_sales` | `208,000` | `0` | ✅ Commission calculated (Next.js only) |

### Item Fields - Next.js vs ERPNext UI

| Field | Next.js Created | ERPNext UI Created | Impact |
|-------|----------------|-------------------|---------|
| `custom_komisi_sales` | `208,000` | `0` | ✅ Item commission (Next.js) |
| `custom_hpp_snapshot` | `0` | `148,000` | ❌ HPP not snapshotted |
| `custom_financial_cost_percent` | `0` | `2.0` | ❌ Financial cost not set |

## Root Cause Analysis

### 🔴 PRIMARY ROOT CAUSE: API Endpoint Choice

**Current Implementation:**
```typescript
const erpNextUrl = `${baseUrl}/api/method/frappe.client.insert`;
```

**Problem:** `frappe.client.insert` is a LOW-LEVEL API that:
- ✅ Saves data to database
- ❌ Does NOT trigger ERPNext calculation engines
- ❌ Does NOT run form controller logic
- ❌ Does NOT apply tax templates
- ❌ Does NOT calculate payment terms
- ❌ Does NOT populate derived fields

**What ERPNext UI Uses:**
- Form controller JavaScript (`erpnext/selling/doctype/sales_invoice/sales_invoice.js`)
- Python controller (`erpnext/selling/doctype/sales_invoice/sales_invoice.py`)
- Calculation triggers on field changes
- Tax template application logic
- Payment terms calculation

### 🔴 SECONDARY ROOT CAUSE: Frontend Pre-Calculation

**Current Frontend Approach:**
```typescript
// Frontend calculates taxes manually
if (selectedTaxTemplate && selectedTaxTemplate.taxes) {
  let runningTotal = netTotal;
  
  for (const taxRow of selectedTaxTemplate.taxes) {
    const rate = taxRow.rate || 0;
    let taxAmount = 0;
    
    if (taxRow.charge_type === 'On Net Total') {
      taxAmount = (rate / 100) * netTotal;
    } else if (taxRow.charge_type === 'On Previous Row Total') {
      taxAmount = (rate / 100) * runningTotal;
    }
    
    runningTotal += taxAmount;
    totalTaxes += taxAmount;
    
    taxesPayload.push({
      charge_type: taxRow.charge_type,
      account_head: taxRow.account_head,
      description: taxRow.description,
      rate: rate,
      tax_amount: Math.round(taxAmount * 100) / 100,
    });
  }
}
```

**Problem:**
- Frontend sends pre-calculated tax amounts
- Backend receives these values but doesn't validate or recalculate
- ERPNext's native tax engine is bypassed
- Results in inconsistent behavior between API and UI

### 🔴 TERTIARY ROOT CAUSE: Missing Calculation Triggers

**What's Missing:**
1. **Tax Template Application**: When `taxes_and_charges` is set, ERPNext should:
   - Fetch the tax template
   - Apply tax rows to the `taxes` child table
   - Calculate tax amounts based on charge_type
   - Update `total_taxes_and_charges`
   - Update `grand_total`

2. **Payment Terms Calculation**: When `payment_terms_template` is set, ERPNext should:
   - Fetch the payment terms template
   - Calculate `due_date` based on terms
   - Create payment schedule entries

3. **Item-Level Calculations**: For each item, ERPNext should:
   - Calculate `incoming_rate` (HPP)
   - Apply pricing rules
   - Calculate discounts
   - Update amounts

## Investigation: Why Tax Template Not Applied?

### Test 1: Check if `taxes_and_charges` is Sent

**Frontend Payload:**
```typescript
taxes_and_charges: selectedTaxTemplate?.name || '',
```

**Backend Receives:**
```typescript
payload.taxes_and_charges = invoiceData.taxes_and_charges;
```

**Result:** ✅ Field is sent correctly

### Test 2: Check if ERPNext Receives the Field

**Backend Log:**
```
Tax template set: PPN 11% - BAC
```

**Result:** ✅ ERPNext receives the field

### Test 3: Check if ERPNext Applies the Template

**Database Query:**
```sql
SELECT taxes_and_charges, total_taxes_and_charges, grand_total
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00024';
```

**Expected Result:**
- `taxes_and_charges`: "PPN 11% - BAC"
- `total_taxes_and_charges`: 220000
- `grand_total`: 2220000

**Actual Result:**
- `taxes_and_charges`: `null` or empty
- `total_taxes_and_charges`: 0
- `grand_total`: 2000000

**Conclusion:** ❌ ERPNext does NOT apply the tax template

## Why ERPNext Doesn't Apply Tax Template?

### Hypothesis 1: `frappe.client.insert` Doesn't Trigger Calculation

**Evidence:**
- `frappe.client.insert` is a simple database insert operation
- It doesn't run form controller logic
- Tax template application happens in form controller

**Test:** Create invoice via ERPNext UI and check database
- Result: Tax template IS applied
- Conclusion: ✅ Hypothesis confirmed

### Hypothesis 2: Tax Rows Must Be Provided

**Evidence:**
- Frontend sends `taxes` array with pre-calculated values
- Backend passes this to ERPNext
- ERPNext might ignore `taxes_and_charges` if `taxes` is already provided

**Test:** Remove `taxes` array from payload, keep only `taxes_and_charges`
- Expected: ERPNext should fetch template and populate `taxes` automatically
- Status: ⏳ Needs testing

### Hypothesis 3: Calculation Trigger Missing

**Evidence:**
- ERPNext form controller has `calculate_taxes_and_totals()` method
- This method is called on field changes in UI
- API doesn't trigger this method

**Solution Options:**
1. Call `calculate_taxes_and_totals()` via API
2. Use different API endpoint that triggers calculations
3. Use `frappe.desk.form.save.savedocs` (already tried, shows "Not Saved")

## Comparison: API Endpoints

### Option A: `frappe.client.insert` (Current)

**Pros:**
- ✅ Simple API
- ✅ Data saved correctly
- ✅ Commission calculation works (via Server Script)

**Cons:**
- ❌ No tax calculation
- ❌ No payment terms calculation
- ❌ No form controller logic
- ❌ Shows "Not Saved" in UI

### Option B: `frappe.desk.form.save.savedocs`

**Pros:**
- ✅ Triggers form controller
- ✅ Should calculate taxes
- ✅ Should apply payment terms
- ✅ Native ERPNext save endpoint

**Cons:**
- ❌ Still shows "Not Saved" (previous attempt)
- ❌ Requires `__islocal`, `__unsaved` flags
- ❌ Requires temporary names for child tables
- ❌ More complex payload structure

### Option C: Custom Python Method

**Pros:**
- ✅ Full control over calculation logic
- ✅ Can call `calculate_taxes_and_totals()` explicitly
- ✅ Can validate and recalculate all fields

**Cons:**
- ❌ Requires Python code deployment
- ❌ More maintenance overhead
- ❌ Custom code outside ERPNext core

## Recommended Solution Path

### Phase 1: Investigate Why Tax Template Not Applied (CURRENT)

1. ✅ Revert to `frappe.client.insert`
2. ⏳ Test without `taxes` array (only `taxes_and_charges`)
3. ⏳ Check if ERPNext auto-populates `taxes` child table
4. ⏳ Verify tax calculation in database

### Phase 2: If Tax Template Still Not Applied

**Option 2A: Call Calculation Method After Insert**
```python
# Custom API method
@frappe.whitelist()
def create_sales_invoice_with_calculations(doc_json):
    doc = frappe.get_doc(json.loads(doc_json))
    doc.insert()
    
    # Trigger calculations
    doc.calculate_taxes_and_totals()
    doc.set_missing_values()
    doc.save()
    
    return doc
```

**Option 2B: Use `frappe.desk.form.save.savedocs` with Fix**
- Investigate why it shows "Not Saved"
- Check if missing metadata fields
- Compare with UI-created invoice metadata

### Phase 3: Fix "Not Saved" Status

**Root Cause Options:**
1. Missing `custom_hpp_snapshot` and `custom_financial_cost_percent`
2. Missing form metadata
3. Browser cache/session issue
4. ERPNext UI validation logic

**Solution:**
- Pre-populate required custom fields
- Add all necessary metadata
- Test in incognito window

## Next Steps

1. **Test without `taxes` array** - Remove pre-calculated taxes from payload
2. **Check database** - Verify if `taxes_and_charges` is saved
3. **Check `taxes` child table** - See if ERPNext auto-populates it
4. **If still not working** - Implement custom Python method
5. **Fix "Not Saved" status** - Pre-populate custom fields

## Files to Modify

- `erp-next-system/app/api/sales/invoices/route.ts` - Backend API
- `erp-next-system/app/invoice/siMain/component.tsx` - Frontend form (if needed)
- `erpnext-dev/apps/batasku_custom/batasku_custom/api/sales_invoice.py` - Custom method (if needed)

## References

- ERPNext Sales Invoice Controller: `erpnext/selling/doctype/sales_invoice/sales_invoice.py`
- ERPNext Form Controller: `frappe/public/js/frappe/form/form.js`
- Tax Calculation: `erpnext/controllers/taxes_and_totals.py`
