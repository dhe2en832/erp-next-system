# Debug "Not Saved" Status - Action Plan

## Summary of Findings

Database comparison shows **NO significant differences** between ERPNext UI and Next.js created invoices. In fact, Next.js invoice has BETTER data (correct commission calculation).

Yet Next.js invoice shows "Not Saved" while ERPNext UI invoice shows "Draft" correctly.

## This Means: The Issue is NOT in the Database

The "Not Saved" indicator is determined by **client-side logic** in ERPNext's JavaScript form controller, not by database fields.

## Immediate Actions to Debug

### Action 1: Check Browser Console (DO THIS NOW)

1. Open ERPNext in browser
2. Open ACC-SINV-2026-00025 (Next.js invoice)
3. Open Browser DevTools (F12)
4. Go to Console tab
5. Look for:
   - JavaScript errors (red text)
   - Warnings (yellow text)
   - Any messages about "unsaved" or "not saved"

**Take screenshot and share any errors/warnings found.**

### Action 2: Check Network Tab

1. Keep DevTools open
2. Go to Network tab
3. Refresh the invoice page
4. Look for:
   - Failed API calls (red status codes)
   - 404 errors
   - 500 errors
   - Any requests with error responses

**Take screenshot of any failed requests.**

### Action 3: Check Form State in Console

While viewing ACC-SINV-2026-00025, run this in browser console:

```javascript
// Check if form exists
console.log('Form exists:', typeof cur_frm !== 'undefined');

// Check form state
if (typeof cur_frm !== 'undefined') {
    console.log('Form name:', cur_frm.docname);
    console.log('Is dirty:', cur_frm.is_dirty());
    console.log('Is new:', cur_frm.is_new());
    console.log('Doc status:', cur_frm.doc.docstatus);
    console.log('Doc __islocal:', cur_frm.doc.__islocal);
    console.log('Doc __unsaved:', cur_frm.doc.__unsaved);
    console.log('Has unsaved changes:', cur_frm.has_unsaved_changes);
}
```

**Copy and paste the console output.**

### Action 4: Compare with Working Invoice

Open ACC-SINV-2026-00024 (ERPNext UI invoice) and run the same console commands:

```javascript
if (typeof cur_frm !== 'undefined') {
    console.log('Form name:', cur_frm.docname);
    console.log('Is dirty:', cur_frm.is_dirty());
    console.log('Is new:', cur_frm.is_new());
    console.log('Doc status:', cur_frm.doc.docstatus);
    console.log('Doc __islocal:', cur_frm.doc.__islocal);
    console.log('Doc __unsaved:', cur_frm.doc.__unsaved);
    console.log('Has unsaved changes:', cur_frm.has_unsaved_changes);
}
```

**Compare the outputs between the two invoices.**

### Action 5: Check Document Metadata

Run this in console for BOTH invoices:

```javascript
if (typeof cur_frm !== 'undefined') {
    console.log('Full doc object:', JSON.stringify(cur_frm.doc, null, 2));
}
```

**Look for differences in metadata fields like:**
- `__islocal`
- `__unsaved`
- `__onload`
- `__run_link_triggers`

### Action 6: Force Refresh Test

1. Close all ERPNext browser tabs
2. Open new incognito/private window
3. Login to ERPNext
4. Open ACC-SINV-2026-00025
5. Check if it still shows "Not Saved"

**Report the result.**

### Action 7: Try Manual Save

1. Open ACC-SINV-2026-00025 in ERPNext UI
2. Don't change anything
3. Click "Save" button
4. Check if status changes to "Draft"

**Report what happens.**

## Possible Root Causes Based on ERPNext Behavior

### Cause 1: `__islocal` Flag

ERPNext uses `__islocal` flag to indicate if a document is "local" (not yet saved to server).

**Fix**: Ensure API response doesn't include `__islocal: 1` in the document.

### Cause 2: Missing `modified` Timestamp

ERPNext might check if `modified` timestamp exists and is recent.

**Check**: Compare `modified` timestamps in database (already done - both have timestamps).

### Cause 3: Form Cache Issue

ERPNext caches form data in browser. API-created documents might not be in cache.

**Fix**: Clear browser cache and test again.

### Cause 4: Document Not Fully Loaded

ERPNext form controller might not have fully loaded the document.

**Test**: Wait 5 seconds after opening invoice, then check status.

### Cause 5: Missing Child Table Metadata

Child tables (items) might be missing metadata that form controller expects.

**Check**: Compare item metadata in console output.

## Quick Test: Try Submitting the Invoice

Even if it shows "Not Saved", try to:
1. Open ACC-SINV-2026-00025
2. Click "Submit" button
3. See if it allows submission

**If submission works**, then "Not Saved" is just a UI display issue and doesn't affect functionality.

**If submission fails**, then we have a real problem.

## Expected Outcome

After running these debug steps, we should identify:
1. What JavaScript flag/property is causing "Not Saved" indicator
2. Whether it's just a display issue or affects functionality
3. What metadata is missing from API-created documents

## Next Steps Based on Findings

### If it's `__islocal` flag:
- Modify API to ensure response doesn't include `__islocal: 1`

### If it's form cache:
- Add API call to refresh form cache after creation
- Or document that users should refresh page after API creation

### If it's missing metadata:
- Identify which metadata fields are missing
- Modify API to include those fields in response

### If it's a display bug:
- Document the issue
- If functionality works (can submit, create credit note), consider it low priority

## Critical Question to Answer

**Can you create a Credit Note from ACC-SINV-2026-00025 despite "Not Saved" status?**

If YES: The "Not Saved" is just a cosmetic issue.
If NO: We need to fix the underlying cause.

## Temporary Workaround

If you need to use the invoice immediately:
1. Open ACC-SINV-2026-00025 in ERPNext UI
2. Click "Save" button (don't change anything)
3. Check if status changes to "Draft"
4. Try creating Credit Note

This will tell us if a simple re-save fixes the issue.
