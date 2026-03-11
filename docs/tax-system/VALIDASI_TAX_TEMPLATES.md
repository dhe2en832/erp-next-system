# Panduan Validasi Tax Templates dengan Dummy Invoices

## Task 1.6: Validasi Tax Templates dengan Dummy Invoice

Dokumen ini berisi panduan untuk memvalidasi bahwa Tax Templates yang telah dibuat berfungsi dengan benar di ERPNext.

## Prerequisites

1. Tax Templates sudah dibuat (Task 1.1 - 1.5 completed)
2. ERPNext server running
3. Login sebagai user dengan akses ke Sales Invoice dan Purchase Invoice
4. Chart of Accounts sudah lengkap

## Validasi Sales Tax Templates

### Test 1: PPN 11%

**Langkah-langkah:**

1. **Buat Sales Invoice baru**
   - Masuk ke: Selling > Sales Invoice > New
   - Customer: Pilih customer test (atau buat baru)
   - Posting Date: Hari ini

2. **Tambahkan Item**
   - Item: Pilih item test
   - Qty: 10
   - Rate: 100,000
   - Amount: 1,000,000 (otomatis)

3. **Pilih Tax Template**
   - Scroll ke section "Taxes and Charges"
   - Pilih: "PPN 11%"
   - Sistem akan otomatis menghitung

4. **Verifikasi Perhitungan**
   ```
   Total:              Rp 1.000.000
   Net Total:          Rp 1.000.000
   PPN 11%:            Rp   110.000
   Grand Total:        Rp 1.110.000
   ```

5. **Submit Invoice**
   - Klik tombol "Submit"
   - Konfirmasi submit

6. **Verifikasi GL Entry**
   - Klik tab "Accounting Ledger" atau "View Ledger"
   - Verifikasi entries:
     ```
     Debit:  1210 - Piutang Usaha         Rp 1.110.000
     Credit: 4100 - Pendapatan Penjualan  Rp 1.000.000
     Credit: 2210 - Hutang PPN            Rp   110.000
     ```
   - **Pastikan:** Total Debit = Total Credit = Rp 1.110.000

7. **Verifikasi Akun 2210 - Hutang PPN**
   - Masuk ke: Accounting > Chart of Accounts
   - Cari akun: 2210 - Hutang PPN
   - Klik "View Ledger"
   - Verifikasi ada entry credit sebesar Rp 110.000

**Expected Result:** ✅ PASS
- Invoice submitted successfully
- GL Entry balanced
- Akun 2210 - Hutang PPN tercatat di credit side

---

### Test 2: PPN 11% + PPh 23 (2%)

**Langkah-langkah:**

1. **Buat Sales Invoice baru**
   - Customer: Pilih customer test
   - Item: Jasa Konsultasi
   - Qty: 1
   - Rate: 1,000,000

2. **Pilih Tax Template**
   - Taxes and Charges: "PPN 11% + PPh 23 (2%)"

3. **Verifikasi Perhitungan**
   ```
   Total:              Rp 1.000.000
   Net Total:          Rp 1.000.000
   PPN 11%:            Rp   110.000
   PPh 23 (2%):        Rp    20.000
   Grand Total:        Rp 1.130.000
   ```

4. **Submit dan Verifikasi GL Entry**
   ```
   Debit:  1210 - Piutang Usaha         Rp 1.130.000
   Credit: 4100 - Pendapatan Penjualan  Rp 1.000.000
   Credit: 2210 - Hutang PPN            Rp   110.000
   Credit: 2230 - Hutang PPh 23         Rp    20.000
   ```

**Expected Result:** ✅ PASS
- Multiple tax rows calculated correctly
- GL Entry balanced
- Both tax accounts credited

---

### Test 3: PPN 11% + PPh 22 (1.5%)

**Langkah-langkah:**

1. **Buat Sales Invoice baru**
   - Item: Barang Impor
   - Qty: 1
   - Rate: 1,000,000

2. **Pilih Tax Template**
   - Taxes and Charges: "PPN 11% + PPh 22 (1.5%)"

3. **Verifikasi Perhitungan**
   ```
   Total:              Rp 1.000.000
   Net Total:          Rp 1.000.000
   PPN 11%:            Rp   110.000
   PPh 22 (1.5%):      Rp    15.000
   Grand Total:        Rp 1.125.000
   ```

4. **Submit dan Verifikasi GL Entry**
   ```
   Debit:  1210 - Piutang Usaha              Rp 1.125.000
   Credit: 4100 - Pendapatan Penjualan       Rp 1.000.000
   Credit: 2210 - Hutang PPN                 Rp   110.000
   Credit: 2240 - Hutang PPh 4(2) Final      Rp    15.000
   ```

**Expected Result:** ✅ PASS

---

## Validasi Purchase Tax Templates

### Test 4: PPN Masukan 11% (PKP)

**Langkah-langkah:**

1. **Buat Purchase Invoice baru**
   - Masuk ke: Buying > Purchase Invoice > New
   - Supplier: Pilih supplier test
   - Item: Bahan Baku
   - Qty: 10
   - Rate: 60,000
   - Amount: 600,000

2. **Pilih Tax Template**
   - Taxes and Charges: "PPN Masukan 11% (PKP)"

3. **Verifikasi Perhitungan**
   ```
   Total:              Rp 600.000
   Net Total:          Rp 600.000
   PPN Masukan 11%:    Rp  66.000
   Grand Total:        Rp 666.000
   ```

4. **Submit dan Verifikasi GL Entry**
   ```
   Debit:  1310 - Persediaan                Rp 600.000
   Debit:  1410 - Pajak Dibayar Dimuka      Rp  66.000
   Credit: 2110 - Hutang Usaha              Rp 666.000
   ```

5. **Verifikasi Akun 1410 - Pajak Dibayar Dimuka**
   - Cek akun 1410 di Chart of Accounts
   - Verifikasi ada entry debit sebesar Rp 66.000
   - **Penting:** Ini adalah ASET (dapat dikreditkan)

**Expected Result:** ✅ PASS
- PPN Masukan tercatat sebagai aset
- GL Entry balanced

---

### Test 5: PPN Masukan 11% (Non-PKP)

**Langkah-langkah:**

1. **Buat Purchase Invoice baru**
   - Supplier: Pilih supplier test
   - Item: Supplies
   - Qty: 10
   - Rate: 60,000

2. **Pilih Tax Template**
   - Taxes and Charges: "PPN Masukan 11% (Non-PKP)"

3. **Verifikasi Perhitungan**
   ```
   Total:              Rp 600.000
   Net Total:          Rp 600.000
   PPN Masukan 11%:    Rp  66.000
   Grand Total:        Rp 666.000
   ```

4. **Submit dan Verifikasi GL Entry**
   ```
   Debit:  1310 - Persediaan                Rp 600.000
   Debit:  5100 - Beban Operasional         Rp  66.000
   Credit: 2110 - Hutang Usaha              Rp 666.000
   ```

5. **Verifikasi Akun 5100 - Beban Operasional**
   - Cek akun 5100 di Chart of Accounts
   - Verifikasi ada entry debit sebesar Rp 66.000
   - **Penting:** Ini adalah EXPENSE (tidak dapat dikreditkan)

**Expected Result:** ✅ PASS
- PPN Masukan tercatat sebagai beban
- GL Entry balanced

---

## Test dengan Diskon

### Test 6: Sales Invoice dengan Diskon + PPN

**Langkah-langkah:**

1. **Buat Sales Invoice**
   - Item: Produk A
   - Qty: 10
   - Rate: 100,000
   - Total: 1,000,000

2. **Tambahkan Diskon**
   - Scroll ke section "Additional Discount"
   - Additional Discount Percentage: 10%
   - Atau Additional Discount Amount: 100,000

3. **Pilih Tax Template**
   - Taxes and Charges: "PPN 11%"

4. **Verifikasi Perhitungan**
   ```
   Total:              Rp 1.000.000
   Discount (10%):     Rp   100.000
   Net Total:          Rp   900.000
   PPN 11%:            Rp    99.000  (11% dari 900.000)
   Grand Total:        Rp   999.000
   ```

5. **Submit dan Verifikasi GL Entry**
   ```
   Debit:  1210 - Piutang Usaha         Rp   999.000
   Debit:  4300 - Potongan Penjualan    Rp   100.000
   Credit: 4100 - Pendapatan Penjualan  Rp 1.000.000
   Credit: 2210 - Hutang PPN            Rp    99.000
   ```

**Expected Result:** ✅ PASS
- PPN dihitung dari Net Total (setelah diskon)
- Diskon tercatat di akun 4300 - Potongan Penjualan
- GL Entry balanced

---

## Checklist Validasi

Gunakan checklist ini untuk memastikan semua test case sudah dijalankan:

### Sales Tax Templates
- [ ] Test 1: PPN 11% - Invoice submitted successfully
- [ ] Test 1: PPN 11% - GL Entry balanced
- [ ] Test 1: PPN 11% - Akun 2210 tercatat dengan benar
- [ ] Test 2: PPN + PPh 23 - Multiple taxes calculated correctly
- [ ] Test 2: PPN + PPh 23 - GL Entry balanced
- [ ] Test 3: PPN + PPh 22 - Taxes calculated correctly
- [ ] Test 3: PPN + PPh 22 - GL Entry balanced

### Purchase Tax Templates
- [ ] Test 4: PPN Masukan (PKP) - Invoice submitted successfully
- [ ] Test 4: PPN Masukan (PKP) - Tercatat sebagai aset (1410)
- [ ] Test 4: PPN Masukan (PKP) - GL Entry balanced
- [ ] Test 5: PPN Masukan (Non-PKP) - Invoice submitted successfully
- [ ] Test 5: PPN Masukan (Non-PKP) - Tercatat sebagai beban (5100)
- [ ] Test 5: PPN Masukan (Non-PKP) - GL Entry balanced

### Discount + Tax
- [ ] Test 6: Diskon + PPN - Perhitungan benar (PPN dari Net Total)
- [ ] Test 6: Diskon + PPN - Diskon tercatat di akun 4300
- [ ] Test 6: Diskon + PPN - GL Entry balanced

---

## Troubleshooting

### Issue: Template tidak muncul di dropdown

**Solusi:**
1. Verifikasi template sudah dibuat dengan script
2. Cek status "Disabled" di template (harus unchecked)
3. Pastikan Company di template sama dengan Company di invoice

### Issue: Perhitungan pajak salah

**Solusi:**
1. Verifikasi rate pajak di template (11%, 2%, 1.5%)
2. Cek Charge Type: harus "On Net Total"
3. Verifikasi Account Head sudah benar

### Issue: GL Entry tidak balanced

**Solusi:**
1. Cek apakah semua account di COA ada
2. Verifikasi konfigurasi template
3. Lihat error message di ERPNext
4. Cek error log: bench --site [site-name] console

### Issue: Account tidak ditemukan

**Solusi:**
1. Masuk ke Chart of Accounts
2. Verifikasi account exists:
   - 2210 - Hutang PPN
   - 2230 - Hutang PPh 23
   - 2240 - Hutang PPh 4(2) Final
   - 1410 - Pajak Dibayar Dimuka
   - 5100 - Beban Operasional
3. Jika tidak ada, buat account dengan tipe yang sesuai

---

## Hasil Validasi

Setelah menjalankan semua test case, dokumentasikan hasilnya:

**Tanggal Validasi:** _________________

**Validator:** _________________

**Hasil:**
- [ ] Semua test case PASS
- [ ] Ada test case FAIL (jelaskan di bawah)

**Catatan:**
```
[Tulis catatan hasil validasi di sini]
```

**Status:** 
- [ ] ✅ APPROVED - Siap untuk production
- [ ] ⚠️ NEEDS FIX - Ada issue yang harus diperbaiki
- [ ] ❌ FAILED - Tidak siap untuk production

---

**Dokumen ini dibuat:** 2024-01-15  
**Task:** 1.6 - Validasi Tax Templates dengan dummy invoice  
**Status:** Ready for manual testing
