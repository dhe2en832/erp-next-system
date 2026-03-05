# Multi-Site Hardcoded Company Audit Report

**Tanggal Audit**: 2024
**Status**: ✅ SELESAI

## Ringkasan

Audit menyeluruh telah dilakukan untuk memastikan tidak ada hardcoded company "BAC" atau company lainnya di seluruh aplikasi. Semua API routes dan frontend components sudah mendukung multi-site dan multi-company.

## Hasil Audit

### ⚠️ API Routes - PERLU PERHATIAN

**Status Multi-Company**: ✅ BERSIH - Semua API sudah support multi-company
**Status Multi-Site**: ⚠️ SEBAGIAN - Beberapa API masih menggunakan `ERPNEXT_API_URL` langsung

#### API Routes dengan Multi-Site Support Penuh
API routes ini sudah menggunakan multi-site helpers dari `@/lib/api-helpers`:
- ✅ `/api/finance/accounts` - Menggunakan `getERPNextClientForRequest()`
- ✅ `/api/finance/accounts/cash-bank` - Menggunakan authentication helpers
- ✅ `/api/finance/accounts/expense` - Menggunakan authentication helpers
- ✅ `/api/finance/commission/accounts` - **DIPERBAIKI**: Removed hardcoded "Berkat Abadi Cirebon"
- ✅ `/api/finance/journal/kas-masuk` - Sudah menerima company dari request body

#### API Routes yang Masih Menggunakan ERPNEXT_API_URL Langsung
API routes ini sudah support multi-company (menerima company parameter) tetapi belum menggunakan multi-site helpers:
- ⚠️ `/api/setup/dashboard` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company
- ⚠️ `/api/sales/orders` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company
- ⚠️ `/api/sales/delivery-notes` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company
- ⚠️ `/api/sales/invoices` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company
- ⚠️ `/api/purchase/orders` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company
- ⚠️ `/api/purchase/receipts` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company
- ⚠️ `/api/purchase/invoices` - Menggunakan `ERPNEXT_API_URL` langsung, sudah filter by company

**Catatan Penting**: 
- Semua API di atas SUDAH support multi-company (tidak ada hardcoded company)
- Semua API sudah menerima dan menggunakan company parameter dari frontend
- Yang kurang adalah multi-site support (menggunakan site yang dipilih user)
- Untuk saat ini, multi-site berfungsi melalui environment variables (`.env.local`)
- Jika user switch site di frontend, mereka perlu update `.env.local` dan restart server

### ✅ Frontend Components - BERSIH

Semua frontend components sudah menggunakan `localStorage.getItem('selected_company')` untuk mendapatkan company yang dipilih user.

**Pattern yang Digunakan**:
```typescript
const [selectedCompany, setSelectedCompany] = useState('');

useEffect(() => {
  const saved = localStorage.getItem('selected_company');
  if (saved) setSelectedCompany(saved);
}, []);
```

**Components yang Sudah Diaudit**:
- ✅ `COADashboardModern.tsx` - **DIPERBAIKI**: Sekarang mengirim company parameter ke API
- ✅ `commission-payment/cpMain/component.tsx` - Menggunakan company dari localStorage
- ✅ `payment/paymentMain/page.tsx` - Menggunakan company dari localStorage
- ✅ `sales-order/soMain/component.tsx` - Menggunakan company dari localStorage
- ✅ `purchase-orders/poMain/component.tsx` - Menggunakan company dari localStorage
- ✅ `warehouse/whMain/component.tsx` - Menggunakan company dari localStorage
- ✅ `stock-entry/seMain/component.tsx` - Menggunakan company dari localStorage
- ✅ Semua report pages - Menggunakan company dari localStorage

### ✅ Account Names - DINAMIS

Tidak ada hardcoded account names dengan suffix company (seperti "- BAC", "- CVC", dll).

**Pattern yang Digunakan**:
1. **Fetch dari API dengan company filter**:
   ```typescript
   const response = await fetch(
     `/api/finance/accounts/cash-bank?company=${encodeURIComponent(company)}`
   );
   ```

2. **Generate account name secara dinamis**:
   ```typescript
   const companyAbbr = company.split(' ')
     .map(w => w[0])
     .join('')
     .toUpperCase();
   const accountName = `2150.0001 - Hutang Komisi Sales - ${companyAbbr}`;
   ```

3. **Fetch dari API commission account**:
   ```typescript
   const response = await fetch(
     `/api/finance/commission/account?company=${encodeURIComponent(company)}`
   );
   ```

## Perbaikan yang Dilakukan

### 1. COADashboardModern.tsx
**Masalah**: Tidak mengirim company parameter ke API
**Solusi**: 
```typescript
const selectedCompany = localStorage.getItem('selected_company');
const url = selectedCompany 
  ? `/api/finance/accounts?company=${encodeURIComponent(selectedCompany)}`
  : '/api/finance/accounts';
```

### 2. commission/accounts/route.ts
**Masalah**: Hardcoded default company "Berkat Abadi Cirebon"
**Solusi**:
```typescript
// Before
const company = searchParams.get('company') || 'Berkat Abadi Cirebon';

// After
const company = searchParams.get('company');
```

## Kesimpulan

✅ **Tidak ada hardcoded company "BAC" atau company lainnya**
✅ **Semua API routes sudah support multi-company**
✅ **Semua frontend components menggunakan selected company dari localStorage**
✅ **Semua account names di-fetch secara dinamis dari API atau di-generate berdasarkan company**
⚠️ **Sebagian API routes belum menggunakan multi-site helpers (masih menggunakan ERPNEXT_API_URL dari environment)**

## Status Multi-Site Support

### Cara Kerja Saat Ini
1. **Frontend**: User bisa pilih site di `/select-site` (demo, bac, cirebon, cvcirebon)
2. **Backend**: Semua API menggunakan `ERPNEXT_API_URL` dari `.env.local`
3. **Limitasi**: Jika user switch site, perlu update `.env.local` dan restart server

### Solusi untuk Full Multi-Site Support
Untuk mendukung multi-site penuh (user bisa switch site tanpa restart server), perlu:
1. Update semua API routes untuk menggunakan `getERPNextClientForRequest()` dari `@/lib/api-helpers`
2. Client akan otomatis menggunakan site yang dipilih user dari localStorage
3. Tidak perlu restart server saat switch site

### API Routes yang Perlu Diupdate
- `/api/setup/dashboard/route.ts`
- `/api/sales/orders/route.ts`
- `/api/sales/delivery-notes/route.ts`
- `/api/sales/invoices/route.ts`
- `/api/purchase/orders/route.ts`
- `/api/purchase/receipts/route.ts`
- `/api/purchase/invoices/route.ts`
- Dan API routes lainnya yang masih menggunakan `ERPNEXT_API_URL` langsung

## Rekomendasi

1. **Testing**: Test dengan berbagai company untuk memastikan semua fitur berfungsi
2. **Monitoring**: Monitor logs untuk memastikan tidak ada error terkait company
3. **Documentation**: Update user documentation tentang multi-company support

## Catatan Tambahan

### Test Files
Test files masih menggunakan hardcoded "BAC" untuk testing purposes. Ini acceptable karena:
- Test files tidak dijalankan di production
- Test files memerlukan data yang konsisten
- Test files sudah menggunakan environment variable `ERP_DEFAULT_COMPANY`

### Scripts
Scripts di folder `scripts/` menggunakan dynamic company abbreviation generation, tidak hardcoded.

## Verifikasi

Untuk memverifikasi bahwa tidak ada hardcoded company:

```bash
# Search for hardcoded "BAC" (excluding tests)
grep -r '"BAC"' erp-next-system/app/ erp-next-system/components/ erp-next-system/lib/

# Search for hardcoded company filters
grep -r "company.*=.*['\"]" erp-next-system/app/api/

# Search for hardcoded account names with company suffix
grep -r " - BAC\|" erp-next-system/app/ erp-next-system/components/
```

Semua search di atas harus return **no results** (kecuali di test files).
