import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';
import Pagination from '../../components/Pagination';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─────────────────────────────────────────────────────────────
// Hook: Deteksi mobile (breakpoint 768px)
// ─────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface StockEntry {
  name: string;
  posting_date: string;
  posting_time: string;
  purpose: string;
  company: string;
  from_warehouse: string;
  to_warehouse: string;
  total_amount: number;
  total_qty: number;
  status: string;
  docstatus: number; // ERPNext document status: 0=Draft, 1=Submitted
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

export default function StockEntryList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingEntry, setSubmittingEntry] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');
  
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Convert YYYY-MM-DD to DD/MM/YYYY for BrowserStyleDatePicker
    const formatDateToDDMMYYYY = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return {
      from_date: formatDateToDDMMYYYY(yesterday), // DD/MM/YYYY format
      to_date: formatDateToDDMMYYYY(today)        // DD/MM/YYYY format
    };
  });
  const [selectedCompany, setSelectedCompany] = useState('');

  // Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  // Update URL with debounce to prevent throttling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams?.toString() || '');
      if (currentPage > 1) {
        newParams.set('page', currentPage.toString());
      } else {
        newParams.delete('page');
      }
      const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }, 100); // Debounce 100ms

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchParams]);

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  const fetchEntries = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      
      // Import parseDate function (similar to paymentList)
      const parseDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Check if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Convert DD/MM/YYYY to YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };
      
      const params = new URLSearchParams();
      
      // Pagination
      params.set('limit_page_length', pageSize.toString());
      params.set('limit_start', ((currentPage - 1) * pageSize).toString());
      
      // Add base filters
      const filtersArray: any[] = [["company", "=", selectedCompany]];
      
      // Add purpose filter
      if (purposeFilter) {
        filtersArray.push(["purpose", "=", purposeFilter]);
      }
      
      // Add search filter
      if (searchTerm.trim()) {
        filtersArray.push(["name", "like", `%${searchTerm.trim()}%`]);
      }
      
      // Add warehouse filter - will be applied in frontend with OR logic
      // (ERPNext API doesn't support OR syntax in filters)
      
      // Add date filters
      if (dateFilter.from_date) {
        const parsedDate = parseDate(dateFilter.from_date);
        if (parsedDate) filtersArray.push(["posting_date", ">=", parsedDate]);
      }
      
      if (dateFilter.to_date) {
        const parsedDate = parseDate(dateFilter.to_date);
        if (parsedDate) filtersArray.push(["posting_date", "<=", parsedDate]);
      }
      
      params.append('filters', JSON.stringify(filtersArray));
      
      console.log('Fetch entries params:', params.toString());
      console.log('Filters array:', filtersArray);

      const response = await fetch(`/api/inventory/stock-entry?${params}`);
      const data = await response.json();

      if (data.success) {
        // Apply warehouse filter in frontend (OR logic)
        let filteredData = data.data || [];
        if (warehouseFilter.trim()) {
          filteredData = filteredData.filter((entry: StockEntry) => 
            entry.from_warehouse === warehouseFilter.trim() || 
            entry.to_warehouse === warehouseFilter.trim()
          );
        }
        
        setEntries(filteredData);
        setTotalRecords(data.total || filteredData.length);
        setTotalPages(Math.ceil((data.total || filteredData.length) / pageSize));
      } else {
        setError(data.message || 'Gagal memuat entri stok');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat entri stok');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, purposeFilter, warehouseFilter, dateFilter, searchTerm, currentPage, pageSize]);

  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/inventory/warehouses?company=${selectedCompany}`);
      const data = await response.json();
      console.log('Warehouses data:', data); // Debug log
      if (data.success) setWarehouses(data.data || []);
    } catch (err) {
      console.error('Gagal memuat gudang:', err);
    }
  }, [selectedCompany]);

  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, purposeFilter, warehouseFilter, searchTerm]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (selectedCompany) {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCompany]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, purposeFilter, warehouseFilter, searchTerm]);

  useEffect(() => {
    if (selectedCompany) {
      fetchWarehouses();
    }
  }, [selectedCompany, fetchWarehouses]);

  // Apply warehouse and search filters in frontend with OR logic
  // NOTE: This is now handled in fetchEntries, so we can remove this useMemo
  // const filteredEntries = useMemo(() => {
  //   let filtered = entries;
  //   
  //   // Apply warehouse filter
  //   if (warehouseFilter.trim()) {
  //     filtered = filtered.filter(entry => 
  //       entry.from_warehouse === warehouseFilter.trim() || 
  //       entry.to_warehouse === warehouseFilter.trim()
  //     );
  //   }
  //   
  //   // Apply search filter
  //   if (searchTerm.trim()) {
  //     const search = searchTerm.trim().toLowerCase();
  //     filtered = filtered.filter(entry => 
  //       entry.name?.toLowerCase().includes(search)
  //     );
  //   }
  //   
  //   return filtered;
  // }, [entries, warehouseFilter, searchTerm]);

  // const paginatedEntries = useMemo(() => {
  //   const start = (currentPage - 1) * PAGE_SIZE;
  //   return filteredEntries.slice(start, start + PAGE_SIZE);
  // }, [filteredEntries, currentPage]);

  const getPurposeColor = (purpose: string) => {
    switch (purpose?.toLowerCase()) {
      case 'material receipt': return 'bg-green-100 text-green-800';
      case 'material issue': return 'bg-red-100 text-red-800';
      case 'material transfer': return 'bg-blue-100 text-blue-800';
      case 'manufacture': return 'bg-purple-100 text-purple-800';
      case 'repack': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitEntry = async (entryName: string) => {
    setSubmittingEntry(entryName);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/inventory/stock-entry/${encodeURIComponent(entryName)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Entri Stok ${entryName} berhasil disubmit!`);
        // Refresh entries list
        fetchEntries();
      } else {
        setError(data.message || 'Gagal submit entri stok');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat submit entri stok');
    } finally {
      setSubmittingEntry(null);
    }
  };

  // Memoized handlers to prevent input losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleWarehouseChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setWarehouseFilter(e.target.value);
  }, []);

  const handlePurposeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPurposeFilter(e.target.value);
  }, []);

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat Entri Stok...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Entri Stok</h1>
              <p className="mt-1 text-sm text-gray-600">Kelola pergerakan stok dan transfer inventaris</p>
            </div>
            <button
              onClick={() => router.push('/stock-entry/seMain')}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center min-h-[44px] shadow-sm transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Entri Stok Baru
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
              <input type="text" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cari entri..." value={searchTerm} onChange={handleSearchChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan</label>
              <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={purposeFilter} onChange={handlePurposeChange}>
                <option value="">Semua Tujuan</option>
                <option value="Material Receipt">Penerimaan Material</option>
                <option value="Material Issue">Pengeluaran Material</option>
                <option value="Material Transfer">Transfer Material</option>
                <option value="Manufacture">Manufaktur</option>
                <option value="Repack">Repack</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
              <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={warehouseFilter} onChange={handleWarehouseChange}>
                <option value="">Semua Gudang</option>
                {warehouses.map((wh) => (
                  <option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <BrowserStyleDatePicker
                value={dateFilter.from_date}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <BrowserStyleDatePicker
                value={dateFilter.to_date}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button onClick={() => { 
              setSearchTerm(''); 
              setPurposeFilter(''); 
              setWarehouseFilter(''); 
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              const formatDateToDDMMYYYY = (date: Date) => {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              };
              
              setDateFilter({ 
                from_date: formatDateToDDMMYYYY(yesterday), 
                to_date: formatDateToDDMMYYYY(today) 
              }); 
            }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">Hapus Filter</button>
            <button onClick={fetchEntries} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">Terapkan Filter</button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">
              Entri Stok 
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{totalRecords} entri</span>
              {totalPages > 1 && <span className="ml-2 text-gray-500">— Hal. {currentPage}</span>}
            </h3>
          </div>
          
          {/* Desktop Table */}
          {!isMobile ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Entri</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tujuan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dari Gudang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ke Gudang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Jumlah</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada entri stok ditemukan
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => {
                  // FIX: Normalisasi tipe data ke number untuk menghindari error TypeScript
                  const docStatusNum = Number(entry.docstatus);
                  const isDraft = docStatusNum === 0;
                  const isSubmitted = docStatusNum === 1;
                  const isSubmitting = submittingEntry === entry.name;

                  return (
                    <tr key={entry.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 cursor-pointer hover:text-indigo-800" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>{entry.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>
                        <div className="flex flex-col">
                          <span>{entry.posting_date}</span>
                          <span className="text-xs text-gray-500">{entry.posting_time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getPurposeColor(entry.purpose)}`}>
                          {entry.purpose}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>{entry.from_warehouse || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>{entry.to_warehouse || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer font-medium" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>{entry.total_amount?.toLocaleString('id-ID') || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}>
                        {isSubmitted ? (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isDraft && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitEntry(entry.name);
                            }}
                            disabled={isSubmitting}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all shadow-sm
                              ${isSubmitting 
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 hover:shadow-md active:scale-95'
                              }`}
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Submit
                              </>
                            )}
                          </button>
                        )}
                        {isSubmitted && (
                          <span className="inline-flex items-center text-xs text-green-600 font-medium">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mobile Cards */
          <div className="divide-y divide-gray-200">
            {entries.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Tidak ada entri stok ditemukan
              </div>
            ) : (
              entries.map((entry) => {
                const docStatusNum = Number(entry.docstatus);
                const isDraft = docStatusNum === 0;
                const isSubmitted = docStatusNum === 1;
                const isSubmitting = submittingEntry === entry.name;

                return (
                  <div
                    key={entry.name}
                    onClick={() => router.push(`/stock-entry/seMain?name=${entry.name}`)}
                    className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="space-y-3">
                      {/* Row 1: Entry Name + Status Badge */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{entry.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">📅 {entry.posting_date} • 🕐 {entry.posting_time}</p>
                        </div>
                        {isSubmitted ? (
                          <span className="ml-2 inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ✓ Submitted
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            📝 Draft
                          </span>
                        )}
                      </div>
                      
                      {/* Row 2: Purpose Badge */}
                      <div>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getPurposeColor(entry.purpose)}`}>
                          {entry.purpose}
                        </span>
                      </div>
                      
                      {/* Row 3: Warehouses */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Dari Gudang</p>
                          <p className="text-sm font-semibold text-gray-900 truncate" title={entry.from_warehouse}>
                            📦 {entry.from_warehouse || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Ke Gudang</p>
                          <p className="text-sm font-semibold text-gray-900 truncate" title={entry.to_warehouse}>
                            📦 {entry.to_warehouse || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Row 4: Total Amount */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Total Jumlah</p>
                        <p className="text-base font-bold text-indigo-600">
                          {entry.total_amount?.toLocaleString('id-ID') || 0}
                        </p>
                      </div>
                      
                      {/* Row 5: Submit Button (only for draft) */}
                      {isDraft && (
                        <div className="pt-3 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitEntry(entry.name);
                            }}
                            disabled={isSubmitting}
                            className={`w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-all shadow-sm
                              ${isSubmitting 
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700'
                              }`}
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Submit
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={(page) => {
              pageChangeSourceRef.current = 'pagination';
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </div>
  );
}
