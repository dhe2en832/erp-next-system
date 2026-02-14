'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface SalesPerson {
  name: string;
  full_name: string;
  email?: string;
  category?: string;
}

export default function SalesPersonList() {
  const router = useRouter();
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchSalesPersons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/sales/sales-persons?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setSalesPersons(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data sales person');
      }
    } catch (err) {
      console.error('Error fetching sales persons:', err);
      setError('Gagal memuat data sales person');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSalesPersons();
  }, [fetchSalesPersons]);

  if (loading) {
    return <LoadingSpinner message="Memuat data sales person..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Person</h1>
          <p className="text-sm text-gray-500">Kelola data master sales person</p>
        </div>
        <button
          onClick={() => router.push('/sales-persons/spMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Sales Person
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari sales person..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesPersons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {search ? 'Tidak ada sales person yang cocok dengan pencarian' : 'Belum ada data sales person'}
                </td>
              </tr>
            ) : (
              salesPersons.map((sp) => (
                <tr key={sp.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/sales-persons/spMain?name=${encodeURIComponent(sp.name)}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{sp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sp.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sp.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sp.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/sales-persons/spMain?name=${encodeURIComponent(sp.name)}`); }}
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
