# Task 7.2 Implementation: Form Validation Logic

## Task Description
Implement form validation logic for Purchase Return form with inline error messages, red borders for invalid fields, and error clearing when user corrects input.

## Requirements Validated
- 1.6, 1.7, 1.8, 1.9 (Item validation requirements)
- 7.3, 7.4, 7.5, 7.6 (Return quantity validation)
- 8.2, 8.3, 8.5, 8.6 (Return reason validation)
- 10.2 (Inline error display)

## Implementation Details

### 1. State Management Additions

Added two new state variables to track inline errors:

```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
const [itemErrors, setItemErrors] = useState<Record<number, { qty?: string; reason?: string; notes?: string }>>({});
```

- `fieldErrors`: Tracks form-level field errors (e.g., purchase receipt selection)
- `itemErrors`: Tracks item-level errors by index (quantity, reason, notes)

### 2. Enhanced Validation Function

Refactored `validateForm()` to:
- Return boolean instead of string array
- Populate inline error states instead of concatenating error messages
- Validate purchase receipt selection
- Validate at least one item selected with qty > 0
- Validate each selected item's quantity, reason, and notes

```typescript
const validateForm = (): boolean => {
  // Clear previous errors
  setFieldErrors({});
  setItemErrors({});
  
  let hasErrors = false;
  const newFieldErrors: Record<string, string> = {};
  const newItemErrors: Record<number, { qty?: string; reason?: string; notes?: string }> = {};

  // Validation logic...
  
  return !hasErrors;
};
```

### 3. Real-time Validation in handleItemChange()

Enhanced `handleItemChange()` to validate and clear errors as user types:

**Quantity Validation:**
- Validates qty > 0
- Validates qty <= remaining_qty
- Shows error: "Jumlah harus lebih besar dari 0" or "Jumlah melebihi sisa yang dapat diretur (X)"
- Clears error when valid value entered

**Return Reason Validation:**
- Validates reason is not empty
- Shows error: "Alasan retur harus dipilih"
- Clears error when reason selected
- Auto-clears notes error if reason changes from "Other"

**Notes Validation:**
- Validates notes are provided when reason is "Other"
- Shows error: "Catatan wajib diisi untuk alasan 'Lainnya'"
- Clears error when notes entered

### 4. Enhanced Item Selection

Updated `handleItemSelect()` to:
- Clear all errors when item is deselected
- Reset quantity, reason, and notes fields
- Prevent orphaned error messages

### 5. UI Updates for Error Display

**Purchase Receipt Field:**
```tsx
<input
  className={`... ${fieldErrors.purchase_receipt ? 'border-red-500' : 'border-gray-300'}`}
/>
{fieldErrors.purchase_receipt && (
  <p className="mt-1 text-sm text-red-600">{fieldErrors.purchase_receipt}</p>
)}
```

**Quantity Input:**
```tsx
<input
  type="number"
  className={`... ${itemErrors[index]?.qty ? 'border-red-500' : 'border-gray-300'}`}
/>
{itemErrors[index]?.qty && (
  <p className="mt-1 text-xs text-red-600">{itemErrors[index].qty}</p>
)}
```

**Return Reason Dropdown:**
```tsx
<select
  className={`... ${itemErrors[index]?.reason ? 'border-red-500' : 'border-gray-300'}`}
>
  {/* options */}
</select>
{itemErrors[index]?.reason && (
  <p className="mt-1 text-xs text-red-600">{itemErrors[index].reason}</p>
)}
```

**Notes Textarea:**
```tsx
<textarea
  className={`... ${itemErrors[index]?.notes ? 'border-red-500' : 'border-gray-300'}`}
/>
{itemErrors[index]?.notes && (
  <p className="mt-1 text-sm text-red-600">{itemErrors[index].notes}</p>
)}
```

## Validation Rules Implemented

### 1. Purchase Receipt Selection
- **Rule**: Must select a purchase receipt before saving
- **Error**: "Tanda terima pembelian harus dipilih"
- **Display**: Red border on input field + error message below

### 2. At Least One Item Selected
- **Rule**: Must select at least one item with qty > 0
- **Error**: "Minimal satu item harus dipilih untuk diretur dengan jumlah > 0"
- **Display**: Error banner at top of form

### 3. Return Quantity > 0
- **Rule**: Selected items must have quantity greater than zero
- **Error**: "Jumlah harus lebih besar dari 0"
- **Display**: Red border on quantity input + error message below

### 4. Return Quantity <= Remaining Quantity
- **Rule**: Return quantity cannot exceed remaining returnable quantity
- **Error**: "Jumlah melebihi sisa yang dapat diretur (X)"
- **Display**: Red border on quantity input + error message below

### 5. Return Reason Required
- **Rule**: Selected items must have a return reason
- **Error**: "Alasan retur harus dipilih"
- **Display**: Red border on dropdown + error message below

### 6. Notes Required for "Other" Reason
- **Rule**: When reason is "Lainnya" (Other), notes are mandatory
- **Error**: "Catatan wajib diisi untuk alasan 'Lainnya'"
- **Display**: Red border on textarea + error message below

## Error Clearing Behavior

Errors are automatically cleared when:
1. User corrects the invalid value
2. User deselects an item (all errors for that item cleared)
3. User changes return reason from "Other" to another value (notes error cleared)

## Form Submission Prevention

When validation errors exist:
1. `validateForm()` returns `false`
2. Form submission is prevented
3. Error banner shows: "Silakan perbaiki kesalahan pada form"
4. All inline errors remain visible with red borders
5. User must fix all errors before form can be submitted

## Consistency with Debit Note Form

This implementation follows the same pattern as the Debit Note form (`dnMain/component.tsx`), ensuring consistency across the purchase return modules.

## Files Modified

1. `app/purchase-return/prMain/component.tsx` - Main form component with validation logic

## Files Referenced

1. `lib/purchase-return-validation.ts` - Shared validation utilities
2. `types/purchase-return.ts` - Type definitions
3. `app/debit-note/dnMain/component.tsx` - Reference implementation

## Testing

See `TASK_7.2_VALIDATION_CHECKLIST.md` for comprehensive manual testing checklist covering all validation scenarios.

## Completion Status

✅ Task 7.2 is complete. All validation rules are implemented with:
- Inline error messages next to invalid fields
- Red borders on invalid fields
- Error clearing when user corrects input
- Form submission prevention when errors exist
- Consistent behavior with Debit Note form
