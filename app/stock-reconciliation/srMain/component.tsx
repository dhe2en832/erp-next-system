'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Warehouse {
  name: string;
  warehouse_name: string;
}

interface Item {
  name: string;
  item_name: string;
  item_code: string;
  stock_uom: string;
}

interface ReconciliationItem {
  item_code: string;
  qty: number;
  valuation_rate: number;
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

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [docstatus, setDocstatus] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 10;

  const [newReconciliation, setNewReconciliation] = useState({
    warehouse: '',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    purpose: 'Stock Reconciliation',
    items: [{ item_code: '', qty: 0, valuation_rate: 0 }] as ReconciliationItem[]
  });

  const isReadOnly = docstatus === 1 || docstatus === 2;

  // Items filtering and pagination
  const filteredItems = useMemo(() => {
    if (!searchTerm) return newReconciliation.items;
    const lowerSearch = searchTerm.toLowerCase();
    return newReconciliation.items.filter(item => {
      const itemDetail = items.find(it => it.item_code === item.item_code);
      return (
        item.item_code.toLowerCase().includes(lowerSearch) ||
        (itemDetail?.item_name || '').toLowerCase().includes(lowerSearch)
      );
    });
  }, [newReconciliation.items, items, searchTerm]);

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
        data?: Item[];
      }
      const data: ItemsResponse = await response.json();
      if (data.success) setItems(data.data || []);
    } catch (err) {
      console.error('Gagal memuat barang:', err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) {
      fetchWarehouses();
      fetchItems();
    }
  }, [selectedCompany, fetchWarehouses, fetchItems]);

  const addItemRow = () => {
    if (isReadOnly) return;
    const newItem = { item_code: '', qty: 0, valuation_rate: 0 };
    setNewReconciliation(prev => ({
      ...prev,
      items: [newItem, ...prev.items]
    }));
    setSearchTerm(''); // Reset search to show the new row
    setCurrentPage(1); // Go to first page to see the new row
  };

  const removeItemRow = (itemCode: string) => {
    if (isReadOnly) return;
    setNewReconciliation(prev => ({
      ...prev,
      items: prev.items.filter(it => it.item_code !== itemCode)
    }));
  };

  const updateItemRow = (itemCode: string, field: string, value: string | number) => {
    if (isReadOnly) return;
    setNewReconciliation(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.item_code === itemCode ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSave = async () => {
    if (isReadOnly) {
      setError('Dokumen yang sudah diajukan tidak dapat diubah');
      return;
    }

    if (!selectedCompany || !newReconciliation.warehouse) {
      setError('Gudang harus dipilih');
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
        setSuccessMessage(`Rekonsiliasi Stok ${name} berhasil ${isEditMode ? 'diperbarui' : 'dibuat'}!`);
        setTimeout(() => router.push('/stock-reconciliation'), 2000);
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

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
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
              <div>
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
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <label className="block text-sm font-medium text-gray-700">Barang ({newReconciliation.items.length})</label>
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari kode atau nama barang..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                {!isReadOnly && (
                  <button 
                    type="button" 
                    onClick={addItemRow} 
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah Barang
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto relative">
                  <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Barang</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Jumlah</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">Nilai Valuasi</th>
                        {!isReadOnly && (
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedItems.length > 0 ? (
                        paginatedItems.map((item, index) => (
                          <tr key={item.item_code || `new-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <select 
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" 
                                value={item.item_code} 
                                onChange={(e) => updateItemRow(item.item_code, 'item_code', e.target.value)}
                                disabled={isReadOnly}
                              >
                                <option value="">Pilih Barang</option>
                                {items.map((it) => (
                                  <option key={it.item_code} value={it.item_code}>
                                    {it.item_name} ({it.item_code})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number" 
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" 
                                value={item.qty} 
                                onChange={(e) => updateItemRow(item.item_code, 'qty', parseFloat(e.target.value) || 0)} 
                                min="0" 
                                step="0.01"
                                disabled={isReadOnly}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number" 
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" 
                                value={item.valuation_rate} 
                                onChange={(e) => updateItemRow(item.item_code, 'valuation_rate', parseFloat(e.target.value) || 0)} 
                                min="0" 
                                step="0.01"
                                disabled={isReadOnly}
                              />
                            </td>
                            {!isReadOnly && (
                              <td className="px-4 py-3 text-center">
                                <button 
                                  type="button" 
                                  onClick={() => removeItemRow(item.item_code)} 
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isReadOnly ? 3 : 4} className="px-4 py-8 text-center text-gray-500 italic">
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
                  {loading ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Buat Rekonsiliasi'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
