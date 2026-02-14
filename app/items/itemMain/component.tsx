'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Item {
  item_code: string;
  item_name: string;
  description: string;
  item_group: string;
  stock_uom: string;
  opening_stock: number;
}

export default function ItemMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemCode = searchParams.get('code');

  const [loading, setLoading] = useState(!!itemCode);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    description: '',
    item_group: 'All Item Groups',
    stock_uom: 'Nos',
    opening_stock: 0,
  });

  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  // Load item details for edit mode
  useEffect(() => {
    if (itemCode) {
      fetchItemDetails(itemCode);
    }
  }, [itemCode]);

  const fetchItemDetails = async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/items/simple?search=${encodeURIComponent(code)}&limit_page_length=1`);
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const item = data.data.find((i: Item) => i.item_code === code) || data.data[0];
        setEditingItem(item);
        setFormData({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description || '',
          item_group: item.item_group || 'All Item Groups',
          stock_uom: item.stock_uom || 'Nos',
          opening_stock: item.opening_stock || 0,
        });
      } else {
        setError('Gagal memuat detail barang');
      }
    } catch {
      setError('Gagal memuat detail barang');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: selectedCompany, ...formData }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Barang ${formData.item_code} berhasil disimpan!`);
        setTimeout(() => router.push('/items/itemList'), 2000);
      } else {
        setError(data.message || 'Gagal menyimpan barang');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat detail barang..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {editingItem ? 'Perbarui informasi barang' : 'Tambahkan barang baru ke sistem'}
              </p>
            </div>
            <button
              onClick={() => router.push('/items/itemList')}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Kode Barang</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  readOnly={!!editingItem}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Barang</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Grup Barang</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.item_group}
                    onChange={(e) => setFormData({ ...formData, item_group: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Satuan Stok</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.stock_uom}
                    onChange={(e) => setFormData({ ...formData, stock_uom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stok Awal</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => router.push('/items/itemList')}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {formLoading ? 'Memproses...' : editingItem ? 'Perbarui Barang' : 'Simpan Barang'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
