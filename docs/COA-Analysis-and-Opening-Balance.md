# Analisa Chart of Accounts & Panduan Opening Balance

Dokumen ini berisi analisa struktur COA sistem ERP terhadap standar akuntansi Indonesia, dokumentasi jurnal entry untuk setiap transaksi, dan panduan pengisian opening balance.

---

## 1. Struktur COA vs Standar Akuntansi

### Root Types (Sesuai Standar SAK/ERPNext)
Sistem menggunakan 5 root types standar yang sesuai dengan prinsip akuntansi:

| Root Type | Label Indonesia | Posisi Laporan | Normal Balance |
|-----------|----------------|----------------|----------------|
| **Asset** | Aktiva | Neraca (Kiri) | Debit |
| **Liability** | Kewajiban | Neraca (Kanan) | Kredit |
| **Equity** | Ekuitas | Neraca (Kanan) | Kredit |
| **Income** | Pendapatan | Laba Rugi | Kredit |
| **Expense** | Beban | Laba Rugi | Debit |

✅ **STATUS**: Struktur root_type sudah sesuai standar akuntansi.

---

### Account Types (Sub-Kategori)
Mapping account_type ke sub-kategori laporan:

#### AKTIVA (Asset)
- **Bank** - Rekening Bank
- **Cash** - Kas
- **Receivable** - Piutang Usaha
- **Stock** - Persediaan Barang Dagang
- **Fixed Asset** - Aset Tetap (Tanah, Bangunan, Kendaraan, Mesin)
- **Accumulated Depreciation** - Akumulasi Penyusutan (contra-asset)
- **Capital Work in Progress** - Aset dalam Pembangunan

#### KEWAJIBAN (Liability)
- **Payable** - Hutang Usaha
- **Tax** - Hutang Pajak (PPN, PPh)
- **Chargeable** - Biaya yang Dapat Dibebankan

#### EKUITAS (Equity)
- **Equity** - Modal Pemilik, Laba Ditahan

#### PENDAPATAN (Income)
- **Income Account** - Pendapatan Usaha (Penjualan)

#### BEBAN (Expense)
- **Cost of Goods Sold** - Harga Pokok Penjualan (HPP)
- **Expense Account** - Beban Operasional (Gaji, Listrik, Sewa, dll)
- **Expenses Included In Asset Valuation** - Beban Penilaian Aset (Ongkir masuk HPP)
- **Depreciation** - Beban Penyusutan
- **Round Off** - Pembulatan
- **Write Off** - Penghapusan

✅ **STATUS**: Account types sudah mencakup kategori standar untuk perusahaan dagang.

---

## 2. Jurnal Entry Standar per Transaksi

### A. Sales Invoice (Faktur Penjualan)
**Saat Submit:**
```
Debit:  Piutang Usaha (Receivable)           Rp XXX
  Kredit: Pendapatan Penjualan (Income)              Rp XXX

Debit:  HPP Barang Dagang (COGS)             Rp YYY
  Kredit: Persediaan (Stock)                         Rp YYY
```
- Mengakui pendapatan dan piutang
- Mengurangi stok dan mengakui HPP

---

### B. Purchase Invoice (Faktur Pembelian)
**Saat Submit:**
```
Debit:  Persediaan (Stock)                   Rp XXX
Debit:  Beban Penilaian Aset (jika ada ongkir) Rp ZZZ
  Kredit: Hutang Usaha (Payable)                     Rp (XXX + ZZZ)
```
- Menambah stok dengan harga perolehan (termasuk ongkir jika dicentang)
- Mengakui hutang kepada supplier

**PENTING:** Ongkir/biaya tambahan yang dicentang "Include in Valuation" akan menambah nilai HPP barang.

---

### C. Payment Entry (Pembayaran Piutang)
**Customer Payment (Terima dari Customer):**
```
Debit:  Bank/Kas (Cash/Bank)                 Rp XXX
  Kredit: Piutang Usaha (Receivable)                 Rp XXX
```

**Supplier Payment (Bayar ke Supplier):**
```
Debit:  Hutang Usaha (Payable)               Rp XXX
  Kredit: Bank/Kas (Cash/Bank)                       Rp XXX
```

---

### D. Stock Entry (Penyesuaian Stok)

#### Material Receipt (Penerimaan Barang - bukan dari Purchase)
```
Debit:  Persediaan (Stock)                   Rp XXX
  Kredit: Stock Adjustment (Equity)                  Rp XXX
```

#### Material Issue (Pengeluaran Barang - bukan untuk Sale)
```
Debit:  Stock Adjustment (Expense)           Rp XXX
  Kredit: Persediaan (Stock)                         Rp XXX
```

#### Material Transfer (Pindah Gudang)
```
Tidak ada jurnal nilai, hanya perpindahan qty antar warehouse.
```

#### Stock Reconciliation (Opname/Koreksi)
**Jika selisih kurang (actual < system):**
```
Debit:  Stock Adjustment (Expense)           Rp XXX
  Kredit: Persediaan (Stock)                         Rp XXX
```

**Jika selisih lebih (actual > system):**
```
Debit:  Persediaan (Stock)                   Rp XXX
  Kredit: Stock Adjustment (Equity/Income)           Rp XXX
```

---

### E. Sales Return (Retur Penjualan)
**Melalui Sales Invoice dengan is_return=1:**
```
Debit:  Retur Penjualan (contra-Income)      Rp XXX
  Kredit: Piutang Usaha (Receivable)                 Rp XXX

Debit:  Persediaan (Stock)                   Rp YYY
  Kredit: HPP Barang Dagang (COGS)                   Rp YYY
```
- Mengurangi pendapatan (retur adalah contra-income)
- Menambah kembali stok dan mengurangi HPP

**PENTING:** Retur penjualan harus mengurangi HPP yang sudah diakui.

---

### F. Purchase Return (Retur Pembelian)
**Melalui Purchase Invoice dengan is_return=1:**
```
Debit:  Hutang Usaha (Payable)               Rp XXX
  Kredit: Retur Pembelian (contra-COGS)              Rp XXX
  atau
  Kredit: Persediaan (Stock)                         Rp XXX
```
- Mengurangi hutang
- Mengurangi stok (jika sudah diterima) atau mengakui retur sebagai pengurang HPP

**PENTING:** Retur pembelian harus mengurangi nilai persediaan dengan benar.

---

### G. Depreciation Entry (Penyusutan Aset)
**Periodik (bulanan/tahunan):**
```
Debit:  Beban Penyusutan (Depreciation Expense) Rp XXX
  Kredit: Akumulasi Penyusutan (Accumulated Dep.)    Rp XXX
```
- Mengakui beban penyusutan periode berjalan
- Menambah akumulasi penyusutan (contra-asset)

---

## 3. Opening Balance - Panduan Pengisian

### Prinsip Dasar
Opening balance adalah saldo awal periode akuntansi. Harus diisi dengan akurat karena menjadi dasar seluruh laporan keuangan.

**Syarat Utama:**
- Total Debit = Total Kredit (Balance Sheet harus balance)
- Aktiva = Kewajiban + Ekuitas
- Jika tidak balance, selisih masuk ke "Retained Earnings" (Laba Ditahan)

---

### Akun yang WAJIB Diisi

#### 1. KAS & BANK (Asset)
**Root Type:** Asset  
**Account Type:** Cash, Bank  
**Entry Method:** Journal Entry (GL Entry) dengan is_opening = "Yes"

```
Contoh:
Kas Toko             Debit:  Rp 5.000.000
Bank BCA Operasional Debit:  Rp 50.000.000
```

**PENTING:** Cek saldo riil kas fisik dan rekening bank di tanggal opening.

---

#### 2. PIUTANG USAHA (Asset)
**Root Type:** Asset  
**Account Type:** Receivable  
**Entry Method:** Journal Entry atau via Opening Invoice

```
Contoh per customer:
Piutang Usaha - PT ABC    Debit:  Rp 25.000.000
Piutang Usaha - CV XYZ    Debit:  Rp 15.000.000
```

**BEST PRACTICE:** Buat "Opening Sales Invoice" per customer untuk tracking aging.

---

#### 3. PERSEDIAAN BARANG (Asset) ⚠️ PALING PENTING
**Root Type:** Asset  
**Account Type:** Stock  
**Entry Method:** Stock Reconciliation (WAJIB detail per item)

**Langkah:**
1. Buka: Stock → Stock Reconciliation
2. Pilih warehouse
3. Scan/input semua item dengan:
   - Item Code
   - Quantity (fisik saat opname)
   - Valuation Rate (harga per unit saat itu)
4. Submit → System akan auto-create GL Entry

```
Contoh output jurnal:
Debit:  Persediaan (Stock)           Rp 100.000.000
  Kredit: Stock Adjustment (Equity)           Rp 100.000.000
```

**PENTING:**
- HARUS detail per SKU, tidak boleh lump sum
- Valuation rate = harga pokok rata-rata atau FIFO saat itu
- Jika ada item expired/rusak, jangan dimasukkan atau adjust valuenya

---

#### 4. ASET TETAP (Asset)
**Root Type:** Asset  
**Account Type:** Fixed Asset  
**Entry Method:** Journal Entry + Master Asset (jika pakai depreciation)

```
Contoh:
Tanah                      Debit:  Rp 200.000.000
Gedung                     Debit:  Rp 300.000.000
Kendaraan                  Debit:  Rp 150.000.000
Akumulasi Peny. Gedung     Kredit: Rp 30.000.000  (contra-asset)
Akumulasi Peny. Kendaraan  Kredit: Rp 45.000.000  (contra-asset)
```

**PENTING:** Akumulasi penyusutan adalah kredit (mengurangi nilai aset).

---

#### 5. HUTANG USAHA (Liability)
**Root Type:** Liability  
**Account Type:** Payable  
**Entry Method:** Journal Entry atau via Opening Purchase Invoice

```
Contoh per supplier:
Hutang Usaha - PT Supplier A  Kredit: Rp 30.000.000
Hutang Usaha - CV Supplier B  Kredit: Rp 20.000.000
```

**BEST PRACTICE:** Buat "Opening Purchase Invoice" per supplier untuk tracking payment.

---

#### 6. HUTANG BANK & PINJAMAN (Liability)
**Root Type:** Liability  
**Account Type:** Payable atau kategori khusus

```
Contoh:
Hutang Bank BRI (KUR)      Kredit: Rp 100.000.000
```

---

#### 7. HUTANG PAJAK (Liability)
**Root Type:** Liability  
**Account Type:** Tax

```
Contoh:
Hutang PPN                 Kredit: Rp 5.000.000
Hutang PPh 23              Kredit: Rp 2.000.000
```

---

#### 8. MODAL & LABA DITAHAN (Equity)
**Root Type:** Equity  
**Account Type:** Equity

**Cara Hitung:**
```
Modal Pemilik = Total Aktiva - Total Kewajiban - Laba Ditahan

Jika ada laba tahun lalu yang belum dibagi:
Laba Ditahan              Kredit: Rp XXX
```

**PENTING:** Jika opening balance tidak balance, selisih otomatis masuk "Retained Earnings".

---

### Contoh Opening Balance Lengkap

```
AKTIVA (Debit):
Kas                          5.000.000
Bank BCA                    50.000.000
Piutang Usaha               40.000.000
Persediaan                 100.000.000
Aset Tetap                 500.000.000
  Akumulasi Penyusutan    (75.000.000)
Total Aktiva               620.000.000

KEWAJIBAN (Kredit):
Hutang Usaha                50.000.000
Hutang Bank                100.000.000
Hutang Pajak                 7.000.000
Total Kewajiban            157.000.000

EKUITAS (Kredit):
Modal Pemilik              400.000.000
Laba Ditahan                63.000.000
Total Ekuitas              463.000.000

TOTAL: 620.000.000 = 157.000.000 + 463.000.000 ✅
```

---

## 4. Checklist Opening Balance

- [ ] Kas & Bank sesuai saldo riil tanggal opening
- [ ] Piutang per customer (aging report)
- [ ] **Persediaan per SKU via Stock Reconciliation** (WAJIB detail)
- [ ] Aset tetap dengan akumulasi penyusutan
- [ ] Hutang per supplier
- [ ] Hutang bank/pinjaman
- [ ] Hutang pajak
- [ ] Modal pemilik
- [ ] **Neraca balance** (Aktiva = Kewajiban + Ekuitas)

---

## 5. Tips Khusus untuk Perusahaan Dagang

### Fokus pada Persediaan & HPP
1. **Stock Reconciliation adalah KUNCI**
   - Harus detail per item dengan qty dan harga
   - Gunakan harga pokok rata-rata atau FIFO konsisten
   - Update rutin jika ada perubahan nilai

2. **HPP akan Akurat jika:**
   - Opening stock benar (qty & value)
   - Purchase invoice selalu di-submit setelah goods receipt
   - Sales invoice auto-calculate COGS dari stock ledger
   - Retur di-handle dengan benar (return invoice)

3. **Ongkir/Biaya Perolehan:**
   - Jika ingin masuk HPP: centang "Landed Cost" atau "Expenses Included In Valuation"
   - Jika tidak ingin masuk HPP: masukkan sebagai Beban Operasional biasa

4. **Margin Monitoring:**
   - Bandingkan harga beli rata-rata vs harga jual rata-rata per SKU
   - Sorot item dengan margin tipis atau negatif
   - Review pricing strategy

5. **Stock Opname Rutin:**
   - Lakukan stock reconciliation minimal 1x per bulan
   - Cek selisih qty & nilai
   - Investigasi penyebab (shrinkage, expired, theft, error input)

---

## 6. Kesimpulan & Rekomendasi

### ✅ Yang Sudah Baik
- Struktur COA sesuai standar (root_type & account_type)
- Mapping akun ke laporan keuangan sudah benar
- Auto-journal dari transaksi (SI, PI, Payment, Stock Entry)

### ⚠️ Yang Perlu Diperhatikan
1. **Opening Balance harus lengkap dan akurat**
   - Terutama persediaan (wajib detail per SKU)
   - Pastikan neraca balance

2. **Konsistensi Pencatatan:**
   - Selalu submit dokumen sesuai urutan (PR → PI → Payment)
   - Jangan skip goods receipt jika ada
   - Handle retur dengan benar (is_return flag)

3. **Monitoring HPP:**
   - Cek secara berkala akun "HPP Barang Dagang"
   - Bandingkan dengan omzet (% HPP terhadap Sales)
   - Investigate jika HPP > Sales (ada masalah)

4. **Ongkir & Biaya Perolehan:**
   - Putuskan: masuk HPP atau Beban Operasional
   - Konsisten sepanjang periode
   - Jika masuk HPP, centang "Expenses Included In Valuation"

5. **Laporan untuk Monitoring:**
   - Ledger HPP (sortir terbesar)
   - Margin per SKU
   - Stock opname selisih
   - Aging piutang & hutang
   - Cash flow

---

**Tanggal Dokumen:** {{ CURRENT_DATE }}  
**Versi:** 1.0  
**Status:** Production Ready ✅
