'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { Edit, Package, ArrowUp, Loader2, Search } from 'lucide-react';
import ErrorDialog from '../../../components/ErrorDialog';

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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Item {
  name: string;
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  opening_stock: number;
  last_purchase_rate?: number;
  valuation_rate?: number;
  standard_rate?: number;
  harga_beli?: number;
  harga_jual?: number;
  description?: string;
  creation?: string;
  modified?: string;
}

// ─────────────────────────────────────────────────────────────
// Helper: Format currency
// ─────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function ItemList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);

  // ✅ OTOMATIS - tidak ada toggle button
  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemCodeFilter, setItemCodeFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // ─────────────────────────────────────────────────────────
  // Sync URL dengan page state (bookmark/share)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) {
        setCurrentPage(pageNum);
      }
    }
  }, [searchParams]);

  // Update URL with debounce to prevent throttling
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams.toString());
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

  // ─────────────────────────────────────────────────────────
  // Company Selection from localStorage/cookies
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(c => c.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Helper: Fetch prices for single item
  // ─────────────────────────────────────────────────────────
  const fetchItemPrices = useCallback(async (itemCode: string) => {
    try {
      // Get company from state or localStorage
      let companyToUse = selectedCompany;
      if (!companyToUse) {
        const stored = localStorage.getItem('selected_company');
        if (stored) companyToUse = stored;
        else {
          const cookies = document.cookie.split(';');
          const cookie = cookies.find(c => c.trim().startsWith('selected_company='));
          if (cookie) companyToUse = cookie.split('=')[1];
        }
      }

      // console.log(`🔍 Fetching prices for ${itemCode}, company: ${companyToUse || 'none'}`);

      const [purchaseRes, sellingRes, valuationRes] = await Promise.all([
        fetch(`/api/inventory/items/price?item_code=${itemCode}&selling=0${companyToUse ? `&company=${encodeURIComponent(companyToUse)}` : ''}`, { credentials: 'include' }),
        fetch(`/api/inventory/items/price?item_code=${itemCode}&selling=1${companyToUse ? `&company=${encodeURIComponent(companyToUse)}` : ''}`, { credentials: 'include' }),
        fetch(`/api/inventory/items/valuation-rate?item_codes=${itemCode}${companyToUse ? `&company=${encodeURIComponent(companyToUse)}` : ''}`, { credentials: 'include' }),
      ]);

      const [purchaseData, sellingData, valuationData] = await Promise.all([
        purchaseRes.json(),
        sellingRes.json(),
        valuationRes.json(),
      ]);

      // console.log(`💰 Prices for ${itemCode}:`, {
      //   purchase: purchaseData,
      //   selling: sellingData,
      //   valuation: valuationData
      // });

      return {
        harga_beli: purchaseData.success ? purchaseData.data?.price_list_rate || 0 : 0,
        harga_jual: sellingData.success ? sellingData.data?.price_list_rate || 0 : 0,
        valuation_rate: valuationData.success && valuationData.data?.[itemCode] ? valuationData.data[itemCode] : 0,
      };
    } catch (error) {
      console.error(`❌ Error fetching prices for ${itemCode}:`, error);
      return { harga_beli: 0, harga_jual: 0, valuation_rate: 0 };
    }
  }, [selectedCompany]);

  // ─────────────────────────────────────────────────────────
  // Fetch Data - PERSIS SEPERTI SO LIST
  // ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  // Fetch Data - FIXED VERSION
  // ─────────────────────────────────────────────────────────
  const fetchItems = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      // ✅ Build params satu per satu agar encoding benar
      const params = new URLSearchParams();
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      params.append('order_by', 'item_code asc'); // Changed from 'modified desc' for stable pagination

      // ✅ ERPNext Filters: JSON array - Items are global, no company filter needed
      // Use OR logic for search: match item_name OR item_code OR description
      const filters: any[] = [];
      
      if (itemCodeFilter?.trim()) {
        filters.push(['item_code', 'like', `%${itemCodeFilter.trim()}%`]);
      }
      
      if (searchTerm?.trim()) {
        filters.push(['item_name', 'like', `%${searchTerm.trim()}%`]);
      }
      
      // ✅ Encode filters sebagai JSON string yang valid (only if filters exist)
      if (filters.length > 0) {
        params.append('filters', JSON.stringify(filters));
      }

      // ✅ Request Fields Spesifik
      const fields = [
        'name', 'item_code', 'item_name', 'item_group', 'stock_uom',
        'opening_stock', 'last_purchase_rate', 'valuation_rate',
        'standard_rate', 'description', 'creation', 'modified'
      ].join(',');
      params.append('fields', fields);

      // ✅ Fetch dengan headers yang benar (hindari 417)
      const queryString = params.toString();
      // console.log('🔍 Fetch URL:', `/api/inventory/items?${queryString}`); // Debug log

      const response = await fetch(`/api/inventory/items?${queryString}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // ✅ Handle non-200 response
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      // console.log('✅ API Response:', result); // Debug log
      // console.log('📊 Pagination info:', { 
      //   totalRecords: result.total_records, 
      //   currentPage, 
      //   pageSize,
      //   calculatedTotalPages: Math.ceil((result.total_records || 0) / pageSize),
      //   useInfiniteScrollMode,
      //   isMobile,
      //   reset
      // });

      if (result.success) {
        let itemsData = result.data || [];

        // ✅ Fetch prices untuk setiap item (parallel)
        const itemsWithPrices = await Promise.all(
          itemsData.map(async (item: Item) => {
            const prices = await fetchItemPrices(item.item_code);
            return { ...item, ...prices };
          })
        );

        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(itemsWithPrices.length);
          setTotalPages(1);
          setHasMoreData(false);
        }

        if (reset) {
          // console.log('🔄 RESET: Setting items to:', itemsWithPrices.length, 'items');
          // console.log('First item:', itemsWithPrices[0]?.item_code);
          setItems(itemsWithPrices);
        } else {
          // ✅ Deduplication saat infinite scroll
          setItems(prev => {
            const existingCodes = new Set(prev.map(i => i.item_code));
            const newItems = itemsWithPrices.filter((i: Item) => !existingCodes.has(i.item_code));
            // console.log('➕ APPEND: Adding', newItems.length, 'new items to existing', prev.length);
            return [...prev, ...newItems];
          });
        }

        setError(itemsWithPrices.length === 0 && reset ? 'Tidak ada barang ditemukan' : '');
      } else {
        setError(result.message || 'Gagal memuat daftar barang');
      }
    } catch (err: any) {
      console.error('❌ Fetch Error:', err);
      setError(err.message || 'Gagal memuat daftar barang');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, pageSize, searchTerm, itemCodeFilter, fetchItemPrices]);
  
  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
  // Reset page when filters change
  useEffect(() => {
    // console.log('🔄 Filter changed, resetting to page 1');
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [searchTerm, itemCodeFilter]);
  
  // Fetch items when page changes (separated from filter logic)
  useEffect(() => {
    // console.log('📄 Page effect triggered:', { 
    //   currentPage, 
    //   source: pageChangeSourceRef.current,
    //   useInfiniteScrollMode 
    // });
    
    // Always reset for desktop pagination
    // Only append for mobile infinite scroll when page > 1
    const shouldReset = !useInfiniteScrollMode || currentPage === 1;
    // console.log('🎯 Calling fetchItems with reset:', shouldReset);
    
    fetchItems(shouldReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, useInfiniteScrollMode]);
  
  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      // console.log('🔍 Filter effect: Triggering fetch after filter change');
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchItems(shouldReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, itemCodeFilter]);

  // ─────────────────────────────────────────────────────────
  // Infinite Scroll Handler (Mobile Only) - IntersectionObserver
  // ─────────────────────────────────────────────────────────
  const loadMoreData = useCallback(() => {
    if (!loadingMore && hasMoreData && useInfiniteScrollMode) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        if (nextPage <= totalPages) {
          return nextPage;
        }
        return prev;
      });
    }
  }, [loadingMore, hasMoreData, useInfiniteScrollMode, totalPages]);

  useEffect(() => {
    if (!useInfiniteScrollMode || loading || loadingMore || !hasMoreData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreData();
        }
      },
      { rootMargin: '100px' } // Trigger 100px sebelum bottom
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [useInfiniteScrollMode, loading, loadingMore, hasMoreData, loadMoreData]);

  // ─────────────────────────────────────────────────────────
  // Back to Top Button
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────
  const handleCardClick = (itemName: string) => {
    if (itemName) {
      router.push(`/items/itemMain?name=${itemName}`);
    }
  };

  const handleEdit = (item: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const params = new URLSearchParams({
      name: item.name,
      item_code: item.item_code,
      item_name: item.item_name,
      item_group: item.item_group,
    });
    router.push(`/items/itemMain?${params}`);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setItemCodeFilter('');
    setCurrentPage(1);
  };

  const handleLoadMoreClick = () => {
    if (!loadingMore && hasMoreData) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
    }
  };

  // ─────────────────────────────────────────────────────────
  // Skeleton Loader Component
  // ─────────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <li className="px-4 py-4 border-b border-gray-100">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    </li>
  );

  // ─────────────────────────────────────────────────────────
  // Initial Loading
  // ─────────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return <LoadingSpinner message="Memuat Daftar Barang..." />;
  }

  // ─────────────────────────────────────────────────────────
  // Render - TANPA TOGGLE BUTTON (OTOMATIS)
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!error} title="Error" message={error} onClose={() => setError('')} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Barang</h1>
            <p className="text-sm text-gray-600 mt-1">Daftar barang persediaan</p>
          </div>
          <button
            onClick={() => router.push('/items/itemMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            + Tambah Barang
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cari Kode Barang</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cari kode barang..."
                value={itemCodeFilter}
                onChange={(e) => setItemCodeFilter(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cari Nama Barang</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cari nama barang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleResetFilters}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ⟲ Reset Filter
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Progress Indicator */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <span className="font-medium">{items.length}</span> dari <span className="font-medium">{totalRecords}</span> barang
            {useInfiniteScrollMode && hasMoreData && (
              <span className="ml-2 text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop Only */}
          {!isMobile && items.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-2">Kode / Nama</div>
                  <div className="col-span-1">Grup</div>
                  <div className="col-span-2 text-right">Harga Beli</div>
                  <div className="col-span-2 text-right">Last Beli</div>
                  <div className="col-span-2 text-right">Avg Beli</div>
                  <div className="col-span-2 text-right">Harga Jual</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* List Items */}
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li
                key={item.item_code}
                onClick={() => handleCardClick(item.name)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ─── Mobile Card View ───
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{item.item_code}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{item.item_name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                          {item.stock_uom}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>
                          <span className="block text-gray-400">Harga Beli:</span>
                          <span className="font-medium text-gray-900">{formatCurrency(item.harga_beli || 0)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">Last Beli:</span>
                          <span className="font-medium text-orange-600">{formatCurrency(item.last_purchase_rate || 0)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">Avg Beli:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(item.valuation_rate || 0)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">Harga Jual:</span>
                          <span className="font-medium text-green-600">{formatCurrency(item.harga_jual || item.standard_rate || 0)}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        Stok: <span className="font-medium text-gray-900">{item.opening_stock} {item.stock_uom}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => handleEdit(item, e)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ─── Desktop Table View ───
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{item.item_code}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{item.item_name}</p>
                        {item.description && <p className="text-xs text-gray-400 truncate mt-1">{item.description}</p>}
                      </div>
                      <div className="col-span-1">
                        <p className="text-xs text-gray-900">{item.item_group}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.opening_stock} {item.stock_uom}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm text-gray-900 font-medium">{formatCurrency(item.harga_beli || 0)}</p>
                        <p className="text-xs text-gray-500">Price List</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm text-orange-600 font-medium">{formatCurrency(item.last_purchase_rate || 0)}</p>
                        <p className="text-xs text-gray-500">Last Purchase</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm text-blue-600 font-medium">{formatCurrency(item.valuation_rate || 0)}</p>
                        <p className="text-xs text-gray-500">Avg/Valuation</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-medium text-green-600">{formatCurrency(item.harga_jual || item.standard_rate || 0)}</p>
                        <p className="text-xs text-gray-500">Selling Price</p>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={(e) => handleEdit(item, e)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}

            {/* Skeleton Loaders */}
            {loadingMore && useInfiniteScrollMode && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* Sentinel untuk infinite scroll */}
            {useInfiniteScrollMode && hasMoreData && (
              <div ref={sentinelRef} className="h-10"></div>
            )}
          </ul>

          {/* Empty State */}
          {items.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada barang yang ditemukan</p>
              <button onClick={() => router.push('/items/itemMain')} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                + Tambah Barang Baru
              </button>
            </div>
          )}

          {/* Load More Button (Mobile Fallback) */}
          {useInfiniteScrollMode && hasMoreData && !loadingMore && items.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMoreClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Loader2 className="h-4 w-4" />
                Load More ({totalRecords - items.length} remaining)
              </button>
            </div>
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data...
              </div>
            </div>
          )}

          {/* End of Data */}
          {!hasMoreData && items.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
              ✓ Semua data telah dimuat
            </div>
          )}

          {/* Pagination - Desktop Only */}
          {!useInfiniteScrollMode && totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={(page) => {
                  // console.log('🖱️ Pagination button clicked:', page);
                  pageChangeSourceRef.current = 'pagination';
                  setCurrentPage(page);
                }}
              />
            </div>
          )}
        </div>
        
        {/* Info Text */}
        <p className="mt-3 text-xs text-gray-500 text-center">
          {useInfiniteScrollMode ? (
            <>Halaman {currentPage} dari {totalPages} • Scroll untuk load lebih banyak</>
          ) : (
            <>Menampilkan {items.length} dari {totalRecords} barang • Halaman {currentPage} dari {totalPages}</>
          )}
        </p>
      </div>

      {/* Back to Top FAB Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105"
          title="Back to top"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}