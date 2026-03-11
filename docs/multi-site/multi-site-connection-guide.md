# Panduan Koneksi Multi-Site

## Cara Kerja Koneksi

### Arsitektur
```
┌─────────────────────────────────────┐
│  Next.js Frontend (localhost:3000)  │
│  - Berjalan di laptop/device Anda   │
│  - Browser-based application        │
└──────────────┬──────────────────────┘
               │
               │ HTTP/HTTPS Request
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌──────────────────┐
│ ERPNext     │  │ ERPNext Cloud    │
│ Lokal       │  │ - demo.batasku   │
│ localhost   │  │ - bac.batasku    │
│ :8000       │  │ - cirebon.batasku│
└─────────────┘  └──────────────────┘
```

### Frontend (Next.js)
- Berjalan di **laptop/device Anda**
- URL: `http://localhost:3000` (development)
- Hanya interface/tampilan
- Tidak menyimpan data bisnis

### Backend (ERPNext)
- Bisa di **mana saja** yang bisa diakses dari laptop Anda:
  - **Lokal**: `http://localhost:8000` (ERPNext di laptop yang sama)
  - **Cloud**: `https://demo.batasku.cloud` (ERPNext di server cloud)
  - **LAN**: `http://192.168.1.100:8000` (ERPNext di komputer lain di jaringan lokal)
  - **Internet**: URL apapun yang bisa diakses

## Contoh Skenario

### Skenario 1: Development Lokal
```
Frontend: localhost:3000 (laptop Anda)
Backend:  localhost:8000 (ERPNext lokal di laptop yang sama)
```
- Cocok untuk development dan testing
- Tidak perlu internet
- Data hanya di laptop Anda

### Skenario 2: Frontend Lokal, Backend Cloud
```
Frontend: localhost:3000 (laptop Anda)
Backend:  https://demo.batasku.cloud (ERPNext di cloud)
```
- **INI YANG ANDA GUNAKAN SEKARANG**
- Frontend development di laptop
- Backend production di cloud
- Butuh internet untuk akses backend
- Data tersimpan di cloud

### Skenario 3: Production (Keduanya di Cloud)
```
Frontend: https://erp.batasku.cloud (Next.js di server)
Backend:  https://demo.batasku.cloud (ERPNext di server)
```
- Untuk production deployment
- User akses dari browser manapun
- Semua di cloud

## Konfigurasi Site

### Default Sites yang Tersedia

Sistem selalu menyediakan site default:

**Demo Batasku (Default)**
- URL: `https://demo.batasku.cloud`
- API Key: `4618e5708dd3d06`
- API Secret: `8984b4011e4a654`
- Selalu muncul di pilihan site
- Bisa digunakan untuk testing

### Menambah Site Sendiri

Setelah login sebagai admin, buka **Pengaturan → Manajemen Sites**:

1. **Klik "Tambah Site"**
2. **Isi form:**
   - Display Name: Nama yang ditampilkan (contoh: "BAC Batasku")
   - API URL: URL ERPNext (contoh: `https://bac.batasku.cloud`)
   - API Key: Dari ERPNext (User → API Access)
   - API Secret: Dari ERPNext (User → API Access)
   - Set as Default: Centang jika ingin jadi default

3. **Test Connection** - Pastikan koneksi berhasil
4. **Simpan**

### Site yang Dikonfigurasi

Site yang Anda tambahkan akan:
- Tersimpan di **localStorage browser** di device Anda
- Muncul di pilihan site selector
- Bisa digunakan untuk login
- Berbeda per device (laptop, HP, tablet punya konfigurasi sendiri)

## CORS dan Network

### Akses ke ERPNext Cloud

Untuk akses dari `localhost:3000` ke `https://demo.batasku.cloud`:

1. **CORS harus diaktifkan** di ERPNext server
2. **Firewall** harus allow koneksi dari IP Anda
3. **Internet** harus tersedia

### Troubleshooting

**Error: CORS Policy**
```
Access to fetch at 'https://demo.batasku.cloud' from origin 
'http://localhost:3000' has been blocked by CORS policy
```
**Solusi**: Minta admin ERPNext untuk enable CORS untuk localhost:3000

**Error: Network Error**
```
Failed to fetch
```
**Solusi**: 
- Cek koneksi internet
- Cek URL ERPNext benar
- Cek firewall tidak block

**Error: 401 Unauthorized**
```
Authentication failed
```
**Solusi**:
- Cek API Key dan Secret benar
- Cek user memiliki API Access di ERPNext

## Testing Koneksi

### Dari Browser Console

Buka browser console (F12) dan jalankan:

```javascript
// Test koneksi ke demo site
fetch('https://demo.batasku.cloud/api/method/ping', {
  headers: {
    'Authorization': 'token 4618e5708dd3d06:8984b4011e4a654'
  }
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

Jika berhasil, akan muncul response dari ERPNext.

### Dari Next.js

Sistem sudah otomatis melakukan health check setiap 60 detik untuk semua site yang dikonfigurasi. Lihat status di site selector (badge hijau = online, merah = offline).

## Best Practices

### Development
- Gunakan ERPNext lokal untuk development
- Gunakan demo site untuk testing fitur baru
- Jangan gunakan production site untuk testing

### Production
- Deploy Next.js ke server (Vercel, Netlify, dll)
- Gunakan HTTPS untuk semua koneksi
- Set proper CORS di ERPNext
- Gunakan environment variables untuk credentials

### Security
- Jangan commit API keys ke git
- Gunakan environment variables
- Rotate API keys secara berkala
- Batasi API access per user role

## FAQ

**Q: Apakah frontend harus di server yang sama dengan backend?**
A: Tidak. Frontend bisa di mana saja, asalkan bisa akses backend via HTTP/HTTPS.

**Q: Apakah bisa connect ke multiple ERPNext sekaligus?**
A: Ya! Itu tujuan multi-site support. Anda bisa switch antar site dengan mudah.

**Q: Apakah data tersimpan di frontend?**
A: Tidak. Data bisnis tersimpan di ERPNext backend. Frontend hanya menyimpan:
  - Konfigurasi site (localStorage)
  - Session cookies (per site)
  - Cache sementara (sessionStorage)

**Q: Apakah bisa akses ERPNext lokal dari HP?**
A: Ya, jika HP dan laptop di jaringan yang sama. Gunakan IP laptop sebagai URL (contoh: `http://192.168.1.100:8000`).

**Q: Kenapa site demo selalu muncul?**
A: Untuk kemudahan testing. Anda bisa ignore jika tidak digunakan.
