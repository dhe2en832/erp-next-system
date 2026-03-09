# Panduan Deploy ke VPS

## Prasyarat

- Node.js v20+ terinstall
- PM2 terinstall (`npm install -g pm2`)
- pnpm terinstall (`npm install -g pnpm`)
- Git terinstall

## Langkah Deploy

### 1. Clone/Pull Repository

```bash
cd ~/erp-next-system
git pull origin main
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Konfigurasi Environment

File `.env.production` sudah dikonfigurasi dengan:
- Default site: Demo Batasku (demo.batasku.cloud)
- Multi-site support untuk 4 sites:
  - Demo Batasku
  - BAC
  - Cirebon
  - CV Cirebon

**Catatan**: Jangan commit file `.env.production` ke Git karena berisi credentials.

### 4. Build Production

```bash
pnpm build
```

Build akan menghasilkan:
- 124 routes
- Optimized production bundle
- TypeScript compilation check

### 5. Deploy dengan PM2

File `ecosystem.config.js` sudah dikonfigurasi dengan semua environment variables.

```bash
# Stop process lama (jika ada)
pm2 stop nextjs
pm2 delete nextjs

# Start dengan ecosystem config
pm2 start ecosystem.config.js

# Save PM2 config untuk auto-restart
pm2 save

# Setup PM2 startup script (opsional, untuk auto-start saat server reboot)
pm2 startup
# Jalankan command yang diberikan PM2
```

### 6. Verifikasi Deployment

```bash
# Check status
pm2 status

# Check logs
pm2 logs nextjs --lines 50

# Monitor real-time
pm2 monit
```

Server akan berjalan di:
- Local: http://localhost:3000
- Network: http://0.0.0.0:3000

## Update Deployment

Untuk update aplikasi setelah ada perubahan code:

```bash
cd ~/erp-next-system

# Pull perubahan terbaru
git pull origin main

# Install dependencies baru (jika ada)
pnpm install

# Rebuild
pnpm build

# Restart PM2
pm2 restart nextjs

# Check logs
pm2 logs nextjs --lines 20
```

## Troubleshooting

### Error "Failed to find Server Action"

Ini terjadi karena browser cache masih menyimpan build lama:

1. Di VPS, rebuild aplikasi:
```bash
cd ~/erp-next-system
rm -rf .next
pnpm build
pm2 restart nextjs
```

2. Di browser, hard refresh:
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R

### Error "Site not found"

Pastikan environment variables di `ecosystem.config.js` sudah benar untuk semua sites.

### PM2 Process Crash

```bash
# Check error logs
pm2 logs nextjs --err --lines 50

# Restart process
pm2 restart nextjs

# Jika masih crash, delete dan start ulang
pm2 delete nextjs
pm2 start ecosystem.config.js
```

### Port Sudah Digunakan

```bash
# Check process yang menggunakan port 3000
lsof -i :3000

# Kill process jika perlu
kill -9 <PID>

# Atau ubah port di ecosystem.config.js dengan menambahkan:
# env: { PORT: '3001', ... }
```

## PM2 Commands Berguna

```bash
# List semua process
pm2 list

# Stop process
pm2 stop nextjs

# Restart process
pm2 restart nextjs

# Restart dengan reload env vars
pm2 restart nextjs --update-env

# Delete process
pm2 delete nextjs

# View logs
pm2 logs nextjs

# View logs (error only)
pm2 logs nextjs --err

# Clear logs
pm2 flush

# Monitor CPU/Memory
pm2 monit

# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

## Multi-Site Configuration

Aplikasi mendukung 4 sites:
1. **Demo Batasku** (demo.batasku.cloud) - Default
2. **BAC** (bac.batasku.cloud)
3. **Cirebon** (cirebon.batasku.cloud)
4. **CV Cirebon** (cvcirebon.batasku.cloud)

User dapat switch site melalui:
- Halaman `/select-site`
- Menu "Ganti Site" di navbar

Setiap site memiliki credentials terpisah yang dikonfigurasi di environment variables dengan format:
- `SITE_<SITE_ID>_API_URL`
- `SITE_<SITE_ID>_API_KEY`
- `SITE_<SITE_ID>_API_SECRET`

Contoh: `SITE_CIREBON_BATASKU_CLOUD_API_KEY`

## Keamanan

- Jangan commit file `.env.production` atau `ecosystem.config.js` ke Git
- Credentials disimpan di environment variables, tidak di browser/localStorage
- Gunakan HTTPS untuk semua koneksi ke ERPNext backend
- Pastikan firewall VPS hanya allow port yang diperlukan

## Backup

Sebelum deploy update major, backup:

```bash
# Backup .next folder
cp -r .next .next.backup

# Backup PM2 config
pm2 save

# Backup database (di ERPNext server)
# bench --site [site-name] backup
```

## Rollback

Jika deployment bermasalah:

```bash
# Restore .next backup
rm -rf .next
mv .next.backup .next

# Restart PM2
pm2 restart nextjs
```
