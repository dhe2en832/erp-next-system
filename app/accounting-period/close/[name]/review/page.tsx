'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import type { AccountingPeriod, AccountBalance } from '../../../../../types/accounting-period';

export default function ReviewBalancesPage() {
  const router = useRouter();
  const params = useParams();
  const periodName = params.name as string;

  const [period, setPeriod] = useState<AccountingPeriod | null>(null);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (periodName) {
      fetchPeriodAndBalances();
    }
  }, [periodName]);

  const fetchPeriodAndBalances = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch period details with account balances
      const response = await fetch(
        `/api/accounting-period/periods/${encodeURIComponent(periodName)}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Gagal memuat detail periode');
        setLoading(false);
        return;
      }

      setPeriod(data.data);
      
      // Fetch account balances for the period
      const balancesResponse = await fetch(
        `/api/accounting-period/balances/${encodeURIComponent(periodName)}`,
        { credentials: 'include' }
      );
      const balancesData = await balancesResponse.json();

      if (balancesData.success) {
        setAccountBalances(balancesData.data || []);
      } else {
        setError(balancesData.message || 'Gagal memuat saldo akun');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/accounting-period/close/${encodeURIComponent(periodName)}`);
  };

  const handleProceed = () => {
    if (!period) return;
    router.push(`/accounting-period/close/${encodeURIComponent(period.name)}/preview`);
  };

  // Separate nominal and real accounts
  const nominalAccounts = accountBalances.filter(ab => ab.is_nominal);
  const realAccounts = accountBalances.filter(ab => !ab.is_nominal);

  // Calculate net income/loss
  const totalIncome = nominalAccounts
    .filter(ab => ab.root_type === 'Income')
    .reduce((sum, ab) => sum + ab.balance, 0);
  
  const totalExpense = nominalAccounts
    .filter(ab => ab.root_type === 'Expense')
    .reduce((sum, ab) => sum + ab.balance, 0);
  
  const netIncome = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner message="Memuat saldo akun..." />;
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
              {period?.period_name} - Langkah 2: Review Saldo
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
          <div className="flex items-center text-indigo-600">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-semibold">
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

      {/* Net Income/Loss Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Laba/Rugi</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Total Pendapatan</p>
            <p className="text-2xl font-bold text-green-900 mt-2">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Total Beban</p>
            <p className="text-2xl font-bold text-red-900 mt-2">{formatCurrency(totalExpense)}</p>
          </div>
          <div className={`border rounded-lg p-4 ${
            netIncome >= 0 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <p className={`text-sm font-medium ${
              netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`}>
              {netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
            </p>
            <p className={`text-2xl font-bold mt-2 ${
              netIncome >= 0 ? 'text-blue-900' : 'text-orange-900'
            }`}>
              {formatCurrency(Math.abs(netIncome))}
            </p>
          </div>
        </div>
      </div>

      {/* Nominal Accounts (Income & Expense) */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Akun Nominal (Pendapatan & Beban)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Akun-akun ini akan ditutup ke laba ditahan
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
                  Tipe
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kredit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {nominalAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada akun nominal dengan saldo
                  </td>
                </tr>
              ) : (
                nominalAccounts.map((account, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{account.account_name}</div>
                      <div className="text-xs text-gray-500">{account.account}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.root_type === 'Income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.root_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(account.debit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(account.credit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(account.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {nominalAccounts.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                    Laba/Rugi Bersih:
                  </td>
                  <td className={`px-6 py-3 text-sm font-bold text-right ${
                    netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(netIncome)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Real Accounts (Asset, Liability, Equity) */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Akun Riil (Aset, Liabilitas, Ekuitas)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Saldo akun-akun ini akan dibawa ke periode berikutnya
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
                  Tipe
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kredit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {realAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada akun riil dengan saldo
                  </td>
                </tr>
              ) : (
                realAccounts.map((account, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{account.account_name}</div>
                      <div className="text-xs text-gray-500">{account.account}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.root_type === 'Asset' 
                          ? 'bg-blue-100 text-blue-800' 
                          : account.root_type === 'Liability'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {account.root_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(account.debit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(account.credit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(account.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              Informasi Penutupan
            </h3>
            <div className="text-sm text-blue-700 mt-2">
              <ul className="list-disc list-inside space-y-1">
                <li>Akun nominal (Pendapatan & Beban) akan ditutup dengan saldo nol</li>
                <li>Laba/rugi bersih akan dipindahkan ke akun laba ditahan</li>
                <li>Akun riil (Aset, Liabilitas, Ekuitas) akan dibawa ke periode berikutnya</li>
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
          ← Kembali ke Validasi
        </button>
        <button
          onClick={handleProceed}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          Lanjut ke Preview Jurnal →
        </button>
      </div>
    </div>
  );
}
