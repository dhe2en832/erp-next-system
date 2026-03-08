# Bugfix Requirements Document

## Introduction

Sistem role-based access control (RBAC) untuk menu navigasi tidak berfungsi dengan benar setelah implementasi multi-site. Semua user dapat melihat dan mengakses semua menu, terlepas dari role yang dimiliki. Bug ini terjadi pada semua user (baik yang memiliki satu role maupun multiple roles) di semua site.

Sebelum implementasi multi-site, RBAC berfungsi dengan benar - user hanya dapat melihat menu yang sesuai dengan role mereka. Setelah perubahan multi-site, filtering menu berdasarkan role tidak lagi berfungsi.

**Contoh Kasus:**
- User "agung" di site cirebon hanya memiliki role "Sales User"
- User "deden" di site cirebon memiliki role "Sales User" dan "Purchase User"
- Kedua user dapat melihat dan mengakses SEMUA menu (Dashboard, Penjualan, Pembelian, Kas & Bank, Akunting, Persediaan, Laporan, Komisi, Master Data, Pengaturan)
- Yang seharusnya: user hanya melihat menu sesuai role mereka

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user dengan role "Sales User" login THEN sistem menampilkan semua kategori menu (Dashboard, Penjualan, Pembelian, Kas & Bank, Akunting, Persediaan, Laporan, Komisi, Master Data, Pengaturan)

1.2 WHEN user dengan role "Purchase User" login THEN sistem menampilkan semua kategori menu termasuk menu yang tidak relevan dengan pembelian

1.3 WHEN user dengan multiple roles (contoh: "Sales User" dan "Purchase User") login THEN sistem menampilkan semua kategori menu, bukan hanya gabungan menu dari kedua role tersebut

1.4 WHEN user dengan role "Accounts User" login THEN sistem menampilkan menu Penjualan, Pembelian, dan Persediaan yang seharusnya tidak dapat diakses

1.5 WHEN user tanpa role "System Manager" login THEN sistem tetap menampilkan menu Pengaturan dan menu lain yang memerlukan privilege tinggi

1.6 WHEN user dengan role "Stock User" login THEN sistem menampilkan menu Akunting dan Kas & Bank yang seharusnya tidak dapat diakses

1.7 WHEN user login di site manapun (cirebon, demo, dll) THEN filtering menu berdasarkan role tidak berfungsi

### Expected Behavior (Correct)

2.1 WHEN user dengan role "Sales User" login THEN sistem SHALL menampilkan hanya menu: Dashboard, Penjualan, dan Master Data

2.2 WHEN user dengan role "Purchase User" login THEN sistem SHALL menampilkan hanya menu: Dashboard, Pembelian, dan Master Data

2.3 WHEN user dengan multiple roles (contoh: "Sales User" dan "Purchase User") login THEN sistem SHALL menampilkan gabungan menu dari kedua role: Dashboard, Penjualan, Pembelian, dan Master Data

2.4 WHEN user dengan role "Accounts User" login THEN sistem SHALL menampilkan hanya menu: Dashboard, Kas & Bank, Akunting, dan Laporan

2.5 WHEN user dengan role "System Manager" login THEN sistem SHALL menampilkan semua menu tanpa pembatasan

2.6 WHEN user dengan role "Stock User" login THEN sistem SHALL menampilkan hanya menu: Dashboard, Persediaan, dan Master Data

2.7 WHEN user login di site manapun THEN sistem SHALL menerapkan filtering menu berdasarkan role yang dimiliki user di site tersebut

2.8 WHEN user dengan role "Sales Manager" login THEN sistem SHALL menampilkan menu: Dashboard, Penjualan, Komisi, Laporan, dan Master Data

2.9 WHEN user dengan role "Report Manager" login THEN sistem SHALL menampilkan menu: Dashboard, Laporan, dan Akunting

2.10 WHEN menu item memiliki allowedRoles yang spesifik (contoh: "Periode Akuntansi" memerlukan "Accounts Manager") THEN sistem SHALL hanya menampilkan item tersebut jika user memiliki salah satu dari allowedRoles

2.11 WHEN kategori "Laporan" memiliki sub-items dengan allowedRoles THEN sistem SHALL menampilkan kategori Laporan hanya jika user memiliki akses ke minimal satu sub-item

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user dengan role "System Manager" login THEN sistem SHALL CONTINUE TO menampilkan semua menu tanpa pembatasan

3.2 WHEN user logout dan login kembali THEN sistem SHALL CONTINUE TO mengambil role terbaru dari API /api/setup/auth/me

3.3 WHEN user berada di halaman login, select-site, atau select-company THEN sistem SHALL CONTINUE TO tidak menampilkan navbar

3.4 WHEN user mengklik menu yang diizinkan THEN sistem SHALL CONTINUE TO menavigasi ke halaman yang sesuai

3.5 WHEN user membuka dropdown menu THEN sistem SHALL CONTINUE TO menampilkan animasi dan interaksi yang sama

3.6 WHEN user menggunakan mobile view THEN sistem SHALL CONTINUE TO menampilkan mobile menu drawer dengan filtering yang sama

3.7 WHEN localStorage berisi data loginData THEN sistem SHALL CONTINUE TO menggunakan data tersebut sebagai fallback sebelum API response diterima

3.8 WHEN API /api/setup/auth/me mengembalikan roles THEN sistem SHALL CONTINUE TO menyimpan roles ke localStorage untuk sinkronisasi

3.9 WHEN user memiliki role yang tidak ada di roleCategoryMap THEN sistem SHALL CONTINUE TO tidak menampilkan menu apapun (kecuali yang tidak memerlukan role)

3.10 WHEN komponen Navbar melakukan filtering dengan canSeeCategory, filterItems, dan filterSubCategories THEN sistem SHALL CONTINUE TO menggunakan fungsi-fungsi tersebut dengan logika yang benar
