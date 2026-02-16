'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function WarehouseMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const warehouseName = searchParams.get('name');
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [isEdit, setIsEdit] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    warehouse_name: '',
    is_group: false,
    parent_warehouse: '',
    company: ''
  });

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  // Load warehouse data for edit mode
  useEffect(() => {
    if (warehouseName) {
      setIsEdit(true);
      const warehouseData = {
        name: warehouseName || '',
        warehouse_name: searchParams.get('warehouse_name') || '',
        is_group: searchParams.get('is_group') === 'true',
        parent_warehouse: searchParams.get('parent_warehouse') || '',
        company: searchParams.get('company') || ''
      };
      setNewWarehouse(warehouseData);
    }
  }, [warehouseName, searchParams]);

  const handleCreateWarehouse = async () => {
    if (!selectedCompany || !newWarehouse.warehouse_name) {
      setError('Nama gudang harus diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEdit ? '/api/inventory/warehouses' : '/api/inventory/warehouses';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newWarehouse, company: selectedCompany }),
      });
      const data = await response.json();

      if (data.success) {
        const action = isEdit ? 'diperbarui' : 'dibuat';
        setAlertType('success');
        setAlertMessage(`Gudang "${newWarehouse.warehouse_name}" berhasil ${action}!`);
        setShowAlert(true);
        setSuccessMessage(`Gudang "${newWarehouse.warehouse_name}" berhasil ${action}!`);
        
        if (!isEdit) {
          // Reset form only for create
          setNewWarehouse({
            name: '',
            warehouse_name: '',
            is_group: false,
            parent_warehouse: '',
            company: ''
          });
        }
      } else {
        setAlertType('error');
        setAlertMessage(data.message || 'Gagal membuat gudang');
        setShowAlert(true);
      }
    } catch {
      setAlertType('error');
      setAlertMessage('Terjadi kesalahan saat membuat gudang');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Alert Dialog */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              {alertType === 'success' ? (
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              <h3 className={`text-lg font-semibold ${alertType === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {alertType === 'success' ? 'Berhasil!' : 'Error!'}
              </h3>
            </div>
            <p className={`text-sm mb-6 ${alertType === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {alertMessage}
            </p>
            <div className="flex justify-end space-x-3">
              {alertType === 'success' && (
                <button
                  onClick={() => {
                    setShowAlert(false);
                    router.push('/warehouse/whList');
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                >
                  OK
                </button>
              )}
              {alertType === 'error' && (
                <button
                  onClick={() => setShowAlert(false)}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEdit ? 'Edit Gudang' : 'Buat Gudang Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isEdit ? 'Perbarui informasi gudang' : 'Tambahkan lokasi gudang baru ke sistem'}
              </p>
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
                disabled={loading}
                className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {loading ? 'Memproses...' : (isEdit ? 'Perbarui Gudang' : 'Buat Gudang')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
