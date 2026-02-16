'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Item {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  opening_stock: number;
  last_purchase_rate?: number;
  valuation_rate?: number;
  harga_beli?: number;
  harga_jual?: number;
}

export default function ItemList() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // Card view fixed
  const [tablePageSize] = useState(25); // Table view fixed

  const fetchItems = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && !hasMore) return;
    
    if (!isLoadMore) {
      setError('');
      setLoading(true);
      setItems([]);
      setCurrentPage(1);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // Gunakan page size yang berbeda untuk card vs table
      const currentPageSize = viewMode === 'table' ? tablePageSize : pageSize;
      const page = isLoadMore ? currentPage : 1;
      const start = (page - 1) * currentPageSize;
      const params = new URLSearchParams({
        limit_page_length: currentPageSize.toString(),
        start: start.toString()
      });
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }

      // Fetch items
      const response = await fetch(`/api/inventory/items/simple?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        const itemsData = data.data || [];
        console.log('Frontend - Raw total_records:', data.total_records);
        console.log('Frontend - Items data length:', itemsData.length);
        
        // Fetch prices for all items
        const itemsWithPrices = await Promise.all(
          itemsData.map(async (item: Item) => {
            try {
              // Fetch purchase price (selling=0)
              const purchaseResponse = await fetch(`/api/inventory/items/price?item_code=${item.item_code}&selling=0`, { credentials: 'include' });
              const purchaseData = await purchaseResponse.json();
              
              // Fetch selling price (selling=1)
              const sellingResponse = await fetch(`/api/inventory/items/price?item_code=${item.item_code}&selling=1`, { credentials: 'include' });
              const sellingData = await sellingResponse.json();

              // Fetch valuation rate from stock ledger
              const valuationResponse = await fetch(`/api/inventory/items/valuation-rate?item_codes=${item.item_code}`, { credentials: 'include' });
              const valuationData = await valuationResponse.json();

              return {
                ...item,
                harga_beli: purchaseData.success ? purchaseData.data.price_list_rate || 0 : 0,
                harga_jual: sellingData.success ? sellingData.data.price_list_rate || 0 : 0,
                valuation_rate: valuationData.success && valuationData.data[item.item_code] ? valuationData.data[item.item_code] : 0,
              };
            } catch (error) {
              console.error(`Error fetching prices for ${item.item_code}:`, error);
              return {
                ...item,
                harga_beli: 0,
                harga_jual: 0,
                valuation_rate: 0,
              };
            }
          })
        );
        
        // Update items state
        if (isLoadMore) {
          // Prevent duplicates by using Set to track existing item codes
          setItems(prev => {
            const existingCodes = new Set(prev.map(item => item.item_code));
            const newItems = itemsWithPrices.filter(item => !existingCodes.has(item.item_code));
            return [...prev, ...newItems];
          });
          setCurrentPage(prev => prev + 1);
        } else {
          setItems(itemsWithPrices);
          setCurrentPage(1);
        }
        
        // Check if there's more data
        const hasMoreData = itemsData.length === currentPageSize;
        setHasMore(hasMoreData);
        
        // Set total records for display
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / currentPageSize));
          console.log('Frontend - Set totalRecords:', data.total_records);
          console.log('Frontend - Set totalPages:', Math.ceil(data.total_records / currentPageSize));
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
          console.log('Frontend - Using data.length fallback:', data.data?.length || 0);
        }
        setError('');
      } else {
        setError('Gagal memuat daftar barang: ' + data.message);
      }
    } catch {
      setError('Gagal memuat daftar barang');
    } finally {
      if (!isLoadMore) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [currentPage, pageSize, tablePageSize, debouncedSearchTerm, viewMode]);

  // Initial fetch
  useEffect(() => { fetchItems(); }, []);
  
  useEffect(() => { 
    // Reset dan fetch ulang saat search atau view berubah
    setItems([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchItems(); 
  }, [debouncedSearchTerm, viewMode]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Infinite scroll handler with debounce
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        if (hasMore && !isLoadingMore && !loading) {
          console.log('Triggering load more...');
          fetchItems(true);
        }
      }
    }, 200); // 200ms debounce
  }, [hasMore, isLoadingMore, loading, fetchItems]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (loading) {
    return <LoadingSpinner message="Memuat Daftar Barang..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Barang</h1>
          <p className="text-sm text-gray-500 mt-1">Daftar barang persediaan</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'card' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Card
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => router.push('/items/itemMain')}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]"
          >
            Tambah Barang
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cari Barang {debouncedSearchTerm && `(mencari: "${debouncedSearchTerm}")`}
          </label>
          <input
            type="text"
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Cari nama barang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {debouncedSearchTerm && (
            <div className="mt-2 text-xs text-gray-500">
              {loading ? 'Mencari...' : `Ditemukan ${items.length} barang${totalRecords > 0 ? ` dari ${totalRecords}` : ''}`}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {viewMode === 'card' ? (
          // Card View
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {items.map((item) => (
              <div
                key={item.item_code}
                onClick={() => router.push(`/items/itemMain?code=${encodeURIComponent(item.item_code)}`)}
                className="cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200 rounded-lg p-4 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-600 truncate">{item.item_code}</p>
                    <p className="mt-1 text-sm text-gray-900 font-medium">{item.item_name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Harga Beli:</span>
                        <span className="text-gray-900 font-medium">Rp {(item.harga_beli || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Last Beli:</span>
                        <span className="text-blue-600 font-medium">Rp {(item.last_purchase_rate || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Avg. Beli:</span>
                        <span className="text-purple-600 font-medium">Rp {(item.valuation_rate || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Harga Jual:</span>
                        <span className="text-green-600 font-medium">Rp {(item.harga_jual || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {item.stock_uom}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Grup: {item.item_group}</span>
                  <span className="text-gray-500">Stok: {item.opening_stock}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Table View
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barang</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grup</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satuan</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Beli</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Beli</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Beli</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr 
                    key={item.item_code}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/items/itemMain?code=${encodeURIComponent(item.item_code)}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">{item.item_code}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.item_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.item_group}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.stock_uom}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{item.opening_stock}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">Rp {(item.harga_beli || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 text-right">Rp {(item.last_purchase_rate || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 text-right">Rp {(item.valuation_rate || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-right">Rp {(item.harga_jual || 0).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {items.length === 0 && !loading && (
          <div className="text-center py-12"><p className="text-gray-500">Tidak ada barang ditemukan</p></div>
        )}
        
        {/* Infinite Scroll Loading Indicator */}
        {isLoadingMore && (
          <div className="text-center py-4">
            <LoadingSpinner message="Memuat lebih banyak barang..." />
          </div>
        )}
        
        {/* No More Data Indicator */}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-4 text-sm text-gray-500 border-t">
            {totalRecords > 0 ? (
              <>
                Menampilkan {items.length} dari {totalRecords} barang
                {totalRecords > items.length && (
                  <span className="block text-xs text-gray-400 mt-1">
                    Gulir ke bawah untuk memuat lebih banyak
                  </span>
                )}
              </>
            ) : (
              <>Menampilkan {items.length} barang</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
