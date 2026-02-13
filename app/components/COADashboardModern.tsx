'use client';

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

interface Account { 
  name: string; 
  account_name: string; 
  account_type: string; 
  parent_account: string | null; 
  is_group: boolean;
  balance: number; 
  children?: Account[]; 
}

interface JournalEntry { 
  posting_date: string; 
  voucher_type: string; 
  voucher_no: string; 
  debit: number; 
  credit: number; 
}

export default function COADashboardModern() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState<'name'|'number'|'balance'>('number');
  const [sortAsc, setSortAsc] = useState(true);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [highlight, setHighlight] = useState<Record<string, 'up'|'down'|''>>({});

  const getAccountTypeColor = (type: string) => {
    if (!type || type.trim() === '') return 'bg-gray-100 text-gray-800';
    switch (type) {
      case 'Asset': return 'bg-blue-100 text-blue-800';
      case 'Liability': return 'bg-red-100 text-red-800';
      case 'Equity': return 'bg-green-100 text-green-800';
      case 'Income': return 'bg-purple-100 text-purple-800';
      case 'Expense': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const buildTree = (accounts: Account[]): Account[] => {
    const map: Record<string, Account> = {};
    const roots: Account[] = [];

    accounts.forEach(account => {
      map[account.name] = { ...account, children: [] };
    });

    accounts.forEach(account => {
      const accountWithChildren = map[account.name];
      if (account.parent_account && account.parent_account !== account.name) {
        const parent = map[account.parent_account];
        if (parent) {
          parent.children!.push(accountWithChildren);
        }
      } else {
        roots.push(accountWithChildren);
      }
    });

    return roots;
  };

  const calculateTotalBalance = (account: Account): number => {
    if (!account.children || account.children.length === 0) return account.balance;
    return account.balance + account.children.reduce((sum, c) => sum + calculateTotalBalance(c), 0);
  };

  const toggleAll = (expand: boolean) => {
    const newExpanded: Record<string, boolean> = {};
    const fill = (accs: Account[]) => accs.forEach(acc => { 
      if (acc.children && acc.children.length > 0) { 
        newExpanded[acc.name] = expand; 
        fill(acc.children); 
      }
    });
    fill(accounts);
    setExpanded(newExpanded);
  };

  const sortAccounts = (accs: Account[]): Account[] => {
    const sorted = [...accs].sort((a, b) => {
      const cmp = sortBy === 'name' 
        ? (a.account_name || '').localeCompare(b.account_name || '') 
        : sortBy === 'number'
        ? (a.name || '').localeCompare(b.name || '', undefined, { numeric: true })
        : calculateTotalBalance(a) - calculateTotalBalance(b);
      return sortAsc ? cmp : -cmp;
    });
    return sorted.map(acc => ({ ...acc, children: acc.children ? sortAccounts(acc.children) : [] }));
  };

  const openJournal = async (account: string) => {
    setSelectedAccount(account);
    setModalOpen(true);
    try {
      const res = await fetch('/api/finance/accounts?account=' + account);
      const data = await res.json();
      setJournal(data || []);
    } catch (err) {
      console.error(err);
      setJournal([]);
    }
  };

  const renderAccountRow = (account: Account, level = 0): React.ReactElement[] => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expanded[account.name] || false;
    const totalBalance = calculateTotalBalance(account);
    if (filterType !== 'All' && account.account_type !== filterType) return [];
    if (search && !account.account_name?.toLowerCase().includes(search.toLowerCase())) return [];

    let rowClass = "hover:bg-gray-50 transition-colors duration-200";
    if (highlight[account.name] === 'up') rowClass += " bg-green-50 border-l-4 border-l-green-500";
    else if (highlight[account.name] === 'down') rowClass += " bg-red-50 border-l-4 border-l-red-500";
    else if (totalBalance < 0) rowClass += "bg-red-50";

    const rows: React.ReactElement[] = [
      <tr key={account.name} className={rowClass}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {hasChildren && (
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [account.name]: !isExpanded }))}
                className="mr-2 p-1 hover:bg-gray-200 rounded-full transition-colors duration-200"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                  </svg>
                )}
              </button>
            )}
            <div className="flex items-center space-x-3" style={{ marginLeft: `${level * 20}px` }}>
              {account.is_group ? (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v-7a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div>
                <button
                  onClick={() => openJournal(account.name)}
                  className={`font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 ${getAccountTypeColor(account.account_type) || 'text-gray-800'}`}
                  title={`View journal entries for ${account.account_name || account.name}`}
                >
                  {account.account_name || account.name}
                </button>
                <div className="text-xs text-gray-500 mt-1">{account.name}</div>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.account_type)}`}>
            {account.account_type || '-'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(totalBalance)}
          </div>
          <div className={`text-xs mt-1 ${totalBalance >= 0 ? 'text-gray-500' : 'text-red-600'}`}>
            {totalBalance >= 0 ? 'Debit' : 'Credit'}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => openJournal(account.name)}
              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
              title={`View journal entries for ${account.account_name || account.name}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002 2v-4a2 2 0 00-2-2H9a2 2 0 002 2v4a2 2 0 002 2h8a2 2 0 002 2v-4z" />
                <path d="M9 5a2 2 0 002 2h2m0 6h16a2 2 0 002 2H9a2 2 0 002 2v-4a2 2 0 002 2h8a2 2 0 002 2v-4z" />
              </svg>
              <span className="sr-only">View Journal</span>
            </button>
          </div>
        </td>
      </tr>
    ];

    // Add child rows if expanded
    if (hasChildren && isExpanded && account.children) {
      account.children.forEach(child => {
        rows.push(...renderAccountRow(child, level + 1));
      });
    }

    return rows;
  };

  const exportExcel = () => {
    const rows: unknown[] = [];
    const flatten = (accs: Account[], level = 0) => {
      accs.forEach(acc => {
        const totalBalance = calculateTotalBalance(acc);
        if ((filterType === 'All' || acc.account_type === filterType) && (!search || acc.account_name?.toLowerCase().includes(search.toLowerCase()))) {
          rows.push({
            'Account Name': ' '.repeat(level * 2) + (acc.account_name || acc.name),
            'Account Type': acc.account_type || 'N/A',
            'Total Balance': totalBalance
          });
        }
        if (acc.children) flatten(acc.children, level + 1);
      });
    };
    flatten(sortAccounts(accounts));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'COA');
    XLSX.writeFile(wb, 'COA_export.xlsx');
  };

  const fetchCOA = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(buildTree(data.accounts));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      await fetchCOA();
    };
    
    fetchData();
  }, [fetchCOA]); // Fetch data once on mount

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-blue-200 border-t-transparent rounded-full animate-spin">
            <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading Chart of Accounts...</p>
          <p className="text-sm text-gray-500">Fetching real-time data from ERPNext</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="mr-3">📊</span>
                Chart of Accounts
                <span className="ml-3 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  STATIC
                </span>
              </h1>
              <p className="text-gray-600 mt-1">Financial data visualization</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="min-w-40">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
              >
                <option value="All">All Types</option>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            {/* Sort */}
            <div className="min-w-40">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'name' | 'number' | 'balance')}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
              >
                <option value="number">Sort by Number</option>
                <option value="name">Sort by Name</option>
                <option value="balance">Sort by Balance</option>
              </select>
            </div>

            {/* Sort Direction */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {sortAsc ? (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l6-6m-6 0l6 6" />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v4m0 0l6-6m-6 0l6 6" />
                </svg>
              )}
              {sortAsc ? 'Asc' : 'Desc'}
            </button>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => toggleAll(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h4m-4 4l5 5M4 16v4m0 0h4m-4-4l5 5M11 4h4m0 0v4m0 0h4" />
                </svg>
                Expand All
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h4m-4 4l5 5M4 16v4m0 0h4m-4-4l5 5M11 4h4m0 0v4m0 0h4" />
                </svg>
                Collapse All
              </button>
              <button
                onClick={exportExcel}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-6 0h6m-6 0h6" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Account Structure</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                  <span>Group Account</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
                  <span>Detail Account</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortAccounts(accounts).flatMap(acc => renderAccountRow(acc))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v14a2 2 0 002 2z" />
                      <path d="M9 11V3H7a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002 2v-8a2 2 0 002 2H9a2 2 0 002 2v-8a2 2 0 002 2H9a2 2 0 002 2v-8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Journal Entries</h2>
                    <p className="text-sm text-gray-500">Account: {selectedAccount}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {journal.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002 2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v-4z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No journal entries found for this account</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {journal.map((j, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-medium">{j.posting_date}</span>
                              <span className="text-xs text-gray-500">{j.voucher_type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {j.voucher_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {j.voucher_no}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {j.debit ? formatCurrency(j.debit) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {j.credit ? formatCurrency(j.credit) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
