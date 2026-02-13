'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function StockReconciliationMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryName = searchParams.get('name');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isViewMode] = useState(!!entryName);
  const [newReconciliation, setNewReconciliation] = useState({
    warehouse: '',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    purpose: 'Stock Reconciliation',
    items: [{ item_code: '', current_qty: 0, qty: 0 }]
  });

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/warehouses?company=${selectedCompany}`);
      const data = await response.json();
      if (data.success) setWarehouses(data.data || []);
    } catch (err) {
      console.error('Gagal memuat gudang:', err);
    }
  }, [selectedCompany]);

  const fetchItems = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/items?company=${selectedCompany}`);
      const data = await response.json();
      if (data.success) setItems(data.data || []);
    } catch (err) {
      console.error('Gagal memuat barang:', err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) { fetchWarehouses(); fetchItems(); }
  }, [selectedCompany, fetchWarehouses, fetchItems]);

  const addItemRow = () => {
    setNewReconciliation(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', current_qty: 0, qty: 0 }]
    }));
  };

  const removeItemRow = (index: number) => {
    setNewReconciliation(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemRow = (index: number, field: string, value: string | number) => {
    setNewReconciliation(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreateReconciliation = async () => {
    if (!selectedCompany || !newReconciliation.warehouse) {
      setError('Gudang harus dipilih');
      return;
    }
    try {
      const response = await fetch('/api/stock-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReconciliation, company: selectedCompany }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Rekonsiliasi Stok ${data.data?.name || ''} berhasil dibuat!`);
        setTimeout(() => router.push('/stock-reconciliation/srList'), 2000);
      } else {
        setError(data.message || 'Gagal membuat rekonsiliasi stok');
      }
    } catch {
      setError('Terjadi kesalahan saat membuat rekonsiliasi stok');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isViewMode ? `Lihat Rekonsiliasi: ${entryName}` : 'Buat Rekonsiliasi Stok Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isViewMode ? 'Detail rekonsiliasi stok' : 'Sesuaikan kuantitas stok'}
              </p>
            </div>
            <button onClick={() => router.push('/stock-reconciliation/srList')} className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 min-h-[44px]">
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{successMessage}</div>
        </div>
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      {!isViewMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gudang *</label>
                  <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newReconciliation.warehouse} onChange={(e) => setNewReconciliation(prev => ({ ...prev, warehouse: e.target.value }))} required>
                    <option value="">Pilih Gudang</option>
                    {warehouses.map((wh) => (<option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Posting</label>
                  <input type="date" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newReconciliation.posting_date} onChange={(e) => setNewReconciliation(prev => ({ ...prev, posting_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Posting</label>
                  <input type="time" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newReconciliation.posting_time} onChange={(e) => setNewReconciliation(prev => ({ ...prev, posting_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan</label>
                  <input type="text" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newReconciliation.purpose} onChange={(e) => setNewReconciliation(prev => ({ ...prev, purpose: e.target.value }))} />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Barang</label>
                  <button type="button" onClick={addItemRow} className="text-indigo-600 hover:text-indigo-800 text-sm">+ Tambah Barang</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barang</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jml Saat Ini</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jml Baru</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {newReconciliation.items.map((item, index) => {
                        const difference = (item.qty || 0) - (item.current_qty || 0);
                        return (
                          <tr key={index}>
                            <td className="px-4 py-2">
                              <select className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.item_code} onChange={(e) => updateItemRow(index, 'item_code', e.target.value)}>
                                <option value="">Pilih Barang</option>
                                {items.map((it) => (<option key={it.name} value={it.item_code}>{it.item_name} ({it.item_code})</option>))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.current_qty} onChange={(e) => updateItemRow(index, 'current_qty', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.qty} onChange={(e) => updateItemRow(index, 'qty', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-sm font-medium text-gray-600">{difference > 0 && '+'}{difference}</span>
                            </td>
                            <td className="px-4 py-2">
                              {newReconciliation.items.length > 1 && (
                                <button type="button" onClick={() => removeItemRow(index)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button type="button" onClick={() => router.push('/stock-reconciliation/srList')} className="w-full sm:w-auto bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 min-h-[44px]">Batal</button>
                <button type="button" onClick={handleCreateReconciliation} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]">Buat Rekonsiliasi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
