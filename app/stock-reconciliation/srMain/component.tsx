'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  const [newReconciliation, setNewReconciliation] = useState({
    warehouse: '',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    purpose: 'Stock Reconciliation',
    items: [{ item_code: '', qty: 0, valuation_rate: 0 }] as ReconciliationItem[]
  });

  const isReadOnly = docstatus === 1 || docstatus === 2;

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
    setNewReconciliation(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', qty: 0, valuation_rate: 0 }]
    }));
  };

  const removeItemRow = (index: number) => {
    if (isReadOnly) return;
    setNewReconciliation(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemRow = (index: number, field: string, value: string | number) => {
    if (isReadOnly) return;
    setNewReconciliation(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
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

    if (newReconciliation.items.length === 0 || !newReconciliation.items[0].item_code) {
      setError('Minimal satu barang harus ditambahkan');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = { ...newReconciliation, company: selectedCompany };
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
            <button 
              onClick={() => router.push('/stock-reconciliation')} 
              className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 min-h-[44px]"
            >
              Kembali ke Daftar
            </button>
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Barang</label>
                {!isReadOnly && (
                  <button 
                    type="button" 
                    onClick={addItemRow} 
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    + Tambah Barang
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barang</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nilai Valuasi</th>
                      {!isReadOnly && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {newReconciliation.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <select 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                            value={item.item_code} 
                            onChange={(e) => updateItemRow(index, 'item_code', e.target.value)}
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
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                            value={item.qty} 
                            onChange={(e) => updateItemRow(index, 'qty', parseFloat(e.target.value) || 0)} 
                            min="0" 
                            step="0.01"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                            value={item.valuation_rate} 
                            onChange={(e) => updateItemRow(index, 'valuation_rate', parseFloat(e.target.value) || 0)} 
                            min="0" 
                            step="0.01"
                            disabled={isReadOnly}
                          />
                        </td>
                        {!isReadOnly && (
                          <td className="px-4 py-2">
                            {newReconciliation.items.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeItemRow(index)} 
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
