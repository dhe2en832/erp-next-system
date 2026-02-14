'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PayableInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  grand_total: number;
  custom_total_komisi_sales: number;
  custom_commission_paid: number;
  status: string;
}

export default function CommissionPaymentList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  const fetchPayableInvoices = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ company: selectedCompany });
      const response = await fetch(`/api/finance/commission/payable-invoices?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data komisi');
      }
    } catch (err) {
      console.error('Error fetching payable invoices:', err);
      setError('Gagal memuat data komisi');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchPayableInvoices();
  }, [selectedCompany, fetchPayableInvoices]);

  const totalCommission = invoices.reduce((sum, inv) => sum + (inv.custom_total_komisi_sales || 0), 0);

  if (!selectedCompany) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">Perusahaan Belum Dipilih</h3>
          <p className="text-yellow-600 mt-2">Silakan pilih perusahaan terlebih dahulu.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Memuat data komisi yang belum dibayar..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Komisi Sales</h1>
          <p className="text-sm text-gray-500">Faktur penjualan lunas dengan komisi belum dibayar</p>
        </div>
        <button
          onClick={() => router.push('/commission-payment/cpMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Bayar Komisi
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Jumlah Faktur</p>
          <p className="text-2xl font-bold text-blue-900">{invoices.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Total Komisi Terhutang</p>
          <p className="text-2xl font-bold text-orange-900">Rp {totalCommission.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Status</p>
          <p className="text-2xl font-bold text-green-900">Belum Dibayar</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Faktur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Faktur</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Komisi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada faktur dengan komisi yang belum dibayar
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">{inv.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{inv.customer_name || inv.customer}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{inv.posting_date}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">Rp {(inv.grand_total || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-orange-600 text-right">Rp {(inv.custom_total_komisi_sales || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Belum Dibayar
                    </span>
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
