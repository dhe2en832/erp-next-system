# Multi-Site Flow Documentation

## Overview

Sistem ERP sekarang mendukung multi-site dengan flow yang telah diperbaiki:
1. User memilih site SEBELUM login
2. Company name ditampilkan dari ERPNext (bukan "Unknown")
3. Site baru dapat didaftarkan dan langsung muncul di pilihan

## User Flow

### 1. Akses Pertama Kali
```
User akses aplikasi (/)
  ↓
SiteGuard check: Ada active site?
  ↓ (Tidak)
Redirect ke /select-site
  ↓
User pilih site dari list
  ↓
Klik "Lanjutkan ke Login"
  ↓
Redirect ke /login
  ↓
User login dengan credentials
  ↓
Redirect ke /select-company (jika multiple companies)
  ↓
Redirect ke /dashboard
```

### 2. Menambah Site Baru (Sebelum Login)
```
User di /select-site
  ↓
Klik "Tambah Site Baru"
  ↓
Isi form:
  - Nama Site: bac.batasku.cloud
  - API Key: xxx (untuk validasi)
  - API Secret: yyy (untuk validasi)
  ↓
Sistem validasi format (.batasku.cloud)
  ↓
Sistem validasi koneksi ke ERPNext dengan credentials
  - Request: GET /api/method/ping
  - Headers: Authorization: token xxx:yyy
  ↓
Jika berhasil (200 OK):
  ✓ Site valid
  ✓ Simpan ke localStorage dengan credentials 'env' (TIDAK simpan xxx:yyy)
  ✓ Site muncul di list
  ↓
Jika gagal (401, 403, timeout, network error):
  ❌ Error: "Site tidak dapat diakses atau credentials invalid"
  ❌ Site TIDAK ditambahkan
```

### 3. Menghapus Site (Sebelum Login)
```
User di /select-site
  ↓
Klik tombol delete (ikon trash) pada site card
  ↓
Konfirmasi: "Apakah Anda yakin ingin menghapus site?"
  ↓
Site dihapus dari localStorage
  ↓
Site hilang dari list
```

**Catatan**: 
- Site yang sedang aktif tidak bisa dihapus (tombol delete tidak muncul)
- Demo site (demo.batasku.cloud) bisa dihapus jika bukan site aktif
- **Validasi dengan credentials:** User harus input API Key/Secret untuk validasi, tapi credentials TIDAK disimpan di localStorage
- **Credentials dari environment:** Saat runtime, credentials dimuat dari environment variables:
  - `SITE_<SITE_ID>_API_KEY` (contoh: `SITE_BAC_BATASKU_CLOUD_API_KEY`)
  - `SITE_<SITE_ID>_API_SECRET` (contoh: `SITE_BAC_BATASKU_CLOUD_API_SECRET`)

## Komponen Utama

### 1. SiteGuard Component
**File**: `components/SiteGuard.tsx`

**Fungsi**: 
- Memastikan user sudah memilih site sebelum akses halaman protected
- Redirect ke `/select-site` jika belum ada active site
- Skip check untuk public paths: `/select-site`, `/settings/sites`

### 2. Site Selector Page
**File**: `app/select-site/page.tsx`

**Fitur**:
- Menampilkan list sites yang tersedia
- Fetch dan display company name dari ERPNext (jika credentials valid)
- Health status indicator (Online/Offline)
- Response time monitoring
- Form tambah site baru (hanya perlu nama site)
- Tombol delete untuk menghapus site (kecuali site yang sedang aktif)

**Tambah Site Baru**:
- Input: Nama site (contoh: bac.batasku.cloud, cirebon.batasku.cloud)
- Validasi: Harus berakhiran .batasku.cloud dan site harus dapat diakses
- Credentials: Menggunakan 'env' marker (akan dimuat dari environment variables)
- Site langsung muncul di list setelah ditambahkan

**Hapus Site**:
- Tombol delete (ikon trash) muncul di setiap site card
- Site yang sedang aktif tidak bisa dihapus (tombol delete tidak muncul)
- Konfirmasi sebelum menghapus
- Site langsung hilang dari list setelah dihapus

**Tampilan Site Card**:
```
┌─────────────────────────────────────────────┐
│ ☑ Demo Batasku (Default)        [Online]   │
│   https://demo.batasku.cloud     120ms      │
│   PT. Demo Batasku Indonesia                │
│   demo-batasku                              │
└─────────────────────────────────────────────┘
```

### 3. Site Management Page
**File**: `app/settings/sites/page.tsx`

**Fitur**:
- Add new site dengan form validation
- Edit existing site
- Delete site (tidak bisa delete active site)
- Connection validation sebelum save
- Auto-fetch company name dari ERPNext

### 4. Site Config Library
**File**: `lib/site-config.ts`

**Fungsi Baru**:
- `fetchCompanyName(config)`: Fetch company name dari ERPNext API
- `validateSiteConnection(config)`: Validasi koneksi ke ERPNext

### 5. Site Context Provider
**File**: `lib/site-context.tsx`

**Fungsi**:
- Manage active site state
- Persist active site ke localStorage
- Auto-load sites dari environment atau localStorage
- Provide site switching functionality

## Data Structure

### SiteConfig Interface
```typescript
interface SiteConfig {
  id: string;                // Site ID (kebab-case)
  name: string;              // Site name
  displayName: string;       // Display name untuk UI
  apiUrl: string;            // ERPNext API URL
  apiKey: string;            // API Key
  apiSecret: string;         // API Secret
  companyName?: string;      // Company name dari ERPNext (NEW)
  isDefault?: boolean;       // Default site flag
  isActive?: boolean;        // Active site flag
  createdAt?: string;        // Created timestamp
  updatedAt?: string;        // Updated timestamp
}
```

## Storage

### localStorage Keys
- `erpnext-sites-config`: Menyimpan semua site configurations
- `erpnext-active-site`: Menyimpan active site ID
- `erpnext-site-health`: Menyimpan health check results

### Storage Schema
```json
{
  "version": 1,
  "sites": [
    {
      "id": "demo-batasku",
      "name": "demo-batasku",
      "displayName": "Demo Batasku (Default)",
      "apiUrl": "https://demo.batasku.cloud",
      "apiKey": "xxx",
      "apiSecret": "xxx",
      "companyName": "PT. Demo Batasku Indonesia",
      "isDefault": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "lastModified": "2025-01-01T00:00:00.000Z"
}
```

## API Endpoints Used

### Fetch Company Name
```
GET {apiUrl}/api/resource/Company?fields=["name","company_name"]&limit_page_length=1
Authorization: token {apiKey}:{apiSecret}
```

**Response**:
```json
{
  "data": [
    {
      "name": "PT. Demo Batasku Indonesia",
      "company_name": "PT. Demo Batasku Indonesia"
    }
  ]
}
```

### Validate Connection
```
GET {apiUrl}/api/method/ping
Authorization: token {apiKey}:{apiSecret}
```

**Response**: HTTP 200 OK

## Environment Variables

### Multi-Site Format dengan Environment-Based Credentials

Untuk setiap site yang ditambahkan melalui UI, credentials akan dimuat dari environment variables:

```env
# Format: SITE_<SITE_ID>_API_KEY dan SITE_<SITE_ID>_API_SECRET
# Site ID adalah nama site dengan titik diganti dash dan uppercase

# Contoh untuk bac.batasku.cloud
SITE_BAC_BATASKU_CLOUD_API_KEY=your_api_key_here
SITE_BAC_BATASKU_CLOUD_API_SECRET=your_api_secret_here

# Contoh untuk cirebon.batasku.cloud
SITE_CIREBON_BATASKU_CLOUD_API_KEY=your_api_key_here
SITE_CIREBON_BATASKU_CLOUD_API_SECRET=your_api_secret_here
```

### Legacy Format (Auto-migrated)
```env
ERPNEXT_API_URL=https://demo.batasku.cloud
ERP_API_KEY=xxx
ERP_API_SECRET=xxx
```

### Multi-Site Format (JSON)
```env
ERPNEXT_SITES='[
  {
    "name": "demo-batasku",
    "displayName": "Demo Batasku",
    "apiUrl": "https://demo.batasku.cloud",
    "apiKey": "xxx",
    "apiSecret": "xxx",
    "isDefault": true
  }
]'
```

## Migration Notes

### Automatic Migration
- Legacy environment variables otomatis di-migrate ke multi-site format
- Migration terjadi saat pertama kali load aplikasi
- Migrated site tersimpan di localStorage

### Default Site
- Jika tidak ada site configured, sistem otomatis add demo.batasku.cloud sebagai default
- Default site credentials:
  - URL: https://demo.batasku.cloud
  - API Key: 4618e5708dd3d06
  - API Secret: 8984b4011e4a654

## Troubleshooting

### Company Name Menampilkan "Unknown"
**Penyebab**: 
- Koneksi ke ERPNext gagal
- API Key/Secret tidak valid
- Company tidak ada di ERPNext

**Solusi**:
1. Check koneksi internet
2. Verify API Key dan Secret di ERPNext
3. Pastikan minimal ada 1 company di ERPNext
4. Refresh halaman untuk retry fetch

### Site Tidak Muncul di List
**Penyebab**:
- Site belum tersimpan di localStorage
- Browser localStorage disabled

**Solusi**:
1. Enable localStorage di browser
2. Clear browser cache dan reload
3. Add site lagi melalui /settings/sites

### Redirect Loop ke /select-site
**Penyebab**:
- Active site tidak valid
- Site ID tidak ditemukan di localStorage

**Solusi**:
1. Clear localStorage: `localStorage.clear()`
2. Reload aplikasi
3. Pilih site lagi dari /select-site

## Testing

### Manual Testing Checklist
- [ ] Akses pertama kali redirect ke /select-site
- [ ] Site list menampilkan company name (bukan "Unknown")
- [ ] Health status indicator berfungsi (Online/Offline)
- [ ] Klik site untuk select
- [ ] Klik "Lanjutkan ke Login" redirect ke /login
- [ ] Klik "Kelola Sites" redirect ke /settings/sites
- [ ] Add new site dengan form validation
- [ ] Connection validation berfungsi
- [ ] Company name auto-fetch saat add site
- [ ] Edit site berfungsi
- [ ] Delete site berfungsi (kecuali active site)
- [ ] Site baru langsung muncul di /select-site
- [ ] Ganti site dari /select-site berfungsi
- [ ] Active site persist setelah reload

## Future Improvements

1. **Site Health Monitoring**
   - Background health check setiap 60 detik
   - Notification jika site offline
   - Auto-switch ke backup site jika primary offline

2. **Site Sync**
   - Sync site configs across devices
   - Cloud backup untuk site configs
   - Import/export site configs

3. **Advanced Features**
   - Multi-company support per site
   - Site-specific settings
   - Site usage analytics
   - Site performance monitoring

4. **Security**
   - Encrypt API keys di localStorage
   - Two-factor authentication per site
   - Session timeout per site
   - Audit log untuk site access
