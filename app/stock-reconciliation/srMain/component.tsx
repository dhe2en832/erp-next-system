'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import ItemDialog, { Item as DialogItem } from '../../components/ItemDialog';
import { Save, ArrowLeft, Plus, Trash2, Upload, Search, Edit2, Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Warehouse {
  name: string;
  warehouse_name: string;
}

interface ReconciliationItem {
  item_code: string;
  qty: number;
  valuation_rate: number;
  warehouse?: string;
  stock_uom?: string;
  item_name?: string;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Draft',
  1: 'Diajukan',
  2: 'Dibatalkan',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  1: 'bg-green-100 text-green-800 border-green-200',
  2: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function StockReconciliationMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryName = searchParams.get('name');
  const isEditMode = !!entryName;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<DialogItem[]>([]);
  const [uoms, setUoms] = useState<{ name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [csvMessage, setCsvMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [savedDocName, setSavedDocName] = useState('');
  const [loading, setLoading] = useState(false);
  const [docstatus, setDocstatus] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingQty, setEditingQty] = useState<{ index: number, value: string } | null>(null);
  const ITEMS_PER_PAGE = 20;

  const [newReconciliation, setNewReconciliation] = useState({
    warehouse: '',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    purpose: 'Stock Reconciliation',
    items: [{ item_code: '', qty: 0, valuation_rate: 0, warehouse: '', stock_uom: '', item_name: '' }] as ReconciliationItem[]
  });

  const isReadOnly = docstatus === 1 || docstatus === 2;

  // Sync item warehouse when header warehouse changes
  useEffect(() => {
    if (newReconciliation.warehouse) {
      setNewReconciliation(prev => ({
        ...prev,
        items: prev.items.map(item => ({
          ...item,
          warehouse: prev.warehouse
        }))
      }));
    }
  }, [newReconciliation.warehouse]);

  // Items filtering and pagination
  const filteredItems = useMemo(() => {
    if (!searchTerm) return newReconciliation.items;
    const lowerSearch = searchTerm.toLowerCase();
    return newReconciliation.items.filter(item => {
      return (
        (item.item_code || '').toLowerCase().includes(lowerSearch) ||
        (item.item_name || '').toLowerCase().includes(lowerSearch)
      );
    });
  }, [newReconciliation.items, searchTerm]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  // Fetch detail when editing
  const fetchDetail = useCallback(async () => {
    if (!entryName) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/reconciliation/${encodeURIComponent(entryName)}`);
      interface ReconciliationDoc {
        company?: string;
        docstatus?: number;
        warehouse?: string;
        posting_date?: string;
        posting_time?: string;
        purpose?: string;
        items?: ReconciliationItem[];
      }
      interface ApiResponse {
        success: boolean;
        data?: ReconciliationDoc;
        message?: string;
      }
      const data: ApiResponse = await response.json();
      if (data.success && data.data) {
        const rec = data.data;
        setSelectedCompany(rec.company || selectedCompany);
        setDocstatus(rec.docstatus || 0);
        setNewReconciliation({
          warehouse: rec.warehouse || '',
          posting_date: rec.posting_date || new Date().toISOString().split('T')[0],
          posting_time: (rec.posting_time || new Date().toTimeString().split(' ')[0]).substring(0, 5),
          purpose: rec.purpose || 'Stock Reconciliation',
          items: (rec.items || []).map((it: ReconciliationItem) => ({
            item_code: it.item_code || '',
            qty: it.qty || 0,
            valuation_rate: it.valuation_rate || 0,
            warehouse: it.warehouse || rec.warehouse || '',
            stock_uom: it.stock_uom || '',
            item_name: it.item_name || '',
          }))
        });
      } else {
        setError(data.message || 'Gagal memuat detail rekonsiliasi');
      }
    } catch (err) {
      console.error('Gagal memuat detail rekonsiliasi:', err);
      setError('Gagal memuat detail rekonsiliasi');
    } finally {
      setLoading(false);
    }
  }, [entryName, selectedCompany]);

  useEffect(() => {
    const savedCompany = typeof window !== 'undefined' ? localStorage.getItem('selected_company') : null;
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  useEffect(() => {
    if (entryName) {
      fetchDetail();
    }
  }, [entryName, fetchDetail]);

  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/inventory/warehouses?company=${selectedCompany}`);
      interface WarehouseResponse {
        success: boolean;
        data?: Warehouse[];
      }
      const data: WarehouseResponse = await response.json();
      if (data.success) setWarehouses(data.data || []);
    } catch (err) {
      console.error('Gagal memuat gudang:', err);
    }
  }, [selectedCompany]);

  const fetchItems = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/inventory/items?company=${selectedCompany}`);
      interface ItemsResponse {
        success: boolean;
        data?: DialogItem[];
      }
      const data: ItemsResponse = await response.json();
      if (data.success) setItems(data.data || []);
    } catch (err) {
      console.error('Gagal memuat barang:', err);
    }
  }, [selectedCompany]);

  const fetchUoms = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/dropdowns/uoms', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        // Sort UOMs alphabetically for easier selection
        const sortedUoms = (data.data || []).sort((a: { name: string }, b: { name: string }) => 
          a.name.localeCompare(b.name)
        );
        setUoms(sortedUoms);
      }
    } catch (err) {
      console.error('Gagal memuat UOM:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchWarehouses();
      fetchItems();
      fetchUoms();
    }
  }, [selectedCompany, fetchWarehouses, fetchItems, fetchUoms]);

  const addItemRow = () => {
    if (isReadOnly) return;
    const newItem = { item_code: '', qty: 0, valuation_rate: 0, warehouse: newReconciliation.warehouse, stock_uom: '', item_name: '' };
    setNewReconciliation(prev => {
      const updatedItems = [...prev.items, newItem];
      // Update page to show the last row
      const newPage = Math.ceil(updatedItems.length / ITEMS_PER_PAGE);
      setCurrentPage(newPage);
      return {
        ...prev,
        items: updatedItems
      };
    });
    setSearchTerm(''); // Reset search to show the new row
  };

  const removeItemRow = (index: number) => {
    if (isReadOnly) return;
    setNewReconciliation(prev => {
      const updatedItems = [...prev.items];
      updatedItems.splice(index, 1);
      return { ...prev, items: updatedItems };
    });
  };

  const updateItemRow = (index: number, field: string, value: string | number) => {
    if (isReadOnly) return;
    setNewReconciliation(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      // If item_code is updated, find its details
      if (field === 'item_code') {
        const itemDetail = items.find(it => it.item_code === value);
        if (itemDetail) {
          updatedItems[index].item_name = itemDetail.item_name;
          updatedItems[index].stock_uom = itemDetail.stock_uom;
        }
      }
      
      return { ...prev, items: updatedItems };
    });
  };

  const handleItemSelect = (selectedItem: DialogItem) => {
    if (currentItemIndex !== null) {
      updateItemRow(currentItemIndex, 'item_code', selectedItem.item_code);
      updateItemRow(currentItemIndex, 'item_name', selectedItem.item_name);
      updateItemRow(currentItemIndex, 'stock_uom', selectedItem.stock_uom || '');
    }
    setShowItemDialog(false);
    setCurrentItemIndex(null);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.split('\n');
        
        // Find header line (starts with Barcode,Item Code,...)
        let headerIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('Barcode,Item Code,Item Name')) {
            headerIndex = i + 1; // Actual field names are in the next line
            break;
          }
        }

        if (headerIndex === -1 || headerIndex >= lines.length) {
          throw new Error('Format CSV tidak valid');
        }

        const dataLines = lines.slice(headerIndex + 1); // Data starts after the lowercase field names line
         const newItems: ReconciliationItem[] = [];
 
         dataLines.forEach(line => {
           const trimmedLine = line.trim();
           if (!trimmedLine || trimmedLine.startsWith(',,,,') || trimmedLine.includes('---') || trimmedLine.includes('CSV format') || trimmedLine.includes('Do not edit')) return;
           
           const parts = line.split(',');
           if (parts.length >= 8) {
             // parts[1] is item_code, parts[5] is qty, parts[7] is valuation_rate, parts[6] is stock_uom
             const item_code = parts[1]?.trim();
             if (!item_code || item_code === 'item_code' || item_code === 'Item Code') return;
             
             const item_name = parts[2]?.trim();
             const qty = parseFloat(parts[5]) || 0;
             const stock_uom = parts[6]?.trim();
             const valuation_rate = parseFloat(parts[7]) || 0;
             const warehouse = parts[4]?.trim() || newReconciliation.warehouse;
 
             newItems.push({
               item_code,
               item_name,
               qty,
               stock_uom,
               valuation_rate,
               warehouse
             });
           }
         });

        if (newItems.length > 0) {
          setNewReconciliation(prev => {
            const currentFilledItems = prev.items.filter(it => it.item_code !== '');
            const updatedItems = [...currentFilledItems, ...newItems];
            // Update page to show the last row if many items added
            const newPage = Math.ceil(updatedItems.length / ITEMS_PER_PAGE);
            setCurrentPage(newPage);
            return {
              ...prev,
              items: updatedItems
            };
          });
          setCsvMessage(`${newItems.length} item berhasil diimpor dari CSV`);
          setTimeout(() => setCsvMessage(''), 3000);
        }
      } catch (err) {
        console.error('CSV Parsing Error:', err);
        setError('Gagal memproses file CSV. Pastikan format sesuai.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (isReadOnly) {
      setError('Dokumen yang sudah diajukan tidak dapat diubah');
      return;
    }

    if (!newReconciliation.warehouse) {
      setError('Gudang harus dipilih sebelum menyimpan.');
      return;
    }

    if (!selectedCompany) {
      setError('Company belum dipilih. Silakan kembali dan pilih company.');
      return;
    }

    // Filter out empty rows
    const validItems = newReconciliation.items.filter(item => item.item_code !== '');

    if (validItems.length === 0) {
      setError('Minimal satu barang harus ditambahkan');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = { 
        ...newReconciliation, 
        items: validItems,
        company: selectedCompany 
      };
      const url = isEditMode 
        ? `/api/inventory/reconciliation/${entryName}` 
        : '/api/inventory/reconciliation';
      
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      interface SaveResponse {
        success: boolean;
        data?: { name?: string };
        message?: string;
      }
      const data: SaveResponse = await response.json();
      
      if (data.success) {
        const name = data.data?.name || entryName || '';
        setSavedDocName(name);
        setSuccessMessage(`Rekonsiliasi Stok ${name} berhasil ${isEditMode ? 'diperbarui' : 'dibuat'}!`);
        setRedirectCountdown(3);
        const timer = setInterval(() => {
          setRedirectCountdown((prev) => prev - 1);
        }, 1000);
        setTimeout(() => {
          clearInterval(timer);
          router.push('/stock-reconciliation');
        }, 3000);
        return;
      } else {
        setError(data.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} rekonsiliasi stok`);
      }
    } catch {
      setError(`Terjadi kesalahan saat ${isEditMode ? 'memperbarui' : 'membuat'} rekonsiliasi stok`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <LoadingSpinner message="Memuat detail rekonsiliasi..." />;
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/stock-reconciliation')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Kembali"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {isEditMode ? `Rekonsiliasi: ${entryName}` : 'Buat Rekonsiliasi Stok Baru'}
                  </h1>
                  {isEditMode && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[docstatus]}`}>
                      {STATUS_LABELS[docstatus]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {isReadOnly 
                    ? 'Dokumen ini sudah diajukan dan tidak dapat diubah' 
                    : isEditMode 
                      ? 'Perbarui rekonsiliasi stok' 
                      : 'Sesuaikan kuantitas stok'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isReadOnly && (
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEditMode ? 'Simpan Perubahan' : 'Buat Rekonsiliasi'}
                </button>
              )}
              <button 
                onClick={() => router.push('/stock-reconciliation')} 
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
              >
                Kembali ke Daftar
              </button>
            </div>
          </div>
        </div>
      </div>

      {csvMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {csvMessage}
          </div>
        </div>
      )}
      
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gudang {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <select 
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  value={newReconciliation.warehouse} 
                  onChange={(e) => setNewReconciliation(prev => ({ ...prev, warehouse: e.target.value }))} 
                  disabled={isReadOnly}
                  required
                >
                  <option value="">Pilih Gudang</option>
                  {warehouses.map((wh) => (
                    <option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Posting</label>
                <input 
                  type="date" 
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  value={newReconciliation.posting_date} 
                  onChange={(e) => setNewReconciliation(prev => ({ ...prev, posting_date: e.target.value }))} 
                  disabled={isReadOnly}
                />
              </div>
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Posting</label>
                <input 
                  type="time" 
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  value={newReconciliation.posting_time} 
                  onChange={(e) => setNewReconciliation(prev => ({ ...prev, posting_time: e.target.value }))} 
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan</label>
                <input 
                  type="text" 
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  value={newReconciliation.purpose} 
                  onChange={(e) => setNewReconciliation(prev => ({ ...prev, purpose: e.target.value }))} 
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <label className="block text-sm font-semibold text-gray-700">Items</label>
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari kode atau nama barang..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 pl-9 pr-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv"
                      onChange={handleCsvUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Upload className="w-4 h-4 mr-1 text-gray-500" />
                      Upload CSV
                    </button>
                    <button 
                      type="button" 
                      onClick={addItemRow} 
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Row
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-10 px-3 py-3 text-center">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" disabled />
                        </th>
                        <th className="w-16 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Item Code <span className="text-red-500">*</span></th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Item Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">Warehouse <span className="text-red-500">*</span></th>
                        <th className="w-32 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock UOM</th>
                        <th className="w-16 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <Settings className="w-4 h-4 mx-auto text-gray-400" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedItems.length > 0 ? (
                        paginatedItems.map((item, index) => {
                          const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                          return (
                            <tr key={actualIndex} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-3 py-3 text-center">
                                <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" disabled />
                              </td>
                              <td className="px-3 py-3 text-sm text-blue-600 font-medium">
                                {actualIndex + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={`flex-1 border border-gray-300 rounded-md py-1.5 px-3 text-sm min-h-[38px] flex items-center ${isReadOnly ? 'bg-gray-50 text-gray-500' : 'cursor-pointer hover:border-indigo-400'}`}
                                    onClick={() => {
                                      if (!isReadOnly) {
                                        setCurrentItemIndex(actualIndex);
                                        setShowItemDialog(true);
                                      }
                                    }}
                                  >
                                    {item.item_code ? (
                                      <span className="text-gray-900">{item.item_code}</span>
                                    ) : (
                                      <span className="text-gray-400">Pilih barang...</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className={`py-1.5 px-3 text-sm min-h-[38px] flex items-center ${isReadOnly ? 'text-gray-500' : 'text-gray-700'}`}>
                                  {item.item_name ? (
                                    <span>{item.item_name}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <select 
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" 
                                  value={item.warehouse} 
                                  onChange={(e) => updateItemRow(actualIndex, 'warehouse', e.target.value)}
                                  disabled={isReadOnly}
                                >
                                  <option value="">Pilih Gudang</option>
                                  {warehouses.map((wh) => (
                                    <option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input 
                                  type="text" 
                                  className="block w-full border-none bg-transparent py-1.5 px-3 text-sm text-right focus:ring-0 focus:outline-none disabled:text-gray-500" 
                                  value={editingQty?.index === actualIndex ? editingQty.value : (item.qty === 0 ? '0,00' : item.qty.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} 
                                  onFocus={(e) => {
                                    if (isReadOnly) return;
                                    setEditingQty({ index: actualIndex, value: item.qty === 0 ? '' : item.qty.toString() });
                                    e.target.select();
                                  }}
                                  onChange={(e) => {
                                    if (isReadOnly) return;
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setEditingQty({ index: actualIndex, value: val });
                                    
                                    // Also update main state so it's "overwritten" correctly
                                    if (val !== '' && val !== '.') {
                                      updateItemRow(actualIndex, 'qty', parseFloat(val) || 0);
                                    }
                                  }} 
                                  onBlur={() => {
                                    if (isReadOnly) return;
                                    const val = parseFloat(editingQty?.value || '0') || 0;
                                    updateItemRow(actualIndex, 'qty', val);
                                    setEditingQty(null);
                                  }}
                                  disabled={isReadOnly}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select 
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" 
                                  value={item.stock_uom} 
                                  onChange={(e) => updateItemRow(actualIndex, 'stock_uom', e.target.value)}
                                  disabled={isReadOnly}
                                >
                                  <option value="">Pilih UOM</option>
                                  {uoms.map((uom) => (
                                    <option key={uom.name} value={uom.name}>{uom.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {!isReadOnly && (
                                  <div className="flex justify-center gap-1">
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setCurrentItemIndex(actualIndex);
                                        setShowItemDialog(true);
                                      }}
                                      className="text-gray-400 hover:text-indigo-600 p-1 rounded-md transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => removeItemRow(actualIndex)} 
                                      className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-gray-500 italic">
                            {searchTerm ? 'Tidak ada barang yang cocok dengan pencarian' : 'Belum ada barang ditambahkan'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={filteredItems.length}
                    pageSize={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>

            <ItemDialog
              isOpen={showItemDialog}
              onClose={() => { setShowItemDialog(false); setCurrentItemIndex(null); }}
              onSelect={handleItemSelect}
            />

            {!isReadOnly && (
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => router.push('/stock-reconciliation')} 
                  className="w-full sm:w-auto bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 min-h-[44px]"
                  disabled={loading}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  onClick={handleSave} 
                  className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Menyimpan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      <span>{isEditMode ? 'Simpan Perubahan' : 'Buat Rekonsiliasi'}</span>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Success Dialog */}
      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Berhasil!</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Rekonsiliasi Stok <span className="font-semibold text-gray-800">{savedDocName}</span> berhasil {isEditMode ? 'diperbarui' : 'dibuat'} dan akan segera dialihkan ke daftar.
              </p>
              {redirectCountdown > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600">
                    Mengalihkan dalam{' '}
                    <span className="font-bold text-green-600">{redirectCountdown}</span>{' '}detik...
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSuccessMessage('');
                  router.push('/stock-reconciliation');
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Ke Daftar Rekonsiliasi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
