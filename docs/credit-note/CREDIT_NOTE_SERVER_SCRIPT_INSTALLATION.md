# Credit Note Commission Adjustment - Installation Guide

This guide provides step-by-step instructions for installing the Credit Note commission adjustment server scripts in ERPNext.

## Overview

The Credit Note commission adjustment feature automatically updates commission values on Sales Invoices when Credit Notes (returns) are submitted or cancelled. This ensures accurate commission tracking when goods are returned.

## Prerequisites

- ERPNext instance running (version 13 or higher recommended)
- Access to ERPNext bench directory
- Administrator/System Manager permissions
- Custom fields already created:
  - `custom_komisi_sales` on Sales Invoice Item
  - `custom_total_komisi_sales` on Sales Invoice

## Installation Steps

### Step 1: Copy Python Modules

Copy the commission adjustment module to your ERPNext installation:

```bash
# Navigate to your ERPNext bench directory
cd /path/to/frappe-bench

# Create erpnext_custom directory if it doesn't exist
mkdir -p apps/erpnext/erpnext/erpnext_custom

# Copy the commission module
cp /path/to/erp-next-system/erpnext_custom/credit_note_commission.py \
   apps/erpnext/erpnext/erpnext_custom/

# Copy the updated hooks file
cp /path/to/erp-next-system/erpnext_custom/hooks.py \
   apps/erpnext/erpnext/erpnext_custom/

# Ensure __init__.py exists
touch apps/erpnext/erpnext/erpnext_custom/__init__.py
```

### Step 2: Configure ERPNext Hooks

You have two options for configuring hooks:

#### Option A: Use erpnext_custom hooks directly

Edit your site's `hooks.py` (usually in `apps/erpnext/erpnext/hooks.py`):

```python
# Add or update doc_events section
doc_events = {
    "Sales Invoice": {
        "on_submit": "erpnext_custom.hooks.on_sales_invoice_submit",
        "on_cancel": "erpnext_custom.hooks.on_sales_invoice_cancel"
    }
}
```

#### Option B: Call from existing hooks

If you already have Sales Invoice hooks, update them to call the commission functions:

```python
from erpnext_custom.credit_note_commission import on_credit_note_submit, on_credit_note_cancel

def your_existing_on_submit(doc, method):
    # Your existing logic
    ...
    
    # Add commission adjustment for Credit Notes
    if doc.is_return and doc.is_return == 1:
        on_credit_note_submit(doc, method)

def your_existing_on_cancel(doc, method):
    # Your existing logic
    ...
    
    # Add commission reversal for Credit Notes
    if doc.is_return and doc.is_return == 1:
        on_credit_note_cancel(doc, method)
```

### Step 3: Restart ERPNext

```bash
# Clear cache
bench --site [your-site-name] clear-cache

# Restart bench
bench restart
```

### Step 4: Verify Installation

Test the installation using ERPNext console:

```bash
bench --site [your-site-name] console
```

In the console:

```python
# Test import
from erpnext_custom.credit_note_commission import on_credit_note_submit, on_credit_note_cancel
print("✓ Commission adjustment module loaded successfully")

# Test calculation function
from erpnext_custom.credit_note_commission import calculate_commission_adjustment
print("✓ Helper functions available")

# Check hooks are registered
import frappe
hooks = frappe.get_hooks("doc_events")
print("✓ Hooks registered:", hooks.get("Sales Invoice", {}))
```

Expected output:
```
✓ Commission adjustment module loaded successfully
✓ Helper functions available
✓ Hooks registered: {'on_submit': [...], 'on_cancel': [...]}
```

## Testing

### Test 1: Create and Submit Credit Note

1. **Create a Sales Invoice with commission:**
   ```
   - Customer: Test Customer
   - Item: Test Item (qty=10, rate=10000)
   - custom_komisi_sales: 5000 per item
   - custom_total_komisi_sales: 50000
   - Mark as Paid
   ```

2. **Create Credit Note:**
   ```
   - Use "Create Return" button or API
   - Return 5 units
   - custom_komisi_sales: -2500 (proportional)
   - custom_total_komisi_sales: -2500
   ```

3. **Submit Credit Note:**
   ```
   - Click Submit
   - Check original Sales Invoice
   - custom_total_komisi_sales should now be: 47500 (50000 - 2500)
   ```

4. **Verify audit trail:**
   ```
   - Check comments on original Sales Invoice
   - Should see: "Commission adjusted by Credit Note [name]: 50000 - 2500 = 47500"
   - Check comments on Credit Note
   - Should see: "Commission adjustment applied to [original]: Reduced by 2500"
   ```

### Test 2: Cancel Credit Note

1. **Cancel the Credit Note from Test 1:**
   ```
   - Click Cancel on Credit Note
   - Check original Sales Invoice
   - custom_total_komisi_sales should be restored to: 50000
   ```

2. **Verify audit trail:**
   ```
   - Check comments on original Sales Invoice
   - Should see: "Commission reversal by Credit Note [name] cancellation: 47500 + 2500 = 50000"
   ```

### Test 3: Multiple Credit Notes

1. **Create Sales Invoice with commission = 100000**

2. **Create and submit Credit Note 1 (commission = -30000)**
   - Original invoice commission: 70000

3. **Create and submit Credit Note 2 (commission = -20000)**
   - Original invoice commission: 50000

4. **Cancel Credit Note 1**
   - Original invoice commission: 80000

5. **Cancel Credit Note 2**
   - Original invoice commission: 100000 (fully restored)

## Troubleshooting

### Issue: Hooks not triggering

**Symptoms:** Commission not adjusting when Credit Note is submitted

**Solutions:**
1. Check ERPNext error logs:
   ```bash
   bench --site [your-site-name] logs
   ```

2. Verify hooks are loaded:
   ```bash
   bench --site [your-site-name] console
   ```
   ```python
   import frappe
   print(frappe.get_hooks("doc_events"))
   ```

3. Clear cache and restart:
   ```bash
   bench --site [your-site-name] clear-cache
   bench restart
   ```

4. Check for Python import errors:
   ```bash
   bench --site [your-site-name] console
   ```
   ```python
   from erpnext_custom.credit_note_commission import on_credit_note_submit
   ```

### Issue: Commission calculation incorrect

**Symptoms:** Wrong commission values after adjustment

**Solutions:**
1. Check Credit Note has negative commission values:
   ```python
   credit_note = frappe.get_doc("Sales Invoice", "CN-2024-00001")
   print(credit_note.custom_total_komisi_sales)  # Should be negative
   ```

2. Verify original invoice reference:
   ```python
   print(credit_note.return_against)  # Should reference original invoice
   ```

3. Check calculation in logs:
   ```bash
   grep "Commission adjusted" sites/[your-site]/logs/erpnext.log
   ```

### Issue: Module not found error

**Symptoms:** `ModuleNotFoundError: No module named 'erpnext_custom'`

**Solutions:**
1. Verify file location:
   ```bash
   ls -la apps/erpnext/erpnext/erpnext_custom/
   ```

2. Check __init__.py exists:
   ```bash
   touch apps/erpnext/erpnext/erpnext_custom/__init__.py
   ```

3. Restart bench:
   ```bash
   bench restart
   ```

### Issue: Permission denied when updating invoice

**Symptoms:** Error about permissions when saving original invoice

**Solutions:**
1. The module uses `ignore_permissions=True` which should work
2. Check if the user running bench has proper permissions
3. Verify ERPNext user has System Manager role

## Monitoring

### Check Adjustment History

View all commission adjustments:

```sql
SELECT 
    name,
    comment_type,
    content,
    creation
FROM `tabComment`
WHERE 
    reference_doctype = 'Sales Invoice'
    AND content LIKE '%Commission adjusted%'
ORDER BY creation DESC
LIMIT 20;
```

### Check Error Logs

```bash
# View recent errors
bench --site [your-site-name] logs | grep "Commission"

# View error log file
tail -f sites/[your-site-name]/logs/erpnext.log | grep "Commission"
```

### Monitor Performance

```python
# In ERPNext console
import frappe

# Count Credit Notes
credit_notes = frappe.db.count("Sales Invoice", {"is_return": 1})
print(f"Total Credit Notes: {credit_notes}")

# Check recent adjustments
recent = frappe.db.sql("""
    SELECT name, posting_date, custom_total_komisi_sales
    FROM `tabSales Invoice`
    WHERE is_return = 1
    AND docstatus = 1
    ORDER BY posting_date DESC
    LIMIT 10
""", as_dict=True)

for cn in recent:
    print(f"{cn.name}: {cn.custom_total_komisi_sales}")
```

## Uninstallation

If you need to remove the commission adjustment feature:

1. **Remove hooks:**
   ```python
   # Edit hooks.py and remove or comment out:
   # "on_submit": "erpnext_custom.hooks.on_sales_invoice_submit",
   # "on_cancel": "erpnext_custom.hooks.on_sales_invoice_cancel"
   ```

2. **Clear cache and restart:**
   ```bash
   bench --site [your-site-name] clear-cache
   bench restart
   ```

3. **Optionally remove files:**
   ```bash
   rm apps/erpnext/erpnext/erpnext_custom/credit_note_commission.py
   ```

Note: Existing commission adjustments will remain in the database. The feature will simply stop adjusting new Credit Notes.

## Support

For issues or questions:

1. Check ERPNext error logs first
2. Review the troubleshooting section above
3. Test in ERPNext console to isolate the issue
4. Check the detailed documentation in `CREDIT_NOTE_COMMISSION.md`

## Security Notes

- The module uses `ignore_permissions=True` for system updates
- This is safe because it runs in the context of document submission
- User permissions are checked before Credit Note submission
- All changes are logged in comments for audit trail

## Performance Notes

- Minimal database impact: 2 queries per adjustment (get + save)
- No recursive calls or infinite loops
- Efficient calculation using simple arithmetic
- Non-blocking error handling prevents operation failures

## Version Compatibility

- Tested on ERPNext v13, v14, v15
- Compatible with Frappe Framework v13+
- Works with both MariaDB and PostgreSQL

## Next Steps

After installation:

1. Test with sample data in a development environment
2. Verify commission calculations are correct
3. Train users on Credit Note workflow
4. Monitor error logs for the first few days
5. Set up regular monitoring of commission adjustments

## Additional Resources

- Full documentation: `erpnext_custom/CREDIT_NOTE_COMMISSION.md`
- Unit tests: `erpnext_custom/tests/test_credit_note_commission.py`
- Integration tests: `tests/commission-credit-note-integration.test.ts`
- Requirements: `.kiro/specs/credit-note-management/requirements.md`
- Design: `.kiro/specs/credit-note-management/design.md`
