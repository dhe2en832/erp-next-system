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

### H. Komisi Sales (Sales Commission)
**Saat Pembayaran Komisi:**
```
Debit:  Beban Komisi Sales (Expense)         Rp XXX
  Kredit: Kas/Bank (Cash/Bank)                      Rp XXX
```
**Atau jika komisi dijurnal saat invoice:**
```
Saat Sales Invoice di-submit:
Debit:  Beban Komisi Sales (Expense)         Rp XXX
  Kredit: Hutang Komisi Sales (Payable)             Rp XXX

Saat bayar komisi:
Debit:  Hutang Komisi Sales (Payable)        Rp XXX
  Kredit: Kas/Bank (Cash/Bank)                      Rp XXX
```

**PENTING:**
- Komisi Sales = **Beban Operasional** (bukan HPP)
- Account Type: **Expense Account**
- Root Type: **Expense**
- Jika pakai accrual basis: akui saat invoice, bayar nanti
- Jika pakai cash basis: akui saat bayar langsung

---

### I. Warkat Tolak, Batal, & Cair (Cheque/Giro Management)

#### 1. Receive Payment - Terima Cek/Giro dari Customer

**A. Saat Terima Cek/Giro (belum cair):**
```
Debit:  Giro Dalam Proses (Current Asset)    Rp XXX
  Kredit: Piutang Usaha (Receivable)                Rp XXX
```

**B. Saat Giro Cair (deposit berhasil):**
```
Debit:  Bank (Bank)                          Rp XXX
  Kredit: Giro Dalam Proses (Current Asset)         Rp XXX
```

**C. Saat Giro TOLAK (bounced cheque):**
```
Jurnal balik (reversal):
Debit:  Piutang Usaha (Receivable)           Rp XXX
Debit:  Beban Admin Bank (Expense)           Rp YYY (fee tolak)
  Kredit: Giro Dalam Proses (Current Asset)         Rp XXX
  Kredit: Kas/Bank (fee dipotong rekening)          Rp YYY
```

**D. Saat Pembayaran BATAL (customer cancel):**
```
Jurnal balik:
Debit:  Piutang Usaha (Receivable)           Rp XXX
  Kredit: Giro Dalam Proses (Current Asset)         Rp XXX
```

---

#### 2. Pay Payment - Bayar Cek/Giro ke Supplier

**A. Saat Issue Cek/Giro (belum dicairkan supplier):**
```
Debit:  Hutang Usaha (Payable)               Rp XXX
  Kredit: Giro Diterbitkan (Current Liability)      Rp XXX
```

**B. Saat Giro Cair (di-clearing oleh supplier):**
```
Debit:  Giro Diterbitkan (Current Liability) Rp XXX
  Kredit: Bank (Bank)                                Rp XXX
```

**C. Saat Giro TOLAK (insufficient fund):**
```
Jurnal balik:
Debit:  Giro Diterbitkan (Current Liability) Rp XXX
Debit:  Beban Admin & Denda (Expense)        Rp YYY
  Kredit: Hutang Usaha (Payable)                    Rp XXX
  Kredit: Bank (denda dipotong rekening)            Rp YYY
```

**D. Saat Pembayaran BATAL (kita cancel sebelum cair):**
```
Jurnal balik:
Debit:  Giro Diterbitkan (Current Liability) Rp XXX
  Kredit: Hutang Usaha (Payable)                    Rp XXX
```

**PENTING:**
- **Giro Dalam Proses** = akun peralihan (Current Asset)
- **Giro Diterbitkan** = akun peralihan (Current Liability)
- Jangan langsung masuk Bank sebelum cek benar-benar cair
- Tracking status: "Dalam Proses", "Cair", "Tolak", "Batal"

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

## 7. Contoh Struktur COA Lengkap untuk Perusahaan Dagang

Berikut struktur Chart of Accounts (COA) yang direkomendasikan untuk sistem ERP Anda:

### Format: `[Nomor] - [Nama Akun]` | Root Type | Account Type | Is Group

---

### 📊 AKTIVA (ASSET)

#### **1000 - Aktiva Lancar** | Asset | - | ✅ Group
- **1100 - Kas & Bank** | Asset | - | ✅ Group
  - `1110 - Kas Toko` | Asset | Cash | ❌
  - `1120 - Kas Kecil (Petty Cash)` | Asset | Cash | ❌
  - `1130 - Bank BCA - Operasional` | Asset | Bank | ❌
  - `1131 - Bank BRI - Giro` | Asset | Bank | ❌
  - `1132 - Bank Mandiri - Payroll` | Asset | Bank | ❌

- **1200 - Piutang** | Asset | - | ✅ Group
  - `1210 - Piutang Usaha` | Asset | Receivable | ❌
  - `1220 - Piutang Karyawan` | Asset | Receivable | ❌
  - `1230 - Piutang Lain-lain` | Asset | Receivable | ❌
  - `1240 - Giro Dalam Proses (Cek Belum Cair)` | Asset | Bank | ❌ ⬅️ **BARU**

- **1300 - Persediaan** | Asset | - | ✅ Group
  - `1310 - Persediaan Barang Dagang` | Asset | Stock | ❌
  - `1320 - Persediaan Barang Dalam Transit` | Asset | Stock | ❌

- **1400 - Aset Lancar Lainnya** | Asset | - | ✅ Group
  - `1410 - Pajak Dibayar Dimuka` | Asset | Tax Asset | ❌
  - `1420 - Uang Muka Pembelian` | Asset | - | ❌
  - `1430 - Biaya Dibayar Dimuka` | Asset | - | ❌

#### **1500 - Aktiva Tetap** | Asset | - | ✅ Group
- **1510 - Tanah** | Asset | Fixed Asset | ❌
- **1520 - Bangunan** | Asset | Fixed Asset | ❌
- **1521 - Akumulasi Penyusutan Bangunan** | Asset | Accumulated Depreciation | ❌
- **1530 - Kendaraan** | Asset | Fixed Asset | ❌
- **1531 - Akumulasi Penyusutan Kendaraan** | Asset | Accumulated Depreciation | ❌
- **1540 - Peralatan Kantor** | Asset | Fixed Asset | ❌
- **1541 - Akumulasi Penyusutan Peralatan** | Asset | Accumulated Depreciation | ❌
- **1550 - Komputer & Elektronik** | Asset | Fixed Asset | ❌
- **1551 - Akumulasi Penyusutan Komputer** | Asset | Accumulated Depreciation | ❌

---

### 📊 KEWAJIBAN (LIABILITY)

#### **2000 - Kewajiban Lancar** | Liability | - | ✅ Group
- **2100 - Hutang Usaha** | Liability | - | ✅ Group
  - `2110 - Hutang Usaha (Supplier)` | Liability | Payable | ❌
  - `2120 - Hutang Komisi Sales` | Liability | Payable | ❌ ⬅️ **BARU**
  - `2130 - Giro Diterbitkan (Cek Belum Dicairkan)` | Liability | Payable | ❌ ⬅️ **BARU**

- **2200 - Hutang Pajak** | Liability | - | ✅ Group
  - `2210 - Hutang PPN` | Liability | Tax | ❌
  - `2220 - Hutang PPh 21` | Liability | Tax | ❌
  - `2230 - Hutang PPh 23` | Liability | Tax | ❌
  - `2240 - Hutang PPh 4(2) Final` | Liability | Tax | ❌

- **2300 - Hutang Lainnya** | Liability | - | ✅ Group
  - `2310 - Hutang Karyawan (Gaji)` | Liability | Payable | ❌
  - `2320 - Uang Muka Penjualan` | Liability | - | ❌

#### **2400 - Kewajiban Jangka Panjang** | Liability | - | ✅ Group
- **2410 - Hutang Bank** | Liability | Payable | ❌
- **2420 - Hutang Leasing** | Liability | Payable | ❌

---

### 📊 EKUITAS (EQUITY)

#### **3000 - Ekuitas** | Equity | - | ✅ Group
- **3100 - Modal Pemilik** | Equity | Equity | ❌
- **3200 - Laba Ditahan** | Equity | Equity | ❌
- **3300 - Laba Tahun Berjalan** | Equity | Equity | ❌
- **3400 - Prive/Drawings** | Equity | Equity | ❌
- **3500 - Stock Adjustment** | Equity | Equity | ❌

---

### 📊 PENDAPATAN (INCOME)

#### **4000 - Pendapatan Usaha** | Income | - | ✅ Group
- **4100 - Pendapatan Penjualan** | Income | Income Account | ❌
- **4200 - Retur Penjualan** | Income | Income Account | ❌ (contra-income, nilai negatif)
- **4300 - Potongan Penjualan** | Income | Income Account | ❌ (contra-income, nilai negatif)

#### **4500 - Pendapatan Lain-lain** | Income | - | ✅ Group
- **4510 - Pendapatan Bunga** | Income | Income Account | ❌
- **4520 - Keuntungan Selisih Kurs** | Income | Income Account | ❌
- **4530 - Pendapatan Lain-lain** | Income | Income Account | ❌

---

### 📊 BEBAN (EXPENSE)

#### **5000 - Harga Pokok Penjualan (HPP)** | Expense | - | ✅ Group
- **5100 - HPP Barang Dagang** | Expense | Cost of Goods Sold | ❌
- **5200 - Retur Pembelian** | Expense | Cost of Goods Sold | ❌ (contra-COGS, nilai negatif)
- **5300 - Potongan Pembelian** | Expense | Cost of Goods Sold | ❌ (contra-COGS, nilai negatif)
- **5400 - Ongkir & Biaya Perolehan (Masuk HPP)** | Expense | Expenses Included In Asset Valuation | ❌ ⬅️ **PENTING**

#### **6000 - Beban Operasional** | Expense | - | ✅ Group
- **6100 - Beban Gaji & Upah** | Expense | - | ✅ Group
  - `6110 - Gaji Karyawan` | Expense | Expense Account | ❌
  - `6120 - Upah Harian` | Expense | Expense Account | ❌
  - `6130 - Tunjangan` | Expense | Expense Account | ❌
  - `6140 - Lembur` | Expense | Expense Account | ❌
  - `6150 - THR & Bonus` | Expense | Expense Account | ❌

- **6200 - Beban Penjualan** | Expense | - | ✅ Group
  - `6210 - Beban Komisi Sales` | Expense | Expense Account | ❌ ⬅️ **BARU**
  - `6220 - Beban Iklan & Promosi` | Expense | Expense Account | ❌
  - `6230 - Beban Pengiriman (Ongkir Bukan HPP)` | Expense | Expense Account | ❌
  - `6240 - Beban Entertaint & Jamuan` | Expense | Expense Account | ❌

- **6300 - Beban Kantor & Umum** | Expense | - | ✅ Group
  - `6310 - Beban Sewa Kantor` | Expense | Expense Account | ❌
  - `6320 - Beban Listrik & Air` | Expense | Expense Account | ❌
  - `6330 - Beban Telepon & Internet` | Expense | Expense Account | ❌
  - `6340 - Beban Alat Tulis Kantor` | Expense | Expense Account | ❌
  - `6350 - Beban Pemeliharaan & Perbaikan` | Expense | Expense Account | ❌
  - `6360 - Beban Perjalanan Dinas` | Expense | Expense Account | ❌
  - `6370 - Beban Asuransi` | Expense | Expense Account | ❌

- **6400 - Beban Penyusutan** | Expense | - | ✅ Group
  - `6410 - Beban Penyusutan Bangunan` | Expense | Depreciation | ❌
  - `6420 - Beban Penyusutan Kendaraan` | Expense | Depreciation | ❌
  - `6430 - Beban Penyusutan Peralatan` | Expense | Depreciation | ❌
  - `6440 - Beban Penyusutan Komputer` | Expense | Depreciation | ❌

- **6500 - Beban Keuangan & Bank** | Expense | - | ✅ Group
  - `6510 - Beban Bunga Bank` | Expense | Expense Account | ❌
  - `6520 - Beban Admin Bank` | Expense | Expense Account | ❌ ⬅️ **Termasuk fee giro tolak**
  - `6530 - Beban Provisi & Fee` | Expense | Expense Account | ❌

- **6600 - Beban Lain-lain** | Expense | - | ✅ Group
  - `6610 - Beban Pajak & Perizinan` | Expense | Expense Account | ❌
  - `6620 - Kerugian Selisih Kurs` | Expense | Expense Account | ❌
  - `6630 - Beban Denda & Sanksi` | Expense | Expense Account | ❌
  - `6640 - Beban Lain-lain` | Expense | Expense Account | ❌

---

## 8. Mapping Khusus untuk Fitur Sistem

### A. Komisi Sales
- **Akun Beban:** `6210 - Beban Komisi Sales`
- **Akun Hutang:** `2120 - Hutang Komisi Sales` (jika accrual)
- **Root Type:** Expense (untuk beban), Liability (untuk hutang)
- **Account Type:** Expense Account, Payable

### B. Giro/Warkat Management
**Receive Payment (Terima dari Customer):**
- **Akun Peralihan:** `1240 - Giro Dalam Proses`
- **Root Type:** Asset
- **Account Type:** Bank
- **Status Tracking:** Dalam Proses → Cair / Tolak / Batal

**Pay Payment (Bayar ke Supplier):**
- **Akun Peralihan:** `2130 - Giro Diterbitkan`
- **Root Type:** Liability
- **Account Type:** Payable
- **Status Tracking:** Diterbitkan → Cair / Tolak / Batal

### C. Ongkir/Biaya Perolehan
**Masuk HPP:**
- Akun: `5400 - Ongkir & Biaya Perolehan (Masuk HPP)`
- Account Type: **Expenses Included In Asset Valuation**
- Centang "Include in Valuation" di Purchase Invoice

**Tidak Masuk HPP (Beban Operasional):**
- Akun: `6230 - Beban Pengiriman (Ongkir Bukan HPP)`
- Account Type: **Expense Account**

---

## 9. Checklist Setup COA

- [ ] Buat semua akun induk (is_group = Yes) terlebih dahulu
- [ ] Buat akun detail (is_group = No) di bawah parent masing-masing
- [ ] Set nomor akun secara konsisten (1xxx = Asset, 2xxx = Liability, dst)
- [ ] Pastikan **Root Type** dan **Account Type** sesuai mapping di atas
- [ ] Buat akun khusus: `1240 - Giro Dalam Proses` dan `2130 - Giro Diterbitkan`
- [ ] Buat akun khusus: `6210 - Beban Komisi Sales` dan `2120 - Hutang Komisi Sales`
- [ ] Pisahkan ongkir masuk HPP (5400) vs ongkir beban (6230)
- [ ] Set default accounts di Company Settings (Sales, Purchase, Cash, Bank, Cost Center)
- [ ] Test transaksi dummy untuk validasi auto-journal

---

**Tanggal Dokumen:** {{ CURRENT_DATE }}  
**Versi:** 2.0  
**Status:** Production Ready ✅  
**Update:** Ditambahkan analisa komisi sales, warkat tolak/batal/cair, dan contoh struktur COA lengkap
