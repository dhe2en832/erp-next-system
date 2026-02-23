'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StockCardFilters from '@/components/stock-card/StockCardFilters';
import StockCardTable from '@/components/stock-card/StockCardTable';
import StockCardSummary from '@/components/stock-card/StockCardSummary';
import {
  StockCardFilters as StockCardFiltersType,
  StockLedgerEntry,
  SummaryData,
  PaginationState,
  DropdownOption,
  StockCardAPIResponse
} from '@/types/stock-card';
import { FileDown, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * Stock Card Report Page
 * 
 * Main page component for Stock Card Report (Laporan Kartu Stok)
 * Integrates StockCardFilters, StockCardTable, and StockCardSummary components
 * 
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4
 */
export default function StockCardReportPage() {
  // State management
  const [selectedCompany, setSelectedCompany] = useState('');
  const [data, setData] = useState<StockLedgerEntry[]>([]);
  const [summary, setSummary] = useState<SummaryData | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dropdown options state
  const [items, setItems] = useState<DropdownOption[]>([]);
  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [customers, setCustomers] = useState<DropdownOption[]>([]);
  const [suppliers, setSuppliers] = useState<DropdownOption[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<StockCardFiltersType>({
    dateRange: {
      from_date: '',
      to_date: ''
    },
    item_code: '',
    warehouse: '',
    customer: '',
    supplier: '',
    transaction_type: ''
  });
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    page_size: 20,
    total_records: 0,
    total_pages: 0
  });

  /**
   * Helper to convert DD/MM/YYYY to YYYY-MM-DD
   */
  const formatToYYYYMMDD = (dateStr: string): string => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  /**
   * Load selected company from localStorage on mount
   * Set default date range: yesterday to today
   */
  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) {
      setSelectedCompany(saved);
    }
    
    // Set default date range: yesterday to today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        from_date: formatDate(yesterday),
        to_date: formatDate(today)
      }
    }));
  }, []);

  /**
   * Fetch dropdown options (items, warehouses, customers, suppliers)
   * All APIs use company parameter for multi-entity support
   */
  const fetchDropdownOptions = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      // Fetch items with company filter
      const itemsResponse = await fetch(
        `/api/inventory/items?company=${encodeURIComponent(selectedCompany)}&limit=1000`,
        { credentials: 'include' }
      );
      const itemsResult = await itemsResponse.json();
      if (itemsResult.success && itemsResult.data) {
        setItems(
          itemsResult.data.map((item: any) => ({
            value: item.item_code || item.name,
            label: `${item.item_name || item.name} (${item.item_code || item.name})`
          }))
        );
      }

      // Fetch warehouses with company filter
      const warehousesResponse = await fetch(
        `/api/inventory/warehouses?company=${encodeURIComponent(selectedCompany)}`,
        { credentials: 'include' }
      );
      const warehousesResult = await warehousesResponse.json();
      if (warehousesResult.success && warehousesResult.data) {
        setWarehouses(
          warehousesResult.data.map((wh: any) => ({
            value: wh.name,
            label: wh.warehouse_name || wh.name
          }))
        );
      }

      // Fetch customers with company filter
      const customersResponse = await fetch(
        `/api/sales/customers?company=${encodeURIComponent(selectedCompany)}&limit=1000`,
        { credentials: 'include' }
      );
      const customersResult = await customersResponse.json();
      if (customersResult.success && customersResult.data) {
        setCustomers(
          customersResult.data.map((cust: any) => ({
            value: cust.name,
            label: cust.customer_name || cust.name
          }))
        );
      }

      // Fetch suppliers with company filter
      const suppliersResponse = await fetch(
        `/api/purchase/suppliers?company=${encodeURIComponent(selectedCompany)}&limit=1000`,
        { credentials: 'include' }
      );
      const suppliersResult = await suppliersResponse.json();
      if (suppliersResult.success && suppliersResult.data) {
        setSuppliers(
          suppliersResult.data.map((supp: any) => ({
            value: supp.name,
            label: supp.supplier_name || supp.name
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch dropdown options:', err);
    }
  }, [selectedCompany]);

  /**
   * Fetch dropdown options when company is selected
   */
  useEffect(() => {
    if (selectedCompany) {
      fetchDropdownOptions();
    }
  }, [selectedCompany, fetchDropdownOptions]);

  /**
   * Fetch stock card data from API
   * Now supports fetching all items when item_code is empty (All)
   */
  const fetchData = useCallback(async () => {
    // Allow fetching without item_code (All items)
    if (!selectedCompany) {
      setData([]);
      setSummary(undefined);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build query parameters
      const params = new URLSearchParams({
        company: selectedCompany,
        page: pagination.current_page.toString(),
        limit: pagination.page_size.toString()
      });

      // Add item_code if specified (not "All")
      if (filters.item_code) {
        params.set('item_code', filters.item_code);
      }

      // Add optional filters
      if (filters.dateRange.from_date) {
        params.set('from_date', formatToYYYYMMDD(filters.dateRange.from_date));
      }
      if (filters.dateRange.to_date) {
        params.set('to_date', formatToYYYYMMDD(filters.dateRange.to_date));
      }
      if (filters.warehouse) {
        params.set('warehouse', filters.warehouse);
      }
      if (filters.customer) {
        params.set('customer', filters.customer);
      }
      if (filters.supplier) {
        params.set('supplier', filters.supplier);
      }
      if (filters.transaction_type) {
        params.set('transaction_type', filters.transaction_type);
      }

      // Make API request
      const response = await fetch(
        `/api/inventory/reports/stock-card?${params}`,
        { credentials: 'include' }
      );

      const result: StockCardAPIResponse = await response.json();

      if (result.success) {
        setData(result.data || []);
        setSummary(result.summary);
        setPagination(result.pagination);
      } else {
        setError(result.message || 'Gagal memuat laporan kartu stok');
        setData([]);
        setSummary(undefined);
      }
    } catch (err) {
      console.error('Failed to fetch stock card data:', err);
      setError('Gagal memuat laporan kartu stok');
      setData([]);
      setSummary(undefined);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, filters, pagination.current_page, pagination.page_size]);

  /**
   * Fetch data when filters or pagination changes
   * Now fetches immediately on load with default date range
   */
  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany, filters, pagination.current_page, pagination.page_size, fetchData]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilters: StockCardFiltersType) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setPagination(prev => ({ ...prev, current_page: 1 }));
  }, []);

  /**
   * Handle clear filters
   */
  const handleClearFilters = useCallback(() => {
    setFilters({
      dateRange: {
        from_date: '',
        to_date: ''
      },
      item_code: '',
      warehouse: '',
      customer: '',
      supplier: '',
      transaction_type: ''
    });
    setData([]);
    setSummary(undefined);
    setPagination({
      current_page: 1,
      page_size: 20,
      total_records: 0,
      total_pages: 0
    });
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  }, []);

  /**
   * Handle page size change
   */
  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      page_size: pageSize,
      current_page: 1 // Reset to page 1 when page size changes
    }));
  }, []);

  /**
   * Export data to Excel
   */
  const handleExportExcel = useCallback(() => {
    if (data.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    // Prepare data for Excel
    const excelData: any[] = data.map((entry, index) => ({
      'No': index + 1,
      'Tanggal': entry.posting_date,
      'Waktu': entry.posting_time,
      'Kode Item': entry.item_code,
      'Nama Item': entry.item_name,
      'Gudang': entry.warehouse,
      'Jenis Transaksi': entry.voucher_type,
      'No. Voucher': entry.voucher_no,
      'Pelanggan/Pemasok': entry.party_name || '-',
      'Qty Masuk': entry.actual_qty > 0 ? entry.actual_qty : 0,
      'Qty Keluar': entry.actual_qty < 0 ? Math.abs(entry.actual_qty) : 0,
      'Saldo': entry.qty_after_transaction,
      'UOM': entry.stock_uom,
      'Nilai': entry.stock_value_difference || 0
    }));

    // Add summary row
    if (summary) {
      excelData.push({
        'No': '',
        'Tanggal': '',
        'Waktu': '',
        'Kode Item': '',
        'Nama Item': 'RINGKASAN',
        'Gudang': '',
        'Jenis Transaksi': '',
        'No. Voucher': '',
        'Pelanggan/Pemasok': '',
        'Qty Masuk': summary.total_in,
        'Qty Keluar': summary.total_out,
        'Saldo': summary.closing_balance,
        'UOM': summary.uom,
        'Nilai': ''
      });
    }

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kartu Stok');

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const filename = `Laporan_Kartu_Stok_${selectedCompany}_${today}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  }, [data, summary, selectedCompany]);

  /**
   * Handle print
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Show loading spinner on initial load
  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Memuat perusahaan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Kartu Stok</h1>
          <p className="text-sm text-gray-500">
            Laporan pergerakan stok per item dengan detail transaksi masuk dan keluar
          </p>
        </div>
        
        {/* Export and Print Buttons */}
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleExportExcel}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <FileDown className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filters Component */}
      <StockCardFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onRefresh={handleRefresh}
        items={items}
        warehouses={warehouses}
        customers={customers}
        suppliers={suppliers}
        loading={loading}
      />

      {/* Summary Component - Only show when data exists */}
      {summary && (
        <StockCardSummary
          openingBalance={summary.opening_balance}
          closingBalance={summary.closing_balance}
          totalIn={summary.total_in}
          totalOut={summary.total_out}
          transactionCount={summary.transaction_count}
          itemName={summary.item_name}
          uom={summary.uom}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Memuat data kartu stok...</p>
        </div>
      )}

      {/* Empty State - No data found */}
      {!loading && data.length === 0 && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Tidak ada transaksi stok ditemukan untuk filter yang dipilih.
          </p>
        </div>
      )}

      {/* Table Component - Show when not loading and has data */}
      {!loading && data.length > 0 && (
        <StockCardTable
          data={data}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
