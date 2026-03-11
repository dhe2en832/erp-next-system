# Test Plan: Tax Calculation Engine

## Objective

Determine why ERPNext's tax calculation engine is not triggered when creating Sales Invoice via `frappe.client.insert` API.

## Test 1: Remove Pre-Calculated Taxes

### Hypothesis
Frontend is sending pre-calculated `taxes` array, which prevents ERPNext from applying the tax template automatically.

### Changes Made
- ✅ Removed `taxes` array from payload
- ✅ Kept only `taxes_and_charges` field
- ✅ Added logging to confirm

### Test Steps
1. Create Sales Invoice from Next.js
2. Check backend logs for "NOT sending pre-calculated taxes"
3. Query database to check if `taxes_and_charges` is saved
4. Check if `taxes` child table is populated
5. Check if `total_taxes_and_charges` is calculated

### Expected Results
- `taxes_and_charges`: "PPN 11% - BAC" (saved)
- `taxes` child table: Should have 1 row with PPN 11%
- `total_taxes_and_charges`: 220,000 (calculated)
- `grand_total`: 2,220,000 (calculated)

### SQL Queries
```sql
-- Check header
SELECT name, taxes_and_charges, total_taxes_and_charges, grand_total, net_total
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-XXXXX';

-- Check tax rows
SELECT * FROM `tabSales Taxes and Charges`
WHERE parent = 'ACC-SINV-2026-XXXXX';
```

### Status
⏳ Ready to test

---

## Test 2: Check if `frappe.client.insert` Supports Calculation Flag

### Hypothesis
`frappe.client.insert` might have a flag or parameter to trigger calculations.

### Research Needed
Check ERPNext source code:
- `frappe/client.py` - `insert()` method
- Look for parameters like `run_calculations`, `trigger_validations`, etc.

### Possible Flags
```python
# Potential API call
frappe.client.insert({
    "doc": doc_dict,
    "run_calculations": True,  # ???
    "ignore_permissions": False
})
```

### Status
⏳ Needs research

---

## Test 3: Use `frappe.get_doc().insert()` with Explicit Calculation

### Hypothesis
Using `frappe.get_doc()` and calling calculation methods explicitly might work.

### Implementation
Create custom Python API method:

```python
# File: erpnext-dev/apps/batasku_custom/batasku_custom/api/sales_invoice.py

import frappe
import json

@frappe.whitelist()
def create_sales_invoice_with_calculations(doc_json):
    """
    Create Sales Invoice and trigger all calculations
    """
    try:
        # Parse JSON
        doc_dict = json.loads(doc_json)
        
        # Create document object (not saved yet)
        doc = frappe.get_doc(doc_dict)
        
        # Set missing values (territory, etc.)
        doc.set_missing_values()
        
        # Calculate taxes and totals
        doc.calculate_taxes_and_totals()
        
        # Insert to database
        doc.insert(ignore_permissions=False)
        
        # Commit
        frappe.db.commit()
        
        return {
            "success": True,
            "data": doc.as_dict()
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Sales Invoice Creation Error")
        return {
            "success": False,
            "message": str(e)
        }
```

### API Route Changes
```typescript
// Use custom method instead of frappe.client.insert
const erpNextUrl = `${baseUrl}/api/method/batasku_custom.api.sales_invoice.create_sales_invoice_with_calculations`;

const response = await fetch(erpNextUrl, {
  method: 'POST',
  headers: {
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    doc_json: JSON.stringify(payload)
  })
});
```

### Status
⏳ Backup option if Test 1 fails

---

## Test 4: Check Payment Terms Calculation

### Hypothesis
Payment terms are also not being calculated, resulting in wrong `due_date`.

### Test Steps
1. Check if `payment_terms_template` is saved
2. Check if `payment_schedule` child table is populated
3. Check if `due_date` is calculated correctly

### SQL Queries
```sql
-- Check payment terms
SELECT name, payment_terms_template, due_date, posting_date
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-XXXXX';

-- Check payment schedule
SELECT * FROM `tabPayment Schedule`
WHERE parent = 'ACC-SINV-2026-XXXXX';
```

### Expected Results
- `payment_terms_template`: Should be saved
- `payment_schedule`: Should have entries based on template
- `due_date`: Should be calculated from posting_date + payment terms

### Status
⏳ Test after fixing tax calculation

---

## Test 5: Investigate "Not Saved" Status

### Hypothesis
Missing `custom_hpp_snapshot` and `custom_financial_cost_percent` causes "Not Saved" status.

### Test Steps
1. Create invoice via API
2. Immediately update items with:
   - `custom_hpp_snapshot` = `incoming_rate`
   - `custom_financial_cost_percent` = 0 or from Item master
3. Open in ERPNext UI
4. Check if status shows "Draft" instead of "Not Saved"

### Implementation
```typescript
// After successful insert
if (data.data && data.data.name) {
  // Fetch created invoice
  const getUrl = `${baseUrl}/api/resource/Sales Invoice/${data.data.name}`;
  const getResponse = await fetch(getUrl, {
    method: 'GET',
    headers: {
      'Authorization': `token ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json',
    },
  });
  
  const invoiceData = await getResponse.json();
  
  // Update each item
  for (const item of invoiceData.data.items) {
    const updateUrl = `${baseUrl}/api/resource/Sales Invoice Item/${item.name}`;
    await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        custom_hpp_snapshot: item.incoming_rate || 0,
        custom_financial_cost_percent: 0
      })
    });
  }
}
```

### Status
⏳ Test after fixing tax calculation

---

## Test 6: Compare API Endpoints

### Endpoints to Test

1. **`frappe.client.insert`** (current)
   - Simple insert
   - No calculations

2. **`frappe.desk.form.save.savedocs`**
   - Form save endpoint
   - Should trigger calculations
   - Requires special payload format

3. **Custom method** (Test 3)
   - Full control
   - Explicit calculation calls

### Comparison Criteria
- Tax calculation: ✅/❌
- Payment terms: ✅/❌
- "Not Saved" status: ✅/❌
- Commission calculation: ✅/❌
- Complexity: Low/Medium/High

### Status
⏳ Pending test results

---

## Success Criteria

Invoice created from Next.js should have:
- ✅ `taxes_and_charges`: "PPN 11% - BAC"
- ✅ `total_taxes_and_charges`: 220,000
- ✅ `grand_total`: 2,220,000
- ✅ `due_date`: Calculated from payment terms
- ✅ `custom_hpp_snapshot`: Populated
- ✅ `custom_financial_cost_percent`: Populated
- ✅ Status in ERPNext UI: "Draft" (not "Not Saved")
- ✅ Can create Credit Note from it
- ✅ Can submit the invoice

## Current Status

- ✅ Test 1 implementation complete
- ⏳ Waiting for user to test
- ⏳ Test 2-6 ready to implement based on results

## Next Actions

1. User tests invoice creation
2. User checks database with SQL queries
3. User reports results
4. Based on results, proceed to Test 2, 3, or 5
