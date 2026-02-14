'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

interface Item {
  item_code: string;
  item_name: string;
  description: string;
  item_group: string;
  stock_uom: string;
  opening_stock: number;
}

export default function ItemList() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20);

  const fetchItems = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/inventory/items/simple?${params}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.data || []);
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
        setError('');
      } else {
        setError('Gagal memuat daftar barang: ' + data.message);
      }
    } catch {
      setError('Gagal memuat daftar barang');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (loading) {
    return <LoadingSpinner message="Memuat Daftar Barang..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Barang</h1>
        <button
          onClick={() => router.push('/items/itemMain')}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]"
        >
          Tambah Barang Baru
        </button>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Cari Barang</label>
        <input
          type="text"
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Cari kode atau nama barang..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {items.map((item) => (
            <li
              key={item.item_code}
              onClick={() => router.push(`/items/itemMain?code=${encodeURIComponent(item.item_code)}`)}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">{item.item_code}</p>
                    <p className="mt-1 text-sm text-gray-900">{item.item_name}</p>
                    <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {item.stock_uom}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <p className="flex items-center text-sm text-gray-500">Grup: {item.item_group}</p>
                  <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">Stok Awal: {item.opening_stock}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <div className="text-center py-12"><p className="text-gray-500">Tidak ada barang ditemukan</p></div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={totalRecords} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
