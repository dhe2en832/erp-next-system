# Multi-Site Setup Guide

## Overview

Sistem ini mendukung multiple ERPNext sites dengan credential management yang aman melalui environment variables.

## Cara Menambahkan Site Baru

### 1. Tambah Site via UI

1. Buka halaman `/select-site`
2. Klik "Tambah Site Baru"
3. Masukkan:
   - **Nama Site**: contoh `bac.batasku.cloud`
   - **API Key**: untuk validasi
   - **API Secret**: untuk validasi
4. Klik "Tambah Site"

**Catatan**: Credentials hanya digunakan untuk validasi, TIDAK disimpan di browser.

### 2. Tambahkan Credentials ke Environment Variables

Setelah site berhasil ditambahkan, admin harus menambahkan credentials ke file `.env.local`:

```bash
# Format: SITE_<SITE_ID>_API_KEY dan SITE_<SITE_ID>_API_SECRET
# Site ID: domain dengan titik diganti dash, lalu uppercase dengan underscore

# Contoh untuk bac.batasku.cloud
SITE_BAC_BATASKU_CLOUD_API_KEY=your_api_key_here
SITE_BAC_BATASKU_CLOUD_API_SECRET=your_api_secret_here
```

#### Cara Generate Site ID untuk Environment Variable

| Site Name | Site ID | Environment Variable Prefix |
|-----------|---------|----------------------------|
| `bac.batasku.cloud` | `bac-batasku-cloud` | `SITE_BAC_BATASKU_CLOUD` |
| `demo.batasku.cloud` | `demo-batasku-cloud` | `SITE_DEMO_BATASKU_CLOUD` |
| `cirebon.batasku.cloud` | `cirebon-batasku-cloud` | `SITE_CIREBON_BATASKU_CLOUD` |

**Rumus**:
1. Ganti titik (`.`) dengan dash (`-`) → `bac-batasku-cloud`
2. Uppercase dan ganti dash dengan underscore → `BAC_BATASKU_CLOUD`
3. Tambahkan prefix `SITE_` → `SITE_BAC_BATASKU_CLOUD`

### 3. Restart Development Server

```bash
# Stop server (Ctrl+C)
# Start server
pnpm dev
```

Environment variables hanya dimuat saat server start, jadi restart diperlukan.

### 4. Test Login

1. Pilih site yang baru ditambahkan
2. Klik "Lanjutkan ke Login"
3. Login dengan credentials ERPNext
4. Verifikasi company yang muncul sesuai dengan site yang dipilih

## Contoh Konfigurasi Lengkap

File `.env.local`:

```bash
# Development Environment Configuration
NEXT_PUBLIC_APP_ENV=development

# ERPNext API Configuration for Development
# Default site: Demo Batasku
ERPNEXT_API_URL=https://demo.batasku.cloud
ERP_API_KEY=4618e5708dd3d06
ERP_API_SECRET=8984b4011e4a654

# Multi-Site Credentials
# Format: SITE_<SITE_ID>_API_KEY and SITE_<SITE_ID>_API_SECRET

# Demo Batasku (demo.batasku.cloud)
SITE_DEMO_BATASKU_CLOUD_API_KEY=4618e5708dd3d06
SITE_DEMO_BATASKU_CLOUD_API_SECRET=8984b4011e4a654

# BAC (bac.batasku.cloud)
SITE_BAC_BATASKU_CLOUD_API_KEY=4618e5708dd3d06
SITE_BAC_BATASKU_CLOUD_API_SECRET=8102adc0e87bb27

# Cirebon (cirebon.batasku.cloud)
SITE_CIREBON_BATASKU_CLOUD_API_KEY=4618e5708dd3d06
SITE_CIREBON_BATASKU_CLOUD_API_SECRET=c0541b43bb18814

# CV Cirebon (cvcirebon.batasku.cloud)
SITE_CVCIREBON_BATASKU_CLOUD_API_KEY=4618e5708dd3d06
SITE_CVCIREBON_BATASKU_CLOUD_API_SECRET=05e5f192e2d458d
```

## Keamanan

### ✅ Aman
- Credentials disimpan di environment variables (server-side)
- Tidak pernah terekspos ke browser
- Tidak bisa diakses via DevTools
- Best practice untuk production

### ❌ Tidak Aman (Tidak Digunakan)
- ~~Simpan credentials di localStorage~~
- ~~Simpan credentials di cookies~~
- ~~Hardcode credentials di source code~~

## Troubleshooting

### Error: "Site not found and no environment credentials"

**Penyebab**: Environment variables belum dikonfigurasi atau server belum direstart.

**Solusi**:
1. Cek file `.env.local` - pastikan credentials sudah ditambahkan
2. Verifikasi format environment variable benar
3. Restart development server (`Ctrl+C` lalu `pnpm dev`)

### Error: "Missing environment variables for site"

**Penyebab**: Format environment variable salah atau typo.

**Solusi**:
1. Cek nama environment variable:
   - Harus diawali `SITE_`
   - Site ID harus uppercase dengan underscore
   - Harus diakhiri `_API_KEY` atau `_API_SECRET`
2. Contoh benar: `SITE_BAC_BATASKU_CLOUD_API_KEY`
3. Contoh salah: `SITE_bac-batasku-cloud_API_KEY` (tidak uppercase)

### Company yang Muncul Salah

**Penyebab**: Cookie `active_site` tidak sesuai dengan site yang dipilih.

**Solusi**:
1. Clear cookies browser
2. Logout dan login ulang
3. Pilih site yang benar di `/select-site`
4. Verifikasi di login page ada indicator "Site Aktif: [nama site]"

## Production Deployment

Untuk production, gunakan environment variables dari platform hosting:

### Vercel
```bash
vercel env add SITE_BAC_BATASKU_CLOUD_API_KEY
vercel env add SITE_BAC_BATASKU_CLOUD_API_SECRET
```

### AWS / Docker
```bash
# Dockerfile atau docker-compose.yml
ENV SITE_BAC_BATASKU_CLOUD_API_KEY=your_key
ENV SITE_BAC_BATASKU_CLOUD_API_SECRET=your_secret
```

### Kubernetes
```yaml
# ConfigMap atau Secret
apiVersion: v1
kind: Secret
metadata:
  name: erpnext-sites
data:
  SITE_BAC_BATASKU_CLOUD_API_KEY: <base64_encoded>
  SITE_BAC_BATASKU_CLOUD_API_SECRET: <base64_encoded>
```

## Best Practices

1. **Jangan commit credentials** ke Git
   - Pastikan `.env.local` ada di `.gitignore`
   - Gunakan `.env.example` untuk template

2. **Gunakan secret management tools** untuk production
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault

3. **Rotate credentials secara berkala**
   - Update credentials di ERPNext
   - Update environment variables
   - Restart server

4. **Monitor access logs**
   - Track API usage per site
   - Detect suspicious activity
   - Alert on authentication failures
