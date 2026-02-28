# Fix Server Script "Nilai Komisi SI" - Version 2

## Problem

Server Script error: `ImportError: __import__ not found` karena menggunakan `import frappe` yang tidak diizinkan di ERPNext Server Script.

## Solution

ERPNext Server Script sudah otomatis menyediakan `frappe` object, jadi tidak perlu import.

## Updated Server Script Code

Buka Server Script "Nilai Komisi SI" di ERPNext dan ganti dengan code berikut:

```python
def execute(doc, method):
    """
    Calculate commission for Sales Invoice
    Handles cases where Delivery Note or Sales Order might not exist
    
    Note: frappe is already available in Server Script context, no import needed
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

## Alternative: Simpler Version

Jika Anda ingin versi yang lebih sederhana:

```python
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

## Steps to Fix

1. Open ERPNext UI
2. Search "Server Script"
3. Open "Nilai Komisi SI"
4. **Delete semua code yang ada**
5. **Paste salah satu versi di atas** (pilih yang simple atau comprehensive)
6. **PENTING: Jangan tambahkan `import frappe` di baris pertama!**
7. Save

## Testing

After updating:

1. Test buat Sales Invoice dari ERPNext UI
2. Test buat Sales Invoice dari Next.js
3. Verify commission calculation works correctly
4. Verify no more `ImportError`

## Key Differences from Previous Version

- **Removed**: `import frappe` (line 1)
- **Reason**: ERPNext Server Script automatically provides `frappe` in the execution context
- **Security**: Server Scripts run in restricted environment that doesn't allow imports

## Notes

- `frappe` object is automatically available in Server Script context
- No need to import any modules
- Use `frappe.db`, `frappe.log_error`, etc. directly
- Server Scripts are sandboxed for security
