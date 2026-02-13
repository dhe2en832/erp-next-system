'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarehouseMain() {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newWarehouse, setNewWarehouse] = useState({
    warehouse_name: '',
    is_group: false,
    parent_warehouse: ''
  });

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  const handleCreateWarehouse = async () => {
    if (!selectedCompany || !newWarehouse.warehouse_name) {
      setError('Nama gudang harus diisi');
      return;
    }

    try {
      const response = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newWarehouse, company: selectedCompany }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Gudang "${newWarehouse.warehouse_name}" berhasil dibuat!`);
        setTimeout(() => router.push('/warehouse/whList'), 2000);
      } else {
        setError(data.message || 'Gagal membuat gudang');
      }
    } catch {
      setError('Terjadi kesalahan saat membuat gudang');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buat Gudang Baru</h1>
              <p className="mt-1 text-sm text-gray-600">Tambahkan lokasi gudang baru ke sistem</p>
            </div>
            <button
              onClick={() => router.push('/warehouse/whList')}
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
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Gudang *</label>
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={newWarehouse.warehouse_name}
                onChange={(e) => setNewWarehouse(prev => ({ ...prev, warehouse_name: e.target.value }))}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={newWarehouse.is_group}
                onChange={(e) => setNewWarehouse(prev => ({ ...prev, is_group: e.target.checked }))}
              />
              <label className="ml-2 block text-sm text-gray-900">Gudang Grup</label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => router.push('/warehouse/whList')}
                className="w-full sm:w-auto bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateWarehouse}
                className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]"
              >
                Buat Gudang
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
