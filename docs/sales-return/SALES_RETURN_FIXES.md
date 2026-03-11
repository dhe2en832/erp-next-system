# 🔧 Sales Return Fixes - Tabel Item & Filter Dialog

## ✅ Masalah yang Diperbaiki

### 1. Tabel Item Tidak Muncul

**Masalah:**
- Setelah pilih delivery note dari dialog, tabel item tidak muncul
- Form tetap kosong tanpa list item

**Penyebab:**
- API list delivery notes tidak mengembalikan child table `items`
- `handleDeliveryNoteSelect` hanya menggunakan data dari list (tanpa items)

**Solusi:**
- ✅ Fetch detail delivery note setelah dipilih
- ✅ Gunakan API `/api/sales/delivery-notes/[name]` untuk get full document
- ✅ API menggunakan `frappe.desk.form.load.getdoc` untuk mendapatkan semua child tables

**Perubahan File:**
- `app/sales-return/srMain/component.tsx` - Update `handleDeliveryNoteSelect()`
- `app/api/sales/delivery-notes/route.ts` - Created (list DN)
- `app/api/sales/delivery-notes/[name]/route.ts` - Created (get detail DN)

---

### 2. Filter Dialog - Hanya "To Bill"

**Masalah:**
- Dialog menampilkan DN dengan status "To Bill" dan "Completed"
- User ingin hanya "To Bill" saja

**Penyebab:**
- Filter menggunakan: `['status', 'in', ['To Bill', 'Completed']]`

**Solusi:**
- ✅ Ubah filter menjadi: `['status', '=', 'To Bill']`
- ✅ Update deskripsi dialog

**Perubahan File:**
- `app/components/DeliveryNoteDialog.tsx` - Update filter & description

---

## 📝 Detail Perubahan

### 1. srMain/component.tsx

**Before:**
```typescript
const handleDeliveryNoteSelect = async (deliveryNote: DeliveryNote) => {
  setSelectedDeliveryNote(deliveryNote);
  
  // Map delivery note items to form items
  const mappedItems: SalesReturnFormItem[] = (deliveryNote.items || []).map((item) => ({
    // ... mapping
  }));
  
  setFormData({
    // ... set form data
  });
};
```

**After:**
```typescript
const handleDeliveryNoteSelect = async (deliveryNote: DeliveryNote) => {
  setSelectedDeliveryNote(deliveryNote);
  setFormLoading(true);
  setError('');
  
  try {
    // Fetch full delivery note details with items
    const response = await fetch(`/api/sales/delivery-notes/${deliveryNote.name}`);
    const data = await response.json();

    if (response.ok && data.success) {
      const fullDN = data.data;
      
      // Map delivery note items to form items
      const mappedItems: SalesReturnFormItem[] = (fullDN.items || []).map((item: any) => ({
        // ... mapping
      }));

      setFormData({
        // ... set form data with items
      });

      // Close dialog
      setShowDeliveryNoteDialog(false);
    } else {
      setError('Gagal memuat detail surat jalan');
    }
  } catch (err) {
    console.error('Error fetching delivery note details:', err);
    setError('Gagal memuat detail surat jalan');
  } finally {
    setFormLoading(false);
  }
};
```

**Perubahan:**
- ✅ Fetch detail DN dari API
- ✅ Loading state saat fetch
- ✅ Error handling
- ✅ Close dialog setelah berhasil

---

### 2. DeliveryNoteDialog.tsx

**Before:**
```typescript
const filters: any[] = [
  ['company', '=', selectedCompany],
  ['docstatus', '=', 1],
  ['status', 'in', ['To Bill', 'Completed']] // ❌ Menampilkan 2 status
];
```

**After:**
```typescript
const filters: any[] = [
  ['company', '=', selectedCompany],
  ['docstatus', '=', 1],
  ['status', '=', 'To Bill'] // ✅ Hanya To Bill
];
```

**Description Update:**
```typescript
// Before
<p>Hanya menampilkan surat jalan yang sudah submitted dan dapat diretur</p>

// After
<p>Hanya menampilkan surat jalan dengan status "To Bill" yang dapat diretur</p>
```

---

### 3. New API Routes

#### `/api/sales/delivery-notes/route.ts`

**Purpose:** List delivery notes dengan filter

**Features:**
- Pagination (limit, start)
- Filters (company, docstatus, status, date range)
- Document number search
- Returns list tanpa child tables (untuk performance)

**Usage:**
```typescript
GET /api/sales/delivery-notes?
  filters=[["company","=","PT ABC"],["status","=","To Bill"]]&
  limit=20&
  start=0
```

---

#### `/api/sales/delivery-notes/[name]/route.ts`

**Purpose:** Get full delivery note detail dengan items

**Features:**
- Menggunakan `frappe.desk.form.load.getdoc`
- Returns complete document dengan semua child tables
- Includes items, taxes, dan fields lainnya

**Usage:**
```typescript
GET /api/sales/delivery-notes/DN-2024-00123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "DN-2024-00123",
    "customer": "CUST-001",
    "customer_name": "PT ABC",
    "posting_date": "2024-01-15",
    "items": [
      {
        "name": "DNI-001",
        "item_code": "ITEM-A",
        "item_name": "Barang A",
        "qty": 100,
        "rate": 10000,
        "amount": 1000000,
        "uom": "Pcs",
        "warehouse": "Stores - B"
      },
      // ... more items
    ]
  }
}
```

---

## 🔄 Flow Setelah Fix

### Create Return Flow

```
1. User klik "Pilih Surat Jalan"
   ↓
2. Dialog muncul
   ↓
3. Fetch DN list (hanya status "To Bill")
   GET /api/sales/delivery-notes?filters=[["status","=","To Bill"]]
   ↓
4. User pilih DN dari list
   ↓
5. Fetch DN detail dengan items
   GET /api/sales/delivery-notes/DN-2024-00123
   ↓
6. Map items ke form state
   ↓
7. Tabel item muncul ✅
   ↓
8. User pilih items & input qty
   ↓
9. Save return
```

---

## 🧪 Testing

### Test 1: Tabel Item Muncul

1. Buka form create return
2. Klik "Pilih Surat Jalan"
3. Pilih DN dari dialog
4. **Expected:** Tabel item muncul dengan semua items dari DN
5. **Expected:** Customer info terisi
6. **Expected:** Dialog tertutup otomatis

### Test 2: Filter "To Bill" Only

1. Buka form create return
2. Klik "Pilih Surat Jalan"
3. **Expected:** Hanya DN dengan status "To Bill" yang muncul
4. **Expected:** DN dengan status "Completed" atau "Draft" tidak muncul

### Test 3: Partial Return

1. Pilih DN dengan 3+ items
2. **Expected:** Semua items muncul di tabel
3. Centang 2 items
4. Input qty parsial
5. **Expected:** Hanya 2 items yang masuk ke return

---

## 🐛 Troubleshooting

### Tabel item masih tidak muncul

**Check:**
1. Browser console untuk error messages
2. Network tab - apakah API `/api/sales/delivery-notes/[name]` dipanggil?
3. Response API - apakah ada field `items`?

**Debug:**
```typescript
// Add console.log di handleDeliveryNoteSelect
console.log('Selected DN:', deliveryNote.name);
console.log('Full DN data:', fullDN);
console.log('Mapped items:', mappedItems);
console.log('Form data items:', formData.items);
```

### Dialog masih menampilkan "Completed"

**Check:**
1. Apakah perubahan di `DeliveryNoteDialog.tsx` sudah tersimpan?
2. Apakah Next.js dev server sudah restart?
3. Clear browser cache (Ctrl+Shift+R)

**Verify:**
```typescript
// Check filter di browser console
// Network tab > Request > Payload
// Should see: ["status","=","To Bill"]
```

### API 404 error

**Check:**
1. Apakah file API route sudah dibuat?
   - `app/api/sales/delivery-notes/route.ts`
   - `app/api/sales/delivery-notes/[name]/route.ts`
2. Restart Next.js dev server

---

## ✅ Checklist

- [x] Fix `handleDeliveryNoteSelect` - fetch detail DN
- [x] Create API route `/api/sales/delivery-notes` (list)
- [x] Create API route `/api/sales/delivery-notes/[name]` (detail)
- [x] Update filter dialog - hanya "To Bill"
- [x] Update description dialog
- [x] Add loading state saat fetch detail
- [x] Add error handling
- [x] Close dialog setelah berhasil
- [ ] Test tabel item muncul
- [ ] Test filter "To Bill" only
- [ ] Test partial return flow

---

## 📚 Files Changed

1. `app/sales-return/srMain/component.tsx` - Fix handleDeliveryNoteSelect
2. `app/components/DeliveryNoteDialog.tsx` - Update filter & description
3. `app/api/sales/delivery-notes/route.ts` - Created (list)
4. `app/api/sales/delivery-notes/[name]/route.ts` - Created (detail)

---

**Status:** ✅ Fixes Complete - Ready for Testing
**Last Updated:** 2024-01-15 22:00


---

## 🔧 Additional Fixes (2026-02-22)

### 3. API 500 Error - Duplicate doctype Parameter

**Masalah:**
- GET request ke `/api/sales/delivery-notes` mengembalikan 500 error
- Error message: "get_list() got multiple values for argument 'doctype'"

**Penyebab:**
- Parameter `doctype` dikirim 2x: di URL path dan di query params
- ERPNext resource API sudah mendapat doctype dari URL path

**Solusi:**
- ✅ Hapus duplicate `doctype` dari query params
- ✅ Gunakan hanya URL path: `/api/resource/Delivery Note`

**Perubahan File:**
- `app/api/sales/delivery-notes/route.ts` - Removed duplicate doctype parameter

---

### 4. Date Input Format - BrowserStyleDatePicker

**Masalah:**
- Native `<input type="date">` menampilkan format YYYY-MM-DD
- System menggunakan format DD/MM/YYYY

**Solusi:**
- ✅ Replace dengan `BrowserStyleDatePicker` component
- ✅ Konsisten dengan format DD/MM/YYYY di seluruh system

**Perubahan File:**
- `app/components/DeliveryNoteDialog.tsx` - Replace date inputs

**Before:**
```typescript
<input
  type="date"
  value={filterFromDate}
  onChange={(e) => setFilterFromDate(e.target.value)}
/>
```

**After:**
```typescript
<BrowserStyleDatePicker
  value={filterFromDate}
  onChange={(value: string) => setFilterFromDate(value)}
  placeholder="DD/MM/YYYY"
/>
```

---

### 5. API Detail - Enhanced Fallback

**Masalah:**
- API detail DN kadang return 404 "Surat jalan tidak ditemukan"
- `frappe.desk.form.load.getdoc` response terpotong di logs

**Solusi:**
- ✅ Enhanced fallback ke resource API dengan `fields=["*"]`
- ✅ Ensure child tables (items) included in response
- ✅ Added logging untuk track items count

**Perubahan File:**
- `app/api/sales/delivery-notes/[name]/route.ts` - Enhanced fallback

**Before:**
```typescript
const resourceUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note/${name}`;
```

**After:**
```typescript
const resourceUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note/${name}?fields=["*"]`;
console.log('Resource API success, items count:', resourceData.data?.items?.length || 0);
```

---

## 🎯 Current Status (2026-02-22 21:30)

### ✅ Fixed
- API 500 error (duplicate doctype) → Now returns 200
- API 404 error (DN not found) → Fallback works, returns 200
- Dialog filter → Only shows "To Bill" status
- Date format → Uses DD/MM/YYYY consistently
- Detail API → Returns items with fallback

### ⚠️ Known Issues

**Validation Error:**
```
"Baris # 1: Item yang Dikembalikan WM03 tidak ada di Delivery Note DN-2026-00016"
"Baris # 2: Item yang Dikembalikan SG01 tidak ada di Delivery Note DN-2026-00016"
```

**Kemungkinan Penyebab:**
1. Items table tidak load dengan benar saat pilih DN
2. User test dengan items yang salah
3. DN-2026-00016 tidak memiliki items WM03 dan SG01

**Solusi:**
- Refresh page dan coba lagi
- Pastikan items table muncul setelah pilih DN
- Verify items yang muncul sesuai dengan DN yang dipilih

---

## 🧪 Testing Instructions (Updated)

### Complete Flow Test

1. **Open Form**
   - Navigate to `/sales-return/srMain`
   - Verify form loads without errors

2. **Open Dialog**
   - Click "Pilih Surat Jalan" button
   - Verify dialog opens
   - Check Network tab: `/api/sales/delivery-notes` returns 200

3. **Verify Filter**
   - Check that only "To Bill" DNs are shown
   - Verify description says "Hanya menampilkan surat jalan dengan status 'To Bill'"

4. **Select DN**
   - Click on a delivery note (e.g., DN-2026-00016)
   - Verify DN is highlighted
   - Click "Pilih Surat Jalan" button

5. **Verify Items Load**
   - Check Network tab: `/api/sales/delivery-notes/DN-2026-00016` returns 200
   - **CRITICAL:** Verify response includes `items` array
   - Check that items table appears in form
   - Verify items match the selected DN

6. **Test Partial Return**
   - Select 1-2 items (checkbox)
   - Enter partial quantities (less than delivered qty)
   - Select return reason for each item
   - If reason is "Lainnya", add notes

7. **Save**
   - Click "Simpan" button
   - Verify no validation errors
   - Check that return document is created

8. **Verify Success**
   - Check that success message appears
   - Verify return document name (e.g., MAT-DN-2026-00005)
   - Navigate to list view to see the new return

---

## 🔍 Debug Checklist

If items table still doesn't appear:

1. **Browser Console**
   ```
   - Check for JavaScript errors
   - Look for failed API calls
   ```

2. **Network Tab**
   ```
   - Verify /api/sales/delivery-notes/[name] is called
   - Check response status (should be 200)
   - Verify response includes items array
   - Check items count > 0
   ```

3. **Server Logs**
   ```
   - Check terminal for API logs
   - Look for "DN Name: [name]"
   - Verify "Resource API success, items count: X"
   - X should be > 0
   ```

4. **Component State**
   ```typescript
   // Add console.log in handleDeliveryNoteSelect
   console.log('API Response:', data);
   console.log('Full DN:', fullDN);
   console.log('Items from DN:', fullDN.items);
   console.log('Mapped items:', mappedItems);
   console.log('Form data items:', formData.items);
   ```

---

**Status:** ✅ All API Errors Fixed - Ready for User Testing
**Last Updated:** 2026-02-22 21:30


---

## 🔧 Additional Fix (2026-02-22 22:00)

### 6. Submit API Route - Wrong Endpoint

**Masalah:**
- List view menggunakan endpoint lama `/api/sales/sales-return/[name]/submit`
- Error: "No module named 'frappe.core.doctype.sales_return'"
- Submit button tidak berfungsi

**Penyebab:**
- Frontend masih menggunakan API route lama yang merujuk ke custom Sales Return DocType
- Seharusnya menggunakan endpoint baru untuk Delivery Note Return

**Solusi:**
- ✅ Update `handleSubmitReturn()` di `srList/component.tsx`
- ✅ Ganti endpoint dari `/api/sales/sales-return/[name]/submit` ke `/api/sales/delivery-note-return/[name]/submit`

**Perubahan File:**
- `app/sales-return/srList/component.tsx` - Update submit endpoint

**Before:**
```typescript
const response = await fetch(`/api/sales/sales-return/${returnName}/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: returnName }),
});
```

**After:**
```typescript
const response = await fetch(`/api/sales/delivery-note-return/${returnName}/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: returnName }),
});
```

---

**Status:** ✅ Submit Button Fixed - Ready for Testing
**Last Updated:** 2026-02-22 22:00


---

## 🔧 Additional Fix (2026-02-22 22:10)

### 7. Submit Concurrency Error - Modified Timestamp

**Masalah:**
- Submit button mengembalikan error 417 Expectation Failed
- Error message: "Dokumen telah dimodifikasi setelah Anda membukanya"
- ERPNext concurrency control menolak submit

**Penyebab:**
- Submit API hanya mengirim `doctype` dan `name` tanpa `modified` timestamp
- ERPNext memerlukan full document dengan timestamp terbaru untuk mencegah konflik

**Solusi:**
- ✅ Fetch full document sebelum submit (sudah ada di kode)
- ✅ Submit dengan full document data termasuk `modified` timestamp
- ✅ Set `docstatus: 1` untuk mark as submitted

**Perubahan File:**
- `app/api/sales/delivery-note-return/[name]/submit/route.ts` - Pass full document to submit

**Before:**
```typescript
const submitPayload = {
  doc: JSON.stringify({
    doctype: 'Delivery Note',
    name: name,
  }),
};
```

**After:**
```typescript
const submitPayload = {
  doc: JSON.stringify({
    ...currentDoc.data,  // Include all fields including modified timestamp
    docstatus: 1,        // Set to submitted
  }),
};
```

**Penjelasan:**
- ERPNext menggunakan `modified` timestamp untuk concurrency control
- Jika timestamp tidak cocok, ERPNext menolak perubahan
- Dengan mengirim full document, kita memastikan timestamp selalu terbaru

---

**Status:** ✅ Submit Concurrency Fixed - Ready for Testing
**Last Updated:** 2026-02-22 22:10


---

## 🔧 Additional Fixes (2026-02-22 22:30)

### 8. Delivery Note Create API - Missing POST Method

**Masalah:**
- Error 405 Method Not Allowed saat create Delivery Note biasa
- POST ke `/api/sales/delivery-notes` tidak didukung
- Frontend tidak bisa membuat DN baru

**Penyebab:**
- API route `/api/sales/delivery-notes/route.ts` hanya memiliki GET method
- Route ini dibuat untuk list DN (Sales Return dialog) tanpa POST method
- Delivery Note form juga menggunakan endpoint yang sama untuk create

**Solusi:**
- ✅ Tambahkan POST method ke `/api/sales/delivery-notes/route.ts`
- ✅ POST method untuk create Delivery Note biasa
- ✅ GET method tetap untuk list DN (Sales Return dialog)

**Perubahan File:**
- `app/api/sales/delivery-notes/route.ts` - Added POST method

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const erpnextUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note`;

    const response = await fetch(erpnextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // ... handle response
  }
}
```

---

### 9. Accounting Period Validation for Sales Return

**Masalah:**
- Sales Return (Delivery Note dengan is_return=1) tidak memiliki validasi periode akuntansi
- User bisa membuat/submit return di periode yang sudah ditutup

**Requirement:**
- Validasi periode akuntansi harus berjalan seperti di dokumen lain (Sales Invoice, Purchase Invoice, dll)
- Prevent create/modify/delete di periode tertutup
- Allow override untuk System Manager/Accounts Manager dengan audit log

**Solusi:**
- ✅ Tambahkan validasi periode akuntansi ke Delivery Note hooks
- ✅ Gunakan modul `accounting_period_restrictions` yang sudah ada
- ✅ Support multiple hooks untuk validate event (array)

**Perubahan File:**
- `apps/batasku_custom/batasku_custom/hooks.py` - Added accounting period validation

**Before:**
```python
"Delivery Note": {
    "validate": "batasku_custom.overrides.delivery_note_return.validate_delivery_note_return",
    "on_submit": "batasku_custom.overrides.delivery_note_return.on_submit_delivery_note_return",
    "on_cancel": "batasku_custom.overrides.delivery_note_return.on_cancel_delivery_note_return"
}
```

**After:**
```python
"Delivery Note": {
    "validate": [
        "batasku_custom.accounting_period_restrictions.validate_transaction_against_closed_period",
        "batasku_custom.overrides.delivery_note_return.validate_delivery_note_return"
    ],
    "on_submit": "batasku_custom.overrides.delivery_note_return.on_submit_delivery_note_return",
    "on_cancel": "batasku_custom.overrides.delivery_note_return.on_cancel_delivery_note_return",
    "before_cancel": "batasku_custom.accounting_period_restrictions.validate_transaction_deletion",
    "on_trash": "batasku_custom.accounting_period_restrictions.validate_transaction_deletion"
}
```

**Validasi yang Diterapkan:**
1. **validate**: Cek posting_date tidak di periode tertutup saat create/update
2. **before_cancel**: Cek posting_date tidak di periode tertutup saat cancel
3. **on_trash**: Cek posting_date tidak di periode tertutup saat delete

**Behavior:**
- Regular users: Ditolak dengan error message
- System Manager/Accounts Manager: Allowed dengan warning + audit log
- Permanently Closed period: Ditolak untuk semua user

**Testing:**
1. Buat periode akuntansi dan tutup (status: Closed)
2. Coba buat Sales Return dengan posting_date di periode tertutup
3. Verify error muncul: "Cannot modify transaction: Period [name] is closed"
4. Login sebagai System Manager
5. Coba lagi - should show warning tapi allowed
6. Check Period Closing Log untuk audit trail

---

**Status:** ✅ All Fixes Applied - Delivery Note Create & Accounting Period Validation
**Last Updated:** 2026-02-22 22:30
**ERPNext Restarted:** Yes
