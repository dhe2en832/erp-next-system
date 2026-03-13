# Instruksi Fix Build Error di VPS

## Masalah
Error saat build production di VPS:
```
.next/types/validator.ts:1403:39 - error TS2307: Cannot find module '../../app/api/analytics/debug-products/route.js'
```

## Penyebab
1. File `.next/types/validator.ts` yang lama masih mereferensi route `debug-products` yang sudah dihapus
2. Directory `.next/` tidak ter-track di git (ada di `.gitignore`), jadi perubahan penghapusan tidak otomatis ter-sync ke VPS
3. File `.env.production` di VPS memiliki **duplikat** `ERPNEXT_API_URL`:
   - Baris pertama: `ERPNEXT_API_URL=https://demo.batasku.cloud` (benar)
   - Baris kedua: `ERPNEXT_API_URL=https://bac.batasku.cloud` (salah, meng-override yang pertama)
4. File `.env.lokal` (typo) juga meng-override settings

## Solusi - Jalankan di VPS

```bash
# 1. Masuk ke directory project
cd ~/erp-next-system

# 2. Stop PM2 process (jika sedang running)
pm2 stop nextjs

# 3. Pull perubahan terbaru dari git
git pull origin main

# 4. Jalankan script untuk fix .env.production
chmod +x fix-env-production-vps.sh
./fix-env-production-vps.sh

# 5. Verify file sudah benar (harus hanya 1 baris ERPNEXT_API_URL)
cat .env.production | grep ERPNEXT_API_URL

# 6. Hapus build artifacts lama
rm -rf .next .next.backup

# 7. Install dependencies (jika ada perubahan)
pnpm install

# 8. Build production (akan bersih tanpa error)
pnpm build:production
# Ketik "yes" saat diminta konfirmasi

# 9. Start PM2 process
pm2 start ecosystem.config.js

# 10. Verify logs
pm2 logs nextjs --lines 50
```

## Verifikasi Build Berhasil

Setelah menjalankan `pnpm build:production`, Anda harus melihat:

```
Step 2: Validating environment variables
🔍 Validating environment variables...
✅ Environment validation passed
📦 Building for: production
🔗 Backend URL: https://demo.batasku.cloud  ← HARUS demo.batasku.cloud, BUKAN bac.batasku.cloud

...

✅ Production build completed successfully!
📦 Build output: .next/
💾 Backup: .next.backup/
🚀 Deploy with: pnpm start:production
```

**PENTING**: Pastikan Backend URL adalah `https://demo.batasku.cloud` (default site untuk multi-site), bukan `https://bac.batasku.cloud`.

## Catatan Penting

**SELALU hapus `.next/` sebelum build di VPS** setelah pull changes yang:
- Menghapus API routes
- Menghapus pages
- Mengubah struktur routing

**JANGAN gunakan `.env.local` di VPS production**:
- File `.env.local` akan meng-override `.env.production`
- Ini menyebabkan default site salah (BAC instead of Demo Batasku)
- Untuk production, gunakan `.env.production` saja
- Jika perlu override credentials, gunakan `.env.production.local` (tapi jangan commit ke git)

Ini mencegah TypeScript validation error yang mereferensi file lama.

## Untuk Deployment Selanjutnya

Gunakan workflow ini setiap kali deploy update:

```bash
cd ~/erp-next-system
pm2 stop nextjs

# PENTING: Pastikan tidak ada .env.local di VPS production
rm -f .env.local

rm -rf .next .next.backup
git pull origin main
pnpm install
pnpm build:production
pm2 start ecosystem.config.js
pm2 logs nextjs --lines 50
```

Atau gunakan script yang lebih aman dengan zero-downtime:

```bash
cd ~/erp-next-system

# PENTING: Pastikan tidak ada .env.local
rm -f .env.local

git pull origin main
pnpm install
rm -rf .next .next.backup
pnpm build:production
pm2 reload nextjs  # Zero-downtime restart
```

## Troubleshooting Lebih Lanjut

Lihat dokumentasi lengkap di:
- `docs/deployment/DEPLOYMENT.md`
- `docs/deployment/TROUBLESHOOTING.md`
