# Form Submission Best Practices

## Problem: Browser Back Button After Form Submission

When users submit a form (create/update document), they should NOT be able to use the browser back button to return to the form page. This prevents:

1. **Duplicate submissions** - User accidentally submits the same data twice
2. **Confusion** - User thinks they can edit the already-submitted document
3. **Data inconsistency** - Form shows old data that's already been saved
4. **Stale form data** - User sees outdated information from before submission

## Solution: Use `router.replace()` Instead of `router.push()`

### ❌ Wrong Pattern

```typescript
// After successful save
if (response.ok) {
  alert('Data berhasil disimpan');
  router.push('/sales-order'); // WRONG - adds to history
}
```

**Problem:** User can click back button and return to the form page.

### ✅ Correct Pattern

```typescript
// After successful save
if (response.ok) {
  alert('Data berhasil disimpan');
  router.replace('/sales-order'); // CORRECT - replaces history entry
}
```

**Benefit:** User cannot click back button to return to the form page. Back button navigates to the page BEFORE the form (typically the list page or dashboard).

## Implementation Patterns

This codebase uses two main patterns for post-submission navigation:

### Pattern A: PrintDialog with onClose Callback

Used in transaction forms that show a print dialog after successful save (Sales Order, Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, Purchase Invoice).

```typescript
// Component state
const [showPrintDialog, setShowPrintDialog] = useState(false);
const [savedDocName, setSavedDocName] = useState('');

// After successful save
if (response.ok) {
  const docName = data.data?.name;
  setSavedDocName(docName);
  setShowPrintDialog(true); // Show print dialog
}

// PrintDialog component
<PrintDialog
  isOpen={showPrintDialog}
  onClose={() => { 
    setShowPrintDialog(false); 
    router.replace('/sales-order/soList'); // ✅ Use replace, not push
  }}
  documentType="Sales Order"
  documentName={savedDocName}
/>
```

**Key Point:** The `onClose` callback must use `router.replace()` to prevent back navigation to the form.

### Pattern B: Direct Redirect After Success

Used in most master data and simple transaction forms (Suppliers, Stock Entry, Warehouse, etc.).

```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      setSuccessMessage('Supplier berhasil ditambahkan!');
      
      // Redirect after short delay to show success message
      setTimeout(() => {
        router.replace('/suppliers'); // ✅ Use replace, not push
      }, 1500);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

**Key Point:** Use `router.replace()` in the success handler, whether immediate or delayed with `setTimeout()`.

### 1. Create/Save Operations

After successfully creating a new document:

```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/sales-order', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      // Show success message
      alert('Sales Order berhasil dibuat');
      
      // Redirect to list page with replace (not push)
      router.replace('/sales-order');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2. Update Operations

After successfully updating an existing document:

```typescript
const handleUpdate = async () => {
  try {
    const response = await fetch(`/api/sales-order/${docName}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      // Show success message
      alert('Sales Order berhasil diupdate');
      
      // Redirect to list page with replace (not push)
      router.replace('/sales-order');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 3. Submit/Post Operations

After successfully submitting a document (changing status from Draft to Submitted):

```typescript
const handleSubmitDocument = async () => {
  try {
    const response = await fetch(`/api/sales-order/${docName}/submit`, {
      method: 'POST',
    });

    if (response.ok) {
      // Show success message
      alert('Sales Order berhasil di-submit');
      
      // Redirect to list page with replace (not push)
      router.replace('/sales-order');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Files Updated (✅ Complete)

All form components have been updated to use `router.replace()` after successful submission:

### Sales Module (5 forms) ✅
- [x] `app/sales-order/soMain/component.tsx` - PrintDialog pattern
- [x] `app/invoice/siMain/component.tsx` - PrintDialog pattern
- [x] `app/delivery-note/dnMain/component.tsx` - PrintDialog pattern
- [x] `app/sales-return/srMain/component.tsx` - Direct redirect pattern
- [x] `app/credit-note/cnMain/component.tsx` - Direct redirect pattern (save, submit, cancel)

### Purchase Module (3 forms) ✅
- [x] `app/purchase-orders/poMain/component.tsx` - PrintDialog pattern
- [x] `app/purchase-receipts/prMain/component.tsx` - PrintDialog pattern
- [x] `app/purchase-invoice/piMain/component.tsx` - PrintDialog pattern

### Finance Module (4 forms) ✅
- [x] `app/journal/journalMain/component.tsx` - Direct redirect pattern
- [x] `app/kas-masuk/kmMain/component.tsx` - Direct redirect pattern
- [x] `app/kas-keluar/kkMain/component.tsx` - Direct redirect pattern
- [x] `app/commission-payment/cpMain/component.tsx` - Direct redirect pattern

### Inventory Module (2 forms) ✅
- [x] `app/stock-entry/seMain/component.tsx` - Direct redirect pattern
- [x] `app/stock-reconciliation/srMain/component.tsx` - Direct redirect pattern

### Master Data (6 forms) ✅
- [x] `app/suppliers/suppMain/component.tsx` - Direct redirect pattern
- [x] `app/employees/empMain/component.tsx` - Direct redirect pattern
- [x] `app/warehouse/whMain/component.tsx` - Direct redirect pattern (alert dialog)
- [x] `app/items/itemMain/component.tsx` - Direct redirect pattern (alert dialog)
- [x] `app/sales-persons/spMain/component.tsx` - Direct redirect pattern
- [x] `app/payment-terms/ptMain/component.tsx` - Direct redirect pattern

**Total: 20 forms updated across 5 modules**

**Note:** Customers, Users, and Payment forms were not found in the codebase.

## Additional Considerations

### 1. Cancel Button

Cancel button should use `router.back()` or `router.push()` (not replace):

```typescript
const handleCancel = () => {
  router.back(); // or router.push('/sales-order')
};
```

### 2. Validation Errors

If validation fails, stay on the form page (don't redirect):

```typescript
if (!response.ok) {
  const error = await response.json();
  alert(error.message);
  // Stay on form page - don't redirect
  return;
}
```

### 3. Loading State

Show loading state during submission to prevent double-click:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return; // Prevent double submission
  
  setIsSubmitting(true);
  try {
    // ... submit logic
  } finally {
    setIsSubmitting(false);
  }
};
```

## Summary

**Key Rule:** After any successful form submission (create, update, submit), always use `router.replace()` to redirect to the list page. This prevents users from using the back button to return to the form and accidentally re-submitting.

**Pattern:**
```typescript
// ❌ Wrong
router.push('/list-page');

// ✅ Correct
router.replace('/list-page');
```

**Browser History Behavior:**
- `router.push('/list')` - Adds new entry: [form page] → [list page] (back button returns to form)
- `router.replace('/list')` - Replaces entry: [previous page] → [list page] (back button skips form)

**Testing:**
- Bug exploration test: `tests/back-button-after-form-submission-bug-exploration.pbt.test.ts`
- Preservation test: `tests/back-button-preservation.pbt.test.ts`
- Run with: `npx tsx tests/back-button-*.pbt.test.ts`
