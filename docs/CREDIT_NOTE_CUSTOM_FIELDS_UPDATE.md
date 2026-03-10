# Credit Note Custom Fields Update

## Summary

File-file berikut telah diupdate untuk menggunakan custom field names yang benar sesuai dengan ERPNext custom fields:

- `return_reason` → `custom_return_reason`
- `return_item_notes` → `custom_return_item_notes`
- `return_notes` → `custom_return_notes`

## Files Updated

### 1. Type Definitions
- ✅ `types/credit-note.ts`
  - Updated `CreditNoteItem` interface
  - Updated `CreditNote` interface
  - Updated `CreateCreditNoteRequest` interface

### 2. API Routes
- ✅ `app/api/sales/credit-note/route.ts` (POST endpoint)
  - Updated validation logic for `custom_return_reason`
  - Updated validation logic for `custom_return_item_notes`
  - Updated template customization to use `custom_return_notes`
  - Updated item mapping to use `custom_return_reason` and `custom_return_item_notes`

### 3. Frontend Components
- ✅ `app/credit-note/cnMain/component.tsx`
  - Updated form data mapping when loading existing credit note
  - Updated payload construction when saving credit note

### 4. Validation & Calculation Libraries
- ✅ `lib/credit-note-validation.ts` - No changes needed (uses interface)
- ✅ `lib/credit-note-calculation.ts` - No changes needed (uses interface)

## Custom Fields Required in ERPNext

Pastikan custom fields berikut sudah dibuat di ERPNext:

### Sales Invoice Item (Child Table)
1. **custom_return_reason** (Select)
   - Label: Return Reason / Alasan Retur
   - Options: Damaged, Quality Issue, Wrong Item, Customer Request, Expired, Other

2. **custom_return_item_notes** (Small Text)
   - Label: Return Item Notes / Catatan Item Retur

### Sales Invoice (Parent)
3. **custom_return_notes** (Text)
   - Label: Return Notes / Catatan Retur

## Testing Checklist

Setelah update ini, test hal-hal berikut:

- [ ] Buat Credit Note baru dari Sales Invoice
- [ ] Pilih item dan isi alasan retur
- [ ] Untuk alasan "Other", pastikan catatan wajib diisi
- [ ] Simpan Credit Note dan verifikasi data tersimpan dengan benar
- [ ] Load Credit Note yang sudah ada dan verifikasi data tampil dengan benar
- [ ] Submit Credit Note dan verifikasi tidak ada error
- [ ] Cek di ERPNext backend bahwa custom fields terisi dengan benar

## Notes

- Frontend form masih menggunakan field names tanpa prefix `custom_` untuk kemudahan development
- Transformasi dari/ke custom field names dilakukan di API layer
- Validation dan calculation libraries tidak perlu diubah karena menggunakan TypeScript interfaces

## Status

✅ Update selesai - Siap untuk testing
