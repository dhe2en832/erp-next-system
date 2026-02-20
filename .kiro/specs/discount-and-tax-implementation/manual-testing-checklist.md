# Manual Testing Checklist - Staging Environment
**Task 19.5**: Manual testing di staging environment  
**Validates**: Requirements 15.11

## Overview

Dokumen ini berisi checklist untuk manual testing di staging environment sebelum deployment ke production. Testing ini dilakukan untuk memastikan semua fitur berfungsi dengan baik dalam environment yang mirip dengan production.

## Prerequisites

- [ ] Staging environment sudah di-deploy dengan code terbaru
- [ ] Database staging sudah di-sync dengan production (anonymized data)
- [ ] API credentials sudah dikonfigurasi di staging
- [ ] Tax templates sudah dibuat di staging
- [ ] Test data sudah disiapkan (customers, suppliers, items)

## Test Scenarios

### 1. Sales Invoice - Discount Percentage

**Objective**: Verify discount percentage calculation works correctly

**Steps**:
1. Login ke staging environment
2. Navigate ke Sales Invoice form
3. Pilih customer: "Test Customer 1"
4. Tambahkan item:
   - Item Code: ITEM-001
   - Qty: 10
   - Rate: Rp 100.000
   - Subtotal: Rp 1.000.000
5. Input discount percentage: 10%
6. Verify calculation:
   - Discount Amount: Rp 100.000
   - Net Total: Rp 900.000
   - Grand Total: Rp 900.000
7. Save dan submit invoice
8. Verify GL Entry:
   - Debit Piutang Usaha: Rp 900.000
   - Debit Potongan Penjualan: Rp 100.000
   - Credit Pendapatan Penjualan: Rp 1.000.000
   - Total Debit = Total Credit

**Expected Result**: ✅ Invoice created successfully, GL Entry balanced

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 2. Sales Invoice - Discount Amount

**Objective**: Verify discount amount calculation works correctly

**Steps**:
1. Navigate ke Sales Invoice form
2. Pilih customer: "Test Customer 2"
3. Tambahkan item:
   - Item Code: ITEM-002
   - Qty: 5
   - Rate: Rp 200.000
   - Subtotal: Rp 1.000.000
4. Input discount amount: Rp 150.000
5. Verify calculation:
   - Discount Percentage: 15%
   - Net Total: Rp 850.000
   - Grand Total: Rp 850.000
6. Save dan submit invoice
7. Verify GL Entry balanced

**Expected Result**: ✅ Invoice created successfully, GL Entry balanced

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 3. Sales Invoice - PPN 11%

**Objective**: Verify PPN 11% tax calculation works correctly

**Steps**:
1. Navigate ke Sales Invoice form
2. Pilih customer: "Test Customer 3"
3. Tambahkan item:
   - Item Code: ITEM-003
   - Qty: 10
   - Rate: Rp 100.000
   - Subtotal: Rp 1.000.000
4. Pilih tax template: "PPN 11%"
5. Verify calculation:
   - Net Total: Rp 1.000.000
   - PPN 11%: Rp 110.000
   - Grand Total: Rp 1.110.000
6. Save dan submit invoice
7. Verify GL Entry:
   - Debit Piutang Usaha: Rp 1.110.000
   - Credit Pendapatan Penjualan: Rp 1.000.000
   - Credit Hutang PPN: Rp 110.000

**Expected Result**: ✅ Invoice created successfully, GL Entry balanced

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 4. Sales Invoice - Discount + PPN

**Objective**: Verify kombinasi discount dan PPN works correctly

**Steps**:
1. Navigate ke Sales Invoice form
2. Pilih customer: "Test Customer 4"
3. Tambahkan item:
   - Item Code: ITEM-004
   - Qty: 10
   - Rate: Rp 100.000
   - Subtotal: Rp 1.000.000
4. Input discount percentage: 10%
5. Pilih tax template: "PPN 11%"
6. Verify calculation:
   - Discount Amount: Rp 100.000
   - Net Total: Rp 900.000
   - PPN 11%: Rp 99.000
   - Grand Total: Rp 999.000
7. Save dan submit invoice
8. Verify GL Entry:
   - Debit Piutang Usaha: Rp 999.000
   - Debit Potongan Penjualan: Rp 100.000
   - Credit Pendapatan Penjualan: Rp 1.000.000
   - Credit Hutang PPN: Rp 99.000

**Expected Result**: ✅ Invoice created successfully, GL Entry balanced

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 5. Sales Invoice - PPN + PPh 23

**Objective**: Verify multiple taxes (PPN + PPh 23) works correctly

**Steps**:
1. Navigate ke Sales Invoice form
2. Pilih customer: "Test Customer 5"
3. Tambahkan item:
   - Item Code: ITEM-005
   - Qty: 10
   - Rate: Rp 100.000
   - Subtotal: Rp 1.000.000
4. Pilih tax template: "PPN 11% + PPh 23 (2%)"
5. Verify calculation:
   - Net Total: Rp 1.000.000
   - PPN 11%: Rp 110.000
   - PPh 23 (2%): Rp 20.000 (deduct)
   - Grand Total: Rp 1.090.000
6. Save dan submit invoice
7. Verify GL Entry:
   - Debit Piutang Usaha: Rp 1.090.000
   - Credit Pendapatan Penjualan: Rp 1.000.000
   - Credit Hutang PPN: Rp 110.000
   - Credit Hutang PPh 23: Rp 20.000

**Expected Result**: ✅ Invoice created successfully, GL Entry balanced

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 6. Purchase Invoice - Discount + PPN Masukan

**Objective**: Verify Purchase Invoice dengan discount dan PPN Masukan

**Steps**:
1. Navigate ke Purchase Invoice form
2. Pilih supplier: "Test Supplier 1"
3. Tambahkan item:
   - Item Code: ITEM-006
   - Qty: 10
   - Rate: Rp 100.000
   - Subtotal: Rp 1.000.000
4. Input discount percentage: 10%
5. Pilih tax template: "PPN Masukan 11% (PKP)"
6. Verify calculation:
   - Discount Amount: Rp 100.000
   - Net Total: Rp 900.000
   - PPN Masukan 11%: Rp 99.000
   - Grand Total: Rp 999.000
7. Save dan submit invoice
8. Verify GL Entry:
   - Debit Persediaan: Rp 900.000
   - Debit Pajak Dibayar Dimuka: Rp 99.000
   - Credit Hutang Usaha: Rp 999.000

**Expected Result**: ✅ Invoice created successfully, GL Entry balanced

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 7. Laporan Laba Rugi - Potongan Penjualan

**Objective**: Verify Laporan Laba Rugi menampilkan Potongan Penjualan

**Steps**:
1. Navigate ke Laporan Laba Rugi
2. Pilih periode: Bulan berjalan
3. Verify report structure:
   - Pendapatan Penjualan: Rp X
   - Potongan Penjualan: Rp Y (displayed as negative)
   - Net Sales: Rp (X - Y)
4. Verify calculation correct
5. Verify currency formatting: "Rp" prefix, pemisah ribuan

**Expected Result**: ✅ Report displays correctly with Potongan Penjualan

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 8. Laporan Neraca - Akun Pajak

**Objective**: Verify Laporan Neraca menampilkan akun pajak

**Steps**:
1. Navigate ke Laporan Neraca
2. Pilih tanggal: Hari ini
3. Verify akun pajak displayed:
   - Aset Lancar:
     - 1410 - Pajak Dibayar Dimuka: Rp X
   - Kewajiban Lancar:
     - 2210 - Hutang PPN: Rp Y
     - 2230 - Hutang PPh 23: Rp Z
4. Verify saldo calculation correct
5. Verify currency formatting

**Expected Result**: ✅ Report displays tax accounts correctly

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 9. Laporan PPN

**Objective**: Verify Laporan PPN calculation dan export

**Steps**:
1. Navigate ke Laporan PPN
2. Pilih periode: Bulan berjalan
3. Verify report structure:
   - PPN Output section (dari Sales Invoice)
   - PPN Input section (dari Purchase Invoice)
   - Summary: PPN Kurang/Lebih Bayar = Output - Input
4. Verify calculation correct
5. Click "Export to Excel"
6. Verify Excel file downloaded
7. Open Excel file, verify format correct

**Expected Result**: ✅ Report displays correctly, export works

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 10. Backward Compatibility - Old Invoice

**Objective**: Verify old invoices (tanpa discount/tax) tetap berfungsi

**Steps**:
1. Cari invoice lama (created before implementation)
2. Open invoice form
3. Verify form loads without error
4. Verify discount fields show default values (0)
5. Verify tax fields show default values (empty)
6. Edit invoice (change customer name)
7. Save invoice
8. Verify GL Entry unchanged

**Expected Result**: ✅ Old invoices work correctly, no errors

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 11. Performance Testing

**Objective**: Verify API response time < 500ms

**Steps**:
1. Open browser DevTools (Network tab)
2. Create new Sales Invoice dengan discount dan tax
3. Measure API response time untuk:
   - POST /api/sales/invoices
   - GET /api/sales/invoices
   - GET /api/setup/tax-templates
4. Verify response time < 500ms untuk semua endpoints

**Expected Result**: ✅ All API responses < 500ms

**Actual Result**: _[To be filled during testing]_

**API Response Times**:
- POST /api/sales/invoices: ___ ms
- GET /api/sales/invoices: ___ ms
- GET /api/setup/tax-templates: ___ ms

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

### 12. Error Handling

**Objective**: Verify error handling works correctly

**Steps**:
1. Try to create invoice dengan discount > 100%
   - Expected: Error message "Discount percentage must be between 0 and 100"
2. Try to create invoice dengan discount amount > subtotal
   - Expected: Error message "Discount amount cannot exceed subtotal"
3. Try to create invoice dengan invalid tax template
   - Expected: Error message "Tax template not found"
4. Try to submit invoice tanpa items
   - Expected: Error message "Invoice must have at least one item"

**Expected Result**: ✅ All error messages displayed correctly

**Actual Result**: _[To be filled during testing]_

**Status**: [ ] Pass / [ ] Fail

**Notes**: _[Any issues or observations]_

---

## Summary

**Total Test Scenarios**: 12

**Passed**: ___ / 12

**Failed**: ___ / 12

**Overall Status**: [ ] All Pass / [ ] Some Fail

## Issues Found

| # | Scenario | Issue Description | Severity | Status |
|---|----------|-------------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Levels**:
- **Critical**: Blocks deployment, must be fixed immediately
- **High**: Major functionality broken, should be fixed before deployment
- **Medium**: Minor functionality issue, can be fixed after deployment
- **Low**: Cosmetic issue, can be fixed later

## Recommendations

_[To be filled after testing]_

## Sign-off

**Tested By**: ___________________

**Date**: ___________________

**Approved By**: ___________________

**Date**: ___________________

---

**Document Status**: Ready for Testing  
**Created**: 2024-01-15  
**Feature**: discount-and-tax-implementation  
**Task**: 19.5 Manual testing di staging environment
