# Cara Fix Employee Creation Error

## Masalah
Saat membuat employee baru, muncul error:
```
Duplicate entry 'HR-EMP-00001' for key 'PRIMARY'
```

Padahal sudah ada 15 employees (HR-EMP-00001 sampai HR-EMP-00015).

## Penyebab
Naming series counter di ERPNext stuck di angka 1. Ini terjadi karena 15 employees dibuat tanggal 2026-02-21 (kemungkinan import data), tapi counter tidak di-update.

## Solusi (HARUS DI SERVER)

### Langkah 1: SSH ke ERPNext Server
```bash
ssh user@your-erpnext-server
```

### Langkah 2: Buka Bench Console
```bash
bench --site cirebon.batasku.cloud console
```

### Langkah 3: Copy-Paste Script Python
Copy seluruh isi file `fix_employee_naming_series.py` dan paste ke console.

Script akan otomatis:
1. Cek semua employee yang ada
2. Cari ID tertinggi (HR-EMP-00015)
3. Update counter ke 16
4. Tampilkan hasil

### Langkah 4: Exit Console
```python
exit()
```

### Langkah 5: Test di Next.js App
1. Buka http://localhost:3000/employees
2. Klik "Tambah Employee"
3. Isi form dan save
4. Seharusnya berhasil dengan ID **HR-EMP-00016**

## Kenapa Tidak Bisa Fix via API?

ERPNext tidak mengizinkan update naming series counter via API karena alasan security. Hanya bisa via:
1. Python script di server (RECOMMENDED)
2. Direct SQL ke database
3. ERPNext UI (jika ada menu Naming Series)

## File-File Terkait

- **fix_employee_naming_series.py** - Script Python untuk fix (GUNAKAN INI)
- **EMPLOYEE_NAMING_SERIES_FIX.md** - Dokumentasi lengkap
- **test-naming-series-query.ts** - Script untuk cek status counter
- Test scripts lainnya - Untuk troubleshooting

## Pertanyaan?

Jika masih error setelah run script Python, cek:
1. Apakah script berhasil dijalankan? (lihat output "✅ Successfully updated")
2. Apakah site yang benar? (cirebon.batasku.cloud)
3. Coba restart bench: `bench restart`
