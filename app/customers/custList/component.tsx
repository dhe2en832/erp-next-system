'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Customer {
  name: string;
  customer_name: string;
  customer_group?: string;
  territory?: string;
  mobile_no?: string;
  email_id?: string;
}

export default function CustomerList() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/sales/customers?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data pelanggan');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (loading) {
    return <LoadingSpinner message="Memuat data pelanggan..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
          <p className="text-sm text-gray-500">Kelola data master pelanggan</p>
        </div>
        <button
          onClick={() => router.push('/customers/custMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Pelanggan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Pelanggan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grup</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wilayah</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telepon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {search ? 'Tidak ada pelanggan yang cocok dengan pencarian' : 'Belum ada data pelanggan'}
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/customers/custMain?name=${encodeURIComponent(cust.name)}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{cust.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cust.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cust.customer_group || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cust.territory || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cust.mobile_no || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/customers/custMain?name=${encodeURIComponent(cust.name)}`); }}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Lihat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
