'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

interface Supplier {
  name: string;
  supplier_name: string;
  supplier_group?: string;
  supplier_type?: string;
  country?: string;
  mobile_no?: string;
}

const PAGE_SIZE = 20;

export default function SupplierList() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const start = (currentPage - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), start: String(start) });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/purchase/suppliers?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.data || []);
        setTotalRecords(data.total || data.data?.length || 0);
      } else {
        setError(data.message || 'Gagal memuat data pemasok');
      }
    } catch {
      setError('Gagal memuat data pemasok');
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) {
    return <LoadingSpinner message="Memuat data pemasok..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pemasok</h1>
          <p className="text-sm text-gray-500">Kelola data master pemasok</p>
        </div>
        <button
          onClick={() => router.push('/suppliers/suppMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Pemasok
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari pemasok..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Pemasok</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negara</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {search ? 'Tidak ada pemasok yang cocok dengan pencarian' : 'Belum ada data pemasok'}
                </td>
              </tr>
            ) : (
              suppliers.map((supp) => (
                <tr key={supp.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/suppliers/suppMain?name=${encodeURIComponent(supp.name)}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{supp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supp.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supp.supplier_type || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supp.country || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/suppliers/suppMain?name=${encodeURIComponent(supp.name)}`); }}
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
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalRecords / PAGE_SIZE)}
          totalRecords={totalRecords}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
