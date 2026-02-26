'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import type { AccountingPeriod, ClosingJournalAccount } from '../../../../../types/accounting-period';

interface EnrichedClosingJournalAccount extends ClosingJournalAccount {
  account_name?: string;
}

interface PreviewData {
  period: AccountingPeriod;
  journal_accounts: EnrichedClosingJournalAccount[];
  total_income: number;
  total_expense: number;
  net_income: number;
  retained_earnings_account: string;
}

export default function PreviewJournalPage() {
  const router = useRouter();
  const params = useParams();
  const periodName = params.name as string;

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (periodName) {
      fetchPreviewData();
    }
  }, [periodName]);

  const fetchPreviewData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/accounting-period/preview-closing/${encodeURIComponent(periodName)}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Gagal memuat preview jurnal penutup');
        setLoading(false);
        return;
      }

      setPreviewData(data.data);
    } catch (err) {
      console.error('Error fetching preview data:', err);
      setError('Gagal memuat preview jurnal penutup');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/accounting-period/close/${encodeURIComponent(periodName)}/review`);
  };

  const handleProceed = () => {
    if (!previewData) return;
    router.push(`/accounting-period/close/${encodeURIComponent(previewData.period.name)}/confirm`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals for verification
  const totalDebit = previewData?.journal_accounts.reduce(
    (sum, entry) => sum + entry.debit_in_account_currency,
    0
  ) || 0;

  const totalCredit = previewData?.journal_accounts.reduce(
    (sum, entry) => sum + entry.credit_in_account_currency,
    0
  ) || 0;

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  if (loading) {
    return <LoadingSpinner message="Memuat preview jurnal penutup..." />;
  }

  if (error && !previewData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 hover:text-indigo-900"
        >
          ← Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/accounting-period/${encodeURIComponent(periodName)}`)}
          className="text-indigo-600 hover:text-indigo-900 mb-2 text-sm"
        >
          ← Kembali ke Detail Periode
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wizard Penutupan Periode</h1>
            <p className="text-sm text-gray-500 mt-1">
              {previewData?.period.period_name} - Langkah 3: Preview Jurnal
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className="flex items-center text-green-600">
            <div className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-semibold">
              ✓
            </div>
            <span className="ml-3 text-sm font-medium">Validasi</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-600 mx-4"></div>
          <div className="flex items-center text-green-600">
            <div className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-semibold">
              ✓
            </div>
            <span className="ml-3 text-sm font-medium">Review Saldo</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-600 mx-4"></div>
          <div className="flex items-center text-indigo-600">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-semibold">
              3
            </div>
            <span className="ml-3 text-sm font-medium">Preview Jurnal</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center text-gray-400">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-semibold">
              4
            </div>
            <span className="ml-3 text-sm font-medium">Konfirmasi</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Pendapatan</p>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {formatCurrency(previewData?.total_income || 0)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total Beban</p>
          <p className="text-2xl font-bold text-red-900 mt-2">
            {formatCurrency(previewData?.total_expense || 0)}
          </p>
        </div>
        <div className={`border rounded-lg p-4 ${
          (previewData?.net_income || 0) >= 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <p className={`text-sm font-medium ${
            (previewData?.net_income || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
          }`}>
            {(previewData?.net_income || 0) >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
          </p>
          <p className={`text-2xl font-bold mt-2 ${
            (previewData?.net_income || 0) >= 0 ? 'text-blue-900' : 'text-orange-900'
          }`}>
            {formatCurrency(Math.abs(previewData?.net_income || 0))}
          </p>
        </div>
      </div>

      {/* Journal Entry Preview */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Preview Jurnal Penutup</h2>
          <p className="text-sm text-gray-500 mt-1">
            Jurnal ini akan dibuat secara otomatis saat periode ditutup
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akun
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kredit
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData?.journal_accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada entri jurnal
                  </td>
                </tr>
              ) : (
                previewData?.journal_accounts.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{entry.account_name || entry.account}</div>
                      <div className="text-xs text-gray-500">{entry.account}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.user_remark}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {entry.debit_in_account_currency > 0
                        ? formatCurrency(entry.debit_in_account_currency)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {entry.credit_in_account_currency > 0
                        ? formatCurrency(entry.credit_in_account_currency)
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                  Total:
                </td>
                <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
              {!isBalanced && (
                <tr>
                  <td colSpan={4} className="px-6 py-3">
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                      ⚠️ Peringatan: Total debit dan kredit tidak seimbang!
                    </div>
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Balance Verification */}
      {isBalanced && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Jurnal Seimbang
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Total debit dan kredit seimbang. Jurnal siap untuk diposting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Tentang Jurnal Penutup
            </h3>
            <div className="text-sm text-blue-700 mt-2">
              <ul className="list-disc list-inside space-y-1">
                <li>Semua akun pendapatan akan di-debit untuk menutup saldo ke nol</li>
                <li>Semua akun beban akan di-kredit untuk menutup saldo ke nol</li>
                <li>Laba/rugi bersih akan dipindahkan ke akun laba ditahan</li>
                <li>Jurnal akan diposting secara otomatis dengan tanggal akhir periode</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          ← Kembali ke Review Saldo
        </button>
        <button
          onClick={handleProceed}
          disabled={!isBalanced}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lanjut ke Konfirmasi →
        </button>
      </div>

      {!isBalanced && (
        <p className="text-sm text-red-600 text-right mt-2">
          Jurnal tidak seimbang. Harap periksa kembali.
        </p>
      )}
    </div>
  );
}
