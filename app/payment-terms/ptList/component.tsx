'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PaymentTermsTemplate {
  name: string;
  template_name?: string;
  terms?: Array<{
    payment_term: string;
    invoice_portion: number;
    credit_days: number;
  }>;
}

export default function PaymentTermsList() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PaymentTermsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPaymentTerms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/setup/payment-terms', { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data termin pembayaran');
      }
    } catch (err) {
      console.error('Error fetching payment terms:', err);
      setError('Gagal memuat data termin pembayaran');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentTerms();
  }, [fetchPaymentTerms]);

  if (loading) {
    return <LoadingSpinner message="Memuat data termin pembayaran..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Termin Pembayaran</h1>
          <p className="text-sm text-gray-500">Kelola template termin pembayaran</p>
        </div>
        <button
          onClick={() => router.push('/payment-terms/ptMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Template
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                  Belum ada template termin pembayaran
                </td>
              </tr>
            ) : (
              templates.map((tpl) => (
                <tr key={tpl.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/payment-terms/ptMain?name=${encodeURIComponent(tpl.name)}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{tpl.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/payment-terms/ptMain?name=${encodeURIComponent(tpl.name)}`); }}
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
