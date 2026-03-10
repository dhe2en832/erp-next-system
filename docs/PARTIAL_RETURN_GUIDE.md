# 📋 Panduan Partial Return (Retur Parsial)

## ✅ Fitur Partial Return Sudah Tersedia!

Form Sales Return **sudah mendukung retur parsial** - Anda bisa memilih item mana yang akan diretur dan berapa qty-nya.

## 🎯 Contoh Kasus Anda

**Delivery Note:**
- Barang A: qty 100
- Barang B: qty 20
- Barang C: qty 30

**Return yang Diinginkan:**
- Barang A: qty 50 (parsial, tidak semua)
- Barang B: qty 10 (parsial, tidak semua)
- Barang C: qty 0 (tidak diretur)

## 📝 Cara Menggunakan Partial Return

### Step 1: Buka Form Create Return

```
http://localhost:3000/sales-return/srMain
```

### Step 2: Pilih Delivery Note

1. Klik tombol **"Pilih Surat Jalan"**
2. Dialog muncul dengan list delivery notes
3. Pilih delivery note yang ingin diretur
4. Klik **"Pilih Surat Jalan"**

### Step 3: Tabel Item Muncul

Setelah delivery note dipilih, tabel item akan muncul dengan **semua item** dari delivery note:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Item Retur                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ☐ Pilih │ Kode    │ Nama     │ Dikirim │ Qty Retur │ UOM │ Harga │ Alasan │
│─────────┼─────────┼──────────┼─────────┼───────────┼─────┼───────┼────────│
│ ☐       │ ITEM-A  │ Barang A │ 100     │ [     0]  │ Pcs │ 10000 │ [...]  │
│ ☐       │ ITEM-B  │ Barang B │ 20      │ [     0]  │ Pcs │ 15000 │ [...]  │
│ ☐       │ ITEM-C  │ Barang C │ 30      │ [     0]  │ Pcs │ 20000 │ [...]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 4: Pilih Item yang Akan Diretur

**Untuk Barang A (retur 50 dari 100):**
1. ✅ **Centang checkbox** di kolom "Pilih"
2. Masukkan **50** di kolom "Qty Retur"
3. Pilih alasan retur (misal: "Rusak")

**Untuk Barang B (retur 10 dari 20):**
1. ✅ **Centang checkbox** di kolom "Pilih"
2. Masukkan **10** di kolom "Qty Retur"
3. Pilih alasan retur (misal: "Quality Issue")

**Untuk Barang C (tidak diretur):**
1. ❌ **Jangan centang checkbox** - biarkan kosong
2. Qty Retur tetap 0

### Step 5: Hasil Setelah Input

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Item Retur                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ☑ Pilih │ Kode    │ Nama     │ Dikirim │ Qty Retur │ UOM │ Harga │ Alasan │
│─────────┼─────────┼──────────┼─────────┼───────────┼─────┼───────┼────────│
│ ☑       │ ITEM-A  │ Barang A │ 100     │ [    50]  │ Pcs │ 10000 │ Rusak  │
│ ☑       │ ITEM-B  │ Barang B │ 20      │ [    10]  │ Pcs │ 15000 │ Quality│
│ ☐       │ ITEM-C  │ Barang C │ 30      │ [     0]  │ Pcs │ 20000 │ [...]  │
└─────────────────────────────────────────────────────────────────────────────┘

Total Item: 2
Total Nilai: Rp 650,000
```

### Step 6: Simpan

1. Klik tombol **"Simpan"**
2. Return akan dibuat dengan **hanya 2 item** (Barang A dan B)
3. Barang C **tidak akan masuk** ke return document

## 🔍 Validasi Otomatis

Form akan otomatis validasi:

### ✅ Valid Cases
- Qty retur > 0 dan ≤ qty dikirim
- Qty retur parsial (tidak harus semua)
- Beberapa item dipilih, beberapa tidak
- Alasan retur dipilih untuk setiap item

### ❌ Invalid Cases (Error akan muncul)
- Qty retur = 0 untuk item yang dicentang
- Qty retur > qty dikirim (misal: retur 150 padahal dikirim 100)
- Tidak ada item yang dipilih
- Alasan retur tidak dipilih
- Alasan "Lainnya" tanpa catatan tambahan

## 📊 Contoh Error Messages

**Error 1: Qty melebihi yang dikirim**
```
❌ Item Barang A: Jumlah retur melebihi jumlah yang dikirim
```

**Error 2: Tidak ada item dipilih**
```
❌ Minimal satu item harus dipilih untuk diretur
```

**Error 3: Alasan tidak dipilih**
```
❌ Item Barang A: Alasan retur harus dipilih
```

## 🎨 Visual Indicators

### Checkbox States
- ☐ **Tidak dicentang** = Item tidak akan diretur
- ☑ **Dicentang** = Item akan diretur

### Row Highlighting
- **Putih** = Item tidak dipilih
- **Biru muda (indigo-50)** = Item dipilih untuk retur

### Input States
- **Disabled (abu-abu)** = Item tidak dipilih, tidak bisa input
- **Enabled (putih)** = Item dipilih, bisa input qty

## 💡 Tips

1. **Centang dulu, baru input qty**
   - Checkbox harus dicentang dulu sebelum bisa input qty
   - Jika checkbox tidak dicentang, input qty akan disabled

2. **Qty bisa parsial**
   - Tidak harus retur semua qty
   - Misal: dikirim 100, bisa retur 1, 10, 50, atau 100

3. **Bisa pilih beberapa item**
   - Tidak harus retur semua item
   - Bisa pilih item tertentu saja

4. **Alasan per item**
   - Setiap item bisa punya alasan berbeda
   - Barang A: Rusak
   - Barang B: Quality Issue

5. **Catatan tambahan**
   - Jika pilih alasan "Lainnya", field catatan akan muncul
   - Wajib diisi untuk alasan "Lainnya"

## 🔄 Data yang Dikirim ke Backend

Ketika Anda simpan return dengan contoh di atas:

```json
{
  "company": "PT Batasku",
  "customer": "CUST-001",
  "posting_date": "2024-01-15",
  "return_against": "DN-2024-00123",
  "items": [
    {
      "item_code": "ITEM-A",
      "item_name": "Barang A",
      "qty": 50,              // Hanya 50, bukan 100
      "rate": 10000,
      "amount": 500000,
      "return_reason": "Damaged",
      "return_item_notes": ""
    },
    {
      "item_code": "ITEM-B",
      "item_name": "Barang B",
      "qty": 10,              // Hanya 10, bukan 20
      "rate": 15000,
      "amount": 150000,
      "return_reason": "Quality Issue",
      "return_item_notes": ""
    }
    // Barang C tidak ada di sini karena tidak dipilih
  ],
  "return_notes": "Partial return - some items damaged"
}
```

## 🧪 Testing Checklist

- [ ] Buka form create return
- [ ] Pilih delivery note dengan 3+ items
- [ ] Centang hanya 2 items
- [ ] Input qty parsial (tidak semua)
- [ ] Pilih alasan retur
- [ ] Simpan
- [ ] Verifikasi: hanya 2 items yang masuk ke return document
- [ ] Verifikasi: qty sesuai dengan yang diinput (parsial)

## ❓ Troubleshooting

### Tabel item tidak muncul
**Penyebab:** Delivery note belum dipilih
**Solusi:** Klik "Pilih Surat Jalan" dan pilih delivery note

### Input qty disabled
**Penyebab:** Checkbox item tidak dicentang
**Solusi:** Centang checkbox dulu, baru input qty

### Error "Jumlah retur melebihi..."
**Penyebab:** Qty retur > qty dikirim
**Solusi:** Kurangi qty retur agar tidak melebihi qty dikirim

### Semua item masuk ke return
**Penyebab:** Semua checkbox dicentang
**Solusi:** Uncheck checkbox untuk item yang tidak mau diretur

## 📚 Referensi

- Requirements: Requirement 1.3 - "Allow user to select which items to include"
- Requirements: Requirement 1.4 - "Allow user to specify return quantity not exceeding delivered quantity"
- Requirements: Requirement 2.4 - "Calculate and display remaining returnable quantity"

---

**Status:** ✅ Fitur partial return sudah tersedia dan berfungsi!
**Last Updated:** 2024-01-15
