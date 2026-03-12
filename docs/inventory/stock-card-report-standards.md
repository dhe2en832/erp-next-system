# Stock Card Report - Standar Implementasi

## 📋 Ringkasan

Dokumen ini menjelaskan standar implementasi untuk Stock Card Report yang dapat dijadikan acuan untuk menu-menu lainnya dalam sistem ERP. Implementasi ini mencakup pagination, sorting, filtering, export Excel, dan print preview dengan best practices.

---

## 🎯 Fitur yang Diimplementasikan

### 1. **Pagination dengan Dual Summary**
- Summary untuk **seluruh periode** (Total Masuk/Keluar untuk semua data)
- Summary untuk **halaman saat ini** (ditampilkan sebagai sub-text "Hal. ini:")
- Menggunakan `client.getCount()` untuk mendapatkan total count yang akurat

### 2. **Sorting di Header Kolom**
- Semua kolom tabel dapat di-sort
- Toggle antara ascending/descending
- Visual indicator dengan icon (↑ ↓ ⇅)
- Otomatis reset ke halaman 1 saat sort berubah

### 3. **Export Excel - Full Period Data**
- Mengambil **semua data** berdasarkan periode tanggal (bukan hanya halaman saat ini)
- Multiple requests dengan limit 1000 per request
- Nama file menyertakan periode tanggal

### 4. **Print Preview - Full Period Data**
- Mengambil **semua data** untuk print
- CSS print khusus untuk multi-page support
- Header tabel muncul di setiap halaman
- Baris tidak terpotong di tengah

### 5. **Default Date Filter**
- "Dari Tanggal" default = kemarin (bukan awal bulan)
- "Sampai Tanggal" default = hari ini

---

## 🔧 Metode dan Best Practices

### A. Mengambil Data List dengan Pagination

#### ✅ DO: Gunakan `client.getCount()` untuk Total Count

```typescript
// STEP 1: Get total count
const total_records = await client.getCount('Stock Ledger Entry', {
  filters
});

console.log('Total count from ERPNext:', total_records);

// STEP 2: Get paginated data
const stockLedgerEntries = await client.getList('Stock Ledger Entry', {
  fields,
  filters,
  order_by: order_by,
  limit_page_length: limit,
  start: start
});
```

#### ❌ DON'T: Jangan gunakan `limit_page_length: 0`

```typescript
// ❌ SALAH - Ini akan return 0 records
const entries = await client.getList('Stock Ledger Entry', {
  fields,
  filters,
  limit_page_length: 0  // ❌ JANGAN!
});
```

#### ❌ DON'T: Jangan gunakan `limit_page_length: 99999` tanpa cek count

```typescript
// ❌ SALAH - Bisa menyebabkan error jika data terlalu banyak
const entries = await client.getList('Stock Ledger Entry', {
  fields,
  filters,
  limit_page_length: 99999  // ❌ JANGAN tanpa cek count dulu!
});
```

---

### B. Mengambil Semua Data (untuk Export/Print)

#### ✅ DO: Multiple Requests dengan Limit 1000

```typescript
// STEP 1: Get total count
const countRes = await fetch(`/api/endpoint?limit=1`, { credentials: 'include' });
const countResult = await countRes.json();
const totalRecords = countResult.pagination?.total_records || 0;

// STEP 2: Calculate pages needed
const limit = Math.min(totalRecords, 1000);
const totalPages = Math.ceil(totalRecords / limit);

// STEP 3: Fetch all pages
let allEntries = [];
for (let page = 1; page <= totalPages; page++) {
  const res = await fetch(`/api/endpoint?page=${page}&limit=${limit}`, { 
    credentials: 'include' 
  });
  const result = await res.json();
  if (result.success && result.data) {
    allEntries = allEntries.concat(result.data);
  }
}
```

#### ⚠️ IMPORTANT: API Limit Validation

Backend API harus membatasi limit maksimal:

```typescript
// Di API route
if (limit < 1 || limit > 1000) {
  return NextResponse.json(
    { 
      success: false, 
      message: 'Batas data per halaman harus antara 1 dan 1000' 
    },
    { status: 400 }
  );
}
```

---

### C. Implementasi Sorting

#### ✅ DO: Kirim `order_by` dari Frontend ke Backend

**Frontend:**
```typescript
// State untuk sorting
const [sortState, setSortState] = useState<SortState>({
  field: 'posting_date',
  direction: 'desc',
});

// Handler untuk sort
const handleSort = useCallback((field: string) => {
  setSortState(prev => {
    if (prev.field === field) {
      // Toggle direction
      return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      // New field, default to desc
      return { field, direction: 'desc' };
    }
  });
  setCurrentPage(1); // Reset ke halaman 1
}, []);

// Buat order_by string
const orderBy = `${sortState.field} ${sortState.direction}, posting_time ${sortState.direction}`;

// Kirim ke API
const params = new URLSearchParams({
  order_by: orderBy,
  // ... params lainnya
});
```

**Backend API:**
```typescript
// Extract order_by parameter
const order_by = searchParams.get('order_by') || 'posting_date desc, posting_time desc';

// Gunakan di getList
const entries = await client.getList('Stock Ledger Entry', {
  fields,
  filters,
  order_by: order_by,  // ✅ Gunakan parameter dari request
  limit_page_length: limit,
  start: start
});
```

#### ❌ DON'T: Jangan hardcode order_by di backend

```typescript
// ❌ SALAH - Hardcoded, tidak bisa di-sort dari frontend
const entries = await client.getList('Stock Ledger Entry', {
  fields,
  filters,
  order_by: 'posting_date asc,posting_time asc',  // ❌ Hardcoded!
  limit_page_length: limit,
  start: start
});
```

#### ✅ DO: Trigger Fetch saat Sort Berubah

```typescript
// useEffect untuk trigger fetch saat sort berubah
useEffect(() => {
  if (currentPage !== 1) {
    setCurrentPage(1);
  } else {
    // If already on page 1, trigger fetch directly
    if (selectedCompany) {
      fetchData();
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sortState]);
```

---

### D. Dual Summary (Periode & Halaman)

#### ✅ DO: Hitung Dua Summary di Backend

```typescript
// 1. Page Summary - dari entries yang di-paginate
const pageSummary = await calculateSummary(
  paginatedEntries,  // Hanya entries di halaman saat ini
  company,
  item_code,
  from_date,
  client
);

// 2. Period Summary - dari SEMUA entries dalam periode
const allEntries = await client.getList('Stock Ledger Entry', {
  fields,
  filters,
  order_by: 'posting_date asc,posting_time asc',
  limit_page_length: Math.max(total_records, 99999)
});

const periodSummary = await calculateSummary(
  allEntries,  // Semua entries dalam periode
  company,
  item_code,
  from_date,
  client
);

// Return keduanya
return NextResponse.json({
  success: true,
  data: paginatedEntries,
  summary: periodSummary,      // Total untuk seluruh periode
  page_summary: pageSummary,   // Total untuk halaman saat ini
  pagination: { ... }
});
```

#### ✅ DO: Tampilkan Keduanya di Frontend

```typescript
function SummaryPanel({ summary, pageSummary }: { 
  summary: SummaryData; 
  pageSummary?: SummaryData 
}) {
  return (
    <div>
      {/* Total Masuk - Periode Penuh */}
      <p className="text-sm font-bold">
        {summary.total_in.toLocaleString('id-ID')} {summary.uom}
      </p>
      
      {/* Total Masuk - Halaman Saat Ini */}
      {pageSummary && (
        <p className="text-xs text-gray-500 mt-1">
          Hal. ini: {pageSummary.total_in.toLocaleString('id-ID')} {pageSummary.uom}
        </p>
      )}
    </div>
  );
}
```

---

### E. Export Excel - Full Period Data

#### ✅ DO: Fetch Semua Data untuk Export

```typescript
const handleExportExcel = useCallback(async () => {
  // STEP 1: Get total count
  const countRes = await fetch(`/api/endpoint?limit=1&...filters`, { 
    credentials: 'include' 
  });
  const countResult = await countRes.json();
  const totalRecords = countResult.pagination?.total_records || 0;

  // STEP 2: Fetch all data dengan multiple requests
  const limit = Math.min(totalRecords, 1000);
  const totalPages = Math.ceil(totalRecords / limit);
  let allEntries = [];

  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(`/api/endpoint?page=${page}&limit=${limit}&...filters`, {
      credentials: 'include'
    });
    const result = await res.json();
    if (result.success && result.data) {
      allEntries = allEntries.concat(result.data);
    }
  }

  // STEP 3: Create Excel
  const rows = allEntries.map((e, i) => ({
    'No': i + 1,
    'Tanggal': e.posting_date,
    // ... kolom lainnya
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet Name');
  
  const filename = `Export_${company}_${from_date}_${to_date}.xlsx`;
  XLSX.writeFile(wb, filename);
}, [filters, selectedCompany]);
```

#### ❌ DON'T: Jangan export hanya data halaman saat ini

```typescript
// ❌ SALAH - Hanya export data di halaman saat ini
const handleExportExcel = () => {
  const rows = entries.map((e, i) => ({ ... }));  // ❌ entries hanya 20 records!
  // ...
};
```

---

### F. Print Preview - Full Period Data

#### ✅ DO: Fetch Data Terpisah untuk Print

```typescript
// State terpisah untuk print
const [printEntries, setPrintEntries] = useState<Entry[]>([]);
const [printLoading, setPrintLoading] = useState(false);

// Handler untuk print
const handlePrint = useCallback(async () => {
  setPrintLoading(true);
  
  try {
    // Fetch semua data (sama seperti export)
    // ... (lihat section Export Excel)
    
    setPrintEntries(allEntries);
    setShowPrint(true);
  } catch (err) {
    console.error('Error fetching print data:', err);
    alert('Gagal memuat data untuk cetak');
  } finally {
    setPrintLoading(false);
  }
}, [filters, selectedCompany]);
```

#### ✅ DO: Gunakan CSS Print untuk Multi-Page

```typescript
<PrintPreviewModal>
  <style>{`
    @media print {
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }  /* Header di setiap halaman */
      tfoot { display: table-footer-group; }  /* Footer di halaman terakhir */
      .print-header { page-break-after: avoid; }
    }
  `}</style>
  
  <div className="p-8 bg-white">
    <div className="print-header">
      {/* Header laporan */}
    </div>
    
    <table>
      <thead>
        {/* Header tabel - akan muncul di setiap halaman */}
      </thead>
      <tbody>
        {printEntries.map(entry => (
          <tr>{/* ... */}</tr>
        ))}
      </tbody>
      <tfoot>
        {/* Summary - akan muncul di halaman terakhir */}
      </tfoot>
    </table>
  </div>
</PrintPreviewModal>
```

---

### G. Perhitungan Opening & Closing Balance

#### ✅ DO: Opening Balance dari Transaksi Pertama dalam Periode

```typescript
// Untuk item spesifik
const openingFilters = [
  ['company', '=', company],
  ['item_code', '=', item_code],
  ['posting_date', '<', from_date]  // SEBELUM periode
];

const openingEntries = await client.getList('Stock Ledger Entry', {
  fields: ['qty_after_transaction'],
  filters: openingFilters,
  order_by: 'posting_date desc,posting_time desc',
  limit_page_length: 1
});

const opening_balance = openingEntries[0]?.qty_after_transaction || 0;
```

#### ✅ DO: Closing Balance dari Formula

```typescript
// Formula: Closing = Opening + Total In - Total Out
const closing_balance = opening_balance + total_in - total_out;
```

#### ⚠️ IMPORTANT: Untuk "All Items"

```typescript
// Opening balance untuk "All Items" = sum dari opening balance setiap item
const itemFirstBalances = new Map<string, number>();

for (const entry of entries) {
  if (!itemFirstBalances.has(entry.item_code)) {
    // Opening balance item ini = qty_after_transaction - actual_qty
    const itemOpeningBalance = entry.qty_after_transaction - entry.actual_qty;
    itemFirstBalances.set(entry.item_code, itemOpeningBalance);
  }
}

const opening_balance = Array.from(itemFirstBalances.values())
  .reduce((sum, qty) => sum + qty, 0);
```

---

## 📝 Checklist Implementasi

Gunakan checklist ini saat mengimplementasikan menu baru:

### Backend API
- [ ] Extract parameter `order_by` dari request
- [ ] Gunakan `client.getCount()` untuk total count
- [ ] Gunakan `order_by` parameter di `client.getList()`
- [ ] Validasi `limit` maksimal 1000
- [ ] Hitung `page_summary` dari paginated entries
- [ ] Hitung `summary` dari ALL entries dalam periode
- [ ] Return kedua summary dalam response

### Frontend
- [ ] State untuk `sortState` (field & direction)
- [ ] State untuk `pageSummary` (terpisah dari `summary`)
- [ ] State untuk `printEntries` dan `printLoading`
- [ ] Implementasi `handleSort()` dengan toggle direction
- [ ] useEffect untuk trigger fetch saat `sortState` berubah
- [ ] Komponen `SortableHeader` untuk header tabel
- [ ] Summary panel menampilkan dual totals (periode & halaman)
- [ ] Export Excel fetch semua data dengan multiple requests
- [ ] Print fetch semua data dengan multiple requests
- [ ] CSS print untuk multi-page support
- [ ] Default date filter (kemarin - hari ini)

### Testing
- [ ] Test sorting setiap kolom (asc & desc)
- [ ] Test pagination dengan berbagai limit
- [ ] Test export Excel dengan data > 1000 records
- [ ] Test print dengan data > 1000 records
- [ ] Test dual summary (periode vs halaman)
- [ ] Test opening & closing balance calculation
- [ ] Test dengan filter berbeda

---

## 🚫 Common Mistakes to Avoid

### 1. Hardcoded Order By
```typescript
// ❌ SALAH
order_by: 'posting_date asc,posting_time asc'

// ✅ BENAR
order_by: order_by  // dari parameter request
```

### 2. Export Hanya Data Halaman Saat Ini
```typescript
// ❌ SALAH
const rows = entries.map(...)  // entries hanya 20 records

// ✅ BENAR
const allEntries = await fetchAllData()
const rows = allEntries.map(...)
```

### 3. Tidak Reset Page saat Sort
```typescript
// ❌ SALAH
const handleSort = (field) => {
  setSortState({ field, direction: 'desc' });
  // Tidak reset page!
}

// ✅ BENAR
const handleSort = (field) => {
  setSortState({ field, direction: 'desc' });
  setCurrentPage(1);  // Reset ke page 1
}
```

### 4. Menggunakan limit_page_length: 0
```typescript
// ❌ SALAH - Return 0 records
limit_page_length: 0

// ✅ BENAR - Gunakan getCount()
const count = await client.getCount('DocType', { filters });
```

### 5. Tidak Menampilkan Page Summary
```typescript
// ❌ SALAH - Hanya tampilkan summary periode
<SummaryPanel summary={summary} />

// ✅ BENAR - Tampilkan keduanya
<SummaryPanel summary={summary} pageSummary={pageSummary} />
```

---

## 📚 File References

### Frontend
- `erp-next-system/app/reports/stock-card/page.tsx`

### Backend API
- `erp-next-system/app/api/inventory/reports/stock-card/route.ts`

### Types
```typescript
interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface SummaryData {
  opening_balance: number;
  closing_balance: number;
  total_in: number;
  total_out: number;
  transaction_count: number;
  item_name: string;
  uom: string;
}
```

---

## 🎓 Kesimpulan

Standar ini memastikan:
1. ✅ Pagination yang akurat dengan `client.getCount()`
2. ✅ Sorting yang berfungsi di semua kolom
3. ✅ Export & Print mengambil semua data (bukan hanya halaman saat ini)
4. ✅ Dual summary (periode penuh & halaman saat ini)
5. ✅ Multi-page print dengan header di setiap halaman
6. ✅ Performance optimal dengan limit 1000 per request
7. ✅ User experience yang konsisten

Gunakan dokumen ini sebagai referensi saat mengimplementasikan menu-menu lainnya dalam sistem ERP.

---

**Last Updated:** 2026-03-12  
**Version:** 1.0  
**Author:** Development Team
