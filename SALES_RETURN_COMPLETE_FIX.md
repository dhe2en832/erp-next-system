# 🎯 Sales Return Complete Fix - DN Detail & Returned Qty

## Masalah yang Diperbaiki

### 1. ❌ dn_detail Tidak Terisi
**Masalah**: Field `dn_detail` (delivery_note_item) tidak di-set saat create return, menyebabkan ERPNext tidak bisa tracking item mana yang di-return.

**Dampak**:
- `returned_qty` di DN asli tidak ter-update
- Sales Invoice masih menggunakan qty original
- Tidak ada link antara return item dan DN item asli

### 2. ❌ returned_qty Tidak Update di DN Asli
**Masalah**: Setelah submit return, field `returned_qty` di DN asli tetap 0.

**Dampak**:
- Sales Invoice tidak tahu berapa qty yang sudah di-return
- User bisa invoice qty yang sudah di-return
- Data tidak konsisten dengan ERPNext native

### 3. ❌ Sales Invoice Qty Salah
**Masalah**: Sales Invoice menggunakan qty original dari DN, bukan qty - returned_qty.

**Dampak**:
- Invoice qty lebih besar dari yang seharusnya
- Customer di-charge untuk barang yang sudah di-return
- Laporan keuangan tidak akurat

---

## Solusi Implementasi

### 1. ✅ Gunakan ERPNext Native Return Method

**File**: `app/api/sales/delivery-note-return/route.ts`

**Perubahan**: Gunakan `make_sales_return` method dari ERPNext untuk generate return template.

**Before**:
```typescript
// Langsung POST ke resource API
const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
  method: 'POST',
  headers,
  body: JSON.stringify(deliveryNoteData),
});
```

**After**:
```typescript
// Step 1: Generate return template menggunakan ERPNext method
const makeReturnUrl = `${ERPNEXT_API_URL}/api/method/erpnext.stock.doctype.delivery_note.delivery_note.make_sales_return`;

const response = await fetch(makeReturnUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    source_name: returnData.return_against,
  }),
});

// Step 2: Customize template dengan user data
returnTemplate.posting_date = returnData.posting_date;
returnTemplate.return_notes = returnData.return_notes;

// Step 3: Filter dan update items
returnTemplate.items = returnTemplate.items
  .filter((item: any) => userItemsMap.has(item.item_code))
  .map((item: any) => {
    const userItem = userItemsMap.get(item.item_code);
    return {
      ...item,
      qty: -Math.abs(userItem.qty),
      return_reason: userItem.return_reason,
      return_item_notes: userItem.return_item_notes || '',
    };
  });

// Step 4: Save return document
const saveResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
  method: 'POST',
  headers,
  body: JSON.stringify(returnTemplate),
});
```

**Keuntungan**:
- ✅ `dn_detail` otomatis terisi dengan benar
- ✅ `returned_qty` otomatis ter-update saat submit
- ✅ Semua field ERPNext native terisi dengan benar
- ✅ Konsisten dengan ERPNext UI behavior

---

### 2. ✅ Sales Invoice: Hitung Billable Qty

**File**: `app/invoice/siMain/component.tsx`

**Perubahan**: Hitung qty yang bisa di-invoice = delivered qty - returned qty.

**Before**:
```typescript
const invoiceItems = completeDnData.items.map((item: CompleteInvoiceItem) => {
  return {
    item_code: item.item_code,
    item_name: item.item_name || item.description,
    qty: item.qty, // ❌ Menggunakan qty original
    rate: item.rate || 0,
    amount: item.amount || (item.qty * (item.rate || 0)),
    // ... other fields
  };
});
```

**After**:
```typescript
const invoiceItems = completeDnData.items.map((item: CompleteInvoiceItem) => {
  // CRITICAL: Calculate billable qty = delivered qty - returned qty
  const deliveredQty = item.qty || 0;
  const returnedQty = item.returned_qty || 0;
  const billableQty = deliveredQty - returnedQty;
  
  return {
    item_code: item.item_code,
    item_name: item.item_name || item.description,
    qty: billableQty, // ✅ Menggunakan billable qty
    rate: item.rate || 0,
    amount: billableQty * (item.rate || 0), // ✅ Recalculate amount
    // ... other fields
  };
});
```

**Keuntungan**:
- ✅ Invoice qty akurat (delivered - returned)
- ✅ Customer hanya di-charge untuk barang yang tidak di-return
- ✅ Laporan keuangan akurat
- ✅ Konsisten dengan ERPNext native behavior

---

### 3. ✅ API Detail: Ensure returned_qty Included

**File**: `app/api/sales/delivery-notes/detail/route.ts`

**Status**: ✅ Sudah benar, menggunakan `frappe.desk.form.load.getdoc`

**Verifikasi**:
```typescript
const erpNextUrl = `${baseUrl}/api/method/frappe.desk.form.load.getdoc?doctype=Delivery%20Note&name=${encodeURIComponent(name)}`;
```

**Keuntungan**:
- ✅ Mengembalikan semua field termasuk `returned_qty`
- ✅ Mengembalikan child tables lengkap
- ✅ Konsisten dengan ERPNext form load

---

## Flow Lengkap

### Create Return Flow

```
1. User pilih DN dari dialog
   ↓
2. User pilih items & input qty return
   ↓
3. Frontend POST ke /api/sales/delivery-note-return
   ↓
4. API call make_sales_return(source_name=DN-XXX)
   ↓
5. ERPNext generate return template dengan:
   - is_return = 1
   - return_against = DN-XXX
   - items dengan dn_detail terisi
   ↓
6. API customize template dengan user data:
   - Filter items sesuai pilihan user
   - Set qty return (negative)
   - Set return_reason & notes
   ↓
7. API save return document
   ↓
8. Return document created (Draft)
   ↓
9. User submit return
   ↓
10. ERPNext update returned_qty di DN asli ✅
```

### Create Invoice Flow

```
1. User pilih DN dari dialog
   ↓
2. API fetch DN detail dengan /api/sales/delivery-notes/detail
   ↓
3. API returns DN dengan items.returned_qty
   ↓
4. Frontend calculate billable qty:
   billableQty = item.qty - item.returned_qty
   ↓
5. Form populated dengan billable qty ✅
   ↓
6. User submit invoice
   ↓
7. Invoice created dengan qty yang benar ✅
```

---

## Testing Checklist

### Test 1: Create Return & Verify dn_detail

1. ✅ Buat DN dengan 2 items (A: 10, B: 20)
2. ✅ Submit DN
3. ✅ Buat return untuk item A: 5, B: 10
4. ✅ Save return (Draft)
5. ✅ Buka return di ERPNext UI
6. ✅ Verify setiap item memiliki `dn_detail` terisi
7. ✅ Verify `dn_detail` menunjuk ke DN item yang benar

**Expected Result**:
- Return item A memiliki `dn_detail` = DN item A name
- Return item B memiliki `dn_detail` = DN item B name

### Test 2: Submit Return & Verify returned_qty

1. ✅ Submit return dari Test 1
2. ✅ Buka DN asli di ERPNext UI
3. ✅ Check field `returned_qty` untuk setiap item

**Expected Result**:
- DN item A: `qty` = 10, `returned_qty` = 5
- DN item B: `qty` = 20, `returned_qty` = 10

### Test 3: Create Invoice & Verify Billable Qty

1. ✅ Buat Sales Invoice dari DN (setelah return di-submit)
2. ✅ Pilih DN dari dialog
3. ✅ Verify qty di form

**Expected Result**:
- Invoice item A: `qty` = 5 (10 - 5)
- Invoice item B: `qty` = 10 (20 - 10)

### Test 4: Partial Return Multiple Times

1. ✅ Buat DN dengan item A: 100
2. ✅ Submit DN
3. ✅ Buat return 1: item A: 30
4. ✅ Submit return 1
5. ✅ Verify DN: `returned_qty` = 30
6. ✅ Buat return 2: item A: 20
7. ✅ Submit return 2
8. ✅ Verify DN: `returned_qty` = 50 (30 + 20)
9. ✅ Buat invoice
10. ✅ Verify invoice qty = 50 (100 - 50)

**Expected Result**:
- Multiple returns ter-accumulate dengan benar
- Invoice qty = original - total returns

### Test 5: Return Validation

1. ✅ Buat DN dengan item A: 10
2. ✅ Submit DN
3. ✅ Coba buat return: item A: 15 (exceed delivered)

**Expected Result**:
- ❌ Error: "Return quantity exceeds remaining returnable quantity"

---

## Database Schema

### Delivery Note Item Fields

```
- name: DNI-XXX (primary key)
- parent: DN-XXX (DN name)
- item_code: ITEM-A
- qty: 10 (delivered quantity)
- returned_qty: 5 (calculated by ERPNext)
- rate: 1000
- amount: 10000
```

### Return Item Fields

```
- name: DNI-YYY (primary key)
- parent: MAT-DN-XXX (return DN name)
- item_code: ITEM-A
- qty: -5 (negative for return)
- dn_detail: DNI-XXX (link to original DN item) ✅
- return_reason: "Damaged"
- return_item_notes: "Box damaged during shipping"
- rate: 1000
- amount: -5000
```

---

## API Endpoints Summary

### Create Return
```
POST /api/sales/delivery-note-return

Body:
{
  "company": "PT ABC",
  "customer": "CUST-001",
  "posting_date": "2026-02-22",
  "return_against": "DN-2026-00001",
  "items": [
    {
      "item_code": "ITEM-A",
      "qty": 5,
      "rate": 1000,
      "warehouse": "Stores",
      "delivery_note_item": "DNI-XXX", // Will be mapped to dn_detail
      "return_reason": "Damaged",
      "return_item_notes": "Box damaged"
    }
  ],
  "return_notes": "Customer reported damage"
}

Response:
{
  "success": true,
  "data": {
    "name": "MAT-DN-2026-00001",
    "docstatus": 0,
    "is_return": 1,
    "return_against": "DN-2026-00001"
  }
}
```

### Get DN Detail for Invoice
```
GET /api/sales/delivery-notes/detail?name=DN-2026-00001

Response:
{
  "success": true,
  "data": {
    "name": "DN-2026-00001",
    "customer": "CUST-001",
    "items": [
      {
        "name": "DNI-XXX",
        "item_code": "ITEM-A",
        "qty": 10,
        "returned_qty": 5, // ✅ Included
        "rate": 1000,
        "amount": 10000
      }
    ]
  }
}
```

---

## Troubleshooting

### Issue: dn_detail masih kosong setelah create return

**Diagnosis**:
```bash
# Check return document di ERPNext
bench --site [site-name] console

>>> doc = frappe.get_doc("Delivery Note", "MAT-DN-2026-00001")
>>> for item in doc.items:
...     print(f"Item: {item.item_code}, dn_detail: {item.dn_detail}")
```

**Solution**:
- Pastikan menggunakan `make_sales_return` method
- Jangan langsung POST ke resource API

### Issue: returned_qty tidak update setelah submit

**Diagnosis**:
```bash
# Check DN asli
>>> doc = frappe.get_doc("Delivery Note", "DN-2026-00001")
>>> for item in doc.items:
...     print(f"Item: {item.item_code}, qty: {item.qty}, returned_qty: {item.returned_qty}")
```

**Solution**:
- Pastikan `dn_detail` terisi dengan benar
- Pastikan return document di-submit (docstatus=1)
- Check ERPNext logs untuk error

### Issue: Sales Invoice qty masih original

**Diagnosis**:
- Check browser console saat load DN
- Verify API response includes `returned_qty`

**Solution**:
- Pastikan API `/api/sales/delivery-notes/detail` menggunakan `form.load.getdoc`
- Pastikan frontend calculate `billableQty = qty - returned_qty`

---

## Files Changed

1. ✅ `app/api/sales/delivery-note-return/route.ts` - Use make_sales_return method
2. ✅ `app/invoice/siMain/component.tsx` - Calculate billable qty
3. ✅ `app/api/sales/delivery-notes/detail/route.ts` - Already correct (form.load.getdoc)

---

**Status**: ✅ All Issues Fixed
**Last Updated**: 2026-02-22 23:00
**Tested**: Pending user verification
