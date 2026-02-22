# Closed Period Error Handling - Implementation Guide

## Overview
Sistem ini menyediakan error handling yang konsisten untuk semua dokumen ERPNext yang memiliki `posting_date`, khususnya untuk menangani error periode akuntansi tertutup.

## Affected Documents
Dokumen-dokumen berikut sudah atau perlu diimplementasikan dengan error handling ini:

### ✅ Sudah Diimplementasikan
- Delivery Note (Surat Jalan)

### 📋 Perlu Diimplementasikan
- Sales Invoice (Faktur Jual)
- Sales Order (Pesanan Penjualan)
- Purchase Order (Pesanan Pembelian)
- Purchase Receipt (Penerimaan Barang)
- Purchase Invoice (Faktur Beli)
- Stock Reconciliation (Rekonsiliasi Stok)
- Stock Entry (Mutasi Stok)
- Payment Entry - Receive (Penerimaan Pembayaran)
- Payment Entry - Pay (Pembayaran)
- Journal Entry (Jurnal Umum)

## Implementation Steps

### 1. Frontend (React Component)

#### Import utility function:
```typescript
import { handleERPNextError } from '../../../utils/erpnext-error-handler';
```

#### Update error handling in submit function:
```typescript
const data = await response.json();

if (data.success) {
  // Handle success
  setSavedDocName(data.data?.name);
  setShowPrintDialog(true);
} else {
  // Use utility function for consistent error handling
  const { bannerMessage } = handleERPNextError(
    data,
    formData.posting_date,  // The posting date from form
    'Nama Dokumen',         // e.g., 'Faktur Jual', 'Purchase Order'
    'Gagal menyimpan'       // Default error message
  );
  setError(bannerMessage);
}
```

### 2. Backend (API Route)

#### Import helper function:
```typescript
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';
```

#### Update error handling in POST/PUT handler:
```typescript
if (response.ok) {
  return NextResponse.json({
    success: true,
    data: data.data,
  });
} else {
  return handleERPNextAPIError(
    response, 
    data, 
    'Failed to create document',  // Default error message
    payloadData                    // Optional: for debugging
  );
}
```

## Error Message Extraction Priority

The system extracts error messages in this order:

1. **_server_messages** (Most user-friendly)
   - Contains formatted messages from ERPNext
   - Example: "Anda tidak dapat membuat Delivery Note dalam Periode Akuntansi 2026 - BAC yang sudah ditutup."

2. **exc** (Exception traceback)
   - Extracts the actual error message from Python traceback
   - Parses the last line of the exception

3. **message** field
   - Direct message field from response

4. **exception** field
   - Fallback exception field

## User Experience

### Closed Period Error
When a user tries to create a document in a closed period:

**Alert Popup:**
```
🚫 PERIODE AKUNTANSI TERTUTUP

[Dokumen] tidak dapat dibuat karena periode akuntansi 
untuk tanggal [DD/MM/YYYY] sudah ditutup.

Solusi:
1. Ubah tanggal posting ke periode yang masih terbuka
2. Atau hubungi administrator untuk membuka kembali periode

Detail: [Error message from ERPNext]
```

**Banner Message:**
```
⚠️ Periode akuntansi tertutup. Silakan ubah tanggal posting ke periode yang terbuka.
```

### Generic Error
For other errors:

**Alert Popup:**
```
❌ GAGAL MENYIMPAN [DOKUMEN]

Error: [Error message]
Tanggal Posting: [DD/MM/YYYY]

Kemungkinan penyebab:
• Periode akuntansi untuk tanggal tersebut sudah ditutup
• Data tidak lengkap atau tidak valid
• Masalah koneksi ke server

Silakan periksa data Anda atau hubungi administrator.
```

## Testing

### Test Closed Period Error
1. Close an accounting period (e.g., February 2026)
2. Try to create a document with posting_date in that period
3. Verify:
   - Alert popup appears with clear message
   - Banner shows warning message
   - User understands what to do

### Test Generic Error
1. Create a document with invalid data
2. Verify:
   - Alert popup shows the actual error
   - Banner displays error message
   - Error is logged in console for debugging

## Files Created

### Utility Files
- `erp-next-system/utils/erpnext-error-handler.ts` - Frontend error handling
- `erp-next-system/utils/erpnext-api-helper.ts` - Backend API error handling

### Updated Files
- `erp-next-system/app/delivery-note/dnMain/component.tsx` - Example implementation
- `erp-next-system/app/api/sales/delivery-notes/route.ts` - Example API implementation

## Next Steps

To implement this for other documents:

1. **Identify the document** from the list above
2. **Update the frontend component** following the pattern in Delivery Note
3. **Update the API route** following the pattern in delivery-notes/route.ts
4. **Test thoroughly** with both closed period and generic errors
5. **Update this document** to mark the document as ✅ implemented

## Notes

- The error detection works for both English and Indonesian error messages
- HTML tags are automatically stripped from error messages
- All errors are logged to console for debugging
- The system is backward compatible with existing error handling
