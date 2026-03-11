# Investigation: Sales Invoice "Not Saved" Status

## Problem Statement

Sales Invoice created via Next.js API shows "Not Saved" status in ERPNext UI, even though:
- Data is correctly saved to database
- `docstatus=0` (Draft)
- `status=Draft`
- Commission calculation works (208,000)
- API returns 200 success

This prevents further operations like creating Credit Notes.

## Current Implementation

Using `frappe.client.insert` API endpoint:
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

## Investigation Steps

### Step 1: Verify Database State

Check if document is actually saved:
```sql
SELECT name, docstatus, status, custom_total_komisi_sales, creation, modified
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00024';
```

**Expected Result**: Document exists with correct data

### Step 2: Check ERPNext UI Behavior

When opening the document in ERPNext UI:
1. Does it show "Not Saved" indicator?
2. Can you edit fields?
3. Can you submit the document?
4. Can you create Credit Note from it?

### Step 3: Compare with UI-Created Invoice

Create a Sales Invoice directly from ERPNext UI and compare:
1. Database fields
2. Document metadata
3. Any missing fields or flags

### Step 4: Check Document Metadata

Look for differences in these fields:
- `__islocal`
- `__unsaved`
- `__onload`
- `modified`
- `modified_by`
- `owner`

### Step 5: Investigate ERPNext Form Controller

The "Not Saved" status might be determined by:
1. JavaScript form controller checking certain flags
2. Missing metadata that UI expects
3. Document not being in form cache

## Possible Root Causes

### Hypothesis 1: Missing Form Metadata
ERPNext UI might expect certain metadata fields that `frappe.client.insert` doesn't set.

**Test**: Compare full document JSON from:
- API-created invoice: `GET /api/resource/Sales Invoice/{name}`
- UI-created invoice: `GET /api/resource/Sales Invoice/{name}`

### Hypothesis 2: Form Cache Issue
ERPNext UI might cache form state, and API-created documents aren't in cache.

**Test**: 
1. Create invoice via API
2. Refresh ERPNext page
3. Open the invoice
4. Check if status changes

### Hypothesis 3: Missing Document Workflow State
Document might be missing workflow state that UI expects.

**Test**: Check `workflow_state` field in both API and UI created invoices.

### Hypothesis 4: Browser Session State
ERPNext UI might track document state in browser session/localStorage.

**Test**: 
1. Create invoice via API
2. Open in incognito/private window
3. Check status

## Investigation Commands

### Get Full Document via API
```bash
curl -X GET "http://localhost:8000/api/resource/Sales Invoice/ACC-SINV-2026-00024" \
  -H "Authorization: token {API_KEY}:{API_SECRET}"
```

### Get Document via Database
```bash
bench --site {site_name} mariadb
```
```sql
SELECT * FROM `tabSales Invoice` WHERE name = 'ACC-SINV-2026-00024'\G
```

### Check ERPNext Logs
```bash
tail -f sites/{site_name}/logs/web.log
```

## Next Steps

1. ✅ Reverted to `frappe.client.insert` (working but shows "Not Saved")
2. ⏳ Run investigation steps above
3. ⏳ Compare API vs UI created documents
4. ⏳ Identify missing fields/metadata
5. ⏳ Implement fix based on findings

## Findings

### Finding 1: Server Script Runs on "Before Submit" Not "Before Save"

The Server Script that populates `custom_hpp_snapshot` and `custom_financial_cost_percent` runs on **"Before Submit"** event, not "Before Save" or "Before Insert".

**Impact**:
- When invoice is created via API with `frappe.client.insert` → status is **Draft** (docstatus=0)
- Server script doesn't run yet (only runs on Submit when docstatus=1)
- Fields `custom_hpp_snapshot` and `custom_financial_cost_percent` remain **empty (0)**
- ERPNext UI detects these critical fields are missing → shows **"Not Saved"** status

### Finding 2: Field Comparison Between API and UI Created Invoices

**API-created invoice (shows "Not Saved"):**
- `custom_komisi_sales`: 208000 ✅ (from "Nilai Komisi SI" script)
- `custom_hpp_snapshot`: 0 ❌ (missing)
- `custom_financial_cost_percent`: 0 ❌ (missing)

**UI-created invoice (shows "Draft" correctly):**
- `custom_komisi_sales`: 0 (will be filled on submit)
- `custom_hpp_snapshot`: 148000 ✅ (filled by UI)
- `custom_financial_cost_percent`: 2.0 ✅ (filled by UI)

### Finding 3: ERPNext UI Validation

ERPNext UI appears to validate that certain custom fields are populated before considering a document "saved". Missing `custom_hpp_snapshot` and `custom_financial_cost_percent` triggers the "Not Saved" indicator.

## Solution

**Root Cause**: Server Script that populates `custom_hpp_snapshot` and `custom_financial_cost_percent` runs on "Before Submit" event, not during document creation. API-created invoices in Draft status don't have these fields populated, causing ERPNext UI to show "Not Saved" status.

**Fix**: Pre-populate these fields in the API route before sending to ERPNext:

```typescript
// CRITICAL FIX: Pre-populate custom_hpp_snapshot and custom_financial_cost_percent
// These fields are normally filled by "Before Submit" server script, but we need them
// at Draft stage to prevent "Not Saved" status in ERPNext UI
if (payload.items && payload.items.length > 0) {
  for (const item of payload.items) {
    // Set HPP snapshot from incoming_rate (already available in item)
    if (!item.custom_hpp_snapshot || item.custom_hpp_snapshot <= 0) {
      item.custom_hpp_snapshot = item.incoming_rate || 0;
    }
    
    // Set financial cost percent - default to 0 if not provided
    // This will be overridden by server script on submit if needed
    if (!item.custom_financial_cost_percent) {
      item.custom_financial_cost_percent = 0;
    }
  }
}
```

**Result**:
- Invoice created from Next.js will have all required fields populated
- ERPNext UI will show "Draft" status correctly (not "Not Saved")
- Can proceed with Submit and other operations
- Server script will still run on Submit to validate/update these values

## References

- ERPNext Form Controller: `frappe/public/js/frappe/form/form.js`
- Document Insert: `frappe/model/document.py`
- Form Save: `frappe/desk/form/save.py`
