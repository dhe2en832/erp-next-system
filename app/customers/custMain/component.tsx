'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface CustomerFormData {
  customer_name: string;
  customer_type: string;
  customer_group: string;
  territory: string;
  tax_id: string;
  mobile_no: string;
  email_id: string;
  default_currency: string;
  default_price_list: string;
}

export default function CustomerMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerName = searchParams.get('name');

  const [loading, setLoading] = useState(!!customerName);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>({
    customer_name: '',
    customer_type: 'Company',
    customer_group: 'All Customer Groups',
    territory: 'All Territories',
    tax_id: '',
    mobile_no: '',
    email_id: '',
    default_currency: 'IDR',
    default_price_list: 'Standard Selling',
  });

  useEffect(() => {
    if (customerName) {
      setIsEditMode(true);
      fetchCustomerDetail(customerName);
    }
  }, [customerName]);

  const fetchCustomerDetail = async (name: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/customers/customer/${encodeURIComponent(name)}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success && data.data) {
        const c = data.data;
        setFormData({
          customer_name: c.customer_name || '',
          customer_type: c.customer_type || 'Company',
          customer_group: c.customer_group || 'All Customer Groups',
          territory: c.territory || 'All Territories',
          tax_id: c.tax_id || '',
          mobile_no: c.mobile_no || '',
          email_id: c.email_id || '',
          default_currency: c.default_currency || 'IDR',
          default_price_list: c.default_price_list || 'Standard Selling',
        });
      } else {
        setError('Gagal memuat detail pelanggan');
      }
    } catch (err) {
      console.error('Error fetching customer detail:', err);
      setError('Gagal memuat detail pelanggan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const url = isEditMode
        ? `/api/sales/customers/customer/${encodeURIComponent(customerName!)}`
        : '/api/sales/customers';

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(isEditMode ? 'Pelanggan berhasil diperbarui!' : 'Pelanggan berhasil ditambahkan!');
        setTimeout(() => router.push('/customers'), 1500);
      } else {
        setError(data.message || 'Gagal menyimpan pelanggan');
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('Gagal menyimpan pelanggan');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data pelanggan..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
          </h1>
          {isEditMode && <p className="text-sm text-gray-500">{customerName}</p>}
        </div>
        <button
          onClick={() => router.push('/customers')}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          Kembali
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan *</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan nama pelanggan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pelanggan</label>
            <select
              value={formData.customer_type}
              onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Company">Perusahaan</option>
              <option value="Individual">Perorangan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grup Pelanggan</label>
            <input
              type="text"
              value={formData.customer_group}
              onChange={(e) => setFormData({ ...formData, customer_group: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah</label>
            <input
              type="text"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NPWP / Tax ID</label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan NPWP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <input
              type="text"
              value={formData.mobile_no}
              onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan nomor telepon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email_id}
              onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
            <input
              type="text"
              value={formData.default_currency}
              onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {formLoading ? 'Menyimpan...' : (isEditMode ? 'Perbarui' : 'Simpan')}
          </button>
        </div>
      </form>
    </div>
  );
}
