'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrialBalanceEntry {
  account: string;
  account_name: string;
  debit: number;
  credit: number;
  account_type: string;
  is_group: boolean;
}

interface BalanceSheetEntry {
  account: string;
  account_name: string;
  balance: number;
  account_type: string;
  parent_account: string;
}

interface ProfitLossEntry {
  account: string;
  account_name: string;
  amount: number;
  account_type: string;
  parent_account: string;
}

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<'trial-balance' | 'balance-sheet' | 'profit-loss'>('trial-balance');
  const [trialBalance, setTrialBalance] = useState<TrialBalanceEntry[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetEntry[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });

  useEffect(() => {
    // Get company from localStorage
    let savedCompany = localStorage.getItem('selected_company');
    
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
  }, []);

  const fetchFinancialReports = useCallback(async () => {
    setError('');
    
    let companyToUse = selectedCompany;
    
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      } else {
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          const cookieValue = companyCookie.split('=')[1];
          if (cookieValue) {
            companyToUse = cookieValue;
          }
        }
      }
    }
    
    if (!companyToUse) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      return;
    }
    
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      let url = `/api/financial-reports?company=${encodeURIComponent(companyToUse)}&report=${activeTab}`;
      
      if (dateFilter.from_date) {
        url += `&from_date=${encodeURIComponent(dateFilter.from_date)}`;
      }
      
      if (dateFilter.to_date) {
        url += `&to_date=${encodeURIComponent(dateFilter.to_date)}`;
      }

      console.log(`Fetching ${activeTab} from:`, url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`${activeTab} response:`, data);
      
      if (data.success) {
        switch (activeTab) {
          case 'trial-balance':
            setTrialBalance(data.data || []);
            break;
          case 'balance-sheet':
            setBalanceSheet(data.data || []);
            break;
          case 'profit-loss':
            setProfitLoss(data.data || []);
            break;
        }
        setError('');
      } else {
        setError(data.message || `Failed to fetch ${activeTab}`);
      }
    } catch (err: unknown) {
      setError(`Failed to fetch ${activeTab}`);
      console.error(`Error fetching ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, activeTab, dateFilter]);

  useEffect(() => {
    if (selectedCompany) {
      fetchFinancialReports();
    }
  }, [selectedCompany, activeTab, dateFilter, fetchFinancialReports]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const calculateTotals = (entries: TrialBalanceEntry[]) => {
    return entries.reduce(
      (acc, entry) => ({
        debit: acc.debit + entry.debit,
        credit: acc.credit + entry.credit,
      }),
      { debit: 0, credit: 0 }
    );
  };

  const groupByParent = (entries: (BalanceSheetEntry | ProfitLossEntry)[]) => {
    const grouped: { [key: string]: (BalanceSheetEntry | ProfitLossEntry)[] } = {};
    
    entries.forEach(entry => {
      const parent = entry.parent_account || 'Uncategorized';
      if (!grouped[parent]) {
        grouped[parent] = [];
      }
      grouped[parent].push(entry);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Memuat Laporan Keuangan...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.from_date}
              onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.to_date}
              onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDateFilter({ from_date: '', to_date: '' })}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Hapus Filter
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('trial-balance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trial-balance'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Neraca Saldo
            </button>
            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'balance-sheet'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Neraca
            </button>
            <button
              onClick={() => setActiveTab('profit-loss')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profit-loss'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Laba Rugi
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'trial-balance' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Neraca Saldo</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akun
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Akun
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
                    {trialBalance.map((entry) => (
                      <tr key={entry.account} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.account}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.account_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                    {trialBalance.length > 0 && (
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(calculateTotals(trialBalance).debit)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(calculateTotals(trialBalance).credit)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'balance-sheet' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Neraca</h2>
              {Object.entries(groupByParent(balanceSheet)).map(([parent, entries]) => (
                <div key={parent} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{parent}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entries.map((entry) => (
                          <tr key={entry.account} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.account_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency((entry as BalanceSheetEntry).balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'profit-loss' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Laporan Laba Rugi</h2>
              {Object.entries(groupByParent(profitLoss)).map(([parent, entries]) => (
                <div key={parent} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{parent}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entries.map((entry) => (
                          <tr key={entry.account} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.account_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency((entry as ProfitLossEntry).amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
