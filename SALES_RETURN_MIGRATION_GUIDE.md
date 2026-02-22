# Sales Return Migration Guide - Hybrid Approach

## Overview

Panduan ini menjelaskan cara migrasi dari custom `Sales Return` DocType ke **Hybrid Approach** menggunakan native ERPNext Delivery Note dengan custom frontend.

## Perubahan Arsitektur

### Before (Custom DocType)

```
Frontend (Next.js) → API Routes → ERPNext Custom DocType "Sales Return"
                                   ├── Sales Return (parent)
                                   └── Sales Return Item (child)
```

### After (Hybrid Approach)

```
Frontend (Next.js) → API Routes → ERPNext Native "Delivery Note" (is_return=1)
                                   ├── Delivery Note (parent) + custom fields
                                   └── Delivery Note Item (child) + custom fields
```

## Keuntungan Migrasi

✅ **Inventory Management**: Otomatis terintegrasi dengan ERPNext  
✅ **Accounting Integration**: GL entries dan credit notes otomatis  
✅ **Upgrade Compatibility**: Tidak perlu maintain custom DocType  
✅ **Existing Features**: Print, email, workflow sudah tersedia  
✅ **Better UX**: Frontend tetap sama, backend lebih robust  

## Migration Steps

### Step 1: Install Custom Fields di ERPNext

```bash
cd /path/to/frappe-bench
bench --site [site-name] console
```

```python
>>> from batasku_custom.install_delivery_note_return import install
>>> install()
```

Verify installation:
```python
>>> from batasku_custom.install_delivery_note_return import verify_installation
>>> verify_installation()
```

Expected output:
```
✓ Delivery Note.return_section - OK
✓ Delivery Note.return_processed_date - OK
✓ Delivery Note.return_processed_by - OK
✓ Delivery Note.return_notes - OK
✓ Delivery Note Item.return_reason - OK
✓ Delivery Note Item.return_item_notes - OK
```

### Step 2: Update Frontend API Endpoints

#### File: `app/sales-return/srList/component.tsx`

**Find and replace:**

```typescript
// OLD
const response = await fetch(`/api/sales/sales-return?${params.toString()}`);

// NEW
const response = await fetch(`/api/sales/delivery-note-return?${params.toString()}`);
```

```typescript
// OLD
const submitResponse = await fetch(`/api/sales/sales-return/${returnDoc.name}/submit`, {

// NEW
const submitResponse = await fetch(`/api/sales/delivery-note-return/${returnDoc.name}/submit`, {
```

#### File: `app/sales-return/srMain/component.tsx`

**Find and replace:**

```typescript
// OLD - Create
const response = await fetch('/api/sales/sales-return', {

// NEW - Create
const response = await fetch('/api/sales/delivery-note-return', {
```

```typescript
// OLD - Update
const response = await fetch(`/api/sales/sales-return/${editingReturn.name}`, {

// NEW - Update
const response = await fetch(`/api/sales/delivery-note-return/${editingReturn.name}`, {
```

```typescript
// OLD - Get detail
const response = await fetch(`/api/sales/sales-return/${returnName}`);

// NEW - Get detail
const response = await fetch(`/api/sales/delivery-note-return/${returnName}`);
```

#### File: `app/components/DeliveryNoteDialog.tsx`

No changes needed - tetap menggunakan `/api/delivery-note`

### Step 3: Update Request Body Format

#### File: `app/sales-return/srMain/component.tsx`

**In `handleSave` function:**

```typescript
// OLD
const payload = {
  company: formData.company,
  customer: formData.customer,
  posting_date: formData.posting_date,
  delivery_note: formData.delivery_note,
  naming_series: 'RET-.YYYY.-',
  items: formData.items.map(item => ({
    item_code: item.item_code,
    item_name: item.item_name,
    qty: item.qty,
    rate: item.rate,
    amount: item.amount,
    uom: item.uom,
    warehouse: item.warehouse,
    delivery_note_item: item.delivery_note_item,
    return_reason: item.return_reason,
    return_notes: item.return_notes
  })),
  custom_notes: formData.custom_notes
};

// NEW
const payload = {
  company: formData.company,
  customer: formData.customer,
  posting_date: formData.posting_date,
  return_against: formData.delivery_note,  // Changed from delivery_note
  items: formData.items.map(item => ({
    item_code: item.item_code,
    item_name: item.item_name,
    qty: item.qty,  // API will make it negative
    rate: item.rate,
    uom: item.uom,
    warehouse: item.warehouse,
    return_reason: item.return_reason,
    return_item_notes: item.return_notes  // Changed from return_notes
  })),
  return_notes: formData.custom_notes  // Changed from custom_notes
};
```

### Step 4: Update Type Definitions (Optional)

#### File: `types/sales-return.ts`

Add new interface for Delivery Note Return:

```typescript
/**
 * Delivery Note Return (Native ERPNext)
 */
export interface DeliveryNoteReturn {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  return_against: string;  // Original delivery note
  is_return: 1;
  docstatus: 0 | 1 | 2;
  status: 'Draft' | 'Submitted' | 'Cancelled';
  company: string;
  grand_total: number;
  items: DeliveryNoteReturnItem[];
  return_notes?: string;
  return_processed_date?: string;
  return_processed_by?: string;
  creation: string;
  modified: string;
}

/**
 * Delivery Note Return Item
 */
export interface DeliveryNoteReturnItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;  // Negative for returns
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  return_reason: ReturnReason;
  return_item_notes?: string;
}
```

### Step 5: Test Migration

#### 5.1 Test Create Return

```bash
# Start Next.js dev server
cd erp-next-system
pnpm dev
```

1. Navigate to: http://localhost:3000/sales-return
2. Click "Create Return"
3. Select a delivery note
4. Select items and enter quantities
5. Select return reasons
6. Save as Draft
7. Submit

**Verify:**
- Return document created with `is_return=1`
- Custom fields populated (return_reason, return_item_notes)
- Stock updated correctly

#### 5.2 Test List View

1. Navigate to: http://localhost:3000/sales-return
2. Verify returns are displayed
3. Test filters (date range, customer, status)
4. Test search by document number

#### 5.3 Test Edit Draft

1. Open a draft return
2. Modify quantities or reasons
3. Save changes
4. Verify updates saved

#### 5.4 Test Submit

1. Open a draft return
2. Click Submit
3. Verify status changes to "Submitted"
4. Verify stock updated
5. Check `return_processed_date` and `return_processed_by` fields

#### 5.5 Test Cancel

1. Open a submitted return
2. Click Cancel
3. Verify status changes to "Cancelled"
4. Verify stock reversed

### Step 6: Data Migration (If Needed)

If you have existing data in custom `Sales Return` DocType:

```bash
bench --site [site-name] console
```

```python
import frappe
from frappe.utils import nowdate

def migrate_sales_returns():
    """Migrate custom Sales Return to Delivery Note returns"""
    
    # Get all sales returns
    returns = frappe.get_all('Sales Return',
        fields=['*'],
        filters={'docstatus': ['<', 2]},
        order_by='creation asc'
    )
    
    migrated = []
    errors = []
    
    for sr in returns:
        try:
            # Create Delivery Note return
            dn = frappe.new_doc('Delivery Note')
            dn.is_return = 1
            dn.return_against = sr.delivery_note
            dn.customer = sr.customer
            dn.posting_date = sr.posting_date
            dn.company = sr.company
            dn.return_notes = sr.custom_notes
            
            # Get items
            sr_items = frappe.get_all('Sales Return Item',
                filters={'parent': sr.name},
                fields=['*'],
                order_by='idx asc'
            )
            
            # Add items
            for sr_item in sr_items:
                dn.append('items', {
                    'item_code': sr_item.item_code,
                    'item_name': sr_item.item_name,
                    'qty': -abs(sr_item.qty),  # Negative for return
                    'rate': sr_item.rate,
                    'uom': sr_item.uom,
                    'warehouse': sr_item.warehouse,
                    'return_reason': sr_item.return_reason,
                    'return_item_notes': sr_item.return_notes
                })
            
            # Save
            dn.insert(ignore_permissions=True)
            
            # Submit if original was submitted
            if sr.docstatus == 1:
                dn.submit()
            
            migrated.append({
                'old': sr.name,
                'new': dn.name,
                'status': 'Success'
            })
            
            print(f"✓ Migrated {sr.name} -> {dn.name}")
            
        except Exception as e:
            errors.append({
                'old': sr.name,
                'error': str(e)
            })
            print(f"✗ Failed to migrate {sr.name}: {str(e)}")
    
    frappe.db.commit()
    
    print(f"\n=== Migration Summary ===")
    print(f"Total: {len(returns)}")
    print(f"Migrated: {len(migrated)}")
    print(f"Errors: {len(errors)}")
    
    if errors:
        print("\n=== Errors ===")
        for err in errors:
            print(f"{err['old']}: {err['error']}")
    
    return migrated, errors

# Run migration
migrated, errors = migrate_sales_returns()
```

### Step 7: Cleanup Old Custom DocType (Optional)

**⚠️ WARNING: Only do this after verifying migration is successful!**

```bash
bench --site [site-name] console
```

```python
import frappe

# Delete custom DocType
frappe.delete_doc('DocType', 'Sales Return', force=True)
frappe.delete_doc('DocType', 'Sales Return Item', force=True)

frappe.db.commit()
print("Custom DocTypes deleted")
```

### Step 8: Update Navigation (If Needed)

If you have custom navigation menu items pointing to old routes, update them to use new API endpoints.

## Rollback Plan

If you need to rollback:

### 1. Revert Frontend Changes

```bash
cd erp-next-system
git checkout app/sales-return/
```

### 2. Keep Using Old API Routes

The old `/api/sales/sales-return` routes are still available if needed.

### 3. Uninstall Custom Fields

```bash
bench --site [site-name] console
```

```python
>>> from batasku_custom.install_delivery_note_return import uninstall
>>> uninstall()
```

## Verification Checklist

- [ ] Custom fields installed in ERPNext
- [ ] Validation hooks working
- [ ] Frontend API endpoints updated
- [ ] Create return works
- [ ] Edit draft return works
- [ ] Submit return works
- [ ] Cancel return works
- [ ] Stock updates correctly
- [ ] List view displays returns
- [ ] Filters work correctly
- [ ] Search works correctly
- [ ] Return reasons saved
- [ ] Return notes saved
- [ ] Existing data migrated (if applicable)

## Performance Considerations

### Database Indexes

Add indexes for better query performance:

```sql
-- Index for is_return filter
ALTER TABLE `tabDelivery Note` 
ADD INDEX idx_is_return (is_return);

-- Index for return_against
ALTER TABLE `tabDelivery Note` 
ADD INDEX idx_return_against (return_against);

-- Composite index for common queries
ALTER TABLE `tabDelivery Note` 
ADD INDEX idx_return_queries (is_return, docstatus, posting_date);
```

### Caching

Consider adding Redis caching for frequently accessed returns:

```python
# In API routes
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_return(name):
    cached = redis_client.get(f'return:{name}')
    if cached:
        return json.loads(cached)
    return None

def cache_return(name, data):
    redis_client.setex(
        f'return:{name}',
        3600,  # 1 hour TTL
        json.dumps(data)
    )
```

## Support

For issues or questions:
- Check ERPNext documentation: https://docs.erpnext.com
- Review Delivery Note source code
- Check batasku_custom app logs
- Contact development team

## Changelog

### v1.0 (2024-01-15)
- Initial hybrid implementation
- Native ERPNext backend
- Custom Next.js frontend
- Migration guide created

