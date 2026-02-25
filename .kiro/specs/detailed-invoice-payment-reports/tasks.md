# Rencana Implementasi: Laporan Detail Faktur dan Pembayaran

## Ringkasan

Implementasi fitur laporan detail untuk faktur penjualan, faktur pembelian, dan pembayaran dengan detail item/referensi per transaksi. Fitur ini mencakup 4 halaman laporan baru, 4 API endpoint backend, fungsi cetak untuk semua laporan, dan komponen UI yang dapat digunakan kembali.

## Tugas

- [x] 1. Setup struktur API routes dan TypeScript interfaces
  - Buat struktur direktori untuk 4 API endpoints di `app/api/finance/reports/`
  - Buat TypeScript interfaces di `types/sales-invoice-details.ts`, `types/purchase-invoice-details.ts`, dan `types/payment-details.ts`
  - Setup authentication helper function untuk reuse di semua endpoints
  - _Requirements: 8.1, 8.2, 9.1, 9.2_

- [x] 2. Implementasi API endpoint untuk Sales Invoice Details
  - [x] 2.1 Buat API route di `app/api/finance/reports/sales-invoice-details/route.ts`
    - Implementasi GET handler dengan query parameters (company, from_date, to_date)
    - Fetch list sales invoices dari ERPNext dengan filters
    - Fetch detail setiap invoice secara parallel menggunakan Promise.all()
    - Combine data dan return response dengan format standar
    - _Requirements: 8.1, 8.3, 8.4, 8.5_
  
  - [x] 2.2 Write property test untuk API response structure
    - **Property 8: API Response Structure Consistency**
    - **Validates: Requirements 8.5**
  
  - [x] 2.3 Implementasi error handling dan timeout
    - Handle authentication errors (401)
    - Handle missing parameters (400)
    - Handle ERPNext API errors dengan graceful degradation
    - Implement 30 second timeout untuk prevent hanging requests
    - _Requirements: 8.6, 8.8_
  
  - [x] 2.4 Write property test untuk API error handling
    - **Property 9: API Error Response Format**
    - **Property 10: API Error Handling Gracefully**
    - **Validates: Requirements 8.6, 8.8**

- [x] 3. Implementasi API endpoint untuk Purchase Invoice Details
  - [x] 3.1 Buat API route di `app/api/finance/reports/purchase-invoice-details/route.ts`
    - Reuse pattern dari Sales Invoice Details API
    - Adjust untuk Purchase Invoice DocType
    - Implement sama error handling dan timeout strategy
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.8_
  
  - [x] 3.2 Write unit tests untuk Purchase Invoice API
    - Test successful response dengan mock data
    - Test error scenarios (missing company, auth failure, ERPNext error)
    - _Requirements: 8.2, 8.6_

- [x] 4. Checkpoint - Test API endpoints
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementasi API endpoints untuk Payment
  - [x] 5.1 Buat API route di `app/api/finance/reports/payment-summary/route.ts`
    - Fetch payment entries dari ERPNext tanpa references
    - Return array of PaymentEntry dengan format standar
    - _Requirements: 9.1, 9.3, 9.4, 9.5_
  
  - [x] 5.2 Buat API route di `app/api/finance/reports/payment-details/route.ts`
    - Fetch payment entries dengan references (child table)
    - Fetch detail setiap payment secara parallel
    - Combine data dan return PaymentWithReferences
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  
  - [x] 5.3 Write property tests untuk payment calculations
    - **Property 7: Payment Summary Calculation Correctness**
    - **Validates: Requirements 5.8, 6.8**
  
  - [x] 5.4 Write unit tests untuk Payment APIs
    - Test payment summary response structure
    - Test payment details dengan references
    - Test error handling
    - _Requirements: 9.1, 9.2, 9.6, 9.8_

- [x] 6. Buat shared components dan utilities
  - [x] 6.1 Buat FilterSection component di `components/reports/FilterSection.tsx`
    - Props: date range, search value, additional filters, action buttons
    - Reusable untuk semua report pages
    - _Requirements: 1.5, 1.6, 1.7, 3.5, 3.6, 3.7, 5.4-5.7, 6.5-6.7_
  
  - [x] 6.2 Buat SummaryCards component di `components/reports/SummaryCards.tsx`
    - Props: array of cards dengan label, value, dan color
    - Support 4 color variants (blue, green, purple, orange)
    - _Requirements: 1.8, 3.8, 5.8, 6.8_
  
  - [x] 6.3 Buat useExpandableRows hook di `hooks/useExpandableRows.ts`
    - State management untuk expanded rows (Set<string>)
    - toggleRow dan isExpanded functions
    - Reusable untuk invoice dan payment details
    - _Requirements: 1.4, 3.4, 6.4_
  
  - [x] 6.4 Buat helper functions di `lib/report-utils.ts`
    - Date formatting (DD/MM/YYYY to YYYY-MM-DD dan sebaliknya)
    - Currency formatting (Rp dengan separator ribuan)
    - Summary calculations (total, average, net balance)
    - _Requirements: 10.5, 10.6_

- [x] 7. Implementasi Sales Invoice Details Page
  - [x] 7.1 Buat page component di `app/reports/sales-invoice-details/page.tsx`
    - Setup state management (data, loading, error, filters, pagination)
    - Implement useEffect untuk fetch data dari API
    - Handle company selection dan redirect jika tidak ada
    - _Requirements: 1.1, 1.2, 12.1_
  
  - [x] 7.2 Implementasi filter section
    - Date range filters (from/to) menggunakan BrowserStyleDatePicker
    - Search input untuk customer/invoice number
    - Status select dropdown
    - Clear filters dan refresh buttons
    - _Requirements: 1.5, 1.6, 1.7, 10.10_
  
  - [x] 7.3 Implementasi summary cards
    - Total Invoices card (blue)
    - Total Sales card (green)
    - Average Invoice card (purple)
    - Current Page Info card (orange)
    - _Requirements: 1.8_
  
  - [x] 7.4 Write property test untuk invoice summary calculations
    - **Property 3: Invoice Summary Calculation Correctness**
    - **Validates: Requirements 1.8, 3.8**
  
  - [x] 7.5 Implementasi desktop table view dengan expandable rows
    - Table header dengan semua columns
    - Invoice rows dengan expand button
    - Expandable detail rows untuk items
    - Nested table untuk item details
    - _Requirements: 1.3, 1.4_
  
  - [x] 7.6 Write property test untuk invoice field display
    - **Property 1: Invoice Field Display Completeness**
    - **Property 2: Invoice Item Field Display Completeness**
    - **Validates: Requirements 1.3, 1.4**
  
  - [x] 7.7 Implementasi mobile card view
    - Card-based layout untuk invoices
    - Expandable sections untuk items
    - Responsive breakpoint 768px
    - _Requirements: 1.10_
  
  - [x] 7.8 Implementasi pagination
    - Frontend pagination dengan cached data di window object
    - 20 items per page untuk desktop, 10 untuk mobile
    - Page change handler dengan smooth scroll
    - _Requirements: 1.9, 11.1, 11.2_
  
  - [x] 7.9 Write property test untuk pagination
    - **Property 4: Pagination Page Size Correctness**
    - **Property 11: Filter Change Resets Pagination**
    - **Validates: Requirements 1.9, 11.1**
  
  - [x] 7.10 Implementasi error handling dan loading states
    - Loading spinner untuk initial load
    - Error message display dengan retry option
    - Empty state untuk no data
    - Date range validation warning
    - _Requirements: 12.2, 12.3, 12.4, 12.5_
  
  - [x] 7.11 Write unit tests untuk Sales Invoice Details Page
    - Test route rendering
    - Test filter interactions
    - Test expand/collapse functionality
    - Test error states
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 12.2, 12.3_

- [x] 8. Checkpoint - Test Sales Invoice Details Page
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implementasi Purchase Invoice Details Page
  - [x] 9.1 Buat page component di `app/reports/purchase-invoice-details/page.tsx`
    - Reuse struktur dari Sales Invoice Details Page
    - Adjust labels untuk supplier instead of customer
    - Adjust API endpoint ke purchase-invoice-details
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 9.2 Implementasi filter, summary, table, dan pagination
    - Reuse FilterSection, SummaryCards, useExpandableRows
    - Adjust field labels untuk purchase context
    - Same responsive behavior dan error handling
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  
  - [x] 9.3 Write unit tests untuk Purchase Invoice Details Page
    - Test route rendering
    - Test supplier filter
    - Test data display
    - _Requirements: 3.1, 3.6_

- [x] 10. Implementasi Payment Summary Page
  - [x] 10.1 Buat page component di `app/reports/payment-summary/page.tsx`
    - Setup state management untuk payment data
    - Fetch data dari payment-summary API
    - _Requirements: 5.1, 5.2_
  
  - [x] 10.2 Implementasi filter section untuk payments
    - Date range filters
    - Payment type filter (Semua, Receive, Pay)
    - Mode of payment filter
    - Party search input
    - _Requirements: 5.4, 5.5, 5.6, 5.7_
  
  - [x] 10.3 Implementasi summary cards untuk payments
    - Total Transactions card (blue)
    - Total Received card (green)
    - Total Paid card (purple)
    - Net Balance card (orange)
    - _Requirements: 5.8_
  
  - [x] 10.4 Implementasi table view untuk payments (non-expandable)
    - Desktop table dengan semua payment fields
    - Mobile card view
    - Pagination dengan 20/10 items per page
    - _Requirements: 5.3, 5.9, 5.10_
  
  - [x] 10.5 Write unit tests untuk Payment Summary Page
    - Test route rendering
    - Test payment type filter
    - Test mode of payment filter
    - Test summary calculations
    - _Requirements: 5.1, 5.5, 5.6, 5.8_

- [-] 11. Implementasi Payment Details Page
  - [x] 11.1 Buat page component di `app/reports/payment-details/page.tsx`
    - Similar structure dengan Payment Summary
    - Fetch data dari payment-details API (dengan references)
    - _Requirements: 6.1, 6.2_
  
  - [x] 11.2 Implementasi expandable rows untuk payment references
    - Payment rows dengan expand button
    - Expandable detail rows untuk invoice references
    - Display allocated amount dan outstanding amount
    - _Requirements: 6.3, 6.4_
  
  - [x] 11.3 Implementasi filters, summary, dan pagination
    - Reuse components dari Payment Summary
    - Same filter options dan summary cards
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_
  
  - [x] 11.4 Write unit tests untuk Payment Details Page
    - Test route rendering
    - Test expandable references
    - Test reference data display
    - _Requirements: 6.1, 6.4_

- [x] 12. Checkpoint - Test all report pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implementasi print functionality untuk Sales Invoice Details
  - [x] 13.1 Buat print page di `app/reports/sales-invoice-details/print/page.tsx`
    - Server-side rendering dengan searchParams
    - Fetch data dari API dengan filter parameters
    - _Requirements: 2.8_
  
  - [x] 13.2 Implementasi print layout
    - A4 paper size (210mm x 297mm)
    - Print header dengan company name, title, dan periode
    - Display active filters
    - Data table dengan invoice dan items
    - Summary section di akhir
    - Print footer
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 13.3 Integrate PrintPreviewModal di main page
    - Add "Cetak Laporan" button
    - Pass printUrl dengan query parameters
    - Handle modal open/close
    - _Requirements: 2.1, 2.2_
  
  - [x] 13.4 Write property test untuk print filter consistency
    - **Property 5: Print Filter Consistency**
    - **Validates: Requirements 2.4**
  
  - [x] 13.5 Write unit tests untuk print functionality
    - Test print button presence
    - Test print modal interaction
    - Test print route rendering
    - Test print header content
    - _Requirements: 2.1, 2.2, 2.5, 2.8_

- [x] 14. Implementasi print functionality untuk Purchase Invoice Details
  - [x] 14.1 Buat print page di `app/reports/purchase-invoice-details/print/page.tsx`
    - Reuse struktur dari Sales Invoice print page
    - Adjust labels untuk purchase context
    - _Requirements: 4.8_
  
  - [x] 14.2 Implementasi print layout dan modal integration
    - Same A4 layout dengan header, data, summary, footer
    - Integrate PrintPreviewModal di main page
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 14.3 Write unit tests untuk purchase invoice print
    - Test print functionality
    - Test print content
    - _Requirements: 4.1, 4.5, 4.7_

- [x] 15. Implementasi print functionality untuk Payment reports
  - [x] 15.1 Buat print page di `app/reports/payment-summary/print/page.tsx`
    - Server-side rendering untuk payment summary
    - Print layout dengan payment data table
    - _Requirements: 7.9_
  
  - [x] 15.2 Buat print page di `app/reports/payment-details/print/page.tsx`
    - Server-side rendering untuk payment details dengan references
    - Print layout dengan nested payment references
    - _Requirements: 7.10_
  
  - [x] 15.3 Integrate PrintPreviewModal untuk both payment pages
    - Add print buttons di Payment Summary dan Payment Details pages
    - Pass correct printUrl dengan parameters
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 15.4 Write unit tests untuk payment print functionality
    - Test print button presence di both pages
    - Test print routes
    - Test print content dengan summary
    - _Requirements: 7.1, 7.2, 7.6, 7.8_

- [ ] 16. Implementasi performance optimizations
  - [x] 16.1 Implement data caching strategy
    - Store full dataset di window object untuk pagination
    - Use useMemo untuk expensive calculations (totals, averages)
    - Use useCallback untuk event handlers
    - _Requirements: 11.2, 11.4, 11.5, 11.6_
  
  - [x] 16.2 Implement debouncing dan smooth scroll
    - Debounce URL updates untuk pagination (100ms)
    - Smooth scroll ke atas saat page change
    - Track pagination source dengan useRef
    - _Requirements: 11.3, 11.9, 11.10_
  
  - [x] 16.3 Optimize loading states
    - Show loading spinner hanya untuk initial load
    - No loading indicator untuk pagination dengan cached data
    - Different loading state untuk refresh
    - _Requirements: 11.7, 11.8_
  
  - [x] 16.4 Write performance tests
    - Test pagination speed dengan cached data
    - Test calculation memoization
    - Verify no unnecessary re-renders
    - _Requirements: 11.2, 11.5, 11.8_

- [x] 17. Implementasi UI consistency dan accessibility
  - [x] 17.1 Ensure consistent styling dengan existing reports
    - Use same color scheme (Indigo, Green, Yellow, Red)
    - Use same component patterns (BrowserStyleDatePicker, Pagination)
    - Use same layout structure
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 17.2 Implement consistent formatting
    - Date format DD/MM/YYYY untuk display
    - Currency format Rp dengan separator ribuan
    - Consistent loading spinner dengan messages
    - Consistent error message styling
    - _Requirements: 10.5, 10.6, 10.7, 10.8_
  
  - [x] 17.3 Add accessibility features
    - ARIA labels untuk tables dan buttons
    - Keyboard navigation support
    - Screen reader support untuk expandable rows
    - Proper focus management
    - _Requirements: 10.9_
  
  - [x] 17.4 Write unit tests untuk UI consistency
    - Test color scheme usage
    - Test component reuse
    - Test responsive breakpoints
    - _Requirements: 10.1, 10.2, 10.3, 10.9_

- [x] 18. Final testing dan validation
  - [x] 18.1 Run all property-based tests
    - Verify all 13 properties pass dengan 100+ iterations
    - Fix any failing properties
    - Document any edge cases found
  
  - [x] 18.2 Run all unit tests
    - Ensure >80% code coverage
    - Fix any failing tests
    - Add missing test cases
  
  - [x] 18.3 Perform integration testing
    - Test end-to-end user flows untuk all 4 reports
    - Test cross-browser compatibility
    - Test mobile responsiveness
    - Test print functionality di different browsers
  
  - [x] 18.4 Perform error scenario testing
    - Test dengan missing company
    - Test dengan invalid date ranges
    - Test dengan network errors
    - Test dengan empty data
    - Test dengan large datasets (500+ records)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 19. Checkpoint - Final validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Documentation dan cleanup
  - [x] 20.1 Add code comments dan JSDoc
    - Document complex functions
    - Add type annotations
    - Document API endpoints
  
  - [x] 20.2 Update user documentation
    - Add usage guide untuk new reports
    - Document filter options
    - Document print functionality
  
  - [x] 20.3 Code cleanup dan refactoring
    - Remove console.logs
    - Remove unused imports
    - Format code dengan prettier
    - Run ESLint dan fix issues

## Catatan

- Tugas yang ditandai dengan `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap tugas mereferensikan requirements spesifik untuk traceability
- Checkpoint tasks memastikan validasi incremental
- Property tests memvalidasi universal correctness properties
- Unit tests memvalidasi specific examples dan edge cases
- Implementasi menggunakan TypeScript dengan Next.js 16.1.6 dan React 19.2.3
- Semua komponen mengikuti pola arsitektur existing dan reuse komponen yang sudah ada
