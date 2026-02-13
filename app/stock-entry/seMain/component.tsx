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

export default function StockEntryMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryName = searchParams.get('name');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isViewMode, setIsViewMode] = useState(false);
  const [newEntry, setNewEntry] = useState({
    purpose: 'Material Receipt',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    from_warehouse: '',
    to_warehouse: '',
    items: [{ item_code: '', qty: 1, transfer_qty: 1 }]
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

  // Load entry details for view mode
  useEffect(() => {
    if (entryName) {
      setIsViewMode(true);
      // For now, view mode just shows the name — full detail fetch can be added later
    }
  }, [entryName]);

  useEffect(() => {
    if (selectedCompany) {
      fetchWarehouses();
      fetchItems();
    }
  }, [selectedCompany, fetchWarehouses, fetchItems]);

  const addItemRow = () => {
    setNewEntry(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', qty: 1, transfer_qty: 1 }]
    }));
  };

  const removeItemRow = (index: number) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemRow = (index: number, field: string, value: string | number) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreateEntry = async () => {
    if (!selectedCompany || !newEntry.from_warehouse || !newEntry.purpose) {
      setError('Tujuan dan gudang harus diisi');
      return;
    }

    try {
      const response = await fetch('/api/stock-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEntry, company: selectedCompany }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Entri Stok ${data.data?.name || ''} berhasil dibuat!`);
        setTimeout(() => router.push('/stock-entry/seList'), 2000);
      } else {
        setError(data.message || 'Gagal membuat entri stok');
      }
    } catch {
      setError('Terjadi kesalahan saat membuat entri stok');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isViewMode ? `Lihat Entri Stok: ${entryName}` : 'Buat Entri Stok Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isViewMode ? 'Detail entri stok' : 'Buat entri pergerakan stok baru'}
              </p>
            </div>
            <button
              onClick={() => router.push('/stock-entry/seList')}
              className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 min-h-[44px]"
            >
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

      {/* Form */}
      {!isViewMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan *</label>
                  <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newEntry.purpose} onChange={(e) => setNewEntry(prev => ({ ...prev, purpose: e.target.value }))} required>
                    <option value="Material Receipt">Penerimaan Material</option>
                    <option value="Material Issue">Pengeluaran Material</option>
                    <option value="Material Transfer">Transfer Material</option>
                    <option value="Manufacture">Manufaktur</option>
                    <option value="Repack">Repack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Posting</label>
                  <input type="date" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newEntry.posting_date} onChange={(e) => setNewEntry(prev => ({ ...prev, posting_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Posting</label>
                  <input type="time" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newEntry.posting_time} onChange={(e) => setNewEntry(prev => ({ ...prev, posting_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dari Gudang *</label>
                  <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newEntry.from_warehouse} onChange={(e) => setNewEntry(prev => ({ ...prev, from_warehouse: e.target.value }))} required>
                    <option value="">Pilih Gudang</option>
                    {warehouses.map((wh) => (<option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>))}
                  </select>
                </div>
              </div>

              {(newEntry.purpose === 'Material Transfer' || newEntry.purpose === 'Material Issue') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ke Gudang</label>
                  <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={newEntry.to_warehouse} onChange={(e) => setNewEntry(prev => ({ ...prev, to_warehouse: e.target.value }))}>
                    <option value="">Pilih Gudang</option>
                    {warehouses.map((wh) => (<option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>))}
                  </select>
                </div>
              )}

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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jml</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jml Transfer</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {newEntry.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <select className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.item_code} onChange={(e) => updateItemRow(index, 'item_code', e.target.value)}>
                              <option value="">Pilih Barang</option>
                              {items.map((it) => (<option key={it.name} value={it.item_code}>{it.item_name} ({it.item_code})</option>))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.qty} onChange={(e) => updateItemRow(index, 'qty', parseFloat(e.target.value) || 0)} min="1" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.transfer_qty} onChange={(e) => updateItemRow(index, 'transfer_qty', parseFloat(e.target.value) || 0)} min="1" />
                          </td>
                          <td className="px-4 py-2">
                            {newEntry.items.length > 1 && (
                              <button type="button" onClick={() => removeItemRow(index)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button type="button" onClick={() => router.push('/stock-entry/seList')} className="w-full sm:w-auto bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 min-h-[44px]">Batal</button>
                <button type="button" onClick={handleCreateEntry} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]">Buat Entri Stok</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
