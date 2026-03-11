# Investigation Summary & Next Steps - UPDATED

## Klarifikasi: Pajak Itu OPSIONAL

**PENTING:** Pajak bukan otomatis, tapi pilihan user:
- ✅ User PILIH pajak → Frontend hitung, kirim ke backend
- ✅ User TIDAK pilih pajak → Tidak ada pajak
- ✅ Backend kirim data sesuai pilihan user ke ERPNext

Ini sudah benar dan tidak perlu diubah.

## Masalah Sebenarnya: "Not Saved" Status

### Root Cause

ERPNext UI mendeteksi field kosong dan menampilkan "Not Saved":
- `custom_hpp_snapshot`: 0 ❌ (harusnya 148,000)
- `custom_financial_cost_percent`: 0 ❌ (harusnya 2.0)

### Mengapa Kosong?

Server Script "Before Submit" mengisi field ini, tapi hanya jalan saat:
- User klik "Submit" (docstatus 0 → 1)
- TIDAK jalan saat "Save" pertama kali

ERPNext UI mengisi field ini saat Save, tapi Next.js API tidak.

## Solusi yang Sudah Diimplementasikan

### Pre-populate Custom Fields

Sebelum kirim ke ERPNext, fetch data dari:
1. **Delivery Note Item** (prioritas 1)
   - `custom_hpp_snapshot` atau `incoming_rate`
   - `custom_financial_cost_percent`

2. **Item Master** (prioritas 2, jika tidak dari DN)
   - `custom_financial_cost_percent`

### Kode yang Ditambahkan

```typescript
// Untuk setiap item, fetch HPP dan Financial Cost
items: await Promise.all((invoiceData.items || []).map(async (item: any) => {
  let hppSnapshot = 0;
  let financialCostPercent = 0;
  
  // Ambil dari DN Item jika ada
  if (item.dn_detail) {
    const dnItemData = await fetchDNItem(item.dn_detail);
    hppSnapshot = dnItemData.custom_hpp_snapshot || dnItemData.incoming_rate || 0;
    financialCostPercent = dnItemData.custom_financial_cost_percent || 0;
  }
  
  // Fallback: Ambil dari Item master
  if (financialCostPercent === 0) {
    const itemData = await fetchItem(item.item_code);
    financialCostPercent = itemData.custom_financial_cost_percent || 0;
  }
  
  return {
    ...item,
    custom_hpp_snapshot: hppSnapshot,
    custom_financial_cost_percent: financialCostPercent,
  };
}))
```

## Yang Sudah Diperbaiki

1. ✅ **Pajak tetap opsional** - User pilih atau tidak
2. ✅ **Pre-populate HPP** - Dari DN Item atau Item master
3. ✅ **Pre-populate Financial Cost** - Dari DN Item atau Item master
4. ✅ **Komisi tetap jalan** - Server Script sudah benar

## Testing

### Langkah Test

1. **Buat Sales Invoice dari Delivery Note**
   - Pilih DN yang ada
   - Isi form
   - Pilih pajak (opsional)
   - Save

2. **Check Backend Logs**
   ```
   Item A003: HPP=148000, FinCost=2.0 from DN
   Tax template selected by user: PPN 11% - BAC
   (atau)
   No tax template selected - invoice without tax
   ```

3. **Check Database**
   ```sql
   SELECT 
     item_code,
     custom_hpp_snapshot,
     custom_financial_cost_percent,
     custom_komisi_sales
   FROM `tabSales Invoice Item`
   WHERE parent = 'ACC-SINV-2026-XXXXX';
   ```

   **Expected:**
   ```
   item_code: A003
   custom_hpp_snapshot: 148000  ✅
   custom_financial_cost_percent: 2.0  ✅
   custom_komisi_sales: 208000  ✅
   ```

4. **Check ERPNext UI**
   - Buka invoice di ERPNext
   - Status harus "Draft" (bukan "Not Saved")
   - Coba buat Credit Note → harus bisa ✅

## Expected Results

### Dengan Pajak (User Pilih PPN 11%)
```
total: 2,000,000
total_taxes_and_charges: 220,000
grand_total: 2,220,000
taxes_and_charges: "PPN 11% - BAC"
custom_hpp_snapshot: 148,000 ✅
custom_financial_cost_percent: 2.0 ✅
Status: "Draft" ✅
```

### Tanpa Pajak (User Tidak Pilih)
```
total: 2,000,000
total_taxes_and_charges: 0
grand_total: 2,000,000
taxes_and_charges: null
custom_hpp_snapshot: 148,000 ✅
custom_financial_cost_percent: 2.0 ✅
Status: "Draft" ✅
```

## Performance Note

Untuk setiap item, ada 1-2 API calls:
- 1 call ke DN Item (jika ada `dn_detail`)
- 1 call ke Item master (jika perlu)

**Contoh:** Invoice dengan 3 items = 3-6 API calls

Ini acceptable untuk memastikan data benar dan status "Draft" muncul.

## Files Modified

- ✅ `erp-next-system/app/api/sales/invoices/route.ts` - Pre-populate custom fields
- ✅ `erp-next-system/docs/FIX_NOT_SAVED_STATUS_FINAL.md` - Dokumentasi lengkap

## Next Steps

1. **Test invoice creation** - Buat invoice dari DN
2. **Verify database** - Check custom fields terisi
3. **Check ERPNext UI** - Status harus "Draft"
4. **Try Credit Note** - Harus bisa dibuat
5. **Report results** - Apakah masih "Not Saved"?

## Summary

- ❌ Bukan masalah pajak (pajak sudah benar - opsional)
- ✅ Masalah: Field `custom_hpp_snapshot` dan `custom_financial_cost_percent` kosong
- ✅ Solusi: Pre-populate dari DN Item atau Item master
- ✅ Implementasi: Sudah ditambahkan ke API route
- ⏳ Testing: Silakan test dan report hasilnya

Silakan test sekarang! 🚀
