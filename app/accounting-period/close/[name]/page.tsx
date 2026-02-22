'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '../../../components/LoadingSpinner';
import type { AccountingPeriod, ValidationResult } from '../../../../types/accounting-period';

export default function ClosingWizardPage() {
  const router = useRouter();
  const params = useParams();
  const periodName = params.name as string;

  const [period, setPeriod] = useState<AccountingPeriod | null>(null);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [allPassed, setAllPassed] = useState(false);

  useEffect(() => {
    if (periodName) {
      fetchPeriodAndValidate();
    }
  }, [periodName]);

  const fetchPeriodAndValidate = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch period details
      const periodResponse = await fetch(
        `/api/accounting-period/periods/${encodeURIComponent(periodName)}`,
        { credentials: 'include' }
      );
      const periodData = await periodResponse.json();

      if (!periodData.success) {
        setError(periodData.message || 'Gagal memuat detail periode');
        setLoading(false);
        return;
      }

      setPeriod(periodData.data);

      // Run validations
      await runValidations(periodData.data);
    } catch (err) {
      console.error('Error fetching period:', err);
      setError('Gagal memuat detail periode');
    } finally {
      setLoading(false);
    }
  };

  const runValidations = async (periodData: AccountingPeriod) => {
    setValidating(true);
    setError('');

    try {
      const response = await fetch('/api/accounting-period/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          period_name: periodData.name,
          company: periodData.company,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setValidations(data.validations || []);
        setAllPassed(data.all_passed || false);
      } else {
        setError(data.error || 'Gagal menjalankan validasi');
      }
    } catch (err) {
      console.error('Error running validations:', err);
      setError('Gagal menjalankan validasi');
    } finally {
      setValidating(false);
    }
  };

  const handleProceed = () => {
    if (!period) return;
    
    // Navigate to step 2 (review balances)
    router.push(`/accounting-period/close/${encodeURIComponent(period.name)}/review`);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (passed: boolean) => {
    if (passed) {
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getValidationExplanation = (checkName: string, passed: boolean, severity: string) => {
    const explanations: Record<string, { error: string; warning: string; info: string }> = {
      'No Draft Transactions': {
        error: '❌ Ada transaksi yang masih dalam status draft (belum di-submit). Transaksi draft tidak akan tercatat dalam laporan keuangan dan harus di-submit terlebih dahulu sebelum periode ditutup.',
        warning: '⚠️ Periksa apakah ada transaksi draft yang perlu di-submit.',
        info: '✅ Semua transaksi sudah di-submit. Tidak ada transaksi draft yang tertinggal.'
      },
      'All Transactions Posted': {
        error: '❌ Ada transaksi yang sudah di-submit tetapi belum memiliki GL Entry (General Ledger Entry). Ini berarti transaksi belum tercatat di buku besar dan akan menyebabkan laporan keuangan tidak akurat.',
        warning: '⚠️ Periksa transaksi yang belum memiliki GL Entry.',
        info: '✅ Semua transaksi sudah memiliki GL Entry. Semua transaksi tercatat dengan benar di buku besar.'
      },
      'Bank Reconciliation Complete': {
        error: '❌ Sistem tidak dapat memeriksa rekonsiliasi bank. Ini mungkin karena tidak ada akun bank yang terdaftar atau terjadi error saat mengecek.',
        warning: '⚠️ Ada transaksi bank yang belum direkonsiliasi (clearance_date belum diisi). Rekonsiliasi bank memastikan bahwa saldo di sistem sesuai dengan saldo di bank. Anda tetap bisa melanjutkan, tetapi disarankan untuk melakukan rekonsiliasi terlebih dahulu.',
        info: '✅ Semua transaksi bank sudah direkonsiliasi. Saldo di sistem sesuai dengan saldo di bank.'
      },
      'Sales Invoices Processed': {
        error: '❌ Ada Sales Invoice (Faktur Penjualan) yang masih draft. Faktur penjualan draft belum tercatat sebagai pendapatan dan piutang. Submit semua faktur penjualan sebelum menutup periode.',
        warning: '⚠️ Periksa faktur penjualan yang masih draft.',
        info: '✅ Semua faktur penjualan sudah diproses (di-submit).'
      },
      'Purchase Invoices Processed': {
        error: '❌ Ada Purchase Invoice (Faktur Pembelian) yang masih draft. Faktur pembelian draft belum tercatat sebagai beban dan hutang. Submit semua faktur pembelian sebelum menutup periode.',
        warning: '⚠️ Periksa faktur pembelian yang masih draft.',
        info: '✅ Semua faktur pembelian sudah diproses (di-submit).'
      },
      'Inventory Transactions Posted': {
        error: '❌ Ada Stock Entry (Transaksi Persediaan) yang masih draft. Transaksi persediaan draft belum mempengaruhi nilai persediaan dan HPP (Harga Pokok Penjualan). Submit semua transaksi persediaan sebelum menutup periode.',
        warning: '⚠️ Periksa transaksi persediaan yang masih draft.',
        info: '✅ Semua transaksi persediaan sudah diposting.'
      },
      'Payroll Entries Recorded': {
        error: '❌ Sistem tidak dapat memeriksa entri payroll. Ini mungkin karena tidak ada data payroll atau terjadi error saat mengecek.',
        warning: '⚠️ Ada Salary Slip (Slip Gaji) yang masih draft. Slip gaji draft belum tercatat sebagai beban gaji. Anda tetap bisa melanjutkan jika memang belum ada payroll di periode ini, tetapi jika ada, sebaiknya di-submit terlebih dahulu.',
        info: '✅ Semua entri payroll sudah tercatat.'
      }
    };

    const explanation = explanations[checkName];
    if (!explanation) return 'Tidak ada penjelasan tersedia.';

    // If validation passed, always show info (success) message
    if (passed) return explanation.info;
    
    // If validation failed, show error or warning based on severity
    if (severity === 'error') return explanation.error;
    if (severity === 'warning') return explanation.warning;
    return explanation.info;
  };

  const errorValidations = validations.filter(v => !v.passed && v.severity === 'error');
  const warningValidations = validations.filter(v => !v.passed && v.severity === 'warning');
  const canProceed = allPassed || errorValidations.length === 0;

  if (loading) {
    return <LoadingSpinner message="Memuat wizard penutupan..." />;
  }

  if (error && !period) {
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
              {period?.period_name} - Langkah 1: Validasi
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className="flex items-center text-indigo-600">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-semibold">
              1
            </div>
            <span className="ml-3 text-sm font-medium">Validasi</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center text-gray-400">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-semibold">
              2
            </div>
            <span className="ml-3 text-sm font-medium">Review Saldo</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center text-gray-400">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-semibold">
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

      {/* Validation Status Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Status Validasi</h2>
          <button
            onClick={() => period && runValidations(period)}
            disabled={validating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {validating ? 'Memvalidasi...' : 'Jalankan Ulang'}
          </button>
        </div>

        {validating ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner message="Menjalankan validasi..." />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium">Total Pemeriksaan</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{validations.length}</p>
              </div>
              <div className={`border rounded-lg p-4 ${
                errorValidations.length === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-medium ${
                  errorValidations.length === 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Error
                </p>
                <p className={`text-3xl font-bold mt-2 ${
                  errorValidations.length === 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {errorValidations.length}
                </p>
              </div>
              <div className={`border rounded-lg p-4 ${
                warningValidations.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-sm font-medium ${
                  warningValidations.length === 0 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  Warning
                </p>
                <p className={`text-3xl font-bold mt-2 ${
                  warningValidations.length === 0 ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {warningValidations.length}
                </p>
              </div>
            </div>

            {/* Overall Status */}
            {allPassed ? (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Semua Validasi Berhasil
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Periode ini siap untuk ditutup. Anda dapat melanjutkan ke langkah berikutnya.
                    </p>
                  </div>
                </div>
              </div>
            ) : errorValidations.length > 0 ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {errorValidations.length} Validasi Gagal
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      Harap selesaikan semua masalah error sebelum melanjutkan penutupan periode.
                    </p>
                  </div>
                </div>
              </div>
            ) : warningValidations.length > 0 ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {warningValidations.length} Warning Ditemukan
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Anda dapat melanjutkan, tetapi disarankan untuk meninjau warning ini terlebih dahulu.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Info Box - Penjelasan Error vs Warning */}
            {!validating && validations.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Perbedaan ERROR dan WARNING
                    </h3>
                    <div className="text-sm text-blue-700 mt-2 space-y-2">
                      <p>
                        <span className="font-semibold">🔴 ERROR:</span> Masalah kritis yang HARUS diselesaikan sebelum periode dapat ditutup. 
                        Jika ada error, tombol "Lanjut" akan dinonaktifkan sampai semua error diperbaiki.
                      </p>
                      <p>
                        <span className="font-semibold">🟡 WARNING:</span> Peringatan yang sebaiknya ditinjau, tetapi tidak menghalangi penutupan periode. 
                        Anda tetap bisa melanjutkan jika yakin warning tersebut tidak masalah (misalnya memang belum ada payroll di periode ini).
                      </p>
                      <p>
                        <span className="font-semibold">🟢 INFO:</span> Validasi berhasil, tidak ada masalah ditemukan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Validation Results */}
      {!validating && validations.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Hasil Validasi Detail</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {validations.map((validation, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(validation.passed)}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {validation.check_name}
                      </h3>
                      {!validation.passed && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadge(validation.severity)}`}>
                          {validation.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${
                      validation.passed ? 'text-green-600' : 'text-gray-700'
                    }`}>
                      {validation.message}
                    </p>
                    
                    {/* Explanation for each validation */}
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                      {getValidationExplanation(validation.check_name, validation.passed, validation.severity)}
                    </div>
                    
                    {/* Show details if validation failed */}
                    {!validation.passed && validation.details && validation.details.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            const detailsEl = document.getElementById(`details-${index}`);
                            if (detailsEl) {
                              detailsEl.classList.toggle('hidden');
                            }
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Lihat Detail ({validation.details.length} item)
                        </button>
                        <div id={`details-${index}`} className="hidden mt-2 bg-gray-50 rounded-lg p-4">
                          <div className="max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  {Object.keys(validation.details[0] || {}).map((key) => (
                                    <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {validation.details.slice(0, 10).map((detail, detailIndex) => (
                                  <tr key={detailIndex}>
                                    {Object.values(detail).map((value, valueIndex) => (
                                      <td key={valueIndex} className="px-3 py-2 text-xs text-gray-900">
                                        {String(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {validation.details.length > 10 && (
                              <p className="text-xs text-gray-500 mt-2">
                                ... dan {validation.details.length - 10} item lainnya
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push(`/accounting-period/${encodeURIComponent(periodName)}`)}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          Batal
        </button>
        <button
          onClick={handleProceed}
          disabled={!canProceed || validating}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lanjut ke Review Saldo →
        </button>
      </div>

      {!canProceed && (
        <p className="text-sm text-red-600 text-right mt-2">
          Selesaikan semua error untuk melanjutkan
        </p>
      )}
    </div>
  );
}
