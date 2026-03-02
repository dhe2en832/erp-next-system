# Bugfix Requirements Document

## Introduction

Audit lengkap sistem pelaporan keuangan Next.js ERP menemukan 10 bug kritis yang mempengaruhi akurasi dan konsistensi laporan keuangan. Bug-bug ini menyebabkan:
- Neraca tidak seimbang (Total Aktiva ≠ Total Kewajiban + Total Ekuitas)
- Laporan Piutang dan Hutang overstated (terlalu tinggi)
- Kalkulasi pajak yang salah untuk rate berbeda
- Filter akun yang tidak fleksibel dan hardcoded
- Tidak ada validasi input tanggal
- Format mata uang yang tidak konsisten

Bug-bug ini harus diperbaiki untuk memastikan laporan keuangan akurat, konsisten, dan dapat diandalkan untuk pengambilan keputusan bisnis.

## Bug Analysis

### Current Behavior (Defect)

#### Bug #1: Balance Sheet - Ekuitas tidak termasuk Laba/Rugi Bersih

1.1 WHEN Balance Sheet dijalankan untuk periode dengan Net Profit/Loss THEN sistem hanya menjumlahkan akun Equity dari GL Entry tanpa menambahkan Net Profit/Loss periode berjalan

1.2 WHEN Balance Sheet dijalankan THEN Total Aktiva ≠ Total Kewajiban + Total Ekuitas (neraca tidak seimbang)

#### Bug #2: Laporan Piutang (AR) - Tidak mengurangi Retur Penjualan

1.3 WHEN Laporan AR dijalankan dan ada Sales Return/Credit Note THEN sistem hanya query Sales Invoice tanpa mengurangi retur

1.4 WHEN Laporan AR dijalankan dengan retur THEN Outstanding AR overstated (lebih tinggi dari seharusnya)

#### Bug #3: Laporan Hutang (AP) - Tidak mengurangi Retur Pembelian

1.5 WHEN Laporan AP dijalankan dan ada Purchase Return THEN sistem hanya query Purchase Invoice tanpa mengurangi retur

1.6 WHEN Laporan AP dijalankan dengan retur THEN Outstanding AP overstated (lebih tinggi dari seharusnya)

#### Bug #4: Semua Laporan - Tidak ada validasi tanggal

1.7 WHEN user memasukkan from_date > to_date THEN sistem tidak memberikan error message dan return hasil kosong atau salah

1.8 WHEN user memasukkan tanggal invalid THEN sistem tidak memberikan error message yang jelas

#### Bug #5: Laporan PPN - Tax rate hardcoded 11%

1.9 WHEN Laporan PPN dijalankan dengan tax rate berbeda (0%, 5%, 15%) THEN sistem tetap menggunakan hardcoded `/ 0.11` untuk kalkulasi DPP

1.10 WHEN Laporan PPN dijalankan dengan tax rate 5% THEN DPP calculation salah (seharusnya `/ 0.05` bukan `/ 0.11`)

#### Bug #6: Cash Flow - Filter berdasarkan nama akun

1.11 WHEN Cash Flow dijalankan dengan akun kas/bank yang tidak mengandung kata "Kas" atau "Bank" THEN akun tersebut tidak termasuk dalam laporan

1.12 WHEN Cash Flow dijalankan THEN sistem menggunakan `account name LIKE '%Kas%' OR '%Bank%'` yang tidak fleksibel

#### Bug #7: HPP Ledger - Filter terlalu luas

1.13 WHEN HPP Ledger dijalankan THEN sistem menggunakan `account LIKE '%HPP%'` yang bisa include akun non-COGS

1.14 WHEN HPP Ledger dijalankan dengan akun yang mengandung "HPP" tapi bukan COGS THEN akun tersebut salah termasuk dalam laporan

#### Bug #8: Laba Rugi - Akun diskon hardcoded

1.15 WHEN Laba Rugi dijalankan dengan nomor akun diskon yang berbeda dari 4300/5300 THEN sistem tidak mengenali akun diskon tersebut

1.16 WHEN Laba Rugi dijalankan THEN sistem menggunakan hardcoded account numbers (4300, 5300) yang tidak fleksibel

#### Bug #9: Balance Sheet - Kategorisasi hardcoded

1.17 WHEN Balance Sheet dijalankan dengan custom account structure THEN sistem menggunakan hardcoded account numbers untuk kategorisasi Current vs Fixed Assets/Liabilities

1.18 WHEN Balance Sheet dijalankan dengan nomor akun berbeda THEN kategorisasi Current vs Fixed salah

#### Bug #10: Format mata uang tidak konsisten

1.19 WHEN laporan keuangan dijalankan THEN `formatCurrency()` diimplementasi berbeda di banyak tempat

1.20 WHEN laporan keuangan dijalankan THEN format display tidak konsisten antar laporan

### Expected Behavior (Correct)

#### Bug #1: Balance Sheet - Ekuitas harus termasuk Laba/Rugi Bersih

2.1 WHEN Balance Sheet dijalankan untuk periode dengan Net Profit/Loss THEN sistem SHALL menghitung Net Profit/Loss dari Profit & Loss report dan menambahkannya ke Total Ekuitas

2.2 WHEN Balance Sheet dijalankan THEN Total Aktiva SHALL sama dengan Total Kewajiban + Total Ekuitas (neraca seimbang)

#### Bug #2: Laporan Piutang (AR) - Harus mengurangi Retur Penjualan

2.3 WHEN Laporan AR dijalankan dan ada Sales Return/Credit Note THEN sistem SHALL query Sales Return dan menguranginya dari outstanding amount

2.4 WHEN Laporan AR dijalankan dengan retur THEN Outstanding AR SHALL akurat (sudah dikurangi retur)

#### Bug #3: Laporan Hutang (AP) - Harus mengurangi Retur Pembelian

2.5 WHEN Laporan AP dijalankan dan ada Purchase Return THEN sistem SHALL query Purchase Return dan menguranginya dari outstanding amount

2.6 WHEN Laporan AP dijalankan dengan retur THEN Outstanding AP SHALL akurat (sudah dikurangi retur)

#### Bug #4: Semua Laporan - Harus ada validasi tanggal

2.7 WHEN user memasukkan from_date > to_date THEN sistem SHALL return error message "from_date must be less than or equal to to_date"

2.8 WHEN user memasukkan tanggal invalid THEN sistem SHALL return error message yang jelas tentang format tanggal yang benar

#### Bug #5: Laporan PPN - Tax rate harus dinamis

2.9 WHEN Laporan PPN dijalankan THEN sistem SHALL mengambil tax rate dari Tax Template atau invoice item

2.10 WHEN Laporan PPN dijalankan dengan tax rate berbeda THEN DPP calculation SHALL menggunakan tax rate yang sesuai (DPP = PPN / tax_rate)

#### Bug #6: Cash Flow - Filter berdasarkan account_type

2.11 WHEN Cash Flow dijalankan THEN sistem SHALL filter berdasarkan `account_type = 'Cash' OR account_type = 'Bank'`

2.12 WHEN Cash Flow dijalankan dengan akun kas/bank dengan nama apapun THEN akun tersebut SHALL termasuk dalam laporan

#### Bug #7: HPP Ledger - Filter berdasarkan account_type

2.13 WHEN HPP Ledger dijalankan THEN sistem SHALL filter berdasarkan `account_type = 'Cost of Goods Sold'`

2.14 WHEN HPP Ledger dijalankan THEN hanya akun COGS yang SHALL termasuk dalam laporan

#### Bug #8: Laba Rugi - Identifikasi diskon berdasarkan account_type atau parent

2.15 WHEN Laba Rugi dijalankan THEN sistem SHALL identifikasi akun diskon berdasarkan account_type atau parent_account, bukan hardcoded numbers

2.16 WHEN Laba Rugi dijalankan dengan nomor akun diskon berbeda THEN sistem SHALL tetap mengenali akun diskon tersebut

#### Bug #9: Balance Sheet - Kategorisasi berdasarkan account_type

2.17 WHEN Balance Sheet dijalankan THEN sistem SHALL kategorisasi Current vs Fixed berdasarkan account_type atau parent_account

2.18 WHEN Balance Sheet dijalankan dengan custom account structure THEN kategorisasi SHALL tetap akurat

#### Bug #10: Format mata uang harus konsisten

2.19 WHEN laporan keuangan dijalankan THEN sistem SHALL menggunakan satu utility function `formatCurrency()` yang konsisten

2.20 WHEN laporan keuangan dijalankan THEN format display SHALL konsisten di semua laporan (format: "Rp 1.000.000,00")

### Unchanged Behavior (Regression Prevention)

#### General Report Behavior

3.1 WHEN laporan keuangan dijalankan dengan parameter valid THEN sistem SHALL CONTINUE TO return data dengan struktur response yang sama

3.2 WHEN laporan keuangan dijalankan dengan authentication valid THEN sistem SHALL CONTINUE TO authorize request dengan API key atau session cookie

3.3 WHEN laporan keuangan dijalankan dengan company parameter THEN sistem SHALL CONTINUE TO filter data berdasarkan company

#### Balance Sheet

3.4 WHEN Balance Sheet dijalankan tanpa as_of_date THEN sistem SHALL CONTINUE TO include semua GL entries sampai tanggal sekarang

3.5 WHEN Balance Sheet dijalankan THEN sistem SHALL CONTINUE TO aggregate GL entries by account

3.6 WHEN Balance Sheet dijalankan THEN sistem SHALL CONTINUE TO categorize accounts into Current Assets, Fixed Assets, Current Liabilities, Long-term Liabilities, dan Equity

#### Accounts Receivable

3.7 WHEN Laporan AR dijalankan THEN sistem SHALL CONTINUE TO query Sales Invoice dengan outstanding_amount > 0

3.8 WHEN Laporan AR dijalankan THEN sistem SHALL CONTINUE TO include sales_person dari sales_team child table

3.9 WHEN Laporan AR dijalankan THEN sistem SHALL CONTINUE TO return customer, posting_date, due_date, grand_total, outstanding_amount

#### Accounts Payable

3.10 WHEN Laporan AP dijalankan THEN sistem SHALL CONTINUE TO query Purchase Invoice dengan outstanding_amount > 0

3.11 WHEN Laporan AP dijalankan THEN sistem SHALL CONTINUE TO return supplier, posting_date, due_date, grand_total, outstanding_amount

#### VAT Report

3.12 WHEN Laporan PPN dijalankan THEN sistem SHALL CONTINUE TO query GL Entry untuk akun 2210 (PPN Output) dan 1410 (PPN Input)

3.13 WHEN Laporan PPN dijalankan THEN sistem SHALL CONTINUE TO group entries by voucher_no

3.14 WHEN Laporan PPN dijalankan THEN sistem SHALL CONTINUE TO calculate ppn_kurang_lebih_bayar = total_ppn_output - total_ppn_input

#### Cash Flow

3.15 WHEN Cash Flow dijalankan dengan from_date dan to_date THEN sistem SHALL CONTINUE TO filter GL entries berdasarkan posting_date range

3.16 WHEN Cash Flow dijalankan THEN sistem SHALL CONTINUE TO return account, posting_date, debit, credit, voucher_type, voucher_no

#### HPP Ledger

3.17 WHEN HPP Ledger dijalankan THEN sistem SHALL CONTINUE TO return GL entries dengan debit, credit, voucher_type, voucher_no

3.18 WHEN HPP Ledger dijalankan THEN sistem SHALL CONTINUE TO calculate amount = debit - credit

3.19 WHEN HPP Ledger dijalankan THEN sistem SHALL CONTINUE TO calculate total HPP

#### Profit & Loss

3.20 WHEN Laba Rugi dijalankan THEN sistem SHALL CONTINUE TO process Income dan Expense accounts

3.21 WHEN Laba Rugi dijalankan THEN sistem SHALL CONTINUE TO calculate gross_sales, net_sales, gross_cogs, net_cogs, gross_profit, total_expenses, net_profit

3.22 WHEN Laba Rugi dijalankan THEN sistem SHALL CONTINUE TO separate income_accounts dan expense_accounts dalam response

#### Error Handling

3.23 WHEN laporan keuangan dijalankan tanpa authentication THEN sistem SHALL CONTINUE TO return 401 Unauthorized

3.24 WHEN laporan keuangan dijalankan tanpa company parameter THEN sistem SHALL CONTINUE TO return 400 Bad Request

3.25 WHEN ERPNext API error THEN sistem SHALL CONTINUE TO return error message dari ERPNext

#### Response Format

3.26 WHEN laporan keuangan dijalankan THEN sistem SHALL CONTINUE TO return JSON dengan structure `{ success: true/false, data: {...}, message?: string }`

3.27 WHEN laporan keuangan dijalankan THEN sistem SHALL CONTINUE TO format currency amounts dalam response
