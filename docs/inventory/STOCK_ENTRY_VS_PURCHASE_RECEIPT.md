# Stock Entry vs Purchase Receipt

## Ringkasan

Dokumentasi ini menjelaskan perbedaan antara **Stock Entry** dan **Purchase Receipt**, serta kapan menggunakan masing-masing dokumen.

---

## Perbedaan Utama

| Aspek | Stock Entry | Purchase Receipt |
|-------|-------------|------------------|
| **Tujuan** | Internal movement & adjustment | Penerimaan dari supplier |
| **Supplier** | Tidak ada | Ada (required) |
| **Jurnal** | Cr. Stock Adjustment Account | Cr. Stock Received But Not Billed |
| **Link ke PI** | Tidak bisa | Bisa link ke Purchase Invoice |
| **Tracking** | Tidak ada supplier tracking | Ada supplier tracking |

---

## Stock Entry

### Kapan Menggunakan Stock Entry?

✅ **Gunakan untuk:**
1. **Stock Opname** - Menemukan selisih fisik vs sistem
2. **Material Transfer** - Pindah barang antar gudang
3. **Material Issue** - Keluar untuk produksi
4. **Material Receipt** - Penerimaan internal (bukan dari supplier!)
5. **Repack** - Ubah kemasan
6. **Manufacture** - Hasil produksi
7. **Opening Stock** - Saldo awal
8. **Barang Rusak/Hilang** - Write-off

❌ **JANGAN gunakan untuk:**
1. Penerimaan barang dari supplier
2. Pembelian barang
3. Retur ke supplier

### Jurnal Stock Entry (Material Receipt)

```
Dr. Persediaan Barang (Asset)
    Cr. Stock Adjustment Account (Expense)
```

**Konfigurasi:**
- Stock Adjustment Account diset di: Company → Stock and Manufacturing
- Default: `5110.020 - Penyesuaian Stock - C`

### Contoh Penggunaan

**Stock Opname - Menemukan Barang Tidak Tercatat:**
```
Saat stock opname, ditemukan 100 unit barang @ Rp 10.000 yang tidak tercatat

Jurnal:
Dr. Persediaan Barang           Rp 1.000.000
    Cr. Penyesuaian Stock (Expense)  Rp 1.000.000

Dampak P/L: Beban berkurang Rp 1.000.000, Laba naik
```

**Material Transfer - Pindah Antar Gudang:**
```
Pindah 50 unit dari Gudang A ke Gudang B

Jurnal: Tidak ada (hanya update warehouse)
```

---

## Purchase Receipt

### Kapan Menggunakan Purchase Receipt?

✅ **Gunakan untuk:**
1. **Penerimaan barang dari supplier** (belum ada invoice)
2. **Pembelian barang** yang akan diinvoice nanti
3. **Tracking penerimaan** dari Purchase Order

❌ **JANGAN gunakan untuk:**
1. Stock opname
2. Material transfer internal
3. Barang rusak/hilang

### Jurnal Purchase Receipt

```
Dr. Persediaan Barang (Asset)
    Cr. Stock Received But Not Billed (Liability)
```

**Konfigurasi:**
- Stock Received But Not Billed diset di: Company → Stock and Manufacturing
- Default: `2115.000 - Stock Diterima Tapi Tidak Ditagih - C`

### Workflow Purchase Receipt

**Tahap 1: Purchase Receipt (Barang Diterima)**
```
Dr. Persediaan Barang                      Rp 1.000.000
    Cr. Stock Received But Not Billed          Rp 1.000.000
```

**Tahap 2: Purchase Invoice (Invoice Datang)**
```
Dr. Stock Received But Not Billed          Rp 1.000.000
    Cr. Hutang Dagang                          Rp 1.000.000
```

**Tahap 3: Payment Entry (Bayar)**
```
Dr. Hutang Dagang                          Rp 1.000.000
    Cr. Bank/Kas                               Rp 1.000.000
```

---

## Purchase Invoice

### Kapan Menggunakan Purchase Invoice?

✅ **Gunakan untuk:**
1. **Pembelian dengan invoice langsung** (barang + invoice sekaligus)
2. **Tanpa Purchase Receipt** sebelumnya
3. **Langsung mencatat hutang**

### Jurnal Purchase Invoice (Tanpa PR)

```
Dr. Persediaan Barang (Asset)
    Cr. Hutang Dagang (Liability)
```

### Jurnal Purchase Invoice (Dengan PR)

```
Dr. Stock Received But Not Billed (Liability)
    Cr. Hutang Dagang (Liability)
```

---

## Perbandingan Jurnal

### Skenario: Beli Barang Rp 1.000.000

#### Opsi 1: Pakai Stock Entry (SALAH!)
```
Dr. Persediaan Barang           Rp 1.000.000
    Cr. Penyesuaian Stock (Expense)  Rp 1.000.000

Dampak:
- Beban berkurang Rp 1.000.000
- Laba naik Rp 1.000.000 (SALAH!)
- Tidak ada hutang tercatat
```

#### Opsi 2: Pakai Purchase Receipt (BENAR!)
```
Dr. Persediaan Barang                      Rp 1.000.000
    Cr. Stock Received But Not Billed          Rp 1.000.000

Dampak:
- Tidak ada dampak ke P/L (BENAR!)
- Hutang sementara tercatat
- Bisa link ke Purchase Invoice nanti
```

#### Opsi 3: Pakai Purchase Invoice (BENAR!)
```
Dr. Persediaan Barang           Rp 1.000.000
    Cr. Hutang Dagang                Rp 1.000.000

Dampak:
- Tidak ada dampak ke P/L (BENAR!)
- Hutang langsung tercatat
- Siap untuk payment
```

---

## Konfigurasi Company Settings

### Stock Settings

Di ERPNext → Company → Cirebon → Stock and Manufacturing:

```
Stock Received But Not Billed:
  2115.000 - Stock Diterima Tapi Tidak Ditagih - C

Stock Adjustment Account:
  5110.020 - Penyesuaian Stock - C

Default Inventory Account:
  1141.000 - Persediaan Barang - C

Expenses Included In Valuation:
  2132.001 - Biaya Yang Akan di Bayar - Freight - C
```

### Penjelasan Akun

**2115.000 - Stock Received But Not Billed (Liability)**
- Untuk Purchase Receipt
- Akun transisi (temporary)
- Di-clear saat Purchase Invoice dibuat

**5110.020 - Penyesuaian Stock (Expense)**
- Untuk Stock Entry (adjustment)
- Hanya untuk stock opname/koreksi
- BUKAN untuk penerimaan supplier

---

## Kesalahan yang Sering Terjadi

### ❌ Kesalahan 1: Pakai Stock Entry untuk Penerimaan Supplier

```
Problem:
- Buat Stock Entry (Material Receipt) untuk barang dari supplier
- Jurnal: Cr. Penyesuaian Stock (Expense)
- Beban berkurang, laba naik (SALAH!)

Solution:
- Pakai Purchase Receipt atau Purchase Invoice
- Jurnal: Cr. Stock Received But Not Billed atau Hutang Dagang
```

### ❌ Kesalahan 2: Ubah Stock Adjustment Account ke Liability

```
Problem:
- Ubah Stock Adjustment Account dari Expense ke Liability
- Stock opname jadi salah jurnalnya

Solution:
- Biarkan Stock Adjustment Account tetap Expense
- Pakai dokumen yang tepat (PR untuk supplier, SE untuk adjustment)
```

### ❌ Kesalahan 3: Tidak Ada Supplier di Purchase Receipt

```
Problem:
- Buat Purchase Receipt tanpa supplier
- Tidak bisa tracking pembelian

Solution:
- Selalu isi supplier di Purchase Receipt
- Jika tidak ada supplier, pakai Stock Entry (untuk internal)
```

---

## Workflow yang Benar

### Workflow 1: Pembelian dengan PO

```
1. Purchase Order (PO)
   ↓
2. Purchase Receipt (PR) - Barang diterima
   Jurnal: Dr. Persediaan, Cr. Stock Received But Not Billed
   ↓
3. Purchase Invoice (PI) - Invoice datang
   Jurnal: Dr. Stock Received But Not Billed, Cr. Hutang Dagang
   ↓
4. Payment Entry - Bayar
   Jurnal: Dr. Hutang Dagang, Cr. Bank
```

### Workflow 2: Pembelian Langsung (Tanpa PO)

```
1. Purchase Invoice (PI) - Langsung beli + invoice
   Jurnal: Dr. Persediaan, Cr. Hutang Dagang
   ↓
2. Payment Entry - Bayar
   Jurnal: Dr. Hutang Dagang, Cr. Bank
```

### Workflow 3: Stock Opname

```
1. Stock Reconciliation atau Stock Entry
   Jurnal: Dr. Persediaan, Cr. Penyesuaian Stock
   
Dampak: Beban berkurang (jika menemukan barang)
```

---

## Implementasi di Next.js

### Buat Purchase Receipt

```typescript
const purchaseReceipt = {
  doctype: 'Purchase Receipt',
  supplier: 'NAMA-SUPPLIER',
  company: 'Cirebon',
  posting_date: '2026-03-11',
  items: [{
    item_code: 'A0001',
    item_name: 'HOLLO STD 2 x 4 x 0.30',
    qty: 100,
    rate: 8690,
    warehouse: 'GD. UTAMA - C'
  }]
};

const response = await erpnextClient.createDoc('Purchase Receipt', purchaseReceipt);
```

### Buat Stock Entry (untuk Stock Opname)

```typescript
const stockEntry = {
  doctype: 'Stock Entry',
  stock_entry_type: 'Material Receipt',
  purpose: 'Material Receipt',
  company: 'Cirebon',
  posting_date: '2026-03-11',
  items: [{
    item_code: 'A0001',
    qty: 100,
    basic_rate: 8690,
    t_warehouse: 'GD. UTAMA - C',
    expense_account: '5110.020 - Penyesuaian Stock - C',
    cost_center: 'Utama - C'
  }]
};

const response = await erpnextClient.createDoc('Stock Entry', stockEntry);
```

---

## Catatan Penting

1. **Stock Entry ≠ Purchase Receipt** - Jangan disamakan!
2. **Pilih dokumen yang tepat** sesuai transaksi
3. **Jangan ubah konfigurasi** tanpa memahami dampaknya
4. **Validasi jurnal** setelah submit dokumen

---

## Referensi

- ERPNext Documentation: Stock Entry
- ERPNext Documentation: Purchase Receipt
- File: `app/api/purchase-receipt/route.ts`
- File: `app/api/stock-entry/route.ts`

---

**Terakhir diupdate:** 11 Maret 2026
**Status:** ✓ Dokumentasi lengkap
