# Company Total Stock Field Fix

## Issue Summary

The `company_total_stock` field in Delivery Note Item is not being populated when creating delivery note returns from the Next.js frontend. The field exists in the database but shows 0 for all items.

## Root Cause Analysis

1. **Field Exists**: The `company_total_stock` custom field exists in the database (confirmed from screenshot)
2. **Validation Hook Registered**: The `validate_delivery_note_return` hook is properly registered in `hooks.py`
3. **Hook Logic Updated**: The Python validation function has been updated to populate the field from Bin table
4. **Cache Cleared**: ERPNext cache has been cleared and bench restarted

## Changes Made

### 1. Python Validation Hook (`delivery_note_return.py`)

Updated the `validate_delivery_note_return` function to:
- Use `frappe.db.sql()` for more reliable Bin queries
- Add detailed logging for debugging
- Populate `company_total_stock` for each item before validation

```python
# Populate company_total_stock from Bin
if item.item_code and item.warehouse:
    try:
        bin_data = frappe.db.sql("""
            SELECT actual_qty, projected_qty
            FROM `tabBin`
            WHERE item_code = %s AND warehouse = %s
            LIMIT 1
        """, (item.item_code, item.warehouse), as_dict=True)
        
        if bin_data and len(bin_data) > 0:
            item.company_total_stock = bin_data[0].actual_qty or 0
            frappe.logger().info(f"✓ Set company_total_stock for {item.item_code}: {item.company_total_stock}")
        else:
            item.company_total_stock = 0
            frappe.logger().warning(f"⚠ No Bin record found for {item.item_code} at {item.warehouse}, setting to 0")
    except Exception as e:
        frappe.logger().error(f"✗ Failed to get stock for {item.item_code}: {str(e)}")
        item.company_total_stock = 0
```

### 2. Custom Field Definition (`delivery_note_return_fields.py`)

Added `company_total_stock` field definition:

```python
{
    'fieldname': 'company_total_stock',
    'label': 'Company Total Stock',
    'fieldtype': 'Float',
    'insert_after': 'warehouse',
    'read_only': 1,
    'in_list_view': 0,
    'precision': 2,
    'description': 'Total stock available in the warehouse at the time of return'
}
```

### 3. Frontend API (`route.ts`)

The API already fetches stock from Bin before saving, but this is stored in `actual_qty`, not `company_total_stock`.

## Testing Steps

### Step 1: Check Frappe Logs

After creating a delivery note return from Next.js, check the logs:

```bash
cd erpnext-dev
tail -f logs/frappe.log | grep -i "company_total_stock\|VALIDATE DELIVERY NOTE RETURN"
```

Look for log messages like:
- `=== VALIDATE DELIVERY NOTE RETURN: DN-RET-XXXXX ===`
- `✓ Set company_total_stock for ITEM-001: 100.0`
- `⚠ No Bin record found for ITEM-001 at Warehouse-A, setting to 0`

### Step 2: Test from ERPNext UI

1. Open ERPNext UI: http://localhost:8000
2. Go to Delivery Note list
3. Open an existing Delivery Note (not a return)
4. Click "Create" → "Return / Credit Note"
5. Select items and save
6. Check if `company_total_stock` is populated in the items table

If it works from ERPNext UI but not from Next.js, the issue is in the API flow.

### Step 3: Test from Next.js

1. Open Next.js app: http://localhost:3000/sales-return
2. Click "Buat Retur Penjualan Baru"
3. Select a delivery note
4. Select items and enter return quantities
5. Click "Simpan"
6. Check the database to see if `company_total_stock` is populated

### Step 4: Check Database Directly

```bash
mysql -u root -p885671 -D _d965388d3d0882b3 -e "
SELECT 
    dni.name,
    dni.item_code,
    dni.warehouse,
    dni.company_total_stock,
    b.actual_qty as bin_stock
FROM \`tabDelivery Note Item\` dni
LEFT JOIN \`tabBin\` b ON b.item_code = dni.item_code AND b.warehouse = dni.warehouse
WHERE dni.parent IN (
    SELECT name FROM \`tabDelivery Note\` WHERE is_return = 1 ORDER BY creation DESC LIMIT 1
);
"
```

This will show:
- The `company_total_stock` value in the Delivery Note Item
- The actual stock from Bin table for comparison

## Possible Issues

### Issue 1: Hook Not Triggered

**Symptom**: No log messages in frappe.log when creating return

**Solution**: Verify hooks are registered correctly

```bash
cd erpnext-dev
bench --site batasku.local console
```

Then in console:
```python
import frappe
hooks = frappe.get_hooks("doc_events")
print(hooks.get("Delivery Note", {}).get("validate"))
# Should show: ['batasku_custom.accounting_period_restrictions.validate_transaction_against_closed_period', 'batasku_custom.overrides.delivery_note_return.validate_delivery_note_return']
```

### Issue 2: Field Not Saved

**Symptom**: Logs show field is set, but database shows 0

**Solution**: The field might be read-only and not saving. Check if we need to use `db_set()` instead:

```python
# Instead of:
item.company_total_stock = bin_data[0].actual_qty or 0

# Try:
item.db_set('company_total_stock', bin_data[0].actual_qty or 0, update_modified=False)
```

### Issue 3: Timing Issue

**Symptom**: Field is 0 on save but populated after refresh

**Solution**: The field might be calculated after save. The API already refreshes the document using `getdoc`, which should get the calculated value.

## Alternative Approach: Populate in API

If the Python hook doesn't work reliably, we can populate the field directly in the Next.js API after save:

```typescript
// After saving the document
if (savedDocName) {
  // Update company_total_stock for each item
  for (const item of returnTemplate.items) {
    if (item.name && item.item_code && item.warehouse) {
      try {
        await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item/${item.name}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            company_total_stock: item.actual_qty || 0
          })
        });
      } catch (error) {
        console.warn(`Failed to update company_total_stock for ${item.name}`);
      }
    }
  }
}
```

## Next Steps

1. **Test from ERPNext UI first** to verify the hook works
2. **Check frappe.log** for validation messages
3. **Test from Next.js** and compare behavior
4. **If hook doesn't work**, implement the alternative API approach
5. **Verify the field is populated** in both Draft and Submitted states

## Files Modified

- `erpnext-dev/apps/batasku_custom/batasku_custom/overrides/delivery_note_return.py`
- `erpnext-dev/apps/batasku_custom/batasku_custom/custom_fields/delivery_note_return_fields.py`

## Commands Run

```bash
cd erpnext-dev
bench clear-cache
bench restart
```

## Status

- ✅ Custom field exists in database
- ✅ Validation hook registered in hooks.py
- ✅ Hook logic updated with detailed logging
- ✅ Cache cleared and bench restarted
- ⏳ **PENDING**: Test to verify field is populated
- ⏳ **PENDING**: Check frappe.log for validation messages

## User Action Required

Please test creating a delivery note return and check:
1. Is `company_total_stock` now populated?
2. Are there any log messages in `erpnext-dev/logs/frappe.log`?
3. Does it work from ERPNext UI but not from Next.js?

Based on the test results, we can determine if we need to implement the alternative API approach or if there's another issue.
