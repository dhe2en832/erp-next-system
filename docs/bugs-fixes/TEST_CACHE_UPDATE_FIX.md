# Test Plan: Cache Update Fix

## Quick Test Steps

### Test 1: Create New Invoice

1. Open Next.js: http://localhost:3000/invoice/siMain
2. Select Delivery Note
3. Fill form and click "Simpan"
4. Check browser console for:
   ```
   Forcing document save to update ERPNext cache...
   ✅ Document cache updated successfully
   ```
5. Note the invoice number (e.g., ACC-SINV-2026-00026)

**Expected:** Invoice created successfully with cache update log

### Test 2: Check Status in ERPNext

1. Open ERPNext UI
2. Go to Sales Invoice list
3. Open the invoice you just created
4. Look at status indicator

**Expected:** Status shows "Draft" (NOT "Not Saved")

### Test 3: Submit Invoice

1. In Next.js, open the invoice
2. Click "Submit"
3. Verify success

**Expected:** Invoice submitted (docstatus=1)

### Test 4: Create Credit Note

1. In Next.js, go to Credit Note form
2. Select the submitted invoice
3. Fill details and save

**Expected:** Credit Note created successfully ✅

## SQL Verification

After creating invoice, run:

```sql
-- Check invoice status
SELECT 
    name,
    status,
    docstatus,
    custom_total_komisi_sales,
    modified
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-XXXXX';
```

**Expected:**
- status: "Draft"
- docstatus: 0
- custom_total_komisi_sales: > 0
- modified: Recent timestamp

## Console Log Verification

Look for this sequence in Next.js API logs:

```
=== CREATE SALES INVOICE - ERPNEXT REST API ===
Using frappe.client.insert to create Sales Invoice
ERPNext Response Status: 200
ERPNext Success Response: {...}
Forcing document save to update ERPNext cache...
✅ Document cache updated successfully
```

## If Cache Update Fails

If you see:
```
⚠️ Failed to update cache, but document is saved in database
```

Then:
1. Check ERPNext logs for errors
2. Verify API credentials are correct
3. Check if `frappe.client.save` method exists in your ERPNext version
4. Try opening invoice in ERPNext UI and clicking "Save" manually

## Success Checklist

- [ ] Invoice created from Next.js
- [ ] Console shows "✅ Document cache updated successfully"
- [ ] ERPNext UI shows "Draft" status (not "Not Saved")
- [ ] Can submit invoice from Next.js
- [ ] Can create Credit Note from Next.js
- [ ] No errors in console
- [ ] Performance is acceptable

## If Test Fails

### Scenario 1: Cache update returns error

**Check:**
```bash
# In erpnext-dev directory
tail -f sites/*/logs/web.log | grep -i "save\|cache"
```

**Possible causes:**
- `frappe.client.save` method doesn't exist in your ERPNext version
- API permissions issue
- Document is locked

**Solution:**
- Try alternative method: `frappe.desk.form.save.savedocs`
- Check ERPNext version compatibility

### Scenario 2: Still shows "Not Saved"

**Check:**
1. Verify cache update API call succeeded (200 status)
2. Check if ERPNext requires additional parameters
3. Try refreshing ERPNext page (Ctrl+F5)

**Solution:**
- Add more parameters to save call
- Try different API endpoint

### Scenario 3: Credit Note still fails

**Check:**
1. Verify invoice is submitted (docstatus=1)
2. Check if there are other validation errors
3. Look at Credit Note API error message

**Solution:**
- Debug Credit Note creation separately
- Check if issue is with Credit Note API, not invoice status

## Rollback Instructions

If fix causes problems:

1. Open `erp-next-system/app/api/sales/invoices/route.ts`
2. Remove the cache update code block (lines with `frappe.client.save`)
3. Restart Next.js server
4. Document workaround for users

## Report Results

After testing, report:

1. ✅ or ❌ for each test
2. Console log output
3. Any error messages
4. ERPNext UI screenshots showing status
5. Credit Note creation result

## Next Steps After Success

1. Update user documentation
2. Remove workaround instructions
3. Test with multiple invoices
4. Monitor production for any issues
5. Consider applying same fix to other document types (Purchase Invoice, etc.)
