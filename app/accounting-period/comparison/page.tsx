'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { AccountingPeriod, AccountBalance } from '../../../types/accounting-period';

interface PeriodComparison {
  period: AccountingPeriod;
  balances: AccountBalance[];
}

export default function PeriodComparisonPage() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<PeriodComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [company, setCompany] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('');

  // Fetch available periods
  useEffect(() => {
    const fetchPeriods = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/accounting-period/periods?status=Closed', {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
          setPeriods(data.data || []);
          if (data.data && data.data.length > 0) {
            setCompany(data.data[0].company);
          }
        } else {
          setError(data.message || 'Gagal memuat daftar periode');
        }
      } catch (err) {
        console.error('Error fetching periods:', err);
        setError('Gagal memuat daftar periode');
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, []);

  // Handle period selection
  const handlePeriodToggle = (periodName: string) => {
    setSelectedPeriods(prev => {
      if (prev.includes(periodName)) {
        return prev.filter(p => p !== periodName);
      } else {
        // Limit to 4 periods for better comparison
        if (prev.length >= 4) {
          setError('Maksimal 4 periode dapat dibandingkan sekaligus');
          return prev;
        }
        return [...prev, periodName];
      }
    });
    setError('');
  };

  // Fetch comparison data
  const handleCompare = useCallback(async () => {
    if (selectedPeriods.length < 2) {
      setError('Pilih minimal 2 periode untuk dibandingkan');
      return;
    }

    setComparing(true);
    setError('');
    
    try {
      const comparisons: PeriodComparison[] = [];
      
      for (const periodName of selectedPeriods) {
        const response = await fetch(
          `/api/accounting-period/periods/${encodeURIComponent(periodName)}`,
          { credentials: 'include' }
        );
        const data = await response.json();

        if (data.success) {
          comparisons.push({
            period: data.data,
            balances: data.data.account_balances || []
          });
        }
      }

      setComparisonData(comparisons);
    } catch (err) {
      console.error('Error comparing periods:', err);
      setError('Gagal memuat data perbandingan');
    } finally {
      setComparing(false);
    }
  }, [selectedPeriods]);

  // Get all unique accounts across selected periods
  const allAccounts = useMemo(() => {
    const accountMap = new Map<string, AccountBalance>();
    
    comparisonData.forEach(({ balances }) => {
      balances.forEach(balance => {
        if (!accountMap.has(balance.account)) {
          accountMap.set(balance.account, balance);
        }
      });
    });

    return Array.from(accountMap.values());
  }, [comparisonData]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    let filtered = allAccounts;

    if (accountFilter) {
      const term = accountFilter.toLowerCase();
      filtered = filtered.filter(acc => 
        acc.account.toLowerCase().includes(term) ||
        acc.account_name.toLowerCase().includes(term)
      );
    }

    if (accountTypeFilter) {
      filtered = filtered.filter(acc => acc.root_type === accountTypeFilter);
    }

    return filtered.sort((a, b) => a.account.localeCompare(b.account));
  }, [allAccounts, accountFilter, accountTypeFilter]);

  // Get balance for specific account in specific period
  const getBalance = (periodIndex: number, accountCode: string): number => {
    const comparison = comparisonData[periodIndex];
    if (!comparison) return 0;
    
    const balance = comparison.balances.find(b => b.account === accountCode);
    return balance?.balance || 0;
  };

  // Calculate change between periods
  const calculateChange = (currentBalance: number, previousBalance: number) => {
    if (previousBalance === 0) {
      return currentBalance === 0 ? 0 : 100;
    }
    return ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeIndicator = (change: number) => {
    if (Math.abs(change) < 0.1) {
      return <span className="text-gray-500">→</span>;
    }
    if (change > 0) {
      return <span className="text-green-600">↑</span>;
    }
    return <span className="text-red-600">↓</span>;
  };

  const getChangeColor = (change: number) => {
    if (Math.abs(change) < 0.1) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    return 'text-red-600';
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data periode..." />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perbandingan Periode</h1>
        <p className="text-sm text-gray-500">
          Bandingkan saldo akun dan tren perubahan antar periode akuntansi
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Period Selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pilih Periode untuk Dibandingkan (2-4 periode)
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {periods.map(period => (
            <label
              key={period.name}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPeriods.includes(period.name)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPeriods.includes(period.name)}
                onChange={() => handlePeriodToggle(period.name)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{period.period_name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(period.start_date).toLocaleDateString('id-ID')} - {' '}
                  {new Date(period.end_date).toLocaleDateString('id-ID')}
                </p>
              </div>
            </label>
          ))}
        </div>

        {periods.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            Tidak ada periode tertutup yang tersedia untuk dibandingkan
          </p>
        )}

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            {selectedPeriods.length} periode dipilih
          </p>
          <button
            onClick={handleCompare}
            disabled={selectedPeriods.length < 2 || comparing}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {comparing ? 'Memuat...' : 'Bandingkan'}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <>
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cari Akun
                </label>
                <input
                  type="text"
                  placeholder="Kode atau nama akun..."
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe Akun
                </label>
                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Semua Tipe</option>
                  <option value="Asset">Aset</option>
                  <option value="Liability">Liabilitas</option>
                  <option value="Equity">Ekuitas</option>
                  <option value="Income">Pendapatan</option>
                  <option value="Expense">Beban</option>
                </select>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                      Akun
                    </th>
                    {comparisonData.map((comparison, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        <div>{comparison.period.period_name}</div>
                        <div className="text-xs font-normal text-gray-400 mt-1">
                          {new Date(comparison.period.end_date).toLocaleDateString('id-ID')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={comparisonData.length + 1}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Tidak ada akun yang cocok dengan filter
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => {
                      const balances = comparisonData.map((_, idx) => 
                        getBalance(idx, account.account)
                      );
                      
                      return (
                        <tr key={account.account} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm sticky left-0 bg-white z-10">
                            <div className="font-medium text-gray-900">
                              {account.account_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {account.account}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {account.root_type}
                            </div>
                          </td>
                          {balances.map((balance, idx) => {
                            const previousBalance = idx > 0 ? balances[idx - 1] : balance;
                            const change = idx > 0 ? calculateChange(balance, previousBalance) : 0;
                            
                            return (
                              <td key={idx} className="px-4 py-3 text-sm text-center">
                                <div className="font-medium text-gray-900">
                                  {formatCurrency(balance)}
                                </div>
                                {idx > 0 && (
                                  <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${getChangeColor(change)}`}>
                                    {getChangeIndicator(change)}
                                    <span>{formatPercentage(change)}</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonData.map((comparison, idx) => {
              const totalAssets = comparison.balances
                .filter(b => b.root_type === 'Asset')
                .reduce((sum, b) => sum + b.balance, 0);
              
              const totalLiabilities = comparison.balances
                .filter(b => b.root_type === 'Liability')
                .reduce((sum, b) => sum + b.balance, 0);
              
              const totalEquity = comparison.balances
                .filter(b => b.root_type === 'Equity')
                .reduce((sum, b) => sum + b.balance, 0);

              return (
                <div key={idx} className="bg-white shadow rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    {comparison.period.period_name}
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-600">Total Aset:</dt>
                      <dd className="text-xs font-medium text-gray-900">
                        {formatCurrency(totalAssets)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-600">Total Liabilitas:</dt>
                      <dd className="text-xs font-medium text-gray-900">
                        {formatCurrency(totalLiabilities)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-600">Total Ekuitas:</dt>
                      <dd className="text-xs font-medium text-gray-900">
                        {formatCurrency(totalEquity)}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
