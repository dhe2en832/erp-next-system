'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import type { AccountingPeriod, ClosePeriodResponse } from '../../../../../types/accounting-period';

interface PreviewData {
  period: AccountingPeriod;
  total_income: number;
  total_expense: number;
  net_income: number;
  journal_entry_count: number;
}

export default function ConfirmClosePage() {
  const router = useRouter();
  const params = useParams();
  const periodName = params.name as string;

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [closingProgress, setClosingProgress] = useState(0);
  const [closingStep, setClosingStep] = useState('');
  const [closeResult, setCloseResult] = useState<ClosePeriodResponse | null>(null);

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
        setError(data.message || 'Gagal memuat data periode');
        setLoading(false);
        return;
      }

      setPreviewData({
        period: data.data.period,
        total_income: data.data.total_income,
        total_expense: data.data.total_expense,
        net_income: data.data.net_income,
        journal_entry_count: data.data.journal_accounts?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching preview data:', err);
      setError('Gagal memuat data periode');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!previewData) return;

    setClosing(true);
    setError('');
    setClosingProgress(0);
    setClosingStep('Memulai proses penutupan...');

    try {
      // Simulate progress steps
      setClosingProgress(20);
      setClosingStep('Memvalidasi data periode...');
      
      await new Promise(resolve => setTimeout(resolve, 500));

      setClosingProgress(40);
      setClosingStep('Membuat jurnal penutup...');

      // Call the close API
      const response = await fetch('/api/accounting-period/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          period_name: previewData.period.name,
          company: previewData.period.company,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || data.error || 'Gagal menutup periode');
        setClosing(false);
        setShowConfirmDialog(false);
        return;
      }

      setClosingProgress(70);
      setClosingStep('Menyimpan snapshot saldo...');
      
      await new Promise(resolve => setTimeout(resolve, 500));

      setClosingProgress(90);
      setClosingStep('Menyelesaikan penutupan...');
      
      await new Promise(resolve => setTimeout(resolve, 500));

      setClosingProgress(100);
      setClosingStep('Penutupan berhasil!');
      setCloseResult(data);

      // Wait a moment before showing success
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Error closing period:', err);
      setError('Gagal menutup periode. Silakan coba lagi.');
      setClosing(false);
      setShowConfirmDialog(false);
    }
  };

  const handleBack = () => {
    router.push(`/accounting-period/close/${encodeURIComponent(periodName)}/preview`);
  };

  const handleViewPeriod = () => {
    if (!previewData) return;
    router.push(`/accounting-period/${encodeURIComponent(previewData.period.name)}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data periode..." />;
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

  // Show success screen if closing is complete
  if (closeResult) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Periode Berhasil Ditutup!
            </h2>
            <p className="text-gray-600 mb-6">
              Periode {previewData?.period.period_name} telah ditutup dengan sukses.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Penutupan</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Periode:</span>
                  <span className="font-medium text-gray-900">{previewData?.period.period_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal Periode:</span>
                  <span className="font-medium text-gray-900">
                    {previewData && formatDate(previewData.period.start_date)} - {previewData && formatDate(previewData.period.end_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pendapatan:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(previewData?.total_income || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Beban:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(previewData?.total_expense || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="text-gray-900 font-semibold">
                    {(previewData?.net_income || 0) >= 0 ? 'Laba Bersih:' : 'Rugi Bersih:'}
                  </span>
                  <span className={`font-bold ${
                    (previewData?.net_income || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(Math.abs(previewData?.net_income || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jurnal Penutup:</span>
                  <span className="font-medium text-gray-900">
                    {closeResult.data.closing_journal?.name || 'Dibuat'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleViewPeriod}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Lihat Detail Periode
              </button>
              <button
                onClick={() => router.push('/accounting-period')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Kembali ke Daftar Periode
              </button>
            </div>
          </div>
        </div>
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
              {previewData?.period.period_name} - Langkah 4: Konfirmasi & Penutupan
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
          <div className="flex items-center text-green-600">
            <div className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-semibold">
              ✓
            </div>
            <span className="ml-3 text-sm font-medium">Preview Jurnal</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-600 mx-4"></div>
          <div className="flex items-center text-indigo-600">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-semibold">
              4
            </div>
            <span className="ml-3 text-sm font-medium">Konfirmasi</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Closing Progress */}
      {closing && (
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="text-center">
            <div className="mb-4">
              <LoadingSpinner message={closingStep} />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${closingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {closingProgress}% selesai
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Summary */}
      {!closing && (
        <>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Penutupan</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nama Periode</p>
                  <p className="text-base font-medium text-gray-900">{previewData?.period.period_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipe Periode</p>
                  <p className="text-base font-medium text-gray-900">{previewData?.period.period_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tanggal Mulai</p>
                  <p className="text-base font-medium text-gray-900">
                    {previewData && formatDate(previewData.period.start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tanggal Akhir</p>
                  <p className="text-base font-medium text-gray-900">
                    {previewData && formatDate(previewData.period.end_date)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Total Pendapatan</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      {formatCurrency(previewData?.total_income || 0)}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 font-medium">Total Beban</p>
                    <p className="text-xl font-bold text-red-900 mt-1">
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
                    <p className={`text-xl font-bold mt-1 ${
                      (previewData?.net_income || 0) >= 0 ? 'text-blue-900' : 'text-orange-900'
                    }`}>
                      {formatCurrency(Math.abs(previewData?.net_income || 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600">Jurnal Penutup</p>
                <p className="text-base font-medium text-gray-900">
                  {previewData?.journal_entry_count || 0} entri akan dibuat
                </p>
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Peringatan Penting
                </h3>
                <div className="text-sm text-yellow-700 mt-2">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Setelah periode ditutup, transaksi tidak dapat dibuat atau diubah pada periode ini</li>
                    <li>Jurnal penutup akan dibuat secara otomatis dan diposting</li>
                    <li>Saldo akun nominal akan ditutup ke laba ditahan</li>
                    <li>Periode dapat dibuka kembali oleh administrator jika diperlukan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              disabled={closing}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
            >
              ← Kembali ke Preview Jurnal
            </button>
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={closing}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              Tutup Periode Sekarang
            </button>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Konfirmasi Penutupan Periode
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Apakah Anda yakin ingin menutup periode <span className="font-semibold">{previewData?.period.period_name}</span>?
                Tindakan ini akan membuat jurnal penutup dan mengubah status periode menjadi "Ditutup".
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    handleClosePeriod();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Ya, Tutup Periode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
