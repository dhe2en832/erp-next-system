# Purchase Return and Debit Note - Testing Checklist

## Task 19: Final Integration and Testing

This document provides a comprehensive checklist for manual testing of the Purchase Return and Debit Note implementation.

### ✅ Automated Tests Completed

All integration tests have passed successfully:
- ✅ Type definitions validation
- ✅ Validation functions (29 tests passed)
- ✅ Calculation functions
- ✅ Date and currency formatting
- ✅ Integration scenarios

---

## Manual Testing Checklist

### 1. Purchase Return Module

#### 1.1 Navigation and List View
- [ ] Navigate to `/purchase-return` URL
- [ ] Verify page title displays "Retur Pembelian" (Indonesian)
- [ ] Verify list displays existing purchase returns
- [ ] Verify columns: Document Name, Supplier, Posting Date, Total Amount, Status
- [ ] Verify status badges show correct colors:
  - Draft: Yellow
  - Submitted: Green
  - Cancelled: Gray

#### 1.2 List Filtering and Search
- [ ] Test status filter dropdown (Draft, Submitted, Cancelled)
- [ ] Test date range filters (from_date, to_date)
- [ ] Test search by supplier name
- [ ] Test search by document number
- [ ] Verify pagination controls work correctly
- [ ] Test changing page size

#### 1.3 Create New Purchase Return
- [ ] Click "Create New" button
- [ ] Verify form displays with all required fields
- [ ] Click "Select Purchase Receipt" button
- [ ] Verify Purchase Receipt Dialog opens
- [ ] Search for a purchase receipt
- [ ] Filter by supplier
- [ ] Filter by date range
- [ ] Select a purchase receipt
- [ ] Verify supplier name auto-populates
- [ ] Verify posting date defaults to current date
- [ ] Verify items table populates with receipt items
- [ ] Verify columns display: Item Code, Item Name, Delivered Qty, Returned Qty, Remaining Qty, Return Qty, Rate, Amount, Return Reason, Notes

#### 1.4 Item Selection and Quantity Entry
- [ ] Select one or more items using checkboxes
- [ ] Enter return quantity for selected items
- [ ] Verify quantity validation:
  - Cannot be zero
  - Cannot be negative
  - Cannot exceed remaining quantity
- [ ] Verify inline error messages display for invalid quantities
- [ ] Verify line amount calculates automatically (qty × rate)
- [ ] Verify total amount updates reactively

#### 1.5 Return Reason Selection
- [ ] Select return reason for each item
- [ ] Verify dropdown shows all options:
  - Rusak (Damaged)
  - Masalah Kualitas (Quality Issue)
  - Item Salah (Wrong Item)
  - Permintaan Pemasok (Supplier Request)
  - Kadaluarsa (Expired)
  - Lainnya (Other)
- [ ] Select "Lainnya" (Other) reason
- [ ] Verify notes field becomes required
- [ ] Enter notes
- [ ] Verify validation error if notes are empty for "Other" reason

#### 1.6 Form Validation
- [ ] Try to save without selecting any items
- [ ] Verify error message displays
- [ ] Try to save with invalid quantities
- [ ] Verify inline error messages
- [ ] Try to save without return reasons
- [ ] Verify validation errors
- [ ] Fill all required fields correctly
- [ ] Verify form can be saved

#### 1.7 Save Draft
- [ ] Click "Save" button
- [ ] Verify loading spinner displays
- [ ] Verify button is disabled during save
- [ ] Verify success toast notification
- [ ] Verify redirect to list view
- [ ] Verify new document appears in list with Draft status

#### 1.8 Edit Draft Purchase Return
- [ ] Click on a Draft purchase return
- [ ] Verify all fields are editable
- [ ] Modify quantities
- [ ] Change return reasons
- [ ] Click "Save"
- [ ] Verify changes are saved
- [ ] Verify success message

#### 1.9 Submit Purchase Return
- [ ] Open a Draft purchase return
- [ ] Verify "Submit" button is visible
- [ ] Click "Submit" button
- [ ] Verify confirmation dialog appears
- [ ] Confirm submission
- [ ] Verify loading state
- [ ] Verify success message
- [ ] Verify status changes to Submitted
- [ ] Verify "Submit" button is no longer visible
- [ ] Verify all fields are now read-only

#### 1.10 Cancel Purchase Return
- [ ] Open a Submitted purchase return
- [ ] Verify "Cancel" button is visible
- [ ] Click "Cancel" button
- [ ] Verify confirmation dialog appears
- [ ] Confirm cancellation
- [ ] Verify loading state
- [ ] Verify success message
- [ ] Verify status changes to Cancelled
- [ ] Verify "Cancel" button is no longer visible
- [ ] Verify all fields remain read-only

#### 1.11 View Read-Only Purchase Return
- [ ] Open a Submitted purchase return
- [ ] Verify all fields are read-only
- [ ] Verify no edit buttons are visible
- [ ] Open a Cancelled purchase return
- [ ] Verify all fields are read-only
- [ ] Verify no edit buttons are visible

---

### 2. Debit Note Module

#### 2.1 Navigation and List View
- [ ] Navigate to `/debit-note` URL
- [ ] Verify page title displays "Debit Memo" (Indonesian)
- [ ] Verify list displays existing debit notes
- [ ] Verify columns: Document Name, Supplier, Posting Date, Total Amount, Status
- [ ] Verify status badges show correct colors

#### 2.2 List Filtering and Search
- [ ] Test status filter dropdown
- [ ] Test date range filters
- [ ] Test search by supplier name
- [ ] Test search by document number
- [ ] Verify pagination works correctly

#### 2.3 Create New Debit Note
- [ ] Click "Create New" button
- [ ] Click "Select Purchase Invoice" button
- [ ] Verify Purchase Invoice Dialog opens
- [ ] Search for a paid purchase invoice
- [ ] Filter by supplier
- [ ] Filter by date range
- [ ] Select a purchase invoice
- [ ] Verify supplier name auto-populates
- [ ] Verify posting date defaults to current date
- [ ] Verify items table populates with invoice items

#### 2.4 Item Selection and Validation
- [ ] Select items using checkboxes
- [ ] Enter return quantities
- [ ] Verify quantity validation works
- [ ] Select return reasons
- [ ] Enter notes for "Other" reason
- [ ] Verify line amounts calculate correctly
- [ ] Verify total amount updates

#### 2.5 Save, Submit, and Cancel Debit Note
- [ ] Save as draft
- [ ] Edit draft
- [ ] Submit debit note
- [ ] Cancel submitted debit note
- [ ] Verify all workflows work correctly

---

### 3. Mobile Responsiveness

#### 3.1 Mobile Layout (viewport < 768px)
- [ ] Test on mobile device or browser dev tools
- [ ] Verify list view is responsive
- [ ] Verify table scrolls horizontally if needed
- [ ] Verify form layout adapts to mobile
- [ ] Verify buttons are touch-friendly (44x44px minimum)
- [ ] Verify dialogs are mobile-friendly
- [ ] Verify all text is readable on small screens

#### 3.2 Tablet Layout (768px - 1024px)
- [ ] Test on tablet or browser dev tools
- [ ] Verify layout adapts appropriately
- [ ] Verify all functionality works

---

### 4. Error Handling

#### 4.1 Validation Errors
- [ ] Trigger various validation errors
- [ ] Verify inline error messages display correctly
- [ ] Verify error messages are in Indonesian
- [ ] Verify errors clear when corrected

#### 4.2 API Errors
- [ ] Test with invalid document selection
- [ ] Test with network disconnected
- [ ] Verify error dialog displays
- [ ] Verify error messages are user-friendly
- [ ] Verify Indonesian error messages

#### 4.3 Network Errors
- [ ] Disconnect network
- [ ] Try to save a document
- [ ] Verify network error message displays
- [ ] Verify message is in Indonesian
- [ ] Reconnect network
- [ ] Verify retry works

---

### 5. Indonesian Language Support

#### 5.1 UI Labels
- [ ] Verify all buttons are in Indonesian
- [ ] Verify all field labels are in Indonesian
- [ ] Verify all error messages are in Indonesian
- [ ] Verify status labels are in Indonesian
- [ ] Verify return reason options are in Indonesian

#### 5.2 Date Format
- [ ] Verify dates display as DD/MM/YYYY
- [ ] Verify date picker uses DD/MM/YYYY format
- [ ] Verify date validation works with Indonesian format

#### 5.3 Currency Format
- [ ] Verify amounts display with "Rp" prefix
- [ ] Verify Indonesian number formatting (1.000.000)
- [ ] Verify currency formatting is consistent throughout

---

### 6. Data Integrity

#### 6.1 Calculation Accuracy
- [ ] Create return with multiple items
- [ ] Verify line amounts are correct (qty × rate)
- [ ] Verify total amount is sum of line amounts
- [ ] Verify remaining quantity calculation is correct

#### 6.2 Remaining Quantity Tracking
- [ ] Create a purchase receipt with 10 items
- [ ] Create a return for 3 items
- [ ] Verify remaining quantity shows 7
- [ ] Create another return for 5 items
- [ ] Verify remaining quantity shows 2
- [ ] Try to return 5 items (should fail)
- [ ] Verify validation prevents over-returning

---

### 7. API Integration

#### 7.1 Purchase Return API Routes
- [ ] Verify GET /api/purchase/purchase-return returns list
- [ ] Verify POST /api/purchase/purchase-return creates document
- [ ] Verify GET /api/purchase/purchase-return/[name] returns details
- [ ] Verify PUT /api/purchase/purchase-return/[name] updates draft
- [ ] Verify POST /api/purchase/purchase-return/[name]/submit works
- [ ] Verify POST /api/purchase/purchase-return/[name]/cancel works

#### 7.2 Debit Note API Routes
- [ ] Verify GET /api/purchase/debit-note returns list
- [ ] Verify POST /api/purchase/debit-note creates document
- [ ] Verify GET /api/purchase/debit-note/[name] returns details
- [ ] Verify PUT /api/purchase/debit-note/[name] updates draft
- [ ] Verify POST /api/purchase/debit-note/[name]/submit works
- [ ] Verify POST /api/purchase/debit-note/[name]/cancel works

---

### 8. Performance

#### 8.1 Loading States
- [ ] Verify loading spinners display during API calls
- [ ] Verify buttons disable during submission
- [ ] Verify no double-submission is possible
- [ ] Verify loading states are user-friendly

#### 8.2 Large Data Sets
- [ ] Test with purchase receipt containing many items (50+)
- [ ] Verify pagination works in dialogs
- [ ] Verify performance is acceptable
- [ ] Verify no UI freezing

---

### 9. Cross-Browser Testing

#### 9.1 Chrome
- [ ] Test all functionality in Chrome
- [ ] Verify no console errors

#### 9.2 Firefox
- [ ] Test all functionality in Firefox
- [ ] Verify no console errors

#### 9.3 Safari
- [ ] Test all functionality in Safari
- [ ] Verify no console errors

#### 9.4 Edge
- [ ] Test all functionality in Edge
- [ ] Verify no console errors

---

## Test Results Summary

### Automated Tests
- **Status**: ✅ PASSED
- **Tests Run**: 29
- **Tests Passed**: 29
- **Tests Failed**: 0

### Manual Tests
- **Status**: ⏳ PENDING USER VERIFICATION
- **Recommendation**: Test with real ERPNext backend for complete validation

---

## Known Limitations

1. **No Real Backend Testing**: Integration tests validate logic but not actual ERPNext API integration
2. **No Commission Calculations**: Unlike sales returns, purchase returns don't require commission calculations
3. **Requires ERPNext Backend**: Full testing requires a running ERPNext instance with:
   - Purchase Receipts with returnable items
   - Purchase Invoices with returnable items
   - Proper authentication configured

---

## Next Steps

1. ✅ Run automated integration tests (COMPLETED)
2. ⏳ Perform manual testing with real ERPNext backend
3. ⏳ Test mobile responsiveness on actual devices
4. ⏳ Verify Indonesian language support with native speakers
5. ⏳ Load test with large data sets
6. ⏳ Cross-browser compatibility testing

---

## Sign-Off

**Implementation Status**: ✅ COMPLETE
**Automated Tests**: ✅ PASSED (29/29)
**Manual Testing**: ⏳ READY FOR USER VERIFICATION

**Recommendation**: The implementation is complete and all automated tests pass. Manual testing with a real ERPNext backend is recommended to verify end-to-end functionality.
