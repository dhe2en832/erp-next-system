'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Pagination from '../components/Pagination';
import BrowserStyleDatePicker from '../../components/BrowserStyleDatePicker';
import LoadingSpinner from '../components/LoadingSpinner';
import PrintPreviewModal from '../../components/PrintPreviewModal';

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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceEntry[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetEntry[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDateToDDMMYYYY = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return {
      from_date: formatDateToDDMMYYYY(yesterday),
      to_date: formatDateToDDMMYYYY(today)
    };
  });
  
  // Pagination states for each tab
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  
  // Expand/collapse state for grouped sections
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});

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
      let url = `/api/finance/reports?company=${encodeURIComponent(companyToUse)}&report=${activeTab}`;
      
      if (dateFilter.from_date) {
        // Convert DD/MM/YYYY to YYYY-MM-DD for API
        const parts = dateFilter.from_date.split('/');
        if (parts.length === 3) {
          url += `&from_date=${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      if (dateFilter.to_date) {
        // Convert DD/MM/YYYY to YYYY-MM-DD for API
        const parts = dateFilter.to_date.split('/');
        if (parts.length === 3) {
          url += `&to_date=${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();
      
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

  // Reset page when tab changes or search changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedGroups({}); // Reset expanded groups on tab change
  }, [activeTab, searchTerm]);

  // Toggle expand/collapse for a group
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Expand all groups
  const expandAll = () => {
    const allGroups: {[key: string]: boolean} = {};
    if (activeTab === 'balance-sheet') {
      Object.keys(groupByParent(getFilteredData(balanceSheet))).forEach(key => {
        allGroups[key] = true;
      });
    } else if (activeTab === 'profit-loss') {
      Object.keys(groupByParent(getFilteredData(profitLoss))).forEach(key => {
        allGroups[key] = true;
      });
    }
    setExpandedGroups(allGroups);
  };

  // Collapse all groups
  const collapseAll = () => {
    setExpandedGroups({});
  };
  const getFilteredData = useCallback((data: any[]) => {
    if (!searchTerm.trim()) return data;
    
    const search = searchTerm.trim().toLowerCase();
    return data.filter((entry: any) => 
      entry.account?.toLowerCase().includes(search) ||
      entry.account_name?.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  // Pagination helper
  const getPaginatedData = useCallback((data: any[]) => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [currentPage]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = () => {
    setSearchTerm('');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDateToDDMMYYYY = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    setDateFilter({
      from_date: formatDateToDDMMYYYY(yesterday),
      to_date: formatDateToDDMMYYYY(today)
    });
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
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
      // Use account_type as fallback if parent_account is empty
      const parent = entry.parent_account || entry.account_type || 'Lainnya';
      if (!grouped[parent]) {
        grouped[parent] = [];
      }
      grouped[parent].push(entry);
    });
    
    return grouped;
  };

  // Calculate summary stats for each report type
  const getTrialBalanceStats = (entries: TrialBalanceEntry[]) => {
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    return { totalDebit, totalCredit, difference, count: entries.length };
  };

  const getBalanceSheetStats = (entries: BalanceSheetEntry[]) => {
    // Helper to check if account is Asset (Aktiva)
    const isAsset = (e: BalanceSheetEntry) => {
      const type = (e.account_type || '').toLowerCase();
      const parent = (e.parent_account || '').toLowerCase();
      const account = (e.account || '').toLowerCase();
      return type.includes('asset') || type.includes('aktiva') || 
             parent.includes('asset') || parent.includes('aktiva') ||
             account.startsWith('1'); // Account codes starting with 1 are typically assets
    };
    
    // Helper to check if account is Liability (Kewajiban)
    const isLiability = (e: BalanceSheetEntry) => {
      const type = (e.account_type || '').toLowerCase();
      const parent = (e.parent_account || '').toLowerCase();
      const account = (e.account || '').toLowerCase();
      return type.includes('liabilit') || type.includes('kewajiban') || 
             parent.includes('liabilit') || parent.includes('kewajiban') ||
             account.startsWith('2'); // Account codes starting with 2 are typically liabilities
    };
    
    // Helper to check if account is Equity (Ekuitas)
    const isEquity = (e: BalanceSheetEntry) => {
      const type = (e.account_type || '').toLowerCase();
      const parent = (e.parent_account || '').toLowerCase();
      const account = (e.account || '').toLowerCase();
      return type.includes('equity') || type.includes('ekuitas') || type.includes('modal') ||
             parent.includes('equity') || parent.includes('ekuitas') || parent.includes('modal') ||
             account.startsWith('3'); // Account codes starting with 3 are typically equity
    };

    // Assets have debit normal balance (positive in API), show as positive
    const totalAssets = entries.filter(isAsset).reduce((sum, e) => sum + Math.abs(e.balance || 0), 0);
    // Liabilities have credit normal balance (negative in API), show as positive
    const totalLiabilities = entries.filter(isLiability).reduce((sum, e) => sum + Math.abs(e.balance || 0), 0);
    // Equity has credit normal balance (negative in API), show as positive
    const totalEquity = entries.filter(isEquity).reduce((sum, e) => sum + Math.abs(e.balance || 0), 0);
    
    // Debug logging
    console.log('Balance Sheet Stats:', { totalAssets, totalLiabilities, totalEquity, count: entries.length });
    
    return { totalAssets, totalLiabilities, totalEquity, count: entries.length };
  };

  const getProfitLossStats = (entries: ProfitLossEntry[]) => {
    // Helper to check if account is Income (Pendapatan)
    const isIncome = (e: ProfitLossEntry) => {
      const type = (e.account_type || '').toLowerCase();
      const parent = (e.parent_account || '').toLowerCase();
      const account = (e.account || '').toLowerCase();
      return type.includes('income') || type.includes('pendapatan') || type.includes('revenue') ||
             parent.includes('income') || parent.includes('pendapatan') || parent.includes('revenue') ||
             account.startsWith('4'); // Account codes starting with 4 are typically income
    };
    
    // Helper to check if account is Expense (Biaya)
    const isExpense = (e: ProfitLossEntry) => {
      const type = (e.account_type || '').toLowerCase();
      const parent = (e.parent_account || '').toLowerCase();
      const account = (e.account || '').toLowerCase();
      return type.includes('expense') || type.includes('biaya') || type.includes('beban') ||
             parent.includes('expense') || parent.includes('biaya') || parent.includes('beban') ||
             account.startsWith('5') || account.startsWith('6') || account.startsWith('7') || account.startsWith('8'); // 5-8 are typically expenses
    };

    // Income has credit normal balance (negative in API), convert to positive for display
    const totalIncome = entries.filter(isIncome).reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
    // Expense has debit normal balance (positive in API), show as positive
    const totalExpense = entries.filter(isExpense).reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
    // Net Profit = Income - Expense
    const netProfit = totalIncome - totalExpense;
    
    // Debug logging
    console.log('Profit Loss Stats:', { totalIncome, totalExpense, netProfit, count: entries.length });
    
    return { totalIncome, totalExpense, netProfit, count: entries.length };
  };

  const tabLabel = activeTab === 'trial-balance' ? 'Neraca Saldo' : activeTab === 'balance-sheet' ? 'Neraca' : 'Laporan Laba Rugi';

  const renderPrintContent = () => {
    const fromDate = dateFilter.from_date;
    const toDate = dateFilter.to_date;
    const formatCur = (v: number) => `Rp ${Math.abs(v).toLocaleString('id-ID')}`;

    if (activeTab === 'trial-balance') {
      const data = getFilteredData(trialBalance);
      const totals = calculateTotals(data);
      return (
        <div>
          <div className="doc-header">
            <div>
              <div className="doc-company">{selectedCompany}</div>
              <div className="doc-meta">Periode: {fromDate} s/d {toDate}</div>
            </div>
            <div className="doc-title">Neraca Saldo</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{width:'120px'}}>Kode Akun</th>
                <th>Nama Akun</th>
                <th className="right" style={{width:'130px'}}>Debit</th>
                <th className="right" style={{width:'130px'}}>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.account}>
                  <td>{e.account}</td>
                  <td>{e.account_name}</td>
                  <td className="right">{e.debit > 0 ? formatCur(e.debit) : '-'}</td>
                  <td className="right">{e.credit > 0 ? formatCur(e.credit) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={2}><strong>Total</strong></td>
                <td className="right"><strong>{formatCur(totals.debit)}</strong></td>
                <td className="right"><strong>{formatCur(totals.credit)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    if (activeTab === 'balance-sheet') {
      const grouped = groupByParent(getFilteredData(balanceSheet));
      return (
        <div>
          <div className="doc-header">
            <div>
              <div className="doc-company">{selectedCompany}</div>
              <div className="doc-meta">Periode: {fromDate} s/d {toDate}</div>
            </div>
            <div className="doc-title">Neraca</div>
          </div>
          {Object.entries(grouped).map(([parent, entries]) => (
            <div key={parent}>
              <div className="section-header">{parent}</div>
              <table>
                <thead>
                  <tr>
                    <th>Nama Akun</th>
                    <th className="right" style={{width:'150px'}}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.account}>
                      <td>{e.account_name}</td>
                      <td className="right">{formatCur((e as BalanceSheetEntry).balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="subtotal-row">
                    <td>Subtotal {parent}</td>
                    <td className="right">{formatCur(entries.reduce((s, e) => s + Math.abs((e as BalanceSheetEntry).balance || 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'profit-loss') {
      const grouped = groupByParent(getFilteredData(profitLoss));
      const stats = getProfitLossStats(getFilteredData(profitLoss));
      return (
        <div>
          <div className="doc-header">
            <div>
              <div className="doc-company">{selectedCompany}</div>
              <div className="doc-meta">Periode: {fromDate} s/d {toDate}</div>
            </div>
            <div className="doc-title">Laporan Laba Rugi</div>
          </div>
          {Object.entries(grouped).map(([parent, entries]) => (
            <div key={parent}>
              <div className="section-header">{parent}</div>
              <table>
                <thead>
                  <tr>
                    <th>Nama Akun</th>
                    <th className="right" style={{width:'150px'}}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.account}>
                      <td>{e.account_name}</td>
                      <td className="right">{formatCur((e as ProfitLossEntry).amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="subtotal-row">
                    <td>Subtotal {parent}</td>
                    <td className="right">{formatCur(entries.reduce((s, e) => s + Math.abs((e as ProfitLossEntry).amount || 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
          <table style={{marginTop:'12px'}}>
            <tbody>
              <tr className="total-row">
                <td><strong>{stats.netProfit >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</strong></td>
                <td className="right"><strong>{formatCur(stats.netProfit)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Laporan Keuangan..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="mt-1 text-sm text-gray-600">Neraca Saldo, Neraca, dan Laporan Laba Rugi</p>
        </div>
        <button
          onClick={() => setShowPrintPreview(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak {tabLabel}
        </button>
      </div>

      {showPrintPreview && (
        <PrintPreviewModal
          title={`${tabLabel} — ${selectedCompany}`}
          onClose={() => setShowPrintPreview(false)}
        >
          <>
            {renderPrintContent()}
            <div style={{ marginTop: '20px', borderTop: '1px solid #d1d5db', paddingTop: '4px', fontSize: '8px', color: '#9ca3af', textAlign: 'center' }}>
              Dicetak oleh sistem &mdash; {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </>
        </PrintPreviewModal>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Akun
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Kode atau nama akun..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <BrowserStyleDatePicker
              value={dateFilter.from_date}
              onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <BrowserStyleDatePicker
              value={dateFilter.to_date}
              onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            <button
              onClick={handleClearFilters}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Hapus Filter
            </button>
            <button
              onClick={fetchFinancialReports}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4 py-2 bg-gray-50">
            {[
              { id: 'trial-balance', label: 'Neraca Saldo', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
              { id: 'balance-sheet', label: 'Neraca', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
              { id: 'profit-loss', label: 'Laba Rugi', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Trial Balance Tab */}
          {activeTab === 'trial-balance' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  const stats = getTrialBalanceStats(getFilteredData(trialBalance));
                  return (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Akun</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.count}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Total Debit</p>
                        <p className="text-xl font-bold text-green-900">{formatCurrency(stats.totalDebit)}</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">Total Kredit</p>
                        <p className="text-xl font-bold text-orange-900">{formatCurrency(stats.totalCredit)}</p>
                      </div>
                      <div className={`${stats.difference === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
                        <p className={`text-sm font-medium ${stats.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>Selisih</p>
                        <p className={`text-xl font-bold ${stats.difference === 0 ? 'text-green-900' : 'text-red-900'}`}>
                          {formatCurrency(stats.difference)}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Neraca Saldo</h2>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                  {getFilteredData(trialBalance).length} akun
                </span>
              </div>
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
                    {getPaginatedData(getFilteredData(trialBalance)).map((entry) => (
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
                    {getFilteredData(trialBalance).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Tidak ada data yang sesuai dengan filter
                        </td>
                      </tr>
                    )}
                    {getFilteredData(trialBalance).length > 0 && (
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(calculateTotals(getFilteredData(trialBalance)).debit)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {formatCurrency(calculateTotals(getFilteredData(trialBalance)).credit)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(getFilteredData(trialBalance).length / PAGE_SIZE)}
                totalRecords={getFilteredData(trialBalance).length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {/* Balance Sheet Tab */}
          {activeTab === 'balance-sheet' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  const stats = getBalanceSheetStats(getFilteredData(balanceSheet));
                  return (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Akun</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.count}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Total Aset</p>
                        <p className="text-xl font-bold text-green-900">{formatCurrency(stats.totalAssets)}</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">Total Kewajiban</p>
                        <p className="text-xl font-bold text-orange-900">{formatCurrency(stats.totalLiabilities)}</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">Total Ekuitas</p>
                        <p className="text-xl font-bold text-purple-900">{formatCurrency(stats.totalEquity)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Neraca</h2>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                  {getFilteredData(balanceSheet).length} akun
                </span>
              </div>
              {/* Expand/Collapse Controls */}
              <div className="flex space-x-2 mb-4">
                <button 
                  onClick={expandAll}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Buka Semua
                  </span>
                </button>
                <button 
                  onClick={collapseAll}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Tutup Semua
                  </span>
                </button>
              </div>

              {getFilteredData(balanceSheet).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data yang sesuai dengan filter
                </div>
              ) : (
                <>
                  {Object.entries(groupByParent(getFilteredData(balanceSheet))).map(([parent, entries]) => (
                    <div key={parent} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      <button 
                        onClick={() => toggleGroup(parent)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-lg font-medium text-gray-900">{parent}</span>
                        <span className="flex items-center text-gray-500">
                          <span className="text-sm mr-2">{entries.length} akun</span>
                          <svg 
                            className={`w-5 h-5 transform transition-transform ${expandedGroups[parent] ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      
                      {expandedGroups[parent] !== false && (
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nama Akun
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Saldo
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {entries.map((entry) => (
                                  <tr key={entry.account} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {entry.account_name}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                                      {formatCurrency(Math.abs((entry as BalanceSheetEntry).balance))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                  <td className="px-4 py-2 text-sm text-gray-900">Subtotal {parent}</td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">
                                    {formatCurrency(entries.reduce((sum, e) => sum + Math.abs((e as BalanceSheetEntry).balance || 0), 0))}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(getFilteredData(balanceSheet).length / PAGE_SIZE)}
                    totalRecords={getFilteredData(balanceSheet).length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          )}

          {/* Profit Loss Tab */}
          {activeTab === 'profit-loss' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  const stats = getProfitLossStats(getFilteredData(profitLoss));
                  return (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Akun</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.count}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Total Pendapatan</p>
                        <p className="text-xl font-bold text-green-900">{formatCurrency(stats.totalIncome)}</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">Total Biaya</p>
                        <p className="text-xl font-bold text-orange-900">{formatCurrency(stats.totalExpense)}</p>
                      </div>
                      <div className={`${stats.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
                        <p className={`text-sm font-medium ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stats.netProfit >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
                        </p>
                        <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                          {formatCurrency(Math.abs(stats.netProfit))}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Laporan Laba Rugi</h2>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                  {getFilteredData(profitLoss).length} akun
                </span>
              </div>
              {/* Expand/Collapse Controls */}
              <div className="flex space-x-2 mb-4">
                <button 
                  onClick={expandAll}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Buka Semua
                  </span>
                </button>
                <button 
                  onClick={collapseAll}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Tutup Semua
                  </span>
                </button>
              </div>

              {getFilteredData(profitLoss).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data yang sesuai dengan filter
                </div>
              ) : (
                <>
                  {Object.entries(groupByParent(getFilteredData(profitLoss))).map(([parent, entries]) => (
                    <div key={parent} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      <button 
                        onClick={() => toggleGroup(parent)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-lg font-medium text-gray-900">{parent}</span>
                        <span className="flex items-center text-gray-500">
                          <span className="text-sm mr-2">{entries.length} akun</span>
                          <svg 
                            className={`w-5 h-5 transform transition-transform ${expandedGroups[parent] ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      
                      {expandedGroups[parent] !== false && (
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nama Akun
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Jumlah
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {entries.map((entry) => (
                                  <tr key={entry.account} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {entry.account_name}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                                      {formatCurrency(Math.abs((entry as ProfitLossEntry).amount || 0))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                  <td className="px-4 py-2 text-sm text-gray-900">Subtotal {parent}</td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">
                                    {formatCurrency(entries.reduce((sum, e) => sum + Math.abs((e as ProfitLossEntry).amount || 0), 0))}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(getFilteredData(profitLoss).length / PAGE_SIZE)}
                    totalRecords={getFilteredData(profitLoss).length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
