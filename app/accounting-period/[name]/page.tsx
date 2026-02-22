'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { AccountingPeriod, AccountBalance, PeriodClosingLog } from '../../../types/accounting-period';

export default function PeriodDetailPage() {
  const router = useRouter();
  const params = useParams();
  const periodName = params.name as string;

  const [period, setPeriod] = useState<AccountingPeriod | null>(null);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<PeriodClosingLog[]>([]);
  const [closingJournal, setClosingJournal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'balances' | 'journal' | 'audit'>('info');

  useEffect(() => {
    if (periodName) {
      fetchPeriodDetail();
    }
  }, [periodName]);

  const fetchPeriodDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/accounting-period/periods/${encodeURIComponent(periodName)}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (data.success) {
        setPeriod(data.data);
        setAccountBalances(data.data.account_balances || []);
        setClosingJournal(data.data.closing_journal);
        
        // Fetch audit logs
        await fetchAuditLogs();
      } else {
        setError(data.message || 'Gagal memuat detail periode');
      }
    } catch (err) {
      console.error('Error fetching period detail:', err);
      setError('Gagal memuat detail periode');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch(
        `/api/accounting-period/audit-log?period_name=${encodeURIComponent(periodName)}&limit=50`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const handleClose = () => {
    if (!period) return;
    
    // Navigate to closing wizard
    router.push(`/accounting-period/close/${encodeURIComponent(period.name)}`);
  };

  const handleReopen = async () => {
    if (!period) return;
    
    // Different confirmation for permanently closed periods
    if (period.status === 'Permanently Closed') {
      const confirmation = prompt(
        'PERINGATAN: Anda akan membuka kembali periode yang sudah ditutup PERMANEN!\n\n' +
        'Ini adalah tindakan yang sangat serius dan dapat mempengaruhi integritas data keuangan.\n\n' +
        'Ketik "REOPEN PERMANENT" untuk mengkonfirmasi:'
      );
      
      if (confirmation !== 'REOPEN PERMANENT') return;
    }
    
    const reason = prompt('Masukkan alasan pembukaan kembali periode:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/accounting-period/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          period_name: period.name,
          company: period.company,
          reason,
          force_permanent: period.status === 'Permanently Closed'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Periode berhasil dibuka kembali');
        fetchPeriodDetail();
      } else {
        alert(`Gagal membuka kembali periode: ${data.message}`);
      }
    } catch (err) {
      console.error('Error reopening period:', err);
      alert('Gagal membuka kembali periode');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentClose = async () => {
    if (!period) return;
    
    const confirmation = prompt('PERINGATAN: Penutupan permanen tidak dapat dibatalkan!\n\nKetik "PERMANENT" untuk mengkonfirmasi:');
    if (confirmation !== 'PERMANENT') return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/accounting-period/permanent-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          period_name: period.name,
          company: period.company,
          confirmation: 'PERMANENT'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Periode berhasil ditutup permanen');
        fetchPeriodDetail();
      } else {
        alert(`Gagal menutup permanen periode: ${data.message}`);
      }
    } catch (err) {
      console.error('Error permanently closing period:', err);
      alert('Gagal menutup permanen periode');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'Open': 'bg-green-100 text-green-800 border-green-200',
      'Closed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Permanently Closed': 'bg-red-100 text-red-800 border-red-200'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'Open': 'Terbuka',
      'Closed': 'Ditutup',
      'Permanently Closed': 'Ditutup Permanen'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (loading) {
    return <LoadingSpinner message="Memuat detail periode..." />;
  }

  if (error || !period) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Periode tidak ditemukan'}
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
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-900 mb-2 text-sm"
        >
          ← Kembali ke Daftar Periode
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{period.period_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{period.name}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(period.status)}`}>
            {getStatusText(period.status)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex space-x-3">
        {period.status === 'Open' && (
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            Tutup Periode
          </button>
        )}
        {period.status === 'Closed' && (
          <>
            <button
              onClick={handleReopen}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Buka Kembali
            </button>
            <button
              onClick={handlePermanentClose}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Tutup Permanen
            </button>
          </>
        )}
        {period.status === 'Permanently Closed' && (
          <button
            onClick={handleReopen}
            disabled={actionLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            🔓 Buka Kembali Periode Permanen
          </button>
        )}
        <button
          onClick={() => router.push(`/accounting-period/reports/${encodeURIComponent(period.name)}`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          Lihat Laporan
        </button>
      </div>

      {/* Warning for Permanently Closed */}
      {period.status === 'Permanently Closed' && (
        <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                Periode Ditutup Permanen
              </h3>
              <div className="text-sm text-orange-700 mt-2">
                <p>
                  Periode ini telah ditutup secara permanen. Pembukaan kembali periode yang sudah ditutup permanen 
                  memerlukan otorisasi khusus dan harus dilakukan dengan sangat hati-hati karena dapat mempengaruhi 
                  integritas data keuangan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Informasi
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`${
              activeTab === 'balances'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Saldo Akun
          </button>
          {closingJournal && (
            <button
              onClick={() => setActiveTab('journal')}
              className={`${
                activeTab === 'journal'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Jurnal Penutup
            </button>
          )}
          <button
            onClick={() => setActiveTab('audit')}
            className={`${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Audit Trail
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Periode</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Perusahaan</dt>
              <dd className="mt-1 text-sm text-gray-900">{period.company}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipe Periode</dt>
              <dd className="mt-1 text-sm text-gray-900">{period.period_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tanggal Mulai</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(period.start_date).toLocaleDateString('id-ID', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tanggal Akhir</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(period.end_date).toLocaleDateString('id-ID', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </dd>
            </div>
            {period.fiscal_year && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tahun Fiskal</dt>
                <dd className="mt-1 text-sm text-gray-900">{period.fiscal_year}</dd>
              </div>
            )}
            {period.closed_by && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ditutup Oleh</dt>
                  <dd className="mt-1 text-sm text-gray-900">{period.closed_by}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tanggal Penutupan</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {period.closed_on && new Date(period.closed_on).toLocaleString('id-ID')}
                  </dd>
                </div>
              </>
            )}
            {period.permanently_closed_by && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ditutup Permanen Oleh</dt>
                  <dd className="mt-1 text-sm text-gray-900">{period.permanently_closed_by}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tanggal Penutupan Permanen</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {period.permanently_closed_on && new Date(period.permanently_closed_on).toLocaleString('id-ID')}
                  </dd>
                </div>
              </>
            )}
            {period.remarks && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Catatan</dt>
                <dd className="mt-1 text-sm text-gray-900">{period.remarks}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Saldo Akun</h2>
          </div>
          {accountBalances.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Belum ada data saldo akun
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accountBalances.map((balance, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{balance.account_name}</div>
                        <div className="text-gray-500">{balance.account}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{balance.root_type}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {balance.debit.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {balance.credit.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {balance.balance.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'journal' && closingJournal && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Jurnal Penutup</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nomor Jurnal</dt>
              <dd className="mt-1 text-sm text-gray-900">{closingJournal.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tanggal Posting</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(closingJournal.posting_date).toLocaleDateString('id-ID')}
              </dd>
            </div>
          </dl>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {closingJournal.accounts?.map((acc: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-sm text-gray-900">{acc.account}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {acc.debit_in_account_currency?.toLocaleString('id-ID') || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {acc.credit_in_account_currency?.toLocaleString('id-ID') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Belum ada riwayat aktivitas
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <div key={log.name} className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.action_type}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Oleh {log.action_by} pada {new Date(log.action_date).toLocaleString('id-ID')}
                      </p>
                      {log.reason && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Alasan:</span> {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
