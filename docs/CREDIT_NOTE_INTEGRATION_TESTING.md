# Credit Note Management - Integration Testing Guide

## Overview

This document provides comprehensive integration testing procedures for the Credit Note Management feature. Since this is a Next.js frontend application that integrates with ERPNext backend, these tests require a running ERPNext instance with proper configuration.

## Prerequisites

### Environment Setup

1. **ERPNext Backend**:
   - ERPNext instance running and accessible
   - API credentials configured in `.env`:
     ```
     ERPNEXT_API_URL=http://localhost:8000
     ERP_API_KEY=your_api_key
     ERP_API_SECRET=your_api_secret
     ```

2. **Test Data Requirements**:
   - At least one Company configured
   - At least one Customer with transactions
   - At least one Warehouse
   - At least 3-5 Items in inventory
   - Open Accounting Period for current date
   - Sales Invoices with status "Paid" (minimum 3 invoices)
   - At least one Sales Invoice with commission values set

3. **Server Scripts Installed**:
   - Credit Note Commission Adjustment script (see `CREDIT_NOTE_SERVER_SCRIPT_INSTALLATION.md`)
   - Script should be active and enabled

4. **Frontend Application**:
   - Next.js application running: `pnpm dev`
   - Application accessible at `http://localhost:3000`

## Test Data Preparation

### Create Test Sales Invoices

Before running integration tests, create test Sales Invoices with the following characteristics:


**Invoice 1: Simple Invoice (for basic flow testing)**
- Customer: Any test customer
- Items: 2-3 items
- Quantities: 10 units each
- Status: Paid
- Commission: Not required for this invoice

**Invoice 2: Commissioned Invoice (for commission testing)**
- Customer: Any test customer with sales person
- Items: 3-4 items
- Quantities: 5-10 units each
- Status: Paid
- Commission: Set `custom_komisi_sales` for each item (e.g., 50000, 75000, 100000)
- Total Commission: Should be calculated in `custom_total_komisi_sales`

**Invoice 3: Multi-Item Invoice (for partial return testing)**
- Customer: Any test customer
- Items: 5+ items with varying quantities
- Quantities: Mix of small (2-3) and large (20-30) quantities
- Status: Paid
- Commission: Optional

### Verify Accounting Period

Ensure there's an open Accounting Period:
1. Go to ERPNext → Accounting → Accounting Period
2. Verify there's a period covering today's date
3. Status should be "Open"
4. If no open period exists, create one

---

## Test Suite 21.1: Complete Create Credit Note Flow

**Objective**: Verify the complete flow of creating a Credit Note from a paid Sales Invoice.

**Requirements Validated**: 1.1 - 1.16

### Test Case 21.1.1: Access Credit Note Module

**Steps**:
1. Open the application at `http://localhost:3000`
2. Look for "Credit Note" menu item in the navigation (Sales section)
3. Click on "Credit Note" menu

**Expected Results**:
- ✓ "Credit Note" menu is visible in navigation
- ✓ Clicking menu navigates to `/credit-note` page
- ✓ Page displays Credit Note list view
- ✓ "Buat Credit Note Baru" (Create New Credit Note) button is visible

**Validation**: Requirements 1.1, 1.2

---

### Test Case 21.1.2: Open Create Credit Note Form

**Steps**:
1. From Credit Note list page, click "Buat Credit Note Baru" button
2. Observe the form that appears

**Expected Results**:
- ✓ Form displays with empty fields
- ✓ "Pilih Sales Invoice" (Select Sales Invoice) button is visible
- ✓ Posting date field shows today's date
- ✓ Form is in create mode (not edit mode)

**Validation**: Requirements 1.2

---

### Test Case 21.1.3: Select Paid Sales Invoice

**Steps**:
1. Click "Pilih Sales Invoice" button
2. Observe the dialog that opens
3. Verify the list shows only paid invoices
4. Use search to filter by customer name
5. Select "Invoice 1" (the simple test invoice)
6. Click "Pilih" (Select) button

**Expected Results**:
- ✓ Dialog opens showing list of Sales Invoices
- ✓ All displayed invoices have status "Paid"
- ✓ Search filter works correctly
- ✓ Selecting an invoice closes the dialog
- ✓ Form populates with invoice details:
  - Customer name
  - Customer code
  - Invoice number in "Sales Invoice Asli" field
- ✓ Items table populates with invoice items
- ✓ Each item shows: item code, name, original qty, remaining qty, rate, UOM

**Validation**: Requirements 1.3, 1.4

---

### Test Case 21.1.4: Select Items and Quantities for Return

**Steps**:
1. In the items table, check the checkbox for the first item
2. Check the checkbox for the second item (leave third unchecked if exists)
3. For the first item, enter return quantity = 5 (assuming original qty >= 5)
4. For the second item, enter return quantity = 3 (assuming original qty >= 3)
5. Observe the "Remaining Qty" column updates
6. Observe the total calculation at the bottom

**Expected Results**:
- ✓ Checkboxes work correctly
- ✓ Only checked items are included in the return
- ✓ Quantity input accepts positive numbers
- ✓ Quantity input validates against remaining quantity
- ✓ Error message appears if quantity exceeds remaining
- ✓ Total amount calculates correctly: (qty1 × rate1) + (qty2 × rate2)
- ✓ If invoice has commission, commission adjustment displays (negative value)

**Validation**: Requirements 1.5, 1.6, 1.9, 8.1, 8.2, 8.3, 8.4

---

### Test Case 21.1.5: Select Return Reasons

**Steps**:
1. For the first selected item, click the "Alasan Retur" (Return Reason) dropdown
2. Select "Damaged" from the dropdown
3. For the second selected item, select "Other" from the dropdown
4. Observe that a notes field appears for the second item
5. Enter notes: "Customer changed mind" in the notes field
6. Try to submit without filling notes for "Other" reason

**Expected Results**:
- ✓ Return reason dropdown shows all options:
  - Damaged
  - Quality Issue
  - Wrong Item
  - Customer Request
  - Expired
  - Other
- ✓ Selecting "Other" shows additional notes field
- ✓ Notes field is required when "Other" is selected
- ✓ Validation error appears if "Other" selected but notes empty
- ✓ Other reasons don't require notes (optional)

**Validation**: Requirements 1.7, 1.8

---

### Test Case 21.1.6: Submit Credit Note Form

**Steps**:
1. Verify all required fields are filled:
   - Customer (auto-filled from invoice)
   - Posting date (today's date)
   - Sales Invoice selected
   - At least one item checked with qty > 0
   - Return reason for each selected item
   - Notes for items with "Other" reason
2. Click "Simpan" (Save) button
3. Wait for the operation to complete

**Expected Results**:
- ✓ Loading indicator appears on the button
- ✓ Form is disabled during submission
- ✓ Success notification appears: "Credit Note berhasil dibuat"
- ✓ Page redirects to Credit Note list or detail view
- ✓ New Credit Note appears in the list with status "Draft"

**Validation**: Requirements 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16

---

### Test Case 21.1.7: Verify Created Credit Note

**Steps**:
1. From the Credit Note list, find the newly created Credit Note
2. Click on it to view details
3. Verify all information is correct

**Expected Results**:
- ✓ Credit Note number is generated (e.g., ACC-SINV-2024-00123)
- ✓ Status shows "Draft"
- ✓ Customer name matches original invoice
- ✓ Posting date matches what was entered
- ✓ "Sales Invoice Asli" shows the original invoice number
- ✓ Items table shows:
  - Only the selected items (not all items from original invoice)
  - Quantities match what was entered
  - Rates match original invoice
  - Amounts are calculated correctly
  - Return reasons are saved
  - Return notes are saved for items with "Other" reason
- ✓ Total amount is negative (Credit Note reduces revenue)
- ✓ If original invoice had commission:
  - Each item shows `custom_komisi_sales` (negative value)
  - Total commission adjustment shows in header (negative value)
  - Commission is proportional to returned quantity

**Validation**: Requirements 1.12, 1.13, 1.14, 4.1, 4.2, 4.3, 4.4, 4.5

---

### Test Case 21.1.8: Verify in ERPNext Backend

**Steps**:
1. Open ERPNext in another browser tab
2. Go to Accounting → Sales Invoice
3. Filter by `is_return = 1`
4. Find the Credit Note just created
5. Open it and verify details

**Expected Results**:
- ✓ Credit Note exists in ERPNext
- ✓ `is_return` field = 1
- ✓ `return_against` field references the original Sales Invoice
- ✓ All item details match what was entered in frontend
- ✓ `docstatus` = 0 (Draft)
- ✓ Commission fields are populated if applicable

**Validation**: Requirements 1.14, 9.1, 9.2

---

## Test Suite 21.2: Submit and Cancel Flow

**Objective**: Verify Credit Note submission creates GL entries and updates returned quantities, and cancellation reverses everything.

**Requirements Validated**: 3.1 - 3.9

### Test Case 21.2.1: Submit Draft Credit Note

**Steps**:
1. From Credit Note list, open the Draft Credit Note created in Test 21.1
2. Verify the "Submit" button is visible
3. Click "Submit" button
4. Confirm in the confirmation dialog
5. Wait for operation to complete

**Expected Results**:
- ✓ "Submit" button is visible for Draft Credit Notes
- ✓ Confirmation dialog appears asking for confirmation
- ✓ Loading indicator shows during submission
- ✓ Success notification appears: "Credit Note berhasil di-submit"
- ✓ Status changes from "Draft" to "Submitted"
- ✓ "Submit" button disappears
- ✓ "Cancel" button appears
- ✓ Document becomes read-only (no edit allowed)

**Validation**: Requirements 3.1, 3.2

---

### Test Case 21.2.2: Verify GL Entries Created

**Steps**:
1. In ERPNext, go to Accounting → General Ledger
2. Filter by:
   - Voucher Type = "Sales Invoice"
   - Voucher No = [Credit Note number]
3. Review the GL entries

**Expected Results**:
- ✓ GL entries exist for the Credit Note
- ✓ Entries include:
  - Debit to Revenue account (reverses original sale)
  - Credit to Customer account (reduces receivable)
  - Tax entries if applicable
- ✓ All amounts are opposite sign from original invoice
- ✓ Posting date matches Credit Note posting date
- ✓ Entries are balanced (total debit = total credit)

**Validation**: Requirements 3.4, 9.9

---

### Test Case 21.2.3: Verify Returned Quantity Updated

**Steps**:
1. In ERPNext, open the original Sales Invoice (the one referenced in `return_against`)
2. Go to the Items table
3. Check the `returned_qty` field for items that were returned

**Expected Results**:
- ✓ `returned_qty` field is updated for returned items
- ✓ Values match the quantities in the Credit Note
- ✓ For example, if original qty = 10 and Credit Note qty = 5:
  - `returned_qty` should now be 5
- ✓ Items not included in Credit Note have `returned_qty` = 0
- ✓ Multiple Credit Notes accumulate correctly (test later)

**Validation**: Requirements 3.3

---

### Test Case 21.2.4: Verify Stock Ledger Updated

**Steps**:
1. In ERPNext, go to Stock → Stock Ledger
2. Filter by:
   - Item Code = [one of the returned items]
   - Warehouse = [warehouse from Credit Note]
   - Voucher No = [Credit Note number]
3. Review the stock entries

**Expected Results**:
- ✓ Stock entries exist for returned items
- ✓ Quantity is positive (stock increases due to return)
- ✓ Voucher Type = "Sales Invoice"
- ✓ Voucher No = Credit Note number
- ✓ Stock balance increases by returned quantity

**Validation**: Requirements 9.10

---

### Test Case 21.2.5: Cancel Submitted Credit Note

**Steps**:
1. From the submitted Credit Note detail view, click "Cancel" button
2. Confirm in the confirmation dialog
3. Wait for operation to complete

**Expected Results**:
- ✓ "Cancel" button is visible for Submitted Credit Notes
- ✓ Confirmation dialog appears with warning message
- ✓ Loading indicator shows during cancellation
- ✓ Success notification appears: "Credit Note berhasil dibatalkan"
- ✓ Status changes to "Cancelled"
- ✓ "Cancel" button disappears
- ✓ Document remains read-only
- ✓ Cancelled badge shows in red

**Validation**: Requirements 3.5, 3.6

---

### Test Case 21.2.6: Verify GL Entries Reversed

**Steps**:
1. In ERPNext, go to Accounting → General Ledger
2. Filter by Voucher No = [Credit Note number]
3. Review the GL entries after cancellation

**Expected Results**:
- ✓ Original GL entries are marked as cancelled
- ✓ Reversal entries are created with opposite signs
- ✓ Net effect is zero (all entries cancelled out)
- ✓ `is_cancelled` field = 1 for all entries

**Validation**: Requirements 3.6, 9.9

---

### Test Case 21.2.7: Verify Returned Quantity Reversed

**Steps**:
1. In ERPNext, open the original Sales Invoice
2. Check the `returned_qty` field for items that were returned

**Expected Results**:
- ✓ `returned_qty` is reduced back to previous value
- ✓ If this was the only Credit Note, `returned_qty` = 0
- ✓ If there were other Credit Notes, `returned_qty` reflects only those

**Validation**: Requirements 3.6

---

### Test Case 21.2.8: Verify Stock Ledger Reversed

**Steps**:
1. In ERPNext, go to Stock → Stock Ledger
2. Filter by Voucher No = [Credit Note number]
3. Review the stock entries

**Expected Results**:
- ✓ Reversal entries exist with opposite quantities
- ✓ Net effect on stock is zero
- ✓ Stock balance returns to pre-Credit Note level

**Validation**: Requirements 9.10

---

### Test Case 21.2.9: Test Accounting Period Validation

**Steps**:
1. Create a new Credit Note with posting date in a closed period
2. Try to submit it
3. Alternatively, close the accounting period for an existing Draft Credit Note
4. Try to submit it

**Expected Results**:
- ✓ Submission fails with error message
- ✓ Error message indicates accounting period is closed
- ✓ Error message is in Indonesian
- ✓ Credit Note remains in Draft status
- ✓ User can edit posting date to fix the issue

**Validation**: Requirements 3.7, 9.8

---

### Test Case 21.2.10: Test Error Handling

**Steps**:
1. Disconnect from ERPNext backend (stop ERPNext or block network)
2. Try to submit a Credit Note
3. Observe error handling

**Expected Results**:
- ✓ Error notification appears
- ✓ Error message is user-friendly: "Gagal terhubung ke server"
- ✓ Loading state clears
- ✓ Form remains in previous state
- ✓ User can retry after connection is restored

**Validation**: Requirements 3.8, 11.9, 11.10

---

## Test Suite 21.3: Commission Adjustment Flow

**Objective**: Verify that Credit Notes correctly adjust commission values in the original Sales Invoice and display properly in the Commission Dashboard.

**Requirements Validated**: 7.1 - 7.12

### Test Case 21.3.1: Create Credit Note from Commissioned Invoice

**Steps**:
1. Navigate to Credit Note creation page
2. Select "Invoice 2" (the commissioned test invoice)
3. Verify commission values are displayed
4. Select 2 items for return
5. For first item: return 50% of quantity
6. For second item: return 100% of quantity
7. Observe commission calculations
8. Fill in return reasons
9. Save as Draft

**Expected Results**:
- ✓ Original invoice items show `custom_komisi_sales` values
- ✓ When items are selected, commission adjustment calculates
- ✓ Commission adjustment is proportional to quantity:
  - Item 1: commission = -(original_commission × 0.5)
  - Item 2: commission = -(original_commission × 1.0)
- ✓ Total commission adjustment = sum of item commissions (negative)
- ✓ Commission values display in the form
- ✓ Credit Note saves successfully with commission data

**Validation**: Requirements 7.1, 7.2, 7.12

---

### Test Case 21.3.2: Submit Credit Note and Verify Commission Adjustment

**Steps**:
1. Before submitting, note the `custom_total_komisi_sales` value in the original Sales Invoice (in ERPNext)
2. Submit the Credit Note created in Test 21.3.1
3. Wait for submission to complete
4. Go to ERPNext and open the original Sales Invoice
5. Check the `custom_total_komisi_sales` field

**Expected Results**:
- ✓ Credit Note submits successfully
- ✓ In original Sales Invoice:
  - `custom_total_komisi_sales` is reduced
  - New value = original value - Credit Note commission adjustment
  - For example: if original = 225000 and Credit Note = -75000
    - New value should be 150000
- ✓ Calculation is accurate to 2 decimal places

**Validation**: Requirements 7.3, 7.4

---

### Test Case 21.3.3: Verify Commission Adjustment in Commission Dashboard

**Steps**:
1. Navigate to Commission Dashboard (if exists in the application)
2. Find the original Sales Invoice in the Paid Invoices table
3. Look for "Credit Note Adjustments" column
4. Click on the invoice to see details

**Expected Results**:
- ✓ Commission Dashboard displays the invoice
- ✓ "Credit Note Adjustments" column shows the adjustment amount
- ✓ Adjustment amount matches the Credit Note commission (negative)
- ✓ "Net Commission" column shows: earned commission - adjustments
- ✓ Detail view shows list of Credit Notes affecting this invoice
- ✓ Each Credit Note shows:
  - Credit Note number
  - Date
  - Amount
  - Commission adjustment

**Validation**: Requirements 7.5, 7.6, 7.7, 7.8, 7.9

---

### Test Case 21.3.4: Test Multiple Credit Notes Commission Accumulation

**Steps**:
1. Create a second Credit Note from the same commissioned invoice
2. Select different items or remaining quantity
3. Submit the second Credit Note
4. Check the original invoice commission again

**Expected Results**:
- ✓ Second Credit Note creates successfully
- ✓ Commission adjustment accumulates correctly
- ✓ Original invoice `custom_total_komisi_sales` = 
  - original - first Credit Note - second Credit Note
- ✓ Commission Dashboard shows both Credit Notes
- ✓ Total adjustment = sum of all Credit Note adjustments

**Validation**: Requirements 7.3, 7.4, 7.9

---

### Test Case 21.3.5: Test Commission Adjustment Reversal on Cancel

**Steps**:
1. Note the current `custom_total_komisi_sales` in original invoice
2. Cancel one of the Credit Notes
3. Check the original invoice commission again

**Expected Results**:
- ✓ Credit Note cancels successfully
- ✓ Commission adjustment is reversed
- ✓ Original invoice `custom_total_komisi_sales` increases back
- ✓ New value = previous value + cancelled Credit Note commission
- ✓ Commission Dashboard updates to reflect cancellation
- ✓ Cancelled Credit Note no longer counts in adjustments

**Validation**: Requirements 7.3, 7.4

---

### Test Case 21.3.6: Test Warning for Paid Commission

**Steps**:
1. In ERPNext, create a Commission Payment Entry that includes the commissioned invoice
2. Mark the commission as paid
3. Now create a Credit Note from that invoice
4. Check if warning appears in Commission Dashboard

**Expected Results**:
- ✓ Commission Dashboard shows warning indicator
- ✓ Warning message indicates commission was already paid
- ✓ Warning suggests reviewing the commission payment
- ✓ Credit Note still processes normally
- ✓ Adjustment is tracked for reconciliation

**Validation**: Requirements 7.11

---

### Test Case 21.3.7: Verify Server Script Execution

**Steps**:
1. Check ERPNext Error Log for any script errors
2. Verify the server script is active:
   - Go to ERPNext → Customization → Server Script
   - Find "Credit Note Commission Adjustment"
   - Verify it's enabled
3. Review script execution logs if available

**Expected Results**:
- ✓ No errors in Error Log related to commission script
- ✓ Server script is enabled and active
- ✓ Script executes on Credit Note submit and cancel
- ✓ Commission adjustments happen automatically

**Validation**: Requirements 7.3, 7.4

---

## Test Suite 21.4: Partial Return Scenarios

**Objective**: Verify that partial returns work correctly, including multiple Credit Notes for the same invoice and proper accumulation of returned quantities.

**Requirements Validated**: 8.1 - 8.8

### Test Case 21.4.1: Create First Partial Credit Note

**Steps**:
1. Navigate to Credit Note creation
2. Select "Invoice 3" (the multi-item test invoice)
3. Select only 2 out of 5+ items
4. For selected items, return only partial quantities:
   - Item 1: return 30% of original quantity
   - Item 2: return 50% of original quantity
5. Fill in return reasons
6. Save and submit the Credit Note

**Expected Results**:
- ✓ Only selected items appear in Credit Note
- ✓ Unselected items are not included
- ✓ Partial quantities are accepted
- ✓ Total calculates based only on selected items and quantities
- ✓ Credit Note saves and submits successfully
- ✓ In original invoice, `returned_qty` updates only for returned items:
  - Item 1: returned_qty = 30% of original
  - Item 2: returned_qty = 50% of original
  - Other items: returned_qty = 0

**Validation**: Requirements 8.1, 8.2, 8.3, 8.4, 8.5

---

### Test Case 21.4.2: Verify Remaining Returnable Quantity

**Steps**:
1. Create a new Credit Note from the same "Invoice 3"
2. Select the same items that were partially returned
3. Observe the "Remaining Qty" column

**Expected Results**:
- ✓ Remaining quantity reflects previous returns:
  - Item 1: remaining = original × 70% (since 30% was returned)
  - Item 2: remaining = original × 50% (since 50% was returned)
- ✓ Items not previously returned show full original quantity
- ✓ Validation prevents entering quantity > remaining
- ✓ Error message is clear: "Quantity exceeds remaining returnable quantity"

**Validation**: Requirements 5.2, 5.5, 8.8

---

### Test Case 21.4.3: Create Second Partial Credit Note

**Steps**:
1. From the form in Test 21.4.2, select different items:
   - Item 3: return 100% of quantity
   - Item 4: return 25% of quantity
2. Also select Item 1 again and return additional 40% of original quantity
3. Fill in return reasons
4. Save and submit

**Expected Results**:
- ✓ Second Credit Note creates successfully
- ✓ Mix of new items and previously returned items works
- ✓ Accumulated returns for Item 1:
  - First Credit Note: 30%
  - Second Credit Note: 40%
  - Total returned: 70%
  - Remaining: 30%
- ✓ New items (3, 4) have correct returned_qty
- ✓ Total returned quantity across all Credit Notes doesn't exceed original

**Validation**: Requirements 8.7

---

### Test Case 21.4.4: Test Maximum Return Limit

**Steps**:
1. Create a third Credit Note from "Invoice 3"
2. Select Item 1 (which now has 70% returned, 30% remaining)
3. Try to enter quantity > remaining 30%
4. Try to enter exactly the remaining 30%

**Expected Results**:
- ✓ Entering quantity > remaining shows validation error
- ✓ Error message: "Quantity exceeds remaining returnable quantity"
- ✓ Form prevents submission with invalid quantity
- ✓ Entering exactly remaining 30% is accepted
- ✓ After submitting, Item 1 is fully returned (100%)
- ✓ Further Credit Notes cannot include Item 1 (remaining = 0)

**Validation**: Requirements 5.3, 8.7

---

### Test Case 21.4.5: Verify Accumulated Returns in Original Invoice

**Steps**:
1. In ERPNext, open "Invoice 3" (the original invoice)
2. Review the Items table
3. Check `returned_qty` for each item

**Expected Results**:
- ✓ Item 1: returned_qty = 100% (fully returned across 3 Credit Notes)
- ✓ Item 2: returned_qty = 50% (from first Credit Note)
- ✓ Item 3: returned_qty = 100% (from second Credit Note)
- ✓ Item 4: returned_qty = 25% (from second Credit Note)
- ✓ Item 5 (if exists): returned_qty = 0 (never returned)
- ✓ All values are accurate and match Credit Note quantities

**Validation**: Requirements 8.7

---

### Test Case 21.4.6: Test Partial Return with Commission

**Steps**:
1. Create a Credit Note from "Invoice 2" (commissioned invoice)
2. Select one item and return 60% of quantity
3. Verify commission calculation
4. Submit the Credit Note
5. Create a second Credit Note for the same item, return remaining 40%
6. Verify commission calculation again

**Expected Results**:
- ✓ First Credit Note:
  - Commission = -(original_commission × 0.6)
  - Proportional to returned quantity
- ✓ Second Credit Note:
  - Commission = -(original_commission × 0.4)
  - Proportional to remaining quantity
- ✓ Total commission adjustment = original_commission (fully returned)
- ✓ Original invoice commission reduced to 0 for that item
- ✓ Calculations are accurate to 2 decimal places

**Validation**: Requirements 7.12, 8.7

---

### Test Case 21.4.7: Test Minimum Selection Validation

**Steps**:
1. Create a new Credit Note
2. Select a Sales Invoice
3. Don't check any item checkboxes
4. Try to submit the form

**Expected Results**:
- ✓ Validation error appears
- ✓ Error message: "Pilih minimal satu item untuk diretur"
- ✓ Form doesn't submit
- ✓ User must select at least one item to proceed

**Validation**: Requirements 8.6, 11.4

---

### Test Case 21.4.8: Test Partial Return Report

**Steps**:
1. Navigate to Credit Note Report page
2. Set date range to include all test Credit Notes
3. Filter by customer (Invoice 3's customer)
4. Review the report

**Expected Results**:
- ✓ Report shows all Credit Notes for the customer
- ✓ Multiple Credit Notes for same invoice are listed separately
- ✓ Total return value = sum of all Credit Notes
- ✓ Grouping by invoice shows accumulated returns
- ✓ Export to Excel includes all partial return details

**Validation**: Requirements 6.1 - 6.11

---

## Additional Integration Tests

### Test Case 21.5: List and Filter Functionality

**Steps**:
1. Navigate to Credit Note list page
2. Test date range filter:
   - Set from_date = 1 week ago
   - Set to_date = today
   - Click "Filter"
3. Test customer filter:
   - Enter customer name in search
   - Verify results
4. Test status filter:
   - Select "Draft" only
   - Select "Submitted" only
   - Select "Cancelled" only
5. Test document number search:
   - Enter partial Credit Note number
   - Verify results
6. Test pagination:
   - Navigate to page 2
   - Navigate back to page 1
7. Test mobile view:
   - Resize browser to mobile width
   - Verify infinite scroll works

**Expected Results**:
- ✓ Date range filter works correctly
- ✓ Only Credit Notes within date range appear
- ✓ Customer search filters correctly (partial match)
- ✓ Status filter shows only matching statuses
- ✓ Document number search works (partial match)
- ✓ Pagination shows correct page numbers
- ✓ Total records count is accurate
- ✓ Mobile view switches to card layout
- ✓ Infinite scroll loads more items on mobile
- ✓ All filters can be combined

**Validation**: Requirements 2.1 - 2.10

---

### Test Case 21.6: Validation and Error Handling

**Steps**:
1. Test required field validation:
   - Try to save without selecting invoice
   - Try to save without return reason
   - Try to save with "Other" reason but no notes
2. Test quantity validation:
   - Enter 0 quantity
   - Enter negative quantity
   - Enter quantity exceeding remaining
3. Test date validation:
   - Enter invalid date format
   - Enter date in closed accounting period
4. Test network error handling:
   - Disconnect network
   - Try to load Credit Note list
   - Try to submit Credit Note

**Expected Results**:
- ✓ All required field validations work
- ✓ Error messages are clear and in Indonesian
- ✓ Quantity validations prevent invalid values
- ✓ Date validations work correctly
- ✓ Accounting period validation prevents submission
- ✓ Network errors show user-friendly messages
- ✓ Forms remain in valid state after errors
- ✓ Users can correct errors and retry

**Validation**: Requirements 5.1 - 5.7, 11.1 - 11.10

---

### Test Case 21.7: UI Consistency and Responsiveness

**Steps**:
1. Test on desktop (1920x1080):
   - Navigate through all Credit Note pages
   - Verify layout and spacing
2. Test on tablet (768x1024):
   - Navigate through all pages
   - Verify responsive behavior
3. Test on mobile (375x667):
   - Navigate through all pages
   - Verify mobile-specific features
4. Test loading states:
   - Observe loading indicators during API calls
5. Test success notifications:
   - Create, submit, cancel Credit Notes
   - Verify toast notifications
6. Test confirmation dialogs:
   - Try to submit Credit Note
   - Try to cancel Credit Note
   - Verify dialog appearance and behavior

**Expected Results**:
- ✓ Desktop layout uses table view with pagination
- ✓ Mobile layout uses card view with infinite scroll
- ✓ All text is in Indonesian (Bahasa Indonesia)
- ✓ Color scheme matches application:
  - Indigo for primary actions
  - Green for success states
  - Yellow for warnings
  - Red for danger/cancel actions
- ✓ Loading buttons show spinner during operations
- ✓ Loading spinner appears during data fetching
- ✓ Toast notifications appear for all operations
- ✓ Confirmation dialogs appear before destructive actions
- ✓ All forms are accessible and keyboard-navigable
- ✓ Date formats use Indonesian locale (DD/MM/YYYY)
- ✓ Currency formats use Indonesian locale (Rp)

**Validation**: Requirements 10.1 - 10.10, 12.7

---

### Test Case 21.8: Audit Trail and History

**Steps**:
1. Create a Credit Note (note the logged-in user)
2. View the Credit Note detail
3. Check audit information displayed
4. In ERPNext, check the document history
5. Submit the Credit Note
6. Check audit information again
7. Cancel the Credit Note
8. Check final audit information

**Expected Results**:
- ✓ Created by shows correct username
- ✓ Creation date shows correct timestamp
- ✓ Modified by updates when document is edited
- ✓ Modified date updates with each change
- ✓ After submit:
  - Submitted by is recorded
  - Submitted date is recorded
- ✓ After cancel:
  - Cancelled by is recorded
  - Cancelled date is recorded
- ✓ All dates display in Indonesian format
- ✓ Timeline shows all status changes
- ✓ ERPNext document history matches frontend display

**Validation**: Requirements 12.1 - 12.7

---

## Edge Cases and Stress Tests

### Test Case 21.9: Decimal Quantity Handling

**Steps**:
1. Create a Sales Invoice with decimal quantities (e.g., 2.5, 10.75)
2. Create a Credit Note with decimal return quantities (e.g., 1.25, 5.5)
3. Verify calculations
4. Submit and verify GL entries

**Expected Results**:
- ✓ Decimal quantities are accepted
- ✓ Calculations are accurate to 2 decimal places
- ✓ Remaining quantity calculations handle decimals correctly
- ✓ GL entries show correct decimal amounts
- ✓ No rounding errors accumulate

---

### Test Case 21.10: Large Quantity Values

**Steps**:
1. Create a Sales Invoice with large quantities (e.g., 10000 units)
2. Create a Credit Note returning large quantities
3. Verify calculations and performance

**Expected Results**:
- ✓ Large numbers are handled correctly
- ✓ No integer overflow errors
- ✓ Calculations remain accurate
- ✓ UI displays large numbers properly
- ✓ Performance is acceptable

---

### Test Case 21.11: Multiple Items (20+ items)

**Steps**:
1. Create a Sales Invoice with 20+ items
2. Create a Credit Note selecting all items
3. Verify form performance and usability
4. Submit and verify processing time

**Expected Results**:
- ✓ Form handles many items without performance issues
- ✓ Scrolling is smooth
- ✓ Calculations are fast
- ✓ Submission completes in reasonable time (<10 seconds)
- ✓ All items are processed correctly

---

### Test Case 21.12: Concurrent Credit Notes

**Steps**:
1. Open two browser tabs
2. In both tabs, start creating Credit Note from same invoice
3. In tab 1, select items 1-2 and submit
4. In tab 2, select items 3-4 and submit
5. Verify both Credit Notes process correctly

**Expected Results**:
- ✓ Both Credit Notes save successfully
- ✓ No race condition errors
- ✓ Returned quantities accumulate correctly
- ✓ No data corruption
- ✓ Both Credit Notes appear in list

---

### Test Case 21.13: Special Characters in Notes

**Steps**:
1. Create a Credit Note
2. In return notes, enter special characters:
   - Quotes: "test" and 'test'
   - Symbols: @#$%^&*()
   - Indonesian characters: é, ñ, etc.
   - Line breaks and spaces
3. Save and verify

**Expected Results**:
- ✓ All characters are accepted
- ✓ No SQL injection or XSS vulnerabilities
- ✓ Characters display correctly after save
- ✓ No encoding issues
- ✓ Data integrity maintained

---

### Test Case 21.14: Date Boundary Testing

**Steps**:
1. Test Credit Note on first day of accounting period
2. Test Credit Note on last day of accounting period
3. Test Credit Note on day after period closes
4. Test with posting date in future
5. Test with posting date in past (but within open period)

**Expected Results**:
- ✓ First day of period: works correctly
- ✓ Last day of period: works correctly
- ✓ After period closes: validation error
- ✓ Future date: accepted if within open period
- ✓ Past date: accepted if within open period
- ✓ Error messages are clear about period restrictions

---

## Performance Benchmarks

### Test Case 21.15: Response Time Benchmarks

**Objective**: Verify acceptable performance for all operations.

**Benchmarks**:
- List Credit Notes (20 items): < 2 seconds
- Load Credit Note detail: < 1 second
- Create Credit Note: < 3 seconds
- Submit Credit Note: < 5 seconds
- Cancel Credit Note: < 5 seconds
- Load Sales Invoice dialog: < 2 seconds
- Filter/search operations: < 1 second

**Steps**:
1. Use browser DevTools Network tab
2. Measure time for each operation
3. Repeat 3 times and average

**Expected Results**:
- ✓ All operations complete within benchmark times
- ✓ No operations timeout
- ✓ UI remains responsive during operations
- ✓ Loading indicators show for operations > 500ms

---

## Regression Testing Checklist

After any code changes to Credit Note feature, verify:

- [ ] All 4 main test suites pass (21.1 - 21.4)
- [ ] No console errors in browser
- [ ] No errors in ERPNext error log
- [ ] Commission calculations remain accurate
- [ ] GL entries are created correctly
- [ ] Stock ledger updates correctly
- [ ] Returned quantities accumulate correctly
- [ ] All validations still work
- [ ] UI remains consistent with design
- [ ] Mobile view still works
- [ ] Indonesian translations are correct
- [ ] No performance degradation

---

## Test Data Cleanup

After completing all tests:

1. **Cancel all test Credit Notes**:
   - Go through Credit Note list
   - Cancel all submitted test Credit Notes
   - Delete all draft test Credit Notes

2. **Verify original invoices**:
   - Check that returned_qty is reset to 0
   - Check that commission values are restored
   - Verify GL entries are reversed

3. **Clean up test data** (optional):
   - Delete test Sales Invoices if created specifically for testing
   - Archive test customers if needed
   - Clean up test items if created

---

## Troubleshooting Guide

### Issue: Credit Note not creating

**Possible Causes**:
- ERPNext backend not running
- Authentication credentials invalid
- Accounting period closed
- Sales Invoice not in "Paid" status

**Solutions**:
1. Check ERPNext is accessible at `ERPNEXT_API_URL`
2. Verify API credentials in `.env`
3. Check accounting period is open
4. Verify Sales Invoice status in ERPNext

---

### Issue: Commission not adjusting

**Possible Causes**:
- Server script not installed
- Server script disabled
- Original invoice doesn't have commission values
- Script execution error

**Solutions**:
1. Install server script (see `CREDIT_NOTE_SERVER_SCRIPT_INSTALLATION.md`)
2. Enable server script in ERPNext
3. Check ERPNext Error Log for script errors
4. Verify original invoice has `custom_komisi_sales` values

---

### Issue: GL entries not created

**Possible Causes**:
- Credit Note not submitted (still Draft)
- ERPNext permissions issue
- Accounting configuration missing

**Solutions**:
1. Ensure Credit Note is submitted, not just saved
2. Check user has permission to create GL entries
3. Verify Chart of Accounts is configured
4. Check ERPNext Error Log for details

---

### Issue: Returned quantity not updating

**Possible Causes**:
- Credit Note not submitted
- ERPNext version compatibility
- Item not properly linked to original invoice

**Solutions**:
1. Ensure Credit Note is submitted
2. Verify ERPNext version supports return mechanism
3. Check `si_detail` field links to original invoice item
4. Verify `return_against` field is set correctly

---

### Issue: Validation errors not showing

**Possible Causes**:
- Frontend validation disabled
- JavaScript errors in console
- API not returning proper error format

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify API error responses include proper message format
3. Test with browser DevTools open
4. Check network tab for API response details

---

## Test Report Template

Use this template to document test execution:

```
# Credit Note Integration Test Report

**Date**: [Date of testing]
**Tester**: [Your name]
**Environment**: [Development/Staging/Production]
**ERPNext Version**: [Version number]
**Frontend Version**: [Git commit hash]

## Test Summary

- Total Test Cases: 21
- Passed: [Number]
- Failed: [Number]
- Skipped: [Number]
- Pass Rate: [Percentage]

## Test Results

### Test Suite 21.1: Complete Create Credit Note Flow
- [ ] 21.1.1: Access Credit Note Module - PASS/FAIL
- [ ] 21.1.2: Open Create Credit Note Form - PASS/FAIL
- [ ] 21.1.3: Select Paid Sales Invoice - PASS/FAIL
- [ ] 21.1.4: Select Items and Quantities - PASS/FAIL
- [ ] 21.1.5: Select Return Reasons - PASS/FAIL
- [ ] 21.1.6: Submit Credit Note Form - PASS/FAIL
- [ ] 21.1.7: Verify Created Credit Note - PASS/FAIL
- [ ] 21.1.8: Verify in ERPNext Backend - PASS/FAIL

### Test Suite 21.2: Submit and Cancel Flow
- [ ] 21.2.1: Submit Draft Credit Note - PASS/FAIL
- [ ] 21.2.2: Verify GL Entries Created - PASS/FAIL
- [ ] 21.2.3: Verify Returned Quantity Updated - PASS/FAIL
- [ ] 21.2.4: Verify Stock Ledger Updated - PASS/FAIL
- [ ] 21.2.5: Cancel Submitted Credit Note - PASS/FAIL
- [ ] 21.2.6: Verify GL Entries Reversed - PASS/FAIL
- [ ] 21.2.7: Verify Returned Quantity Reversed - PASS/FAIL
- [ ] 21.2.8: Verify Stock Ledger Reversed - PASS/FAIL
- [ ] 21.2.9: Test Accounting Period Validation - PASS/FAIL
- [ ] 21.2.10: Test Error Handling - PASS/FAIL

### Test Suite 21.3: Commission Adjustment Flow
- [ ] 21.3.1: Create Credit Note from Commissioned Invoice - PASS/FAIL
- [ ] 21.3.2: Submit and Verify Commission Adjustment - PASS/FAIL
- [ ] 21.3.3: Verify in Commission Dashboard - PASS/FAIL
- [ ] 21.3.4: Test Multiple Credit Notes Accumulation - PASS/FAIL
- [ ] 21.3.5: Test Commission Reversal on Cancel - PASS/FAIL
- [ ] 21.3.6: Test Warning for Paid Commission - PASS/FAIL
- [ ] 21.3.7: Verify Server Script Execution - PASS/FAIL

### Test Suite 21.4: Partial Return Scenarios
- [ ] 21.4.1: Create First Partial Credit Note - PASS/FAIL
- [ ] 21.4.2: Verify Remaining Returnable Quantity - PASS/FAIL
- [ ] 21.4.3: Create Second Partial Credit Note - PASS/FAIL
- [ ] 21.4.4: Test Maximum Return Limit - PASS/FAIL
- [ ] 21.4.5: Verify Accumulated Returns - PASS/FAIL
- [ ] 21.4.6: Test Partial Return with Commission - PASS/FAIL
- [ ] 21.4.7: Test Minimum Selection Validation - PASS/FAIL
- [ ] 21.4.8: Test Partial Return Report - PASS/FAIL

## Issues Found

[List any issues discovered during testing]

1. Issue: [Description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]
   - Screenshot: [Link if available]

## Performance Notes

[Document any performance observations]

## Recommendations

[Any recommendations for improvements]

## Sign-off

Tested by: ___________________
Date: ___________________
Approved by: ___________________
Date: ___________________
```

---

## Conclusion

This integration testing guide provides comprehensive coverage of the Credit Note Management feature. All test cases should be executed before deploying to production. Any failures should be investigated and resolved before proceeding.

For automated testing, consider implementing:
- API integration tests using Jest
- E2E tests using Playwright
- Property-based tests for calculations
- Performance monitoring in production

**Next Steps**:
1. Execute all test cases in this document
2. Document results using the test report template
3. Fix any issues found
4. Re-test failed cases
5. Get sign-off from stakeholders
6. Deploy to production with confidence

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Maintained By**: Development Team
