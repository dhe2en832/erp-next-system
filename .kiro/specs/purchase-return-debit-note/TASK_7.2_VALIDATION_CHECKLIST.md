# Task 7.2: Form Validation Logic - Implementation Checklist

## Overview
This document provides a manual testing checklist for the form validation logic implemented in Task 7.2.

## Implementation Summary

### Changes Made

1. **State Management** - Added inline error tracking:
   - `fieldErrors`: Record<string, string> - Tracks field-level errors
   - `itemErrors`: Record<number, { qty?: string; reason?: string; notes?: string }> - Tracks item-level errors

2. **Validation Logic** - Enhanced `validateForm()`:
   - Returns boolean instead of string array
   - Populates `fieldErrors` and `itemErrors` state
   - Validates purchase receipt selection
   - Validates at least one item selected with qty > 0
   - Validates each selected item's quantity, reason, and notes

3. **Real-time Validation** - Enhanced `handleItemChange()`:
   - Validates quantity inline (> 0 and <= remaining_qty)
   - Validates return reason inline (not empty)
   - Validates notes inline (required when reason is "Other")
   - Clears errors when user corrects input

4. **Item Selection** - Enhanced `handleItemSelect()`:
   - Clears all errors when item is deselected
   - Resets quantity, reason, and notes when deselecting

5. **UI Updates** - Added inline error display:
   - Purchase receipt field shows red border and error message
   - Quantity input shows red border and error message below
   - Return reason dropdown shows red border and error message below
   - Notes textarea shows red border and error message below

## Manual Testing Checklist

### Test 1: Purchase Receipt Selection Validation
- [ ] Open Purchase Return form (create new)
- [ ] Try to save without selecting a purchase receipt
- [ ] Verify error message appears: "Tanda terima pembelian harus dipilih"
- [ ] Verify purchase receipt field has red border
- [ ] Select a purchase receipt
- [ ] Verify error clears and red border disappears

### Test 2: No Items Selected Validation
- [ ] Select a purchase receipt
- [ ] Do not select any items (all checkboxes unchecked)
- [ ] Try to save
- [ ] Verify error message: "Minimal satu item harus dipilih untuk diretur dengan jumlah > 0"
- [ ] Select at least one item
- [ ] Verify error clears

### Test 3: Quantity Validation - Zero or Negative
- [ ] Select a purchase receipt
- [ ] Select an item (check the checkbox)
- [ ] Leave quantity at 0 or enter negative value
- [ ] Verify inline error appears below quantity field: "Jumlah harus lebih besar dari 0"
- [ ] Verify quantity field has red border
- [ ] Enter a valid quantity (> 0)
- [ ] Verify error clears and red border disappears

### Test 4: Quantity Validation - Exceeds Remaining
- [ ] Select an item with remaining quantity of 10
- [ ] Enter quantity of 15 (exceeds remaining)
- [ ] Verify inline error: "Jumlah melebihi sisa yang dapat diretur (10)"
- [ ] Verify quantity field has red border
- [ ] Enter quantity of 10 or less
- [ ] Verify error clears and red border disappears

### Test 5: Return Reason Validation
- [ ] Select an item and enter valid quantity
- [ ] Leave return reason dropdown at "Pilih alasan..."
- [ ] Try to save or move to another field
- [ ] Verify inline error: "Alasan retur harus dipilih"
- [ ] Verify dropdown has red border
- [ ] Select any reason (e.g., "Rusak")
- [ ] Verify error clears and red border disappears

### Test 6: Notes Validation for "Other" Reason
- [ ] Select an item with valid quantity
- [ ] Select "Lainnya" (Other) as return reason
- [ ] Verify notes textarea appears below the table
- [ ] Leave notes empty
- [ ] Try to save
- [ ] Verify inline error: "Catatan wajib diisi untuk alasan 'Lainnya'"
- [ ] Verify notes textarea has red border
- [ ] Enter some text in notes
- [ ] Verify error clears and red border disappears

### Test 7: Notes Not Required for Non-Other Reasons
- [ ] Select an item with valid quantity
- [ ] Select "Rusak" (Damaged) as return reason
- [ ] Leave notes empty (should not appear)
- [ ] Try to save
- [ ] Verify no error about notes
- [ ] Form should save successfully

### Test 8: Multiple Items with Mixed Errors
- [ ] Select a purchase receipt with multiple items
- [ ] Select 3 items:
  - Item 1: qty = 0, reason = empty
  - Item 2: qty = valid, reason = "Other", notes = empty
  - Item 3: qty = exceeds remaining, reason = valid
- [ ] Try to save
- [ ] Verify all 3 items show appropriate inline errors
- [ ] Verify all error fields have red borders
- [ ] Fix Item 1 (set qty > 0, select reason)
- [ ] Verify Item 1 errors clear
- [ ] Verify Items 2 and 3 still show errors
- [ ] Fix Items 2 and 3
- [ ] Verify all errors clear
- [ ] Form should save successfully

### Test 9: Error Clearing on Item Deselection
- [ ] Select an item with errors (e.g., qty = 0, no reason)
- [ ] Verify errors are displayed
- [ ] Uncheck the item (deselect)
- [ ] Verify all errors for that item disappear
- [ ] Verify red borders disappear

### Test 10: Form Submission Prevention
- [ ] Create a form with validation errors
- [ ] Click "Simpan" (Save) button
- [ ] Verify form does NOT submit
- [ ] Verify error banner appears: "Silakan perbaiki kesalahan pada form"
- [ ] Verify inline errors remain visible
- [ ] Fix all errors
- [ ] Click "Simpan" again
- [ ] Verify form submits successfully

### Test 11: Read-Only Mode (No Validation)
- [ ] Open an existing submitted purchase return
- [ ] Verify all fields are read-only
- [ ] Verify no validation errors appear
- [ ] Verify no red borders on any fields

### Test 12: Edit Mode Validation
- [ ] Open an existing draft purchase return
- [ ] Modify quantity to invalid value (0 or exceeds remaining)
- [ ] Verify inline error appears
- [ ] Try to save
- [ ] Verify form does not submit
- [ ] Fix the error
- [ ] Verify form saves successfully

## Requirements Coverage

This implementation validates the following requirements:

- **1.6**: FOR ALL selected items, THE Purchase_Return_Module SHALL require the User to specify a return quantity
- **1.7**: THE Purchase_Return_Module SHALL validate that return quantity does not exceed the remaining returnable quantity
- **1.8**: FOR ALL selected items, THE Purchase_Return_Module SHALL require the User to select a Return_Reason
- **1.9**: WHERE the Return_Reason is "Other", THE Purchase_Return_Module SHALL require the User to provide additional notes
- **7.3**: WHEN a User enters a return quantity, THE system SHALL validate it is greater than zero
- **7.4**: WHEN a User enters a return quantity, THE system SHALL validate it does not exceed the remaining returnable quantity
- **7.5**: IF return quantity is invalid, THEN THE system SHALL display an inline error message
- **7.6**: IF return quantity is invalid, THEN THE system SHALL prevent form submission
- **8.2**: FOR ALL selected Return_Items, THE system SHALL require a Return_Reason to be selected
- **8.3**: WHERE Return_Reason is "Other", THE system SHALL require additional notes to be provided
- **8.5**: IF Return_Reason is not selected for a selected item, THEN THE system SHALL display an error message
- **8.6**: IF Return_Reason is "Other" and notes are empty, THEN THE system SHALL display an error message
- **10.2**: WHEN a validation error occurs, THE system SHALL display inline error messages next to the relevant fields

## Success Criteria

All checklist items above should pass for Task 7.2 to be considered complete.

## Notes

- The Debit Note form (`dnMain/component.tsx`) already has similar validation implemented and can be used as a reference
- Validation logic is shared via `lib/purchase-return-validation.ts`
- Error messages are in Indonesian (Bahasa Indonesia) as per requirement 11.1
