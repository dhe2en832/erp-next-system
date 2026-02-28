# Fix "Not Saved" Status - Final Solution

## Problem

Sales Invoice created from Next.js shows "Not Saved" status in ERPNext UI, preventing operations like creating Credit Notes.

## Root Cause

ERPNext UI validates that `custom_hpp_snapshot` and `custom_financial_cost_percent` fields are populated before considering a document "saved".

### Field Comparison

| Field | Next.js | ERPNext UI | Status |
|-------|---------|------------|--------|
| `custom_hpp_snapshot` | 0 | 148,000 | ❌ Missing |
| `custom_financial_cost_percent` | 0 | 2.0 | ❌ Missing |
| `custom_komisi_sales` | 208,000 | 0 | ✅ Working |

## Why These Fields Are Missing

### Server Script Timing Issue

The "Before Submit" server script populates these fields, but it only runs when:
- User clicks "Submit" button (docstatus changes from 0 to 1)
- NOT when document is first saved as Draft

### ERPNext UI Behavior

When creating invoice through ERPNext UI:
1. User fills form
2. User clicks "Save"
3. Form controller populates `custom_hpp_snapshot` from `incoming_rate`
4. Form controller populates `custom_financial_cost_percent` from Item master
5. Document saved with these fields populated
6. Status shows "Draft" ✅

### Next.js API Behavior (Before Fix)

When creating invoice through Next.js API:
1. Frontend sends data
2. Backend calls `frappe.client.insert`
3. Data saved to database
4. Fields `custom_hpp_snapshot` and `custom_financial_cost_percent` remain 0
5. ERPNext UI detects missing fields
6. Status shows "Not Saved" ❌

## Solution

Pre-populate `custom_hpp_snapshot` and `custom_financial_cost_percent` BEFORE sending to ERPNext.

### Implementation

```typescript
// For each item, fetch HPP and Financial Cost before creating invoice
items: await Promise.all((invoiceData.items || []).map(async (item: any) => {
  let hppSnapshot = 0;
  let financialCostPercent = 0;
  
  // Priority 1: Get from Delivery Note Item
  if (item.dn_detail) {
    const dnItemData = await fetchDNItem(item.dn_detail);
    hppSnapshot = dnItemData.custom_hpp_snapshot || dnItemData.incoming_rate || 0;
    financialCostPercent = dnItemData.custom_financial_cost_percent || 0;
  }
  
  // Priority 2: Get Financial Cost from Item master (if not from DN)
  if (financialCostPercent === 0) {
    const itemData = await fetchItem(item.item_code);
    financialCostPercent = itemData.custom_financial_cost_percent || 0;
  }
  
  return {
    ...item,
    custom_hpp_snapshot: hppSnapshot,
    custom_financial_cost_percent: financialCostPercent,
  };
}))
```

### Data Flow

```
Delivery Note Item
├── custom_hpp_snapshot: 148,000
├── incoming_rate: 148,000
└── custom_financial_cost_percent: 2.0
    ↓
    Fetch via API
    ↓
Sales Invoice Item (Next.js)
├── custom_hpp_snapshot: 148,000 ✅
├── custom_financial_cost_percent: 2.0 ✅
└── custom_komisi_sales: 208,000 ✅
    ↓
    Save to ERPNext
    ↓
ERPNext UI Status: "Draft" ✅
```

## Benefits

1. **Prevents "Not Saved" Status**
   - All required fields populated
   - ERPNext UI shows "Draft" correctly

2. **Enables Credit Note Creation**
   - Document considered "saved"
   - Can proceed with Credit Note

3. **Consistent with ERPNext UI**
   - Same field values as UI-created invoices
   - Same behavior

4. **Server Script Still Works**
   - On Submit, server script will validate/update these values
   - No conflict with existing logic

## Testing

### Test Case 1: Create Invoice from Delivery Note

1. Select Delivery Note with item A003
2. Create Sales Invoice
3. Check database:
   ```sql
   SELECT 
     item_code,
     custom_hpp_snapshot,
     custom_financial_cost_percent,
     custom_komisi_sales
   FROM `tabSales Invoice Item`
   WHERE parent = 'ACC-SINV-2026-XXXXX';
   ```

**Expected Result:**
```
item_code: A003
custom_hpp_snapshot: 148000
custom_financial_cost_percent: 2.0
custom_komisi_sales: 208000
```

4. Open in ERPNext UI
5. Check status: Should show "Draft" (not "Not Saved")
6. Try creating Credit Note: Should work ✅

### Test Case 2: Create Invoice Without Delivery Note

1. Create Sales Invoice manually (without DN)
2. Check database
3. Expected:
   - `custom_hpp_snapshot`: 0 (no DN to get from)
   - `custom_financial_cost_percent`: From Item master
   - `custom_komisi_sales`: 0 (no DN commission)

### Test Case 3: Submit Invoice

1. Create invoice (Draft)
2. Submit invoice
3. Server script runs "Before Submit"
4. Check if values are validated/updated correctly

## Performance Consideration

### API Calls Per Invoice

For each item:
- 1 API call to fetch DN Item (if `dn_detail` exists)
- 1 API call to fetch Item master (if needed)

**Example:** Invoice with 3 items = 3-6 API calls

### Optimization Options

**Option A: Batch Fetch (Future)**
```typescript
// Fetch all DN items in one call
const dnItems = await fetchMultipleDNItems([dn_detail1, dn_detail2, ...]);
```

**Option B: Cache Item Master Data**
```typescript
// Cache Item master data in memory
const itemCache = new Map();
```

**Current:** Sequential fetch (simple, works)

## Fallback Logic

```
1. Try get HPP from DN Item
   ├── custom_hpp_snapshot (preferred)
   └── incoming_rate (fallback)

2. If DN Item not available or HPP = 0
   └── Leave as 0 (will be calculated on Submit)

3. Try get Financial Cost from DN Item
   └── custom_financial_cost_percent

4. If not from DN Item
   └── Get from Item master

5. If still not available
   └── Default to 0
```

## Error Handling

```typescript
try {
  const dnItemData = await fetchDNItem(item.dn_detail);
  hppSnapshot = dnItemData.custom_hpp_snapshot || 0;
} catch (error) {
  console.error(`Error fetching DN item:`, error);
  // Continue with hppSnapshot = 0
  // Don't fail the whole invoice creation
}
```

## Files Modified

- `erp-next-system/app/api/sales/invoices/route.ts` - POST method

## Related Issues

- Server Script "Nilai Komisi SI" - Fixed in `FIX_SERVER_SCRIPT_NILAI_KOMISI_SI_V2.md`
- Tax calculation - User selects tax template (optional)
- Payment terms - Calculated from SO payment terms template

## Success Criteria

- ✅ Invoice created from Next.js
- ✅ `custom_hpp_snapshot` populated
- ✅ `custom_financial_cost_percent` populated
- ✅ `custom_komisi_sales` calculated correctly
- ✅ Status in ERPNext UI: "Draft" (not "Not Saved")
- ✅ Can create Credit Note
- ✅ Can submit invoice
- ✅ Tax calculation works (if user selects tax)
- ✅ All ERPNext operations work normally

## Notes

- This fix addresses the "Not Saved" status issue
- Tax calculation is separate (user selects tax template)
- Commission calculation already works (Server Script)
- Server script on Submit will validate/update these values
