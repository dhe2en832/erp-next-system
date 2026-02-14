'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface StockEntry {
  item_code: string;
  item_name?: string;
  warehouse: string;
  actual_qty: number;
  stock_value?: number;
  stock_uom?: string;
}

export default function StockBalancePage() {
  const [data, setData] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ company: selectedCompany });
      const response = await fetch(`/api/inventory/reports/stock-balance?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat data stok per gudang');
      }
    } catch (err) {
      console.error('Error fetching stock balance:', err);
      setError('Gagal memuat data stok per gudang');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  const totalQty = data.reduce((sum, e) => sum + (e.actual_qty || 0), 0);
  const totalValue = data.reduce((sum, e) => sum + (e.stock_value || 0), 0);

  if (loading) return <LoadingSpinner message="Memuat data stok per gudang..." />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stok per Gudang</h1>
        <p className="text-sm text-gray-500">Ringkasan saldo stok per gudang</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Item</p>
          <p className="text-2xl font-bold text-blue-900">{data.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Nilai Stok</p>
          <p className="text-2xl font-bold text-green-900">Rp {totalValue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Barang</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gudang</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UoM</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai Stok</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada data stok</td></tr>
            ) : (
              data.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">{entry.item_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.item_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.warehouse}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{entry.actual_qty}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.stock_uom || 'Nos'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">Rp {(entry.stock_value || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
