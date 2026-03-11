# Multi-Site Employee Naming Series Fix

## Penting untuk Multi-Site Setup

Setiap site di ERPNext punya **database terpisah**, jadi naming series counter juga **terpisah per site**. Jika ada masalah duplicate entry di satu site, kemungkinan site lain juga punya masalah yang sama.

## Sites yang Dikonfigurasi

Berdasarkan `.env.local`, ada 4 sites:

1. **demo.batasku.cloud** (Demo Batasku)
2. **bac.batasku.cloud** (BAC)
3. **cirebon.batasku.cloud** (Cirebon) ← Issue ditemukan di sini
4. **cvcirebon.batasku.cloud** (CV Cirebon)

## Cara Cek Semua Sites

### Option 1: Menggunakan Script TypeScript

```bash
cd erp-next-system
npx tsx check-all-sites-naming-series.ts
```

Script ini akan:
- Cek setiap site satu per satu
- Hitung jumlah employees dan highest ID
- Test apakah naming series berfungsi
- Tampilkan summary site mana yang perlu di-fix

### Option 2: Manual Check per Site

Untuk setiap site, jalankan:

```bash
# Ganti site-name dengan nama site yang mau dicek
bench --site site-name console
```

Lalu paste:

```python
import frappe

employees = frappe.get_all('Employee', fields=['name'], order_by='name desc')
print(f"Total employees: {len(employees)}")

if employees:
    max_num = max([int(e.name.replace('HR-EMP-', '')) for e in employees if e.name.startswith('HR-EMP-')])
    print(f"Highest ID: HR-EMP-{str(max_num).zfill(5)}")
    print(f"Next should be: HR-EMP-{str(max_num + 1).zfill(5)}")
    
    # Check counter
    counter = frappe.db.sql("SELECT current FROM tabSeries WHERE name = 'HR-EMP-'", as_dict=True)
    if counter:
        print(f"Current counter: {counter[0].current}")
    else:
        print("Counter: NOT SET")
```

## Cara Fix Semua Sites

### Option 1: Fix Semua Sites Sekaligus (Recommended)

```bash
# Di ERPNext server
cd /path/to/frappe-bench
python3 fix_all_sites_naming_series.py --all
```

Script ini akan:
- Loop semua sites
- Fix naming series counter untuk setiap site
- Tampilkan summary hasil

### Option 2: Fix Per Site Manual

Untuk setiap site yang perlu di-fix:

```bash
# 1. SSH ke server
ssh user@erpnext-server

# 2. Buka console untuk site tertentu
bench --site demo.batasku.cloud console

# 3. Paste isi file fix_employee_naming_series.py
# Script akan auto-run

# 4. Exit
exit()

# 5. Ulangi untuk site lain
bench --site bac.batasku.cloud console
# ... paste script lagi
```

## Verification

Setelah fix, test di Next.js app untuk setiap site:

1. Buka http://localhost:3000/employees
2. Switch ke site yang sudah di-fix (pilih dari dropdown site selector)
3. Klik "Tambah Employee"
4. Isi form dan save
5. Seharusnya berhasil dengan ID yang benar

## Files untuk Multi-Site

1. **check-all-sites-naming-series.ts** - Cek status semua sites via API
2. **fix_all_sites_naming_series.py** - Fix semua sites sekaligus
3. **fix_employee_naming_series.py** - Fix single site (original)

## Troubleshooting

### Site tidak bisa diakses via API

Cek:
- Apakah credentials di `.env.local` benar?
- Apakah site aktif? `bench --site site-name list-apps`
- Apakah API key valid? Test dengan curl

### Script Python error

Cek:
- Apakah frappe-bench environment aktif?
- Apakah user punya permission ke database?
- Apakah site name benar? `bench --site-list`

### Masih duplicate entry setelah fix

Cek:
- Apakah script menampilkan "✅ Successfully updated"?
- Restart bench: `bench restart`
- Cek counter lagi dengan query manual
- Mungkin ada custom server script yang interfere

## Best Practice

1. **Selalu cek semua sites** setelah data migration
2. **Run fix script** untuk semua sites yang punya employees
3. **Monitor naming series** secara berkala
4. **Document** setiap data import/migration
5. **Test** employee creation di setiap site setelah fix

## Prevention

Untuk mencegah issue ini di masa depan:

1. **Jangan import employees via direct SQL** - selalu gunakan API/UI
2. **Setelah data migration**, jalankan fix script untuk sync counter
3. **Setup monitoring** untuk detect naming series issues
4. **Document migration procedures** dengan checklist termasuk naming series fix
5. **Test di staging** sebelum production migration

## Summary

- ✅ Setiap site punya database terpisah
- ✅ Naming series counter terpisah per site
- ✅ Harus fix per site yang bermasalah
- ✅ Gunakan `check-all-sites-naming-series.ts` untuk cek status
- ✅ Gunakan `fix_all_sites_naming_series.py --all` untuk fix semua
- ✅ Test setiap site setelah fix
