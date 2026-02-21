# Implementation Plan: Implementasi Fitur Diskon dan Pajak

## Overview

Dokumen ini berisi rencana implementasi untuk fitur diskon dan pajak pada sistem ERP berbasis ERPNext. Implementasi dibagi menjadi 5 fase dalam 7 minggu, dengan fokus pada backward compatibility, testing yang komprehensif, dan dokumentasi lengkap.

**Bahasa Implementasi:**
- **Python**: Untuk ERPNext backend (server scripts, custom methods, hooks, GL Entry logic)
- **TypeScript**: Untuk Next.js API layer dan frontend components (React)

**Prinsip Implementasi:**
- Setiap task membangun di atas task sebelumnya secara incremental
- Validasi core functionality dilakukan early melalui code dan automated tests
- Semua perubahan bersifat additive (non-breaking changes)
- Backward compatibility dengan invoice existing adalah prioritas utama

**Catatan:**
- Tasks yang ditandai dengan `*` bersifat optional dan dapat diskip untuk MVP lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Checkpoint tasks memastikan validasi incremental

## Tasks

### Fase 1: Setup Tax Templates (Minggu 1)

- [x] 1. Setup Tax Templates di ERPNext
  - [x] 1.1 Buat Sales Taxes and Charges Template untuk PPN 11%
    - Buat template dengan nama "PPN 11%" di ERPNext
    - Konfigurasi charge_type: "On Net Total"
    - Set account_head: "2210 - Hutang PPN - BAC"
    - Set rate: 11%
    - Set is_default: true
    - _Requirements: 1.1, 1.4_

  - [x] 1.2 Buat Sales Taxes and Charges Template untuk PPN + PPh 23
    - Buat template dengan nama "PPN 11% + PPh 23 (2%)"
    - Tambahkan tax row pertama: PPN 11% (account: 2210, add_deduct_tax: "Add")
    - Tambahkan tax row kedua: PPh 23 2% (account: 2230, add_deduct_tax: "Deduct")
    - _Requirements: 1.1, 1.2_

  - [x] 1.3 Buat Sales Taxes and Charges Template untuk PPN + PPh 22
    - Buat template dengan nama "PPN 11% + PPh 22 (1.5%)"
    - Tambahkan tax row pertama: PPN 11% (account: 2210, add_deduct_tax: "Add")
    - Tambahkan tax row kedua: PPh 22 1.5% (account: 2240, add_deduct_tax: "Deduct")
    - _Requirements: 1.1, 1.3_


  - [x] 1.4 Buat Purchase Taxes and Charges Template untuk PPN Masukan (PKP)
    - Buat template dengan nama "PPN Masukan 11% (PKP)"
    - Konfigurasi charge_type: "On Net Total"
    - Set account_head: "1410 - Pajak Dibayar Dimuka - BAC"
    - Set rate: 11%
    - Set is_default: true untuk Purchase
    - _Requirements: 1.1, 1.4_

  - [x] 1.5 Buat Purchase Taxes and Charges Template untuk PPN Masukan (Non-PKP)
    - Buat template dengan nama "PPN Masukan 11% (Non-PKP)"
    - Konfigurasi charge_type: "On Net Total"
    - Set account_head: "5100 - Beban Operasional - BAC" (expense, tidak dapat dikreditkan)
    - Set rate: 11%
    - _Requirements: 1.1_

  - [x] 1.6 Validasi Tax Templates dengan dummy invoice
    - Buat dummy Sales Invoice dengan PPN 11% di ERPNext UI
    - Submit invoice dan verify GL Entry terbuat dengan benar
    - Verify akun 2210 - Hutang PPN tercatat di credit side
    - Buat dummy Purchase Invoice dengan PPN Masukan di ERPNext UI
    - Verify akun 1410 - Pajak Dibayar Dimuka tercatat di debit side
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 1.7 Write property test untuk Tax Template persistence
    - **Property 17: Tax Template Persistence (Round-trip Property)**
    - **Validates: Requirements 1.5**
    - Generate random tax template data (title, rate, account_head)
    - Create template, save, retrieve dari database
    - Verify semua fields match dengan original data
    - Run dengan minimum 100 iterations
    - _Requirements: 1.5_

  - [x] 1.8 Dokumentasi konfigurasi Tax Templates
    - Buat dokumentasi dalam Bahasa Indonesia
    - Jelaskan setiap template dan use case-nya
    - Sertakan screenshot konfigurasi
    - Dokumentasikan akun COA yang digunakan
    - _Requirements: 16.2, 16.8_

- [x] 2. Checkpoint - Validasi Tax Templates
  - Ensure all tax templates created successfully
  - Verify GL Entry posting dengan dummy invoices
  - Ask user if questions arise


### Fase 2: API Enhancement (Minggu 2-3)

- [x] 3. Implementasi API untuk Sales Invoice dengan Diskon dan Pajak
  - [x] 3.1 Update TypeScript interface untuk Sales Invoice API
    - Buat file `types/sales-invoice.ts` dengan interface lengkap
    - Definisikan `CreateSalesInvoiceRequest` dengan field discount dan taxes
    - Definisikan `SalesInvoiceResponse` dengan field discount dan taxes
    - Definisikan `InvoiceItem` dan `TaxRow` interfaces
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Implementasi POST endpoint untuk create Sales Invoice dengan diskon
    - Update file `app/api/sales/invoices/route.ts`
    - Tambahkan handling untuk field `discount_amount` dan `discount_percentage`
    - Implementasi validasi: discount_percentage antara 0-100
    - Implementasi validasi: discount_amount tidak melebihi subtotal
    - Implementasi priority rule: discount_amount > discount_percentage
    - Return error 400 dengan message deskriptif jika validasi gagal
    - _Requirements: 2.1, 2.2, 5.1, 5.2, 5.4_

  - [x] 3.3 Implementasi POST endpoint untuk create Sales Invoice dengan pajak
    - Tambahkan handling untuk field `taxes_and_charges` dan array `taxes`
    - Validasi tax template exists dan aktif
    - Validasi account_head di tax template ada di COA
    - Call ERPNext API untuk create invoice dengan taxes
    - _Requirements: 2.3, 5.3, 5.7_

  - [x] 3.4 Implementasi GET endpoint dengan backward compatibility
    - Update GET endpoint untuk return field discount dan taxes
    - Untuk invoice lama (tanpa diskon/pajak), return discount_amount: 0, taxes: []
    - Implementasi filtering: company, customer, status, date range
    - Implementasi pagination: limit dan start parameters
    - _Requirements: 2.6, 2.8, 14.1, 14.5_

  - [x] 3.5 Write unit tests untuk Sales Invoice API validation
    - Test validasi discount_percentage (negative, > 100)
    - Test validasi discount_amount (negative, > subtotal)
    - Test validasi tax template (tidak exist, disabled)
    - Test priority rule discount_amount vs discount_percentage
    - _Requirements: 2.7, 5.1, 5.2, 5.3_

  - [x] 3.6 Write integration tests untuk Sales Invoice API
    - Test create invoice dengan discount_percentage
    - Test create invoice dengan discount_amount
    - Test create invoice dengan PPN 11%
    - Test create invoice dengan PPN + PPh 23
    - Test GET invoice lama (backward compatibility)
    - _Requirements: 2.4, 2.5, 2.8, 15.3_


- [x] 4. Implementasi API untuk Purchase Invoice dengan Diskon dan Pajak
  - [x] 4.1 Update TypeScript interface untuk Purchase Invoice API
    - Buat file `types/purchase-invoice.ts` dengan interface lengkap
    - Definisikan `CreatePurchaseInvoiceRequest` dengan field discount dan taxes
    - Definisikan `PurchaseInvoiceResponse` dengan field discount dan taxes
    - Reuse `InvoiceItem` dan `TaxRow` interfaces dari sales-invoice.ts
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Implementasi POST endpoint untuk create Purchase Invoice
    - Update file `app/api/purchase/invoices/route.ts`
    - Implementasi handling discount dan taxes (sama seperti Sales Invoice)
    - Implementasi validasi yang sama dengan Sales Invoice
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.4_

  - [x] 4.3 Implementasi GET endpoint dengan backward compatibility
    - Update GET endpoint untuk return field discount dan taxes
    - Untuk invoice lama, return default values (0 dan empty array)
    - Implementasi filtering dan pagination
    - _Requirements: 3.6, 3.8, 14.2, 14.5_

  - [x] 4.4 Write unit tests untuk Purchase Invoice API validation
    - Test validasi discount dan tax (sama seperti Sales Invoice)
    - _Requirements: 3.7, 5.1, 5.2, 5.3_

  - [x] 4.5 Write integration tests untuk Purchase Invoice API
    - Test create invoice dengan discount dan PPN Masukan
    - Test GET invoice lama (backward compatibility)
    - _Requirements: 3.4, 3.5, 3.8, 15.4_

- [x] 5. Implementasi Tax Template API
  - [x] 5.1 Buat GET endpoint untuk fetch Tax Templates
    - Buat file `app/api/setup/tax-templates/route.ts`
    - Implementasi GET dengan query parameter: type (Sales/Purchase), company
    - Filter hanya templates yang aktif (disabled = 0)
    - Return array of TaxTemplate dengan fields: name, title, rate, account_head, description
    - _Requirements: 1.6_

  - [x] 5.2 Write property test untuk Tax Template Active Filter
    - **Property 25: Tax Template Active Filter**
    - **Validates: Requirements 1.6**
    - Create mix of active dan inactive templates
    - Fetch via API
    - Verify hanya active templates yang returned
    - _Requirements: 1.6_

  - [x] 5.3 Update API documentation
    - Dokumentasikan semua endpoints: Sales Invoice, Purchase Invoice, Tax Template
    - Sertakan contoh request/response untuk setiap endpoint
    - Dokumentasikan error codes dan messages
    - _Requirements: 16.5_


- [x] 6. Implementasi Python Backend untuk GL Entry Posting
  - [x] 6.1 Buat Python module untuk discount calculation
    - Buat file `erpnext_custom/discount_calculator.py`
    - Implementasi function `calculate_discount(subtotal, discount_percentage, discount_amount)`
    - Implementasi validasi range (0-100% dan 0-subtotal)
    - Implementasi priority rule (amount > percentage)
    - Return dict dengan discount_amount, discount_percentage, net_total
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 6.2 Buat Python module untuk tax calculation
    - Buat file `erpnext_custom/tax_calculator.py`
    - Implementasi function `calculate_taxes(net_total, tax_template, tax_type)`
    - Support multiple tax rows dengan charge_type: "On Net Total", "On Previous Row Total", "Actual"
    - Support add_deduct_tax: "Add" dan "Deduct"
    - Return dict dengan taxes array, total_taxes, grand_total
    - _Requirements: 4.5, 8.1, 9.1, 10.1, 10.2_

  - [x] 6.3 Implementasi GL Entry posting untuk Sales Invoice dengan diskon
    - Buat file `erpnext_custom/gl_entry_sales.py`
    - Implementasi function `post_sales_invoice_gl_entry(invoice, posting_date)`
    - Create GL Entry: Debit Piutang Usaha (grand_total)
    - Create GL Entry: Debit Potongan Penjualan (discount_amount) jika ada diskon
    - Create GL Entry: Credit Pendapatan Penjualan (total before discount)
    - Tambahkan remarks untuk audit trail
    - Validasi balanced entry (total debit = total credit)
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 6.4 Implementasi GL Entry posting untuk Sales Invoice dengan pajak
    - Update `gl_entry_sales.py`
    - Create GL Entry: Credit Hutang PPN (tax_amount) untuk setiap tax row
    - Handle multiple taxes (PPN + PPh 23)
    - Handle deduct tax (PPh 23 mengurangi grand_total)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 6.5 Implementasi GL Entry posting untuk Purchase Invoice dengan diskon
    - Buat file `erpnext_custom/gl_entry_purchase.py`
    - Implementasi function `post_purchase_invoice_gl_entry(invoice, posting_date)`
    - Create GL Entry: Debit Persediaan (net_total after discount)
    - Create GL Entry: Credit Hutang Usaha (grand_total)
    - Note: Diskon sudah reflected di net_total, tidak perlu separate GL Entry
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 6.6 Implementasi GL Entry posting untuk Purchase Invoice dengan pajak
    - Update `gl_entry_purchase.py`
    - Create GL Entry: Debit Pajak Dibayar Dimuka (PPN Input)
    - Create GL Entry: Credit Hutang PPh 23 (jika ada)
    - _Requirements: 9.1, 9.2, 9.3, 10.2, 10.3_


  - [x] 6.7 Implementasi invoice cancellation dengan reversal GL Entry
    - Buat file `erpnext_custom/invoice_cancellation.py`
    - Implementasi function `create_reversal_gl_entry(original_gl_entries)`
    - Swap debit dan credit untuk setiap GL Entry
    - Tambahkan remarks: "Reversal: [original remarks]"
    - Validasi balanced entry
    - _Requirements: 6.4, 7.4, 8.4, 9.4, 10.5_

  - [x] 6.8 Setup ERPNext hooks untuk auto-posting GL Entry
    - Update file `hooks.py` di ERPNext custom app
    - Register hook `on_submit` untuk Sales Invoice
    - Register hook `on_submit` untuk Purchase Invoice
    - Register hook `on_cancel` untuk invoice cancellation
    - Call GL Entry posting functions dari hooks
    - _Requirements: 6.6, 7.6, 8.6, 9.6_

  - [x] 6.9 Write unit tests untuk discount calculation
    - Test calculate_discount dengan discount_percentage
    - Test calculate_discount dengan discount_amount
    - Test priority rule (both fields filled)
    - Test edge cases (0%, 100%, negative values)
    - _Requirements: 15.1_

  - [x] 6.10 Write unit tests untuk tax calculation
    - Test calculate_taxes dengan single tax row
    - Test calculate_taxes dengan multiple tax rows
    - Test charge_type: "On Net Total" dan "On Previous Row Total"
    - Test add_deduct_tax: "Add" dan "Deduct"
    - _Requirements: 15.2_

  - [x] 6.11 Write property test untuk GL Entry Balanced
    - **Property 1: GL Entry Balanced (Fundamental Invariant)**
    - **Validates: Requirements 6.5, 7.5, 8.5, 9.5, 10.6**
    - Generate random invoice data (items, discount, taxes)
    - Submit invoice dan post GL Entry
    - Verify total debit = total credit (toleransi 0.01)
    - Run dengan minimum 100 iterations
    - _Requirements: 6.5, 7.5, 8.5, 9.5, 10.6, 15.12_

  - [x] 6.12 Write property test untuk Grand Total Calculation
    - **Property 2: Grand Total Calculation Accuracy**
    - **Validates: Requirements 5.5**
    - Generate random items, discount, dan taxes
    - Calculate expected grand_total: subtotal - discount + taxes
    - Verify dengan actual grand_total dari sistem (toleransi 0.01)
    - Run dengan minimum 100 iterations
    - _Requirements: 5.5_

  - [x] 6.13 Write property test untuk Invoice Cancellation Reversal
    - **Property 11: Invoice Cancellation Reversal (Round-trip Property)**
    - **Validates: Requirements 6.4, 7.4, 8.4, 9.4, 10.5**
    - Generate random invoice, submit, get GL Entry
    - Cancel invoice, get reversal GL Entry
    - Verify sum of original + reversal = 0 untuk setiap account
    - Run dengan minimum 100 iterations
    - _Requirements: 6.4, 7.4, 8.4, 9.4, 10.5_

- [x] 7. Checkpoint - Validasi API dan GL Entry Logic
  - Ensure all API endpoints working correctly
  - Verify GL Entry posting dengan berbagai kombinasi discount dan tax
  - Run all unit tests dan property tests
  - Ask user if questions arise


### Fase 3: UI Implementation (Minggu 4-5)

- [x] 8. Buat Reusable UI Components
  - [x] 8.1 Buat DiscountInput component
    - Buat file `components/invoice/DiscountInput.tsx`
    - Support input discount_percentage atau discount_amount
    - Auto-calculate nilai yang lain saat user input
    - Implementasi validasi real-time (0-100% atau 0-subtotal)
    - Display error message jika validasi gagal
    - Props: subtotal, value, onChange, type (percentage/amount)
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 8.2 Buat TaxTemplateSelect component
    - Buat file `components/invoice/TaxTemplateSelect.tsx`
    - Fetch tax templates dari API `/api/setup/tax-templates`
    - Display dropdown dengan options: template title dan rate
    - Support filtering by type (Sales/Purchase)
    - Props: type, value, onChange, company
    - _Requirements: 4.2, 4.5_

  - [x] 8.3 Buat InvoiceSummary component
    - Buat file `components/invoice/InvoiceSummary.tsx`
    - Display breakdown: Subtotal, Diskon, Subtotal setelah Diskon, Pajak, Grand Total
    - Format currency Indonesia: "Rp" prefix, pemisah ribuan (.), 2 decimal places
    - Update real-time saat ada perubahan items/discount/tax
    - Props: items, discount, taxes
    - _Requirements: 4.6, 4.7_

  - [x] 8.4 Write component tests untuk DiscountInput
    - Test input discount_percentage, verify discount_amount calculated
    - Test input discount_amount, verify discount_percentage calculated
    - Test validasi (negative, > 100%, > subtotal)
    - Test error message display
    - _Requirements: 4.3, 4.4, 5.1, 5.2_

  - [x] 8.5 Write component tests untuk TaxTemplateSelect
    - Test fetch tax templates dari API
    - Test filtering by type (Sales/Purchase)
    - Test dropdown display dan selection
    - _Requirements: 4.2_

  - [x] 8.6 Write component tests untuk InvoiceSummary
    - Test calculation: subtotal - discount + tax = grand_total
    - Test currency formatting
    - Test real-time update
    - _Requirements: 4.6, 4.7_


- [x] 9. Update Sales Invoice Form
  - [x] 9.1 Tambahkan section Diskon di Sales Invoice form
    - Update file `app/sales/invoices/[id]/page.tsx` atau form component
    - Tambahkan section "Diskon" setelah items table
    - Integrate DiscountInput component
    - Implementasi state management untuk discount_percentage dan discount_amount
    - _Requirements: 4.1_

  - [x] 9.2 Tambahkan section Pajak di Sales Invoice form
    - Tambahkan section "Pajak" setelah section diskon
    - Integrate TaxTemplateSelect component dengan type="Sales"
    - Implementasi state management untuk taxes_and_charges dan taxes array
    - _Requirements: 4.2_

  - [x] 9.3 Tambahkan InvoiceSummary di Sales Invoice form
    - Tambahkan InvoiceSummary component di bagian bawah form
    - Pass items, discount, dan taxes sebagai props
    - Ensure real-time calculation saat user mengubah items/discount/tax
    - _Requirements: 4.6, 4.7_

  - [x] 9.4 Implementasi real-time calculation logic
    - Buat custom hook `useInvoiceCalculation(items, discount, taxes)`
    - Implementasi calculation logic sesuai Algorithm 6 dari design document
    - Return summary object: subtotal, discount_amount, net_total, total_taxes, grand_total
    - Update summary setiap kali items/discount/taxes berubah
    - _Requirements: 4.7_

  - [x] 9.5 Implementasi form submission dengan discount dan tax
    - Update submit handler untuk include discount dan taxes di request body
    - Call API POST `/api/sales/invoices` dengan payload lengkap
    - Handle success: redirect ke invoice detail atau list
    - Handle error: display error message dari API
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 9.6 Write property test untuk Real-time Calculation Consistency
    - **Property 15: Real-time Calculation Consistency**
    - **Validates: Requirements 4.7**
    - Generate random invoice data
    - Calculate di frontend (useInvoiceCalculation)
    - Submit ke backend, get response
    - Verify frontend calculation = backend calculation (toleransi 0.01)
    - Run dengan minimum 100 iterations
    - _Requirements: 4.7_


- [x] 10. Update Purchase Invoice Form
  - [x] 10.1 Tambahkan section Diskon dan Pajak di Purchase Invoice form
    - Update file `app/purchase/invoices/[id]/page.tsx` atau form component
    - Reuse DiscountInput component
    - Integrate TaxTemplateSelect dengan type="Purchase"
    - Integrate InvoiceSummary component
    - _Requirements: 4.1, 4.2, 4.6, 4.8_

  - [x] 10.2 Implementasi real-time calculation untuk Purchase Invoice
    - Reuse custom hook `useInvoiceCalculation`
    - Ensure calculation logic sama dengan Sales Invoice
    - _Requirements: 4.7, 4.8_

  - [x] 10.3 Implementasi form submission untuk Purchase Invoice
    - Update submit handler untuk call API POST `/api/purchase/invoices`
    - Handle success dan error
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 11. Update Invoice List View
  - [x] 11.1 Tambahkan kolom Diskon di Sales Invoice list
    - Update file `app/sales/invoices/page.tsx` atau list component
    - Tambahkan kolom "Diskon" di table
    - Display discount_amount dengan format currency
    - Display "Rp 0" untuk invoice tanpa diskon
    - _Requirements: 4.1_

  - [x] 11.2 Tambahkan kolom Pajak di Sales Invoice list
    - Tambahkan kolom "Pajak" di table
    - Display total_taxes_and_charges dengan format currency
    - Display "Rp 0" untuk invoice tanpa pajak
    - _Requirements: 4.2_

  - [x] 11.3 Update kolom Grand Total di list view
    - Ensure grand_total sudah include discount dan taxes
    - Format currency dengan benar
    - _Requirements: 4.6_

  - [x] 11.4 Update Purchase Invoice list view
    - Tambahkan kolom Diskon dan Pajak (sama seperti Sales Invoice)
    - _Requirements: 4.8_


- [x] 12. Implementasi Backward Compatibility di UI
  - [x] 12.1 Handle old invoices di form view
    - WHEN user membuka invoice lama (tanpa discount/tax), display default values: 0 dan empty
    - Ensure form tidak error saat load invoice lama
    - Allow user untuk edit invoice lama dan add discount/tax jika diperlukan
    - _Requirements: 14.3, 14.4_

  - [x] 12.2 Handle old invoices di list view
    - Display "Rp 0" untuk kolom Diskon dan Pajak pada invoice lama
    - Ensure sorting dan filtering tetap berfungsi
    - _Requirements: 14.1, 14.2_

  - [x] 12.3 Write property test untuk Old Invoice Edit Idempotence
    - **Property 14: Old Invoice Edit Idempotence**
    - **Validates: Requirements 14.4**
    - Create old invoice (tanpa discount/tax), submit
    - Get GL Entry snapshot
    - Edit invoice (change non-discount field), submit
    - Verify GL Entry unchanged
    - _Requirements: 14.4_

  - [x] 12.4 Write integration tests untuk backward compatibility
    - Test open old invoice form (no error)
    - Test edit old invoice tanpa add discount/tax
    - Test API GET untuk old invoices (return default values)
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 15.10_

- [x] 13. Checkpoint - Validasi UI Implementation
  - Ensure all UI components working correctly
  - Test real-time calculation di form
  - Test backward compatibility dengan old invoices
  - Run all component tests dan integration tests
  - Ask user if questions arise


### Fase 4: Reports Update (Minggu 6)

- [x] 14. Update Laporan Laba Rugi
  - [x] 14.1 Tambahkan line "Potongan Penjualan" di Laporan Laba Rugi
    - Update file report untuk Profit & Loss
    - Query saldo akun 4300 - Potongan Penjualan
    - Display sebagai pengurang dari Pendapatan Penjualan
    - Calculate Net Sales = Gross Sales - Potongan Penjualan
    - _Requirements: 11.1, 11.3_

  - [x] 14.2 Tambahkan line "Potongan Pembelian" di Laporan Laba Rugi
    - Query saldo akun 5300 - Potongan Pembelian
    - Display sebagai pengurang dari Harga Pokok Penjualan
    - Calculate Net COGS = Gross COGS - Potongan Pembelian
    - _Requirements: 11.2, 11.4_

  - [x] 14.3 Implementasi currency formatting untuk Laporan Laba Rugi
    - Format semua nilai dengan "Rp" prefix dan pemisah ribuan
    - Ensure 2 decimal places untuk semua amounts
    - _Requirements: 11.5_

  - [x] 14.4 Implementasi period filtering untuk Laporan Laba Rugi
    - Support filter: from_date dan to_date
    - Query GL Entry dengan posting_date dalam range
    - _Requirements: 11.6_

  - [x] 14.5 Write property test untuk Profit Loss Report Discount Display
    - **Property 18: Profit Loss Report Discount Display**
    - **Validates: Requirements 11.1, 11.3**
    - Create sales invoices dengan diskon
    - Run Profit Loss report
    - Verify "Potongan Penjualan" line exists
    - Verify Net Sales = Gross Sales - Potongan Penjualan
    - _Requirements: 11.1, 11.3_


- [x] 15. Update Laporan Neraca
  - [x] 15.1 Verify akun pajak displayed di Laporan Neraca
    - Verify akun 1410 - Pajak Dibayar Dimuka di section Aset Lancar
    - Verify akun 2210 - Hutang PPN di section Kewajiban Lancar
    - Verify akun 2230 - Hutang PPh 23 di section Kewajiban Lancar
    - Verify akun 2240 - Hutang PPh 4(2) Final di section Kewajiban Lancar
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 15.2 Implementasi currency formatting untuk Laporan Neraca
    - Format semua nilai dengan "Rp" prefix dan pemisah ribuan
    - _Requirements: 12.5_

  - [x] 15.3 Implementasi date filtering untuk Laporan Neraca
    - Support filter: as_of_date
    - Query saldo per tanggal yang dipilih
    - _Requirements: 12.6_

  - [x] 15.4 Write property test untuk Balance Sheet Tax Account Display
    - **Property 19: Balance Sheet Tax Account Display**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
    - Create invoices dengan pajak
    - Run Balance Sheet report
    - Verify tax accounts displayed di section yang benar
    - Verify saldo calculation correct
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 16. Buat Laporan PPN (VAT Report)
  - [x] 16.1 Buat report structure untuk Laporan PPN
    - Buat file `app/api/reports/vat-report/route.ts`
    - Define report structure: PPN Output section, PPN Input section, Net Payable
    - _Requirements: 13.1, 13.2_

  - [x] 16.2 Implementasi query untuk PPN Output
    - Query GL Entry untuk akun 2210 - Hutang PPN
    - Filter by posting_date (periode)
    - Group by invoice: tanggal, nomor invoice, customer, DPP, PPN
    - Calculate Total PPN Output
    - _Requirements: 13.1, 13.3_

  - [x] 16.3 Implementasi query untuk PPN Input
    - Query GL Entry untuk akun 1410 - Pajak Dibayar Dimuka
    - Filter by posting_date (periode)
    - Group by invoice: tanggal, nomor invoice, supplier, DPP, PPN
    - Calculate Total PPN Input
    - _Requirements: 13.2, 13.4_

  - [x] 16.4 Implementasi calculation PPN Kurang/Lebih Bayar
    - Calculate: PPN Kurang/Lebih Bayar = Total PPN Output - Total PPN Input
    - Display di summary section
    - _Requirements: 13.5_

  - [x] 16.5 Implementasi period filtering untuk Laporan PPN
    - Support filter: from_date dan to_date (biasanya per bulan)
    - Default: bulan berjalan
    - _Requirements: 13.7_

  - [x] 16.6 Implementasi export to Excel untuk Laporan PPN
    - Buat endpoint untuk export: `/api/reports/vat-report/export`
    - Generate Excel file dengan format SPT PPN
    - Include semua detail: invoice list, summary, calculation
    - _Requirements: 13.8_

  - [x] 16.7 Write property test untuk VAT Report Calculation
    - **Property 20: VAT Report Calculation**
    - **Validates: Requirements 13.3, 13.4, 13.5**
    - Create sales dan purchase invoices dengan PPN
    - Run VAT report
    - Verify calculation: Output - Input = Net Payable
    - _Requirements: 13.3, 13.4, 13.5_


- [x] 17. Testing Reports
  - [x] 17.1 Write integration tests untuk Laporan Laba Rugi
    - Test query Potongan Penjualan dan Potongan Pembelian
    - Test calculation Net Sales dan Net COGS
    - Test period filtering
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_

  - [x] 17.2 Write integration tests untuk Laporan Neraca
    - Test display akun pajak di section yang benar
    - Test saldo calculation
    - Test date filtering
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

  - [x] 17.3 Write integration tests untuk Laporan PPN
    - Test query PPN Output dan PPN Input
    - Test calculation PPN Kurang/Lebih Bayar
    - Test period filtering
    - Test export to Excel
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7, 13.8_

  - [x] 17.4 Write property test untuk Report Historical Consistency
    - **Property 29: Report Historical Consistency**
    - **Validates: Requirements 14.6**
    - Snapshot report values untuk periode sebelum implementasi
    - Run reports setelah implementasi untuk periode yang sama
    - Verify values unchanged
    - _Requirements: 14.6_

  - [x] 17.5 Write property test untuk Currency Formatting Consistency
    - **Property 21: Currency Formatting Consistency**
    - **Validates: Requirements 11.5, 12.5**
    - Generate random currency values
    - Verify format output matches pattern: /^Rp\s[\d{1,3}(\.\d{3})*,\d{2}$/
    - Test di semua reports
    - _Requirements: 11.5, 12.5_

- [x] 18. Checkpoint - Validasi Reports
  - Ensure all reports displaying correct data
  - Test calculations: Net Sales, Net COGS, PPN Net Payable
  - Test filtering dan export functionality
  - Run all integration tests
  - Ask user if questions arise


### Fase 5: Testing & Documentation (Minggu 7)

- [x] 19. End-to-End Testing
  - [x] 19.1 Write E2E test untuk complete Sales Invoice flow
    - Create Sales Invoice dengan discount dan PPN via API
    - Verify invoice created dengan grand_total correct
    - Verify GL Entry posted dengan balanced entry
    - Verify Laporan Laba Rugi menampilkan Potongan Penjualan
    - Verify Laporan Neraca menampilkan Hutang PPN
    - Verify Laporan PPN menampilkan PPN Output
    - Cancel invoice, verify reversal GL Entry
    - _Requirements: 15.11_

  - [x] 19.2 Write E2E test untuk complete Purchase Invoice flow
    - Create Purchase Invoice dengan discount dan PPN Masukan via API
    - Verify invoice created dengan grand_total correct
    - Verify GL Entry posted dengan balanced entry
    - Verify stock valuation reflect discount (net_total)
    - Verify Laporan Neraca menampilkan Pajak Dibayar Dimuka
    - Verify Laporan PPN menampilkan PPN Input
    - _Requirements: 15.11_

  - [x] 19.3 Write E2E test untuk kombinasi discount + multiple taxes
    - Create invoice dengan discount + PPN + PPh 23
    - Verify calculation: subtotal - discount + PPN - PPh 23 = grand_total
    - Verify GL Entry untuk semua accounts
    - _Requirements: 15.8_

  - [x] 19.4 Write E2E test untuk backward compatibility
    - Create old invoice (tanpa discount/tax)
    - Open form, verify no error
    - Edit invoice (change customer name), save
    - Verify GL Entry unchanged
    - Fetch via API, verify default values (0 dan empty array)
    - _Requirements: 15.10_

  - [x] 19.5 Manual testing di staging environment
    - Deploy ke staging environment
    - Test semua flows secara manual
    - Test dengan production-like data
    - Verify performance (API response time < 500ms)
    - _Requirements: 15.11_


- [ ] 20. User Acceptance Testing (UAT)
  - [ ] 20.1 Prepare UAT environment dan test data
    - Setup UAT environment (copy dari staging)
    - Prepare test scenarios untuk Finance team
    - Prepare test data: customers, suppliers, items
    - _Requirements: 15.11_

  - [ ] 20.2 Conduct UAT session dengan Finance team
    - Train Finance team tentang fitur baru
    - Guide mereka untuk test semua scenarios
    - Scenario 1: Create Sales Invoice dengan discount percentage
    - Scenario 2: Create Sales Invoice dengan discount amount
    - Scenario 3: Create Sales Invoice dengan PPN 11%
    - Scenario 4: Create Sales Invoice dengan PPN + PPh 23
    - Scenario 5: Create Purchase Invoice dengan discount dan PPN Masukan
    - Scenario 6: View Laporan Laba Rugi dengan Potongan Penjualan
    - Scenario 7: View Laporan PPN dan export to Excel
    - Scenario 8: Edit old invoice (backward compatibility)
    - _Requirements: 15.11_

  - [ ] 20.3 Collect feedback dan fix issues
    - Document semua feedback dari Finance team
    - Prioritize issues: critical, high, medium, low
    - Fix critical dan high priority issues
    - Re-test setelah fix
    - _Requirements: 15.11_

  - [ ] 20.4 UAT sign-off
    - Get approval dari Finance Manager
    - Document UAT results
    - Prepare UAT report
    - _Requirements: 15.11_


- [ ] 21. Documentation
  - [ ] 21.1 Buat User Manual dalam Bahasa Indonesia
    - Buat dokumen "Panduan Penggunaan Fitur Diskon dan Pajak"
    - Section 1: Cara input diskon di Sales Invoice (percentage dan amount)
    - Section 2: Cara input pajak di Sales Invoice (pilih template, lihat calculation)
    - Section 3: Cara input diskon di Purchase Invoice
    - Section 4: Cara input pajak di Purchase Invoice
    - Section 5: Cara membaca Laporan Laba Rugi dengan diskon
    - Section 6: Cara membaca Laporan PPN dan export to Excel
    - Sertakan screenshots untuk setiap step
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ] 21.2 Buat dokumentasi API
    - Update API documentation dengan endpoints baru
    - Document request/response structure untuk Sales Invoice API
    - Document request/response structure untuk Purchase Invoice API
    - Document request/response structure untuk Tax Template API
    - Sertakan contoh request/response untuk setiap endpoint
    - Document error codes dan messages
    - _Requirements: 16.5_

  - [ ] 21.3 Buat contoh use cases
    - Use Case 1: Sales Invoice dengan discount 10%
    - Use Case 2: Sales Invoice dengan discount Rp 100.000
    - Use Case 3: Sales Invoice dengan PPN 11%
    - Use Case 4: Sales Invoice dengan PPN + PPh 23
    - Use Case 5: Purchase Invoice dengan discount dan PPN Masukan
    - Use Case 6: Kombinasi discount + multiple taxes
    - Sertakan contoh data input dan expected output
    - _Requirements: 16.6_

  - [ ] 21.4 Buat troubleshooting guide
    - Common Error 1: "Discount amount cannot exceed subtotal" - penyebab dan solusi
    - Common Error 2: "Tax template not found" - penyebab dan solusi
    - Common Error 3: "GL Entry not balanced" - penyebab dan solusi
    - Common Error 4: "Account not found in COA" - penyebab dan solusi
    - FAQ: Perbedaan discount percentage vs amount
    - FAQ: Kapan menggunakan PPN + PPh 23
    - _Requirements: 16.7_

  - [ ] 21.5 Buat dokumentasi teknis untuk developer
    - Document GL Entry logic untuk Sales Invoice dengan diskon
    - Document GL Entry logic untuk Purchase Invoice dengan diskon
    - Document GL Entry logic untuk PPN Output dan PPN Input
    - Document GL Entry logic untuk PPh 23
    - Document calculation algorithms (discount, tax, grand total)
    - Document ERPNext hooks dan custom scripts
    - _Requirements: 16.8_

  - [ ] 21.6 Buat video tutorial
    - Video 1: Cara input diskon dan pajak di Sales Invoice (5 menit)
    - Video 2: Cara input diskon dan pajak di Purchase Invoice (5 menit)
    - Video 3: Cara membaca dan export Laporan PPN (5 menit)
    - Upload ke internal knowledge base atau YouTube (unlisted)
    - _Requirements: 16.1, 16.2, 16.3, 16.4_


- [ ] 22. Migration dan Deployment Preparation
  - [ ] 22.1 Buat migration script untuk Tax Templates
    - Buat Python script `migrations/create_tax_templates.py`
    - Script untuk create semua Tax Templates (PPN, PPh 23, PPh 22)
    - Validasi bahwa akun COA yang dibutuhkan sudah ada
    - Handle error jika template sudah exist (idempotent)
    - _Requirements: 17.1, 17.2_

  - [ ] 22.2 Buat pre-deployment checklist
    - Checklist item 1: Backup database (full backup)
    - Checklist item 2: Test di staging dengan production data
    - Checklist item 3: Validasi semua akun COA exist (4300, 5300, 2210, 1410, 2230, 2240)
    - Checklist item 4: Validasi tidak ada invoice dalam status draft yang akan terpengaruh
    - Checklist item 5: User training completed
    - Checklist item 6: Documentation ready
    - Checklist item 7: Rollback plan prepared
    - _Requirements: 17.3, 17.4, 17.6_

  - [ ] 22.3 Buat rollback script
    - Buat script untuk rollback jika terjadi error
    - Script untuk delete Tax Templates yang dibuat
    - Script untuk restore database dari backup
    - Document rollback procedure
    - _Requirements: 17.5_

  - [ ] 22.4 Buat post-deployment checklist
    - Checklist item 1: Run smoke test (create 1 invoice dengan discount dan tax)
    - Checklist item 2: Verify GL Entry posted correctly
    - Checklist item 3: Verify reports displaying correct data
    - Checklist item 4: Monitor error logs (first 24 hours)
    - Checklist item 5: Monitor API response time
    - Checklist item 6: Collect user feedback
    - Checklist item 7: Send deployment summary to admin
    - _Requirements: 17.7, 17.8_

  - [ ] 22.5 Execute database backup
    - Run full database backup sebelum deployment
    - Verify backup file integrity
    - Store backup di secure location
    - Document backup location dan timestamp
    - _Requirements: 17.3_

  - [ ] 22.6 Execute migration script
    - Run migration script di production
    - Verify Tax Templates created successfully
    - Verify no errors in migration log
    - _Requirements: 17.1, 17.2_

  - [ ] 22.7 Deploy code to production
    - Deploy Next.js frontend (API dan UI)
    - Deploy ERPNext custom app (Python backend)
    - Restart services
    - Verify deployment successful
    - _Requirements: 17.6_

  - [ ] 22.8 Execute post-deployment validation
    - Run smoke test: create Sales Invoice dengan discount dan PPN
    - Verify GL Entry balanced
    - Verify reports displaying correct data
    - Monitor error logs
    - _Requirements: 17.7_

  - [ ] 22.9 Send deployment notification
    - Send email to admin dengan deployment summary
    - Include: deployment time, components deployed, test results
    - Include link to documentation dan troubleshooting guide
    - _Requirements: 17.8_

- [ ] 23. Checkpoint Final - Deployment Complete
  - Ensure deployment successful tanpa critical errors
  - Verify all smoke tests passed
  - Monitor system stability (first 24 hours)
  - Collect user feedback
  - Document lessons learned


## Summary

**Total Tasks**: 23 top-level tasks dengan 100+ sub-tasks
**Estimated Duration**: 7 minggu (35 hari kerja)
**Optional Tasks**: 30+ property-based tests dan unit tests (dapat diskip untuk MVP lebih cepat)

**Fase Breakdown**:
- Fase 1 (Setup Tax Templates): 2 tasks, ~5 hari
- Fase 2 (API Enhancement): 4 tasks, ~10 hari
- Fase 3 (UI Implementation): 6 tasks, ~10 hari
- Fase 4 (Reports Update): 4 tasks, ~5 hari
- Fase 5 (Testing & Documentation): 7 tasks, ~5 hari

**Critical Path**:
1. Setup Tax Templates → API Enhancement → UI Implementation → Reports → Deployment
2. Setiap fase depends on fase sebelumnya
3. Testing dapat dilakukan parallel dengan implementation

**Risk Mitigation**:
- Extensive testing di setiap fase (unit, integration, property-based, E2E)
- Backward compatibility testing untuk old invoices
- UAT dengan Finance team sebelum production
- Rollback plan prepared
- Incremental deployment dengan checkpoints

**Success Criteria**:
- ✅ Semua 17 requirements terpenuhi
- ✅ 30 correctness properties validated (via property-based tests)
- ✅ Test coverage > 80% untuk critical paths
- ✅ Backward compatibility dengan existing invoices
- ✅ No breaking changes
- ✅ GL Entry balanced untuk semua transactions
- ✅ Reports displaying correct data
- ✅ API response time < 500ms
- ✅ UAT approved oleh Finance Manager
- ✅ Documentation complete (user manual, API docs, video tutorial)

**Next Steps**:
1. Review tasks document dengan team
2. Assign tasks ke developers
3. Setup development environment
4. Start Fase 1: Setup Tax Templates

---

**Document Status**: Ready for Implementation  
**Created**: 2024-01-15  
**Language**: Bahasa Indonesia (documentation), Python + TypeScript (code)  
**Feature**: discount-and-tax-implementation
