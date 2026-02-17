'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ItemDialog from '../../components/ItemDialog';

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

interface StockEntryItem {
  item_code: string;
  item_name?: string;
  qty: number;
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
  const [formLoading, setFormLoading] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [newEntry, setNewEntry] = useState({
    purpose: 'Material Receipt',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    from_warehouse: '',
    to_warehouse: '',
    selected_warehouse: '', // Header warehouse selector
    items: [{ item_code: '', item_name: '', qty: 1 }] as StockEntryItem[],
    docstatus: 0 // Add docstatus for submitted check
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
      const response = await fetch(`/api/inventory/warehouses?company=${selectedCompany}`);
      const data = await response.json();
      if (data.success) setWarehouses(data.data || []);
    } catch (err) {
      console.error('Gagal memuat gudang:', err);
    }
  }, [selectedCompany]);

  const fetchItems = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/inventory/items?company=${selectedCompany}`);
      const data = await response.json();
      if (data.success) setItems(data.data || []);
    } catch (err) {
      console.error('Gagal memuat barang:', err);
    }
  }, [selectedCompany]);

  // Load entry details for edit mode
  useEffect(() => {
    if (entryName) {
      setIsViewMode(true);
      fetchEntryDetails(entryName);
    }
  }, [entryName]);

  const fetchEntryDetails = async (name: string) => {
    try {
      console.log('Fetching entry details for:', name);
      const response = await fetch(`/api/inventory/stock-entry/${encodeURIComponent(name)}`);
      const data = await response.json();
      
      console.log('Entry details response:', {
        status: response.status,
        success: data.success,
        data: data.data
      });
      
      if (data.success && data.data) {
        const entry = data.data;
        console.log('Setting entry data:', entry);
        console.log('Entry items:', entry.items);
        setNewEntry(prev => {
          const updated = {
            ...prev,
            purpose: entry.purpose || 'Material Receipt',
            posting_date: entry.posting_date || new Date().toISOString().split('T')[0],
            posting_time: entry.posting_time || new Date().toTimeString().split(' ')[0].substring(0, 5),
            from_warehouse: entry.from_warehouse || '',
            to_warehouse: entry.to_warehouse || '',
            docstatus: entry.docstatus || 0, // Add docstatus
            items: entry.items?.map((item: any) => ({
              item_code: item.item_code || '',
              item_name: item.item_name || item.description || '',
              qty: item.qty || 1
            })) || [{ item_code: '', item_name: '', qty: 1 }]
          };
          console.log('Updated newEntry state:', updated);
          return updated;
        });
      } else {
        console.error('Failed to fetch entry details:', data.message);
      }
    } catch (error) {
      console.error('Error fetching entry details:', error);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchWarehouses();
      fetchItems();
    }
  }, [selectedCompany, fetchWarehouses, fetchItems]);

  // Auto-fill warehouse fields when header warehouse changes
  useEffect(() => {
    if (newEntry.selected_warehouse) {
      setNewEntry(prev => {
        const updated = { ...prev };
        
        // Auto-fill based on purpose
        if (prev.purpose === 'Material Receipt') {
          updated.to_warehouse = newEntry.selected_warehouse;
          updated.from_warehouse = '';
        } else if (prev.purpose === 'Material Issue') {
          updated.from_warehouse = newEntry.selected_warehouse;
          updated.to_warehouse = '';
        } else if (prev.purpose === 'Material Transfer') {
          updated.from_warehouse = newEntry.selected_warehouse;
          // to_warehouse remains as is or empty
        }
        
        return updated;
      });
    }
  }, [newEntry.selected_warehouse, newEntry.purpose]);

  const addItemRow = () => {
    setNewEntry(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', item_name: '', qty: 1 }]
    }));
  };

  const removeItemRow = (index: number) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.filter((_: StockEntryItem, i: number) => i !== index)
    }));
  };

  const updateItemRow = (index: number, field: string, value: string | number) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.map((item: StockEntryItem, i: number) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreateEntry = async () => {
    if (!selectedCompany || !newEntry.purpose) {
      setError('Tujuan harus diisi');
      return;
    }

    // Validate required warehouse based on purpose
    if (newEntry.purpose === 'Material Receipt' && !newEntry.to_warehouse) {
      setError('Gudang tujuan harus diisi untuk Penerimaan Material');
      return;
    }

    if ((newEntry.purpose === 'Material Issue' || newEntry.purpose === 'Material Transfer') && !newEntry.from_warehouse) {
      setError('Gudang asal harus diisi untuk Pengeluaran/Transfer Material');
      return;
    }

    // Validate items
    const hasValidItems = newEntry.items.some(item => item.item_code && item.qty > 0);
    if (!hasValidItems) {
      setError('Setidaknya satu barang harus dipilih dengan quantity > 0');
      return;
    }

    setFormLoading(true);
    setError('');
    try {
      const response = await fetch('/api/inventory/stock-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isViewMode ? `Edit Entri Stok: ${entryName}` : 'Buat Entri Stok Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isViewMode ? 'Perbarui entri pergerakan stok' : 'Buat entri pergerakan stok baru'}
              </p>
              
              {/* Company Info */}
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm text-gray-600">Perusahaan: <span className="font-medium">{selectedCompany}</span></span>
                </div>
                
                {/* Warehouse Selector */}
{/*                 
                {!isViewMode && (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <label className="text-sm text-gray-600 mr-2">Gudang:</label>
                    <select 
                      className="text-sm border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={newEntry.selected_warehouse}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, selected_warehouse: e.target.value }))}
                    >
                      <option value="">Pilih Gudang</option>
                      {warehouses.map((wh) => (
                        <option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>
                      ))}
                    </select>
                  </div>
                )} */}

              </div>
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
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414l-2.586 2.586z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L8.586 10z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading Progress */}
      {formLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span>{isViewMode ? 'Sedang memperbarui entri stok...' : 'Sedang menyimpan entri stok...'}</span>
          </div>
        </div>
      )}

      {/* Form */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newEntry.purpose === 'Material Receipt' ? 'Ke Gudang *' : 'Dari Gudang *'}
                  </label>
                  <select 
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                    value={newEntry.purpose === 'Material Receipt' ? newEntry.to_warehouse : newEntry.from_warehouse} 
                    onChange={(e) => {
                      if (newEntry.purpose === 'Material Receipt') {
                        setNewEntry(prev => ({ ...prev, to_warehouse: e.target.value }));
                      } else {
                        setNewEntry(prev => ({ ...prev, from_warehouse: e.target.value }));
                      }
                    }} 
                    required
                  >
                    <option value="">Pilih Gudang</option>
                    {warehouses.map((wh) => (<option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>))}
                  </select>
                </div>
                
                {/* Show both warehouses for Material Transfer */}
                {newEntry.purpose === 'Material Transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ke Gudang *</label>
                    <select 
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                      value={newEntry.to_warehouse} 
                      onChange={(e) => setNewEntry(prev => ({ ...prev, to_warehouse: e.target.value }))}
                      required
                    >
                      <option value="">Pilih Gudang</option>
                      {warehouses.map((wh) => (<option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>))}
                    </select>
                  </div>
                )}
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kode Barang</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jml</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {newEntry.items.map((item: StockEntryItem, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 cursor-pointer"
                                value={item.item_code || ''}
                                readOnly
                                placeholder="Klik untuk pilih barang..."
                                onClick={() => { setCurrentItemIndex(index); setShowItemDialog(true); }}
                              />
                              <button
                                type="button"
                                onClick={() => { setCurrentItemIndex(index); setShowItemDialog(true); }}
                                className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200 whitespace-nowrap"
                              >
                                Pilih
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                              value={item.item_name || ''}
                              onChange={(e) => updateItemRow(index, 'item_name', e.target.value)}
                              placeholder="Nama barang..."
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm" value={item.qty} onChange={(e) => updateItemRow(index, 'qty', parseFloat(e.target.value) || 0)} min="1" />
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
                <button 
                  type="button" 
                  onClick={handleCreateEntry} 
                  disabled={formLoading || newEntry.docstatus === 1} 
                  className={`w-full sm:w-auto px-4 py-2 rounded-md min-h-[44px] flex items-center justify-center gap-2 transition-colors ${
                    newEntry.docstatus === 1 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                  }`}
                >
                  {formLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                  {formLoading ? (
                    <span>{isViewMode ? 'Memperbarui...' : 'Menyimpan...'}</span>
                  ) : (
                    <span>
                      {newEntry.docstatus === 1 ? 'Sudah Disubmit' : (isViewMode ? 'Perbarui Entri Stok' : 'Buat Entri Stok')}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Item Selection Dialog */}
      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => { setShowItemDialog(false); setCurrentItemIndex(null); }}
        onSelect={(selectedItem) => {
          if (currentItemIndex !== null) {
            updateItemRow(currentItemIndex, 'item_code', selectedItem.item_code);
            updateItemRow(currentItemIndex, 'item_name', selectedItem.item_name);
          }
          setShowItemDialog(false);
          setCurrentItemIndex(null);
        }}
        showStock
      />
    </div>
  );
}
