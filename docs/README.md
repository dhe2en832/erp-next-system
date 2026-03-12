# Dokumentasi Sistem ERP

Dokumentasi ini telah diorganisir ke dalam folder-folder berdasarkan kategori untuk memudahkan navigasi dan pencarian.

## Struktur Folder

### 📊 accounting-period/
Dokumentasi terkait periode akuntansi, penutupan periode, dan laporan keuangan.
- **NET_INCOME_CALCULATION.md** - Perhitungan laba bersih yang benar, menangani expense negatif
- **PERIOD_CLOSING_COMPLETE_GUIDE.md** - Panduan lengkap penutupan periode (English)
- **PANDUAN_PENUTUPAN_PERIODE.md** - Panduan lengkap penutupan periode (Bahasa Indonesia)
- Proses penutupan periode
- Validasi periode akuntansi
- Jurnal penutupan otomatis
- Status implementasi fitur

### 🔌 api-routes/
Dokumentasi tentang API routes dan endpoint backend.
- Struktur API routes
- Konvensi penamaan endpoint
- Implementasi CRUD operations

### 🐛 bugs-fixes/
Dokumentasi bug fixes dan solusi masalah yang telah diselesaikan.
- Bank reconciliation fixes
- Closed period error handling
- Company total stock fixes
- Dan bug fixes lainnya

### 📈 chart-of-accounts/
Dokumentasi tentang Chart of Accounts (COA) dan struktur akun.
- Analisis COA
- Opening balance
- Struktur akun keuangan

### 💳 credit-note/
Dokumentasi tentang Credit Note dan pengembalian penjualan.
- Implementasi credit note
- Proses pengembalian
- Integrasi dengan sistem

### 🚀 deployment/
Dokumentasi deployment dan konfigurasi production.
- Panduan deployment
- Konfigurasi environment
- Best practices production

### 👥 employee-management/
Dokumentasi manajemen karyawan dan komisi.
- Sistem komisi
- Manajemen data karyawan
- Perhitungan komisi

### 📦 inventory/
Dokumentasi terkait manajemen inventory dan stok.
- **stock-card-report-standards.md** - Standar implementasi untuk Stock Card Report (pagination, sorting, export, print)
- Best practices untuk laporan inventory
- Implementasi dual summary (periode & halaman)
- Metode pengambilan data dengan `client.getCount()`

### 🌐 multi-site/
Dokumentasi untuk konfigurasi multi-site/multi-tenant.
- Setup multi-site
- Konfigurasi per-site
- Manajemen tenant

### 💰 payment-system/
Dokumentasi sistem pembayaran.
- Payment entry
- Payment reconciliation
- Integrasi pembayaran

### 🔄 sales-return/
Dokumentasi lengkap tentang Sales Return.
- Implementasi sales return
- Partial return guide
- Migration guide
- Frontend implementation
- Hybrid summary

### 💵 tax-system/
Dokumentasi sistem perpajakan.
- Analisis diskon dan pajak
- Konfigurasi tax templates
- Validasi tax templates
- Test plan tax calculation

### 🎨 ui-ux/
Dokumentasi tentang UI/UX dan frontend implementation.
- UI standardization guide
- Loading states implementation
- Toast notifications
- Print system
- Form submission best practices
- Frontend updates

### 📚 general/
Dokumentasi umum dan referensi sistem.
- ERPNext CRUD operations guide
- ERPNext submit implementation
- Server scripts
- SQL verification queries
- Analisis kekurangan sistem
- Dokumentasi sistem ERP
- Proposal sistem
- Task summaries

## Cara Menggunakan

1. Pilih kategori yang sesuai dengan topik yang ingin Anda pelajari
2. Buka folder kategori tersebut
3. Baca file .md yang relevan dengan kebutuhan Anda

## Konvensi Penamaan

- File dalam Bahasa Indonesia menggunakan format: `NAMA_FILE.md`
- File dalam Bahasa Inggris menggunakan format: `file-name.md`
- File dengan prefix `TASK_` berisi ringkasan task yang telah diselesaikan

## Kontribusi

Saat menambahkan dokumentasi baru:
1. Tentukan kategori yang paling sesuai
2. Gunakan nama file yang deskriptif
3. Ikuti format markdown yang konsisten
4. Tambahkan referensi ke file terkait jika diperlukan

## Update Terakhir

Struktur folder ini dibuat pada: 11 Maret 2026
Tujuan: Mengorganisir 30+ file dokumentasi ke dalam 13 kategori untuk kemudahan navigasi.
