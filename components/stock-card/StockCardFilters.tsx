'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StockCardFiltersProps, TransactionType } from '@/types/stock-card';
import HybridDatePicker from '@/components/HybridDatePicker';
import { Search, X, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'stock-card-filters';
const DEBOUNCE_DELAY = 300;

/**
 * StockCardFilters Component
 * 
 * Comprehensive filter component for Stock Card Report
 * Requirements: 3.1-3.6
 * 
 * Features:
 * - Date range inputs (DD/MM/YYYY format)
 * - Item dropdown with search (required)
 * - Warehouse dropdown (optional)
 * - Customer dropdown (optional)
 * - Supplier dropdown (optional)
 * - Transaction type dropdown (optional)
 * - Clear Filters and Refresh buttons
 */
export default function StockCardFilters({
  filters,
  onFilterChange,
  onClear,
  onRefresh,
  items,
  warehouses,
  customers,
  suppliers,
  loading
}: StockCardFiltersProps) {
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  
  const [itemSearch, setItemSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Local state for controlled inputs
  const [localFilters, setLocalFilters] = useState(() => {
    // Initial state from props
    let initialFilters = filters;
    
    // Try to load from sessionStorage if available
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          initialFilters = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved filters:', e);
        }
      }
    }
    return initialFilters;
  });
  
  // Update parent on mount if we loaded from storage
  useEffect(() => {
    if (JSON.stringify(localFilters) !== JSON.stringify(filters)) {
      onFilterChange(localFilters);
    }
     
  }, []); // Run once on mount

  // Validation error state
  // const [dateRangeError, setDateRangeError] = useState('');
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Validate date range
  const validateDateRange = useCallback((fromDate: string, toDate: string): string => {
    // If either date is empty, no validation error
    if (!fromDate || !toDate) {
      return '';
    }

    // Parse dates in DD/MM/YYYY format
    const parseDate = (dateStr: string): Date | null => {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      
      return new Date(year, month, day);
    };

    const from = parseDate(fromDate);
    const to = parseDate(toDate);

    // If dates are invalid format, no validation error (let format validation handle it)
    if (!from || !to) {
      return '';
    }

    // Check if to_date is after from_date
    if (to < from) {
      return 'Tanggal akhir harus setelah tanggal mulai';
    }

    return '';
  }, []);

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(localFilters));
  }, [localFilters]);

  // Debounced filter change handler
  const debouncedFilterChange = useCallback((newFilters: typeof filters) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      // Only trigger API call if validation passes
      const error = validateDateRange(
        newFilters.dateRange.from_date,
        newFilters.dateRange.to_date
      );
      
      if (!error) {
        onFilterChange(newFilters);
      }
    }, DEBOUNCE_DELAY);
  }, [onFilterChange, validateDateRange]);

  // Update local state and trigger debounced API call
  const handleFilterUpdate = useCallback((newFilters: typeof filters) => {
    setLocalFilters(newFilters);
    debouncedFilterChange(newFilters);
  }, [debouncedFilterChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Validate filters whenever they change
  const dateRangeError = useMemo(() => {
    return validateDateRange(
      localFilters.dateRange.from_date,
      localFilters.dateRange.to_date
    );
  }, [localFilters.dateRange.from_date, localFilters.dateRange.to_date, validateDateRange]);

  // Transaction type options (Indonesian labels)
  const transactionTypes: { value: TransactionType | ''; label: string }[] = [
    { value: '', label: 'Semua Jenis Transaksi' },
    { value: 'Sales Invoice', label: 'Faktur Penjualan' },
    { value: 'Purchase Receipt', label: 'Penerimaan Pembelian' },
    { value: 'Delivery Note', label: 'Surat Jalan' },
    { value: 'Stock Entry', label: 'Entri Stok' },
    { value: 'Stock Reconciliation', label: 'Rekonsiliasi Stok' }
  ];

  // Filter dropdown options based on search
  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.value.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredWarehouses = warehouses.filter(wh =>
    wh.label.toLowerCase().includes(warehouseSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(cust =>
    cust.label.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(supp =>
    supp.label.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Get selected item label
  const getSelectedItemLabel = () => {
    const selected = items.find(item => item.value === localFilters.item_code);
    return selected ? selected.label : '';
  };

  // Get selected warehouse label
  const getSelectedWarehouseLabel = () => {
    const selected = warehouses.find(wh => wh.value === localFilters.warehouse);
    return selected ? selected.label : '';
  };

  // Get selected customer label
  const getSelectedCustomerLabel = () => {
    const selected = customers.find(cust => cust.value === localFilters.customer);
    return selected ? selected.label : '';
  };

  // Get selected supplier label
  const getSelectedSupplierLabel = () => {
    const selected = suppliers.find(supp => supp.value === localFilters.supplier);
    return selected ? selected.label : '';
  };

  // Handle date range change
  const handleDateChange = (field: 'from_date' | 'to_date', value: string) => {
    handleFilterUpdate({
      ...localFilters,
      dateRange: {
        ...localFilters.dateRange,
        [field]: value
      }
    });
  };

  // Handle item selection
  const handleItemSelect = (value: string) => {
    handleFilterUpdate({
      ...localFilters,
      item_code: value
    });
    setShowItemDropdown(false);
    setItemSearch('');
  };

  // Handle warehouse selection
  const handleWarehouseSelect = (value: string) => {
    handleFilterUpdate({
      ...localFilters,
      warehouse: value
    });
    setShowWarehouseDropdown(false);
    setWarehouseSearch('');
  };

  // Handle customer selection
  const handleCustomerSelect = (value: string) => {
    handleFilterUpdate({
      ...localFilters,
      customer: value
    });
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  };

  // Handle supplier selection
  const handleSupplierSelect = (value: string) => {
    handleFilterUpdate({
      ...localFilters,
      supplier: value
    });
    setShowSupplierDropdown(false);
    setSupplierSearch('');
  };

  // Handle transaction type change
  const handleTransactionTypeChange = (value: TransactionType | '') => {
    handleFilterUpdate({
      ...localFilters,
      transaction_type: value
    });
  };

  // Handle clear filters
  const handleClear = () => {
    const emptyFilters = {
      dateRange: { from_date: '', to_date: '' },
      item_code: '',
      warehouse: '',
      customer: '',
      supplier: '',
      transaction_type: '' as const
    };
    setLocalFilters(emptyFilters);
    sessionStorage.removeItem(STORAGE_KEY);
    onClear();
  };

  return (
    <div className="bg-white shadow rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Date Range - From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Tanggal Mulai
          </label>
          <HybridDatePicker
            value={localFilters.dateRange.from_date}
            onChange={(value) => handleDateChange('from_date', value)}
            placeholder="DD/MM/YYYY"
            className={`block w-full border rounded-md shadow-sm py-2.5 sm:py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px] ${
              dateRangeError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {/* Date Range - To Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Tanggal Akhir
          </label>
          <HybridDatePicker
            value={localFilters.dateRange.to_date}
            onChange={(value) => handleDateChange('to_date', value)}
            placeholder="DD/MM/YYYY"
            className={`block w-full border rounded-md shadow-sm py-2.5 sm:py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px] ${
              dateRangeError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {/* Item Dropdown (Required) */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Item <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowItemDropdown(!showItemDropdown)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 sm:py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm bg-white min-h-[44px]"
              disabled={loading}
            >
              <span className={localFilters.item_code ? 'text-gray-900' : 'text-gray-400'}>
                {localFilters.item_code ? getSelectedItemLabel() : 'Pilih Item'}
              </span>
            </button>
            {localFilters.item_code && (
              <button
                type="button"
                onClick={() => handleItemSelect('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          
          {/* Item Dropdown Menu */}
          {showItemDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-4 sm:h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 sm:pl-9 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px]"
                    placeholder="Cari item..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm sm:text-sm">
                    Tidak ada item ditemukan
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleItemSelect(item.value)}
                      className={`w-full text-left px-4 py-3 sm:py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 min-h-[44px] ${
                        localFilters.item_code === item.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium text-base sm:text-sm">{item.label}</div>
                      <div className="text-sm sm:text-xs text-gray-500">{item.value}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Warehouse Dropdown (Optional) */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Gudang
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 sm:py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm bg-white min-h-[44px]"
              disabled={loading}
            >
              <span className={localFilters.warehouse ? 'text-gray-900' : 'text-gray-400'}>
                {localFilters.warehouse ? getSelectedWarehouseLabel() : 'Semua Gudang'}
              </span>
            </button>
            {localFilters.warehouse && (
              <button
                type="button"
                onClick={() => handleWarehouseSelect('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          
          {/* Warehouse Dropdown Menu */}
          {showWarehouseDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-4 sm:h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 sm:pl-9 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px]"
                    placeholder="Cari gudang..."
                    value={warehouseSearch}
                    onChange={(e) => setWarehouseSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredWarehouses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Tidak ada gudang ditemukan
                  </div>
                ) : (
                  filteredWarehouses.map((warehouse) => (
                    <button
                      key={warehouse.value}
                      type="button"
                      onClick={() => handleWarehouseSelect(warehouse.value)}
                      className={`w-full text-left px-4 py-3 sm:py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 min-h-[44px] ${
                        localFilters.warehouse === warehouse.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium text-base sm:text-sm">{warehouse.label}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Customer Dropdown (Optional) */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Pelanggan
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 sm:py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm bg-white min-h-[44px]"
              disabled={loading}
            >
              <span className={localFilters.customer ? 'text-gray-900' : 'text-gray-400'}>
                {localFilters.customer ? getSelectedCustomerLabel() : 'Semua Pelanggan'}
              </span>
            </button>
            {localFilters.customer && (
              <button
                type="button"
                onClick={() => handleCustomerSelect('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          
          {/* Customer Dropdown Menu */}
          {showCustomerDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-4 sm:h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 sm:pl-9 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px]"
                    placeholder="Cari pelanggan..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Tidak ada pelanggan ditemukan
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.value}
                      type="button"
                      onClick={() => handleCustomerSelect(customer.value)}
                      className={`w-full text-left px-4 py-3 sm:py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 min-h-[44px] ${
                        localFilters.customer === customer.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium text-base sm:text-sm">{customer.label}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Supplier Dropdown (Optional) */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Pemasok
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 sm:py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm bg-white min-h-[44px]"
              disabled={loading}
            >
              <span className={localFilters.supplier ? 'text-gray-900' : 'text-gray-400'}>
                {localFilters.supplier ? getSelectedSupplierLabel() : 'Semua Pemasok'}
              </span>
            </button>
            {localFilters.supplier && (
              <button
                type="button"
                onClick={() => handleSupplierSelect('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          
          {/* Supplier Dropdown Menu */}
          {showSupplierDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-4 sm:h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 sm:pl-9 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px]"
                    placeholder="Cari pemasok..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredSuppliers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Tidak ada pemasok ditemukan
                  </div>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <button
                      key={supplier.value}
                      type="button"
                      onClick={() => handleSupplierSelect(supplier.value)}
                      className={`w-full text-left px-4 py-3 sm:py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 min-h-[44px] ${
                        localFilters.supplier === supplier.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium text-base sm:text-sm">{supplier.label}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transaction Type Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">
            Jenis Transaksi
          </label>
          <select
            value={localFilters.transaction_type}
            onChange={(e) => handleTransactionTypeChange(e.target.value as TransactionType | '')}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 sm:py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-sm min-h-[44px]"
            disabled={loading}
          >
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Range Validation Error */}
      {dateRangeError && (
        <div className="mt-3 sm:mt-2 text-sm text-red-600">
          {dateRangeError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
        <button
          type="button"
          onClick={handleClear}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm text-base sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <X className="w-5 h-5 sm:w-4 sm:h-4" />
          Hapus Filter
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-indigo-600 rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <RefreshCw className={`w-5 h-5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
