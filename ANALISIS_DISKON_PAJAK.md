# Analisa Implementasi Diskon dan Pajak

## 📋 Executive Summary

Dokumen ini berisi analisa lengkap untuk implementasi fitur diskon dan pajak pada sistem ERP yang sudah berjalan. Implementasi harus dilakukan dengan sangat hati-hati untuk menghindari error pada sistem yang sudah production.

**Status Sistem Saat Ini:**
- ✅ COA sudah lengkap dengan 221 accounts
- ✅ Sales Invoice dan Purchase Invoice sudah berjalan
- ✅ GL Entry auto-posting sudah berfungsi
- ❌ Diskon belum terimplementasi di UI dan API
- ❌ Pajak belum terimplementasi di UI dan API
- ❌ Laporan keuangan belum memperhitungkan diskon/pajak

**Risiko Implementasi:**
- 🔴 HIGH: Perubahan struktur data bisa break existing invoices
- 🔴 HIGH: Perubahan GL Entry logic bisa corrupt financial reports
- 🟡 MEDIUM: UI changes bisa confuse existing users
- 🟢 LOW: Backward compatibility jika dilakukan dengan benar

---

## 1. Analisa COA untuk Diskon dan Pajak

### 1.1 Akun Pajak yang Sudah Ada

Berdasarkan COA_README.md dan COA-Analysis-and-Opening-Balance.md:

**Akun Pajak (Tax) - Liability:**
```
2210 - Hutang PPN (Output Tax)
2220 - Hutang PPh 21
2230 - Hutang PPh 23  
2240 - Hutang PPh 4(2) Final
```

**Akun Pajak (Tax Asset) - Asset:**
```
1410 - Pajak Dibayar Dimuka (Prepaid Tax / Input Tax)
```

✅ **STATUS**: Akun pajak sudah lengkap untuk PPN dan PPh.

### 1.2 Akun Diskon yang Perlu Ditambahkan

**BELUM ADA** di COA saat ini. Perlu ditambahkan:

**Diskon Penjualan (Sales Discount) - Contra Income:**
```
4200 - Retur Penjualan (sudah ada)
4300 - Potongan Penjualan (sudah ada) ← BISA DIGUNAKAN UNTUK DISKON
```

**Diskon Pembelian (Purchase Discount) - Contra COGS:**
```
5200 - Retur Pembelian (sudah ada)
5300 - Potongan Pembelian (sudah ada) ← BISA DIGUNAKAN UNTUK DISKON
```

✅ **REKOMENDASI**: Gunakan akun yang sudah ada (4300 dan 5300) untuk diskon.
Tidak perlu membuat akun baru.

---

## 2. Analisa ERPNext DocType Structure

### 2.1 Sales Invoice Structure (ERPNext Standard)

ERPNext Sales Invoice sudah memiliki field untuk diskon dan pajak:

**Item Level (Sales Invoice Item):**
```python
{
  "item_code": "ITEM-001",
  "qty": 10,
  "rate": 100000,  # Harga satuan
  
  # DISKON ITEM
  "discount_percentage": 10,  # Diskon %
  "discount_amount": 10000,   # Diskon Rp (auto-calculated)
  "price_list_rate": 100000,  # Harga list
  "rate": 90000,              # Harga setelah diskon
  
  # AMOUNT
  "amount": 900000,  # qty * rate (setelah diskon)
  "net_amount": 900000,
  
  # TAX (calculated by tax template)
  "item_tax_template": "PPN 11%",
  "item_tax_rate": "{\"PPN 11%\": 11}"
}
```

**Document Level (Sales Invoice):**
```python
{
  # TOTALS BEFORE TAX
  "total": 900000,        # Sum of all items amount
  "net_total": 900000,    # Total after item discount
  
  # DISKON DOKUMEN (Additional Discount)
  "apply_discount_on": "Grand Total",  # atau "Net Total"
  "additional_discount_percentage": 5,
  "discount_amount": 45000,  # 5% dari 900000
  
  # TAXES (from taxes_and_charges template)
  "taxes_and_charges": "PPN 11%",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "2210 - Hutang PPN",
      "rate": 11,
      "tax_amount": 94050,  # 11% dari (900000 - 45000)
      "total": 949050
    }
  ],
  
  # GRAND TOTAL
  "grand_total": 949050,  # net_total - discount + tax
  "rounded_total": 949000,
  "outstanding_amount": 949000
}
```

✅ **STATUS**: ERPNext sudah support diskon dan pajak secara native!

### 2.2 Purchase Invoice Structure

Sama seperti Sales Invoice, Purchase Invoice juga sudah memiliki field diskon dan pajak.

**Perbedaan:**
- Tax account menggunakan "1410 - Pajak Dibayar Dimuka" (Input Tax/PPN Masukan)
- Atau "2210 - Hutang PPN" jika non-PKP

---

## 3. Analisa GL Entry Impact

### 3.1 Jurnal Sales Invoice TANPA Diskon/Pajak (Current)

```
Debit:  1210 - Piutang Usaha          Rp 1.000.000
  Kredit: 4100 - Pendapatan Penjualan         Rp 1.000.000

Debit:  5100 - HPP Barang Dagang      Rp 600.000
  Kredit: 1310 - Persediaan                   Rp 600.000
```

### 3.2 Jurnal Sales Invoice DENGAN Diskon Item (10%)

```
Debit:  1210 - Piutang Usaha          Rp 900.000
  Kredit: 4100 - Pendapatan Penjualan         Rp 900.000

Debit:  5100 - HPP Barang Dagang      Rp 600.000
  Kredit: 1310 - Persediaan                   Rp 600.000
```

**Catatan**: Diskon item langsung mengurangi pendapatan. Tidak ada jurnal terpisah.

### 3.3 Jurnal Sales Invoice DENGAN Diskon Dokumen (5%)

```
Debit:  1210 - Piutang Usaha          Rp 950.000
Debit:  4300 - Potongan Penjualan     Rp 50.000
  Kredit: 4100 - Pendapatan Penjualan         Rp 1.000.000

Debit:  5100 - HPP Barang Dagang      Rp 600.000
  Kredit: 1310 - Persediaan                   Rp 600.000
```

**Catatan**: Diskon dokumen dicatat sebagai contra-income (pengurang pendapatan).

### 3.4 Jurnal Sales Invoice DENGAN Pajak PPN 11%

```
Debit:  1210 - Piutang Usaha          Rp 1.110.000
  Kredit: 4100 - Pendapatan Penjualan         Rp 1.000.000
  Kredit: 2210 - Hutang PPN                   Rp 110.000

Debit:  5100 - HPP Barang Dagang      Rp 600.000
  Kredit: 1310 - Persediaan                   Rp 600.000
```

### 3.5 Jurnal Sales Invoice LENGKAP (Diskon + Pajak)

**Scenario**: 
- Harga: Rp 1.000.000
- Diskon Item: 10% = Rp 100.000
- Subtotal: Rp 900.000
- Diskon Dokumen: 5% = Rp 45.000
- Net Total: Rp 855.000
- PPN 11%: Rp 94.050
- Grand Total: Rp 949.050

```
Debit:  1210 - Piutang Usaha          Rp 949.050
Debit:  4300 - Potongan Penjualan     Rp 50.950  (diskon total)
  Kredit: 4100 - Pendapatan Penjualan         Rp 1.000.000
  Kredit: 2210 - Hutang PPN                   Rp 94.050

Debit:  5100 - HPP Barang Dagang      Rp 600.000
  Kredit: 1310 - Persediaan                   Rp 600.000
```

**ATAU** (jika diskon item tidak dicatat terpisah):

```
Debit:  1210 - Piutang Usaha          Rp 949.050
Debit:  4300 - Potongan Penjualan     Rp 45.000  (hanya diskon dokumen)
  Kredit: 4100 - Pendapatan Penjualan         Rp 900.000  (sudah net diskon item)
  Kredit: 2210 - Hutang PPN                   Rp 94.050

Debit:  5100 - HPP Barang Dagang      Rp 600.000
  Kredit: 1310 - Persediaan                   Rp 600.000
```

✅ **REKOMENDASI**: Gunakan opsi kedua (diskon item tidak dicatat terpisah).
Lebih sederhana dan sesuai dengan praktek akuntansi umum.

---

## 4. Analisa Purchase Invoice GL Entry

### 4.1 Jurnal Purchase Invoice TANPA Diskon/Pajak (Current)

```
Debit:  1310 - Persediaan             Rp 600.000
  Kredit: 2110 - Hutang Usaha                 Rp 600.000
```

### 4.2 Jurnal Purchase Invoice DENGAN Diskon (10%)

```
Debit:  1310 - Persediaan             Rp 540.000
  Kredit: 2110 - Hutang Usaha                 Rp 540.000
```

**Catatan**: Diskon pembelian langsung mengurangi harga perolehan persediaan.

### 4.3 Jurnal Purchase Invoice DENGAN PPN Masukan (11%)

**Jika PKP (dapat dikreditkan):**
```
Debit:  1310 - Persediaan             Rp 600.000
Debit:  1410 - Pajak Dibayar Dimuka   Rp 66.000  (PPN Masukan)
  Kredit: 2110 - Hutang Usaha                 Rp 666.000
```

**Jika Non-PKP (tidak dapat dikreditkan):**
```
Debit:  1310 - Persediaan             Rp 666.000  (termasuk PPN)
  Kredit: 2110 - Hutang Usaha                 Rp 666.000
```

### 4.4 Jurnal Purchase Invoice LENGKAP (Diskon + Pajak PKP)

**Scenario**:
- Harga: Rp 600.000
- Diskon: 10% = Rp 60.000
- Net: Rp 540.000
- PPN 11%: Rp 59.400
- Total: Rp 599.400

```
Debit:  1310 - Persediaan             Rp 540.000
Debit:  1410 - Pajak Dibayar Dimuka   Rp 59.400
  Kredit: 2110 - Hutang Usaha                 Rp 599.400
```

---

## 5. Analisa Impact pada Laporan Keuangan

### 5.1 Laporan Laba Rugi (Income Statement)

**SEBELUM (Tanpa Diskon/Pajak):**
```
Pendapatan Penjualan              Rp 10.000.000
HPP                              (Rp  6.000.000)
-------------------------------------------
Laba Kotor                        Rp  4.000.000
Beban Operasional                (Rp  2.000.000)
-------------------------------------------
Laba Bersih                       Rp  2.000.000
```

**SESUDAH (Dengan Diskon/Pajak):**
```
Pendapatan Penjualan              Rp 10.000.000
Potongan Penjualan (Diskon)      (Rp    500.000)
-------------------------------------------
Pendapatan Bersih                 Rp  9.500.000
HPP                              (Rp  6.000.000)
-------------------------------------------
Laba Kotor                        Rp  3.500.000
Beban Operasional                (Rp  2.000.000)
-------------------------------------------
Laba Bersih                       Rp  1.500.000
```

**Catatan PPN**: PPN TIDAK masuk Laba Rugi karena merupakan hutang/piutang pajak.

### 5.2 Laporan Neraca (Balance Sheet)

**Perubahan:**
- **Piutang Usaha**: Bertambah dengan nilai termasuk PPN
- **Hutang PPN**: Bertambah dengan nilai PPN Output
- **Pajak Dibayar Dimuka**: Bertambah dengan nilai PPN Input (jika PKP)

**Contoh:**
```
AKTIVA:
Piutang Usaha                     Rp 10.545.000  (termasuk PPN)
Pajak Dibayar Dimuka (PPN Input)  Rp    594.000

KEWAJIBAN:
Hutang PPN (Output)               Rp  1.045.000
```

**PPN yang harus disetor** = PPN Output - PPN Input = Rp 451.000

---

## 6. Analisa Backward Compatibility

### 6.1 Existing Invoices

**Risiko**: Invoice yang sudah ada tidak memiliki data diskon/pajak.

**Solusi**:
1. ✅ Field diskon/pajak di ERPNext sudah ada, default = 0
2. ✅ Existing invoices akan tetap valid dengan nilai 0
3. ✅ GL Entry existing tidak perlu diubah
4. ✅ Laporan akan tetap akurat (0 diskon/pajak = sama dengan sebelumnya)

**Action Required**: TIDAK ADA. Backward compatible secara otomatis.

### 6.2 API Changes

**Current API** (`POST /api/sales/invoices`):
```typescript
{
  "company": "BAC",
  "customer": "CUST-001",
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": 10,
      "rate": 100000
    }
  ]
}
```

**New API** (dengan diskon/pajak):
```typescript
{
  "company": "BAC",
  "customer": "CUST-001",
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": 10,
      "rate": 100000,
      "discount_percentage": 10,  // OPTIONAL
      "item_tax_template": "PPN 11%"  // OPTIONAL
    }
  ],
  "additional_discount_percentage": 5,  // OPTIONAL
  "taxes_and_charges": "PPN 11%"  // OPTIONAL
}
```

✅ **STATUS**: Backward compatible. Field baru bersifat OPTIONAL.

---

## 7. Analisa Tax Templates (ERPNext)

### 7.1 Sales Taxes and Charges Template

ERPNext menggunakan template untuk pajak. Perlu dibuat template:

**Template: "PPN 11%"**
```python
{
  "title": "PPN 11%",
  "company": "BAC",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "2210 - Hutang PPN - BAC",
      "description": "PPN 11%",
      "rate": 11
    }
  ]
}
```

**Template: "PPN 11% + PPh 23 (2%)"**
```python
{
  "title": "PPN 11% + PPh 23 (2%)",
  "company": "BAC",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "2210 - Hutang PPN - BAC",
      "description": "PPN 11%",
      "rate": 11
    },
    {
      "charge_type": "On Net Total",
      "account_head": "2230 - Hutang PPh 23 - BAC",
      "description": "PPh 23 (2%)",
      "rate": -2,  // Negatif karena mengurangi
      "add_deduct_tax": "Deduct"
    }
  ]
}
```

### 7.2 Purchase Taxes and Charges Template

**Template: "PPN Masukan 11% (PKP)"**
```python
{
  "title": "PPN Masukan 11% (PKP)",
  "company": "BAC",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "1410 - Pajak Dibayar Dimuka - BAC",
      "description": "PPN Masukan 11%",
      "rate": 11,
      "add_deduct_tax": "Add"
    }
  ]
}
```

**Template: "PPN Masukan 11% (Non-PKP)"**
```python
{
  "title": "PPN Masukan 11% (Non-PKP)",
  "company": "BAC",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "1310 - Persediaan - BAC",
      "description": "PPN Masukan 11% (masuk HPP)",
      "rate": 11,
      "add_deduct_tax": "Add",
      "included_in_print_rate": 1
    }
  ]
}
```

---

## 8. Analisa UI/UX Changes

### 8.1 Sales Invoice Form

**Perlu ditambahkan:**

1. **Item Level Discount**:
   - Input field: Discount %
   - Auto-calculate: Discount Amount
   - Display: Rate after discount

2. **Item Level Tax**:
   - Dropdown: Tax Template (optional)
   - Display: Tax amount per item

3. **Document Level Discount**:
   - Input field: Additional Discount %
   - Display: Discount amount
   - Display: Net total after discount

4. **Document Level Tax**:
   - Dropdown: Tax Template (PPN 11%, PPN + PPh, etc.)
   - Display: Tax breakdown
   - Display: Grand total

5. **Summary Section**:
   ```
   Subtotal:              Rp 1.000.000
   Diskon Item:          (Rp   100.000)
   -----------------------------------
   Net Total:             Rp   900.000
   Diskon Tambahan:      (Rp    45.000)
   -----------------------------------
   Subtotal Setelah Diskon: Rp 855.000
   PPN 11%:               Rp    94.050
   -----------------------------------
   GRAND TOTAL:           Rp   949.050
   ```

### 8.2 Purchase Invoice Form

Sama seperti Sales Invoice, dengan perbedaan:
- Tax template untuk PPN Masukan
- Pilihan PKP/Non-PKP

---

## 9. Rekomendasi Implementasi

### 9.1 Phase 1: Setup Tax Templates (Week 1)

**Priority**: 🔴 CRITICAL

**Tasks**:
1. Buat Sales Taxes and Charges Template di ERPNext
   - PPN 11%
   - PPN 11% + PPh 23 (2%)
   - PPN 11% + PPh 22 (1.5%)

2. Buat Purchase Taxes and Charges Template di ERPNext
   - PPN Masukan 11% (PKP)
   - PPN Masukan 11% (Non-PKP)

3. Test template dengan dummy invoice di ERPNext UI
4. Verify GL Entry generated correctly

**Deliverables**:
- ✅ Tax templates created and tested
- ✅ GL Entry validation passed
- ✅ Documentation updated

---

### 9.2 Phase 2: API Enhancement (Week 2-3)

**Priority**: 🔴 HIGH

**Tasks**:
1. Update Sales Invoice API (`POST /api/sales/invoices`)
   - Add optional fields: discount_percentage, discount_amount, taxes_and_charges
   - Maintain backward compatibility
   - Add validation for tax template existence

2. Update Purchase Invoice API (`POST /api/purchase/invoices`)
   - Same as Sales Invoice

3. Update GET APIs to include discount/tax fields
   - `/api/sales/invoices` - include discount and tax in response
   - `/api/purchase/invoices` - include discount and tax in response

4. Add new API endpoint: `/api/setup/tax-templates`
   - GET: List all tax templates
   - Used by frontend dropdown

5. Comprehensive API testing
   - Test with discount only
   - Test with tax only
   - Test with both discount and tax
   - Test backward compatibility (no discount/tax)

**Deliverables**:
- ✅ API endpoints updated
- ✅ Backward compatibility maintained
- ✅ API documentation updated
- ✅ Postman collection updated

---

### 9.3 Phase 3: UI Implementation (Week 4-5)

**Priority**: 🟡 MEDIUM

**Tasks**:
1. Create reusable components:
   - `<DiscountInput>` - for item and document level discount
   - `<TaxTemplateSelect>` - dropdown for tax templates
   - `<InvoiceSummary>` - display subtotal, discount, tax, grand total

2. Update Sales Invoice Form:
   - Add discount fields to item table
   - Add document discount section
   - Add tax template dropdown
   - Add invoice summary section
   - Real-time calculation

3. Update Purchase Invoice Form:
   - Same as Sales Invoice
   - Add PKP/Non-PKP toggle

4. Update Invoice List View:
   - Display discount amount column
   - Display tax amount column
   - Display grand total (with tax)

5. Update Invoice Detail View:
   - Show discount breakdown
   - Show tax breakdown
   - Show GL Entry with discount/tax accounts

**Deliverables**:
- ✅ UI components created
- ✅ Forms updated with discount/tax fields
- ✅ Real-time calculation working
- ✅ User testing completed

---

### 9.4 Phase 4: Reports Update (Week 6)

**Priority**: 🟡 MEDIUM

**Tasks**:
1. Update Laporan Laba Rugi:
   - Add "Potongan Penjualan" line (contra-income)
   - Recalculate "Pendapatan Bersih"
   - Verify HPP not affected by discount

2. Update Laporan Neraca:
   - Verify Piutang includes PPN
   - Verify Hutang PPN displayed correctly
   - Verify Pajak Dibayar Dimuka displayed correctly

3. Create new report: "Laporan PPN"
   - PPN Output (from Sales Invoice)
   - PPN Input (from Purchase Invoice)
   - PPN to be paid (Output - Input)
   - Period filter

4. Update existing reports:
   - Sales Report: include discount column
   - Purchase Report: include discount column
   - Margin Analysis: recalculate with discount

**Deliverables**:
- ✅ Financial reports updated
- ✅ PPN report created
- ✅ All reports tested with discount/tax data

---

### 9.5 Phase 5: Testing & Documentation (Week 7)

**Priority**: 🔴 CRITICAL

**Tasks**:
1. End-to-end testing:
   - Create Sales Invoice with discount + tax
   - Verify GL Entry
   - Create Payment Entry
   - Verify financial reports
   - Test with existing invoices (backward compatibility)

2. User Acceptance Testing (UAT):
   - Train accounting team
   - Test real scenarios
   - Collect feedback
   - Fix issues

3. Documentation:
   - Update user manual
   - Create video tutorial
   - Document tax template setup
   - Document troubleshooting guide

4. Deployment preparation:
   - Backup database
   - Prepare rollback plan
   - Schedule deployment window
   - Notify users

**Deliverables**:
- ✅ All tests passed
- ✅ UAT completed
- ✅ Documentation complete
- ✅ Ready for production deployment

---

## 10. Risk Mitigation

### 10.1 Data Corruption Risk

**Risk**: GL Entry corruption bisa merusak laporan keuangan.

**Mitigation**:
1. ✅ Test extensively di development environment
2. ✅ Backup database sebelum deployment
3. ✅ Deploy di off-peak hours
4. ✅ Monitor GL Entry setelah deployment
5. ✅ Siapkan rollback script

### 10.2 User Confusion Risk

**Risk**: User bingung dengan field baru.

**Mitigation**:
1. ✅ Training session sebelum deployment
2. ✅ Video tutorial
3. ✅ In-app help text
4. ✅ Gradual rollout (optional fields first)

### 10.3 Performance Risk

**Risk**: Calculation overhead bisa slow down invoice creation.

**Mitigation**:
1. ✅ Optimize calculation logic
2. ✅ Use ERPNext built-in calculation (already optimized)
3. ✅ Load test dengan 1000+ invoices
4. ✅ Monitor API response time

---

## 11. Success Criteria

### 11.1 Functional Requirements

- ✅ Diskon item dapat diinput dan dihitung otomatis
- ✅ Diskon dokumen dapat diinput dan dihitung otomatis
- ✅ Pajak dapat dipilih dari template dan dihitung otomatis
- ✅ GL Entry generated correctly dengan akun diskon dan pajak
- ✅ Laporan keuangan menampilkan diskon dan pajak dengan benar
- ✅ Backward compatibility dengan existing invoices

### 11.2 Non-Functional Requirements

- ✅ API response time < 500ms
- ✅ UI responsive dan user-friendly
- ✅ No data corruption
- ✅ No breaking changes untuk existing features
- ✅ Documentation complete dan up-to-date

---

## 12. Kesimpulan

### 12.1 Kelayakan Implementasi

✅ **FEASIBLE** - Implementasi diskon dan pajak dapat dilakukan dengan aman karena:
1. ERPNext sudah support diskon dan pajak secara native
2. COA sudah memiliki akun yang diperlukan
3. Backward compatibility terjamin
4. Risk dapat dimitigasi dengan testing yang baik

### 12.2 Estimasi Waktu

**Total**: 7 minggu (1.75 bulan)

- Week 1: Tax Templates Setup
- Week 2-3: API Enhancement
- Week 4-5: UI Implementation
- Week 6: Reports Update
- Week 7: Testing & Documentation

### 12.3 Rekomendasi

1. ✅ **PROCEED** dengan implementasi
2. ✅ Follow phase-by-phase approach
3. ✅ Extensive testing di setiap phase
4. ✅ User training sebelum deployment
5. ✅ Monitor closely setelah deployment

---

**Dokumen Dibuat**: {{ CURRENT_DATE }}  
**Versi**: 1.0  
**Status**: Ready for Spec Creation  
**Next Step**: Create Requirements → Design → Tasks

