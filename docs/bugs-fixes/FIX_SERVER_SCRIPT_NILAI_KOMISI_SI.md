# Fix Server Script "Nilai Komisi SI"

## Problem

Sales Invoices created from Next.js frontend show "Not Saved" status in ERPNext UI, even though they appear to be created successfully. When created directly in ERPNext UI, the status is correctly "Draft".

## Root Cause

The Server Script "Nilai Komisi SI" (Before Save event) is causing the issue. It tries to access `doc.items[0].delivery_note` and `doc.items[0].sales_order` without proper null checks. When Sales Invoices are created from Next.js without Delivery Notes or Sales Orders, these fields are `None`, causing an error that prevents the document from being saved properly.

## Solution

Update the Server Script in ERPNext with proper error handling:

### Steps to Fix

1. Open ERPNext UI
2. Go to **Server Script** list
3. Find and open **"Nilai Komisi SI"**
4. Update the script with the following changes:

### Updated Script Code

```python
import frappe

def execute(doc, method):
    """
    Calculate commission for Sales Invoice
    Handles cases where Delivery Note or Sales Order might not exist
    """
    
    # Check if items exist
    if not doc.items or len(doc.items) == 0:
        frappe.log_error("No items in Sales Invoice", "Nilai Komisi SI")
        return
    
    total_commission = 0
    
    for item in doc.items:
        try:
            # Initialize commission to 0
            commission = 0
            
            # Try to get commission from Delivery Note first
            if hasattr(item, 'delivery_note') and item.delivery_note:
                try:
                    dn_item = frappe.db.get_value(
                        'Delivery Note Item',
                        {'parent': item.delivery_note, 'item_code': item.item_code},
                        'custom_komisi_sales'
                    )
                    if dn_item:
                        commission = dn_item
                except Exception as e:
                    frappe.log_error(f"Error fetching DN commission: {str(e)}", "Nilai Komisi SI")
            
            # If no DN commission, try Sales Order
            if commission == 0 and hasattr(item, 'sales_order') and item.sales_order:
                try:
                    so_item = frappe.db.get_value(
                        'Sales Order Item',
                        {'parent': item.sales_order, 'item_code': item.item_code},
                        'custom_komisi_sales'
                    )
                    if so_item:
                        commission = so_item
                except Exception as e:
                    frappe.log_error(f"Error fetching SO commission: {str(e)}", "Nilai Komisi SI")
            
            # Set commission for this item (default to 0 if not found)
            item.custom_komisi_sales = commission
            total_commission += commission
            
        except Exception as e:
            # Log error but don't fail the save
            frappe.log_error(f"Error processing item {item.item_code}: {str(e)}", "Nilai Komisi SI")
            item.custom_komisi_sales = 0
    
    # Set total commission
    doc.custom_total_komisi_sales = total_commission
```

### Key Changes

1. **Added `len(doc.items) > 0` check** - Ensures items exist before processing
2. **Added `hasattr()` checks** - Verifies fields exist before accessing them
3. **Wrapped `frappe.db.get_value()` in try-except** - Handles database errors gracefully
4. **Set default to 0 if no DN/SO** - Doesn't error out, just uses 0 commission
5. **Added error logging** - Logs errors for debugging without failing the save

### Alternative: Simpler Version

If you want a simpler version that just sets commission to 0 when DN/SO don't exist:

```python
import frappe

def execute(doc, method):
    """
    Calculate commission for Sales Invoice
    Simple version - sets to 0 if DN/SO not found
    """
    
    if not doc.items or len(doc.items) == 0:
        return
    
    total_commission = 0
    
    for item in doc.items:
        commission = 0
        
        # Try DN first
        if getattr(item, 'delivery_note', None):
            commission = frappe.db.get_value(
                'Delivery Note Item',
                {'parent': item.delivery_note, 'item_code': item.item_code},
                'custom_komisi_sales'
            ) or 0
        
        # Try SO if DN not found
        if commission == 0 and getattr(item, 'sales_order', None):
            commission = frappe.db.get_value(
                'Sales Order Item',
                {'parent': item.sales_order, 'item_code': item.item_code},
                'custom_komisi_sales'
            ) or 0
        
        item.custom_komisi_sales = commission
        total_commission += commission
    
    doc.custom_total_komisi_sales = total_commission
```

## Testing

After updating the Server Script:

1. **Test from Next.js**:
   - Create a new Sales Invoice from the Next.js frontend
   - Save it (status should be Draft)
   - Open it in ERPNext UI
   - Verify status is "Draft" (not "Not Saved")

2. **Test from ERPNext UI**:
   - Create a new Sales Invoice directly in ERPNext
   - Verify it still works as before
   - Check commission calculation is correct

3. **Test with Delivery Note**:
   - Create Sales Invoice from Delivery Note
   - Verify commission is copied correctly

4. **Test with Sales Order**:
   - Create Sales Invoice from Sales Order
   - Verify commission is copied correctly

## Additional Notes

- The "Not Saved" status indicates the document was created but the `on_save` or `before_save` hook failed
- This prevents the document from being properly committed to the database
- The fix ensures the script doesn't fail even when DN/SO fields are missing
- Commission will be 0 for invoices created without DN/SO, which is the expected behavior

## Related Files

- Frontend: `erp-next-system/app/api/sales/invoices/route.ts` (already fixed duplicate fetch issue)
- Backend: ERPNext Server Script "Nilai Komisi SI" (needs to be updated in ERPNext UI)
