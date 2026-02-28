# Fix Sales Invoice "Not Saved" Status Issue

## Problem

Sales Invoice created from Next.js API shows "Not Saved" status in ERPNext UI, even though data is correctly saved to database with:
- `docstatus=0` (Draft)
- `status=Draft`
- `custom_total_komisi_sales=208000` (correct commission)

This prevents further operations like creating Credit Notes, as ERPNext considers the document unsaved.

## Root Cause

Using `frappe.client.insert` API endpoint saves data to database but doesn't trigger ERPNext's form controller state management that updates the UI status indicator.

## Solution

Changed from `frappe.client.insert` to `frappe.desk.form.save.savedocs` - the native ERPNext save endpoint that properly:
1. Saves data to database
2. Updates UI state
3. Triggers all form controllers
4. Sets correct document status

## Code Changes

### Before (frappe.client.insert)

```typescript
const erpNextUrl = `${baseUrl}/api/method/frappe.client.insert`;

const response = await fetch(erpNextUrl, {
  method: 'POST',
  headers: {
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    doc: payload
  })
});
```

### After (frappe.desk.form.save.savedocs)

```typescript
const erpNextUrl = `${baseUrl}/api/method/frappe.desk.form.save.savedocs`;

// Generate temporary name for new document (required by savedocs)
const tempName = `new-sales-invoice-${Date.now()}`;

const payload: any = {
  // ... all fields ...
  name: tempName,  // Required for new documents
  // Required for savedocs endpoint
  __islocal: 1,
  __unsaved: 1
};

const response = await fetch(erpNextUrl, {
  method: 'POST',
  headers: {
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    doc: JSON.stringify(payload),
    action: 'Save'
  })
});
```

## Key Differences

1. **Endpoint**: `frappe.desk.form.save.savedocs` instead of `frappe.client.insert`
2. **Document name**: Added temporary name in format `new-sales-invoice-{timestamp}` for new documents
3. **Payload flags**: Added `__islocal: 1` and `__unsaved: 1` to indicate new document
4. **Request body**: `doc` must be JSON string, not object
5. **Action parameter**: Added `action: 'Save'` to specify save operation

## Testing

After this fix:

1. ✅ Create Sales Invoice from Next.js
2. ✅ Open in ERPNext UI - should show "Draft" status (not "Not Saved")
3. ✅ Commission calculation works correctly
4. ✅ Can create Credit Note from the invoice
5. ✅ Can submit the invoice
6. ✅ All ERPNext operations work normally

## Files Modified

- `erp-next-system/app/api/sales/invoices/route.ts` - POST method

## Related Issues

- Server Script "Nilai Komisi SI" import error - Fixed in `FIX_SERVER_SCRIPT_NILAI_KOMISI_SI_V2.md`
- Accounting Period closing logic - Fixed in `accounting_period.py`

## Notes

- `frappe.desk.form.save.savedocs` is the same endpoint used by ERPNext UI when saving forms
- This ensures consistency between API-created and UI-created documents
- All validation, hooks, and server scripts are triggered properly
- Document workflow state is correctly maintained
