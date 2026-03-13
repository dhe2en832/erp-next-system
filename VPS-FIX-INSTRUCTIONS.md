# Instruksi Fix Build Error di VPS

## Masalah
Error saat build production di VPS:
```
.next/types/validator.ts:1403:39 - error TS2307: Cannot find module '../../app/api/analytics/debug-products/route.js'
```

## Penyebab
File `.next/types/validator.ts` yang lama masih mereferensi route `debug-products` yang sudah dihapus. Directory `.next/` tidak ter-track di git (ada di `.gitignore`), jadi perubahan penghapusan tidak otomatis ter-sync ke VPS.

## Solusi - Jalankan di VPS

```bash
# 1. Masuk ke directory project
cd ~/erp-next-system

# 2. Stop PM2 process (jika sedang running)
pm2 stop nextjs

# 3. Hapus build artifacts lama (PENTING!)
rm -rf .next .next.backup

# 4. Pull perubahan terbaru dari git
git pull origin main

# 5. Install dependencies (jika ada perubahan)
pnpm install

# 6. Build production (akan bersih tanpa error)
pnpm build:production
# Ketik "yes" saat diminta konfirmasi

# 7. Start PM2 process
pm2 start ecosystem.config.js

# 8. Verify logs
pm2 logs nextjs --lines 50
```

## Verifikasi Build Berhasil

Setelah menjalankan `pnpm build:production`, Anda harus melihat:

```
✅ Production build completed successfully!
📦 Build output: .next/
💾 Backup: .next.backup/
🚀 Deploy with: pnpm start:production
```

## Catatan Penting

**SELALU hapus `.next/` sebelum build di VPS** setelah pull changes yang:
- Menghapus API routes
- Menghapus pages
- Mengubah struktur routing

Ini mencegah TypeScript validation error yang mereferensi file lama.

## Untuk Deployment Selanjutnya

Gunakan workflow ini setiap kali deploy update:

```bash
cd ~/erp-next-system
pm2 stop nextjs
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
