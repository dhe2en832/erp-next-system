'use client';

import type { ClosingSummaryResponse } from '../../../types/accounting-period';

interface ClosingSummaryReportProps {
  data: ClosingSummaryResponse['data'];
  showActions?: boolean;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
}

export default function ClosingSummaryReport({ 
  data, 
  showActions = true,
  onExportPDF,
  onExportExcel,
  onPrint
}: ClosingSummaryReportProps) {
  const { 
    period, 
    closing_journal, 
    nominal_accounts = [], 
    real_accounts = [], 
    net_income = 0 
  } = data || {};

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none">
      {/* Action Buttons */}
      {showActions && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-end space-x-3 print:hidden">
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              🖨️ Cetak
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              📄 Export PDF
            </button>
          )}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              📊 Export Excel
            </button>
          )}
        </div>
      )}

      {/* Report Header */}
      <div className="p-8 border-b border-gray-200">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">LAPORAN RINGKASAN PENUTUPAN PERIODE</h2>
          <p className="text-lg text-gray-700 mt-2">{period.company}</p>
        </div>

        {/* Period Information */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi Periode</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Nama Periode:</dt>
                <dd className="text-sm font-medium text-gray-900">{period.period_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Tipe:</dt>
                <dd className="text-sm font-medium text-gray-900">{period.period_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Tanggal Mulai:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(period.start_date).toLocaleDateString('id-ID', { 
                    year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Tanggal Akhir:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(period.end_date).toLocaleDateString('id-ID', { 
                    year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Penutupan</h3>
            <dl className="space-y-2">
              <div className="flex justify-between items-center">
                <dt className="text-sm text-gray-600">Status:</dt>
                <dd>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(period.status)}`}>
                    {getStatusText(period.status)}
                  </span>
                </dd>
              </div>
              {period.closed_by && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Ditutup Oleh:</dt>
                    <dd className="text-sm font-medium text-gray-900">{period.closed_by}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Tanggal Penutupan:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {period.closed_on && new Date(period.closed_on).toLocaleString('id-ID')}
                    </dd>
                  </div>
                </>
              )}
              {period.closing_journal_entry && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Jurnal Penutup:</dt>
                  <dd className="text-sm font-medium text-gray-900">{period.closing_journal_entry}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Net Income Summary */}
      <div className="p-8 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Laba Rugi</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Pendapatan</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(nominal_accounts.filter(a => a.root_type === 'Income').reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Beban</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(nominal_accounts.filter(a => a.root_type === 'Expense').reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Laba (Rugi) Bersih</p>
            <p className={`text-xl font-bold ${net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(net_income)}
            </p>
          </div>
        </div>
      </div>

      {/* Closing Journal */}
      {closing_journal && (
        <div className="p-8 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jurnal Penutup</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Nomor:</span> {closing_journal.name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Tanggal Posting:</span> {new Date(closing_journal.posting_date).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {closing_journal.accounts?.map((acc: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">{acc.account}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {acc.debit_in_account_currency ? formatCurrency(acc.debit_in_account_currency) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {acc.credit_in_account_currency ? formatCurrency(acc.credit_in_account_currency) : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {formatCurrency(closing_journal.accounts?.reduce((sum: number, acc: any) => sum + (acc.debit_in_account_currency || 0), 0) || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {formatCurrency(closing_journal.accounts?.reduce((sum: number, acc: any) => sum + (acc.credit_in_account_currency || 0), 0) || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nominal Accounts (Income & Expense) */}
      <div className="p-8 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Akun Nominal (Pendapatan & Beban)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {nominal_accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Tidak ada akun nominal
                  </td>
                </tr>
              ) : (
                nominal_accounts.map((account, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{account.account_name}</div>
                      <div className="text-gray-500 text-xs">{account.account}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{account.root_type}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(account.debit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(account.credit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(account.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Accounts (Asset, Liability, Equity) */}
      <div className="p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Akun Riil (Aset, Liabilitas, Ekuitas)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {real_accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Tidak ada akun riil
                  </td>
                </tr>
              ) : (
                real_accounts.map((account, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{account.account_name}</div>
                      <div className="text-gray-500 text-xs">{account.account}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{account.root_type}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(account.debit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(account.credit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(account.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Footer */}
      <div className="p-8 bg-gray-50 border-t border-gray-200">
        <div className="text-sm text-gray-600 text-center">
          <p>Laporan ini dibuat pada {new Date().toLocaleString('id-ID')}</p>
          <p className="mt-1">Sistem ERP - {period.company}</p>
        </div>
      </div>
    </div>
  );
}
