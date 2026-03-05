# Multi-Site Credentials Flow

## Overview

Sistem multi-site menggunakan environment variables untuk menyimpan API credentials. User hanya perlu mendaftarkan nama site, credentials akan dimuat dari environment saat runtime.

## Alur Lengkap

### 1. Setup Environment Variables (Developer/DevOps)

Developer atau DevOps engineer menambahkan credentials ke environment variables:

```bash
# File: .env.local atau .env.production

# Format: SITE_<SITE_ID>_API_KEY dan SITE_<SITE_ID>_API_SECRET
# Site ID = nama site dengan titik diganti dash dan uppercase

# Contoh untuk bac.batasku.cloud
SITE_BAC_BATASKU_CLOUD_API_KEY=abc123def456
SITE_BAC_BATASKU_CLOUD_API_SECRET=xyz789uvw012

# Contoh untuk cirebon.batasku.cloud
SITE_CIREBON_BATASKU_CLOUD_API_KEY=ghi345jkl678
SITE_CIREBON_BATASKU_CLOUD_API_SECRET=mno901pqr234

# Contoh untuk cvcirebon.batasku.cloud
SITE_CVCIREBON_BATASKU_CLOUD_API_KEY=stu567vwx890
SITE_CVCIREBON_BATASKU_CLOUD_API_SECRET=yza123bcd456
```

### 2. User Mendaftarkan Site (UI)

User membuka `/select-site` dan menambahkan site baru:

```
Input: bac.batasku.cloud
  ↓
Validasi format: ✓ berakhiran .batasku.cloud
  ↓
Generate Site ID: bac-batasku-cloud
  ↓
Generate Display Name: BAC
  ↓
Generate API URL: https://bac.batasku.cloud
  ↓
Save to localStorage:
  {
    id: "bac-batasku-cloud",
    name: "bac.batasku.cloud",
    displayName: "BAC",
    apiUrl: "https://bac.batasku.cloud",
    apiKey: "env",  // Marker untuk load dari environment
    apiSecret: "env" // Marker untuk load dari environment
  }
  ↓
Site muncul di list ✓
```

**TIDAK ADA VALIDASI KONEKSI** pada tahap ini karena:
- Credentials belum dimuat (masih marker 'env')
- Validasi akan dilakukan saat login

### 3. User Login

User memilih site dan klik "Lanjutkan ke Login":

```
User pilih site: bac-batasku-cloud
  ↓
Redirect ke /login
  ↓
User input username & password
  ↓
System load credentials dari environment:
  - Cari: SITE_BAC_BATASKU_CLOUD_API_KEY
  - Cari: SITE_BAC_BATASKU_CLOUD_API_SECRET
  ↓
Jika ditemukan:
  - Replace 'env' dengan actual credentials
  - Lakukan login request ke ERPNext
  ↓
Jika TIDAK ditemukan:
  - Error: "Credentials tidak ditemukan di environment"
  - User harus contact admin untuk setup credentials
```

### 4. Runtime Credentials Loading

Saat API request ke ERPNext, sistem menggunakan `lib/site-credentials.ts`:

```typescript
// Contoh penggunaan
import { resolveSiteConfig } from '@/lib/site-credentials';

const site = getSite('bac-batasku-cloud');
// site.apiKey = 'env'
// site.apiSecret = 'env'

const resolvedSite = resolveSiteConfig(site);
// resolvedSite.apiKey = 'abc123def456' (dari environment)
// resolvedSite.apiSecret = 'xyz789uvw012' (dari environment)

// Gunakan resolvedSite untuk API request
const client = new ERPNextClient(resolvedSite);
```

## Mapping Site Name ke Environment Variable

| Site Name | Site ID | Env Var Prefix |
|-----------|---------|----------------|
| bac.batasku.cloud | bac-batasku-cloud | SITE_BAC_BATASKU_CLOUD |
| cirebon.batasku.cloud | cirebon-batasku-cloud | SITE_CIREBON_BATASKU_CLOUD |
| cvcirebon.batasku.cloud | cvcirebon-batasku-cloud | SITE_CVCIREBON_BATASKU_CLOUD |
| demo.batasku.cloud | demo-batasku-cloud | SITE_DEMO_BATASKU_CLOUD |

**Rumus Konversi:**
```
Site Name: bac.batasku.cloud
  ↓ Replace . dengan -
Site ID: bac-batasku-cloud
  ↓ Replace - dengan _ dan uppercase
Env Prefix: SITE_BAC_BATASKU_CLOUD
  ↓ Append _API_KEY atau _API_SECRET
Env Vars:
  - SITE_BAC_BATASKU_CLOUD_API_KEY
  - SITE_BAC_BATASKU_CLOUD_API_SECRET
```

## Keuntungan Pendekatan Ini

### 1. Security
- Credentials tidak pernah disimpan di localStorage
- Credentials hanya ada di environment variables (server-side)
- User tidak perlu tahu credentials

### 2. Simplicity
- User hanya perlu tahu nama site
- Tidak perlu input API Key/Secret manual
- Tidak perlu validasi koneksi saat pendaftaran

### 3. Centralized Management
- Admin/DevOps mengelola credentials di satu tempat (.env files)
- Mudah rotate credentials (update .env, restart app)
- Mudah add/remove sites

### 4. Multi-Environment Support
- Development: .env.local
- Staging: .env.staging
- Production: .env.production
- Setiap environment bisa punya credentials berbeda

## Error Handling

### Error 1: Credentials Tidak Ditemukan

```
User login ke site: bac.batasku.cloud
  ↓
System cari: SITE_BAC_BATASKU_CLOUD_API_KEY
  ↓
NOT FOUND ❌
  ↓
Error Message:
  "Credentials untuk site 'bac.batasku.cloud' tidak ditemukan.
   Hubungi administrator untuk menambahkan:
   - SITE_BAC_BATASKU_CLOUD_API_KEY
   - SITE_BAC_BATASKU_CLOUD_API_SECRET
   ke environment variables."
```

### Error 2: Credentials Invalid

```
User login ke site: bac.batasku.cloud
  ↓
System load credentials: ✓
  ↓
Login request ke ERPNext
  ↓
Response: 401 Unauthorized ❌
  ↓
Error Message:
  "Login gagal. API Key atau Secret tidak valid.
   Hubungi administrator untuk memverifikasi credentials."
```

### Error 3: Site Tidak Dapat Diakses

```
User login ke site: bac.batasku.cloud
  ↓
System load credentials: ✓
  ↓
Login request ke ERPNext
  ↓
Network Error (timeout, DNS error, etc.) ❌
  ↓
Error Message:
  "Tidak dapat mengakses site 'bac.batasku.cloud'.
   Pastikan:
   1. Site URL benar
   2. Site dapat diakses dari internet
   3. Tidak ada firewall blocking"
```

## FAQ

### Q: Kenapa tidak validasi koneksi saat pendaftaran site?

**A:** Karena:
1. Credentials belum dimuat (masih marker 'env')
2. Tidak bisa validasi tanpa credentials
3. Validasi sebenarnya terjadi saat login

### Q: Bagaimana jika user salah ketik nama site?

**A:** 
1. Validasi format memastikan berakhiran `.batasku.cloud`
2. Jika typo (contoh: `batsaku` instead of `batasku`), akan error saat login
3. User bisa delete site yang salah dan tambah lagi yang benar

### Q: Bagaimana cara mendapatkan API Key dan Secret?

**A:**
1. Login ke ERPNext sebagai Administrator
2. Buka: User Menu → API Access → Generate Keys
3. Copy API Key dan API Secret
4. Tambahkan ke .env file dengan format yang benar

### Q: Apakah bisa menggunakan credentials yang sama untuk semua site?

**A:** 
Tidak disarankan. Setiap site harus punya credentials sendiri untuk:
1. Security isolation
2. Audit trail yang jelas
3. Mudah revoke access per site

### Q: Bagaimana cara rotate credentials?

**A:**
1. Generate new API Key/Secret di ERPNext
2. Update .env file dengan credentials baru
3. Restart aplikasi
4. Old credentials otomatis tidak valid

## Troubleshooting

### Problem: Site tidak muncul setelah ditambahkan

**Solution:**
1. Check browser console untuk error
2. Check localStorage: `localStorage.getItem('erpnext-sites-config')`
3. Refresh halaman
4. Clear localStorage dan tambah lagi

### Problem: Login gagal dengan "Credentials tidak ditemukan"

**Solution:**
1. Check .env file ada credentials untuk site tersebut
2. Check format env var name (uppercase, underscore)
3. Restart development server (pnpm dev)
4. Check environment variables loaded: `console.log(process.env)`

### Problem: Login gagal dengan "401 Unauthorized"

**Solution:**
1. Verify API Key dan Secret di ERPNext
2. Check credentials tidak expired
3. Check user permissions di ERPNext
4. Regenerate API Key/Secret jika perlu

