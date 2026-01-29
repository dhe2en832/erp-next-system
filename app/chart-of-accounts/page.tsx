'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, Save, X, Folder, FolderOpen } from 'lucide-react';

interface Account {
  name: string;
  account_name: string;
  account_type: string;
  parent_account: string;
  is_group: boolean;
  root_type: string;
  company: string;
  children?: Account[];
}

interface AccountFormData {
  account_name: string;
  account_type: string;
  parent_account: string;
  is_group: boolean;
  root_type: string;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    account_name: '',
    account_type: 'Asset',
    parent_account: '',
    is_group: false,
    root_type: 'Asset'
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

  const fetchAccounts = useCallback(async () => {
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
      setError('No company selected. Please select a company first.');
      setLoading(false);
      return;
    }
    
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      let url = `/api/chart-of-accounts?company=${encodeURIComponent(companyToUse)}`;
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (filterType) {
        url += `&account_type=${encodeURIComponent(filterType)}`;
      }

      console.log('Fetching Chart of Accounts from:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Chart of Accounts response:', data);
      
      if (data.success) {
        setAccounts(data.data || []);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch chart of accounts');
      }
    } catch (err: unknown) {
      setError('Failed to fetch chart of accounts');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, filterType]);

  useEffect(() => {
    fetchAccounts();
  }, [selectedCompany, searchTerm, filterType, fetchAccounts]);

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'Asset': return 'bg-blue-100 text-blue-800';
      case 'Liability': return 'bg-red-100 text-red-800';
      case 'Equity': return 'bg-green-100 text-green-800';
      case 'Income': return 'bg-purple-100 text-purple-800';
      case 'Expense': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const buildAccountTree = (accounts: Account[]): Account[] => {
    const accountMap = new Map();
    const rootAccounts: Account[] = [];

    // Create map of all accounts
    accounts.forEach(account => {
      accountMap.set(account.name, { ...account, children: [] });
    });

    // Build tree structure
    accounts.forEach(account => {
      const accountWithChildren = accountMap.get(account.name);
      if (account.parent_account && account.parent_account !== account.name) {
        const parent = accountMap.get(account.parent_account);
        if (parent) {
          parent.children.push(accountWithChildren);
        }
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    return rootAccounts;
  };

  const toggleExpand = (accountName: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountName)) {
        newSet.delete(accountName);
      } else {
        newSet.add(accountName);
      }
      return newSet;
    });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account.name);
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type,
      parent_account: account.parent_account || '',
      is_group: account.is_group,
      root_type: account.root_type
    });
  };

  const handleSave = async (accountName: string) => {
    try {
      const response = await fetch('/api/chart-of-accounts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: accountName,
          ...formData
        })
      });

      if (response.ok) {
        setEditingAccount(null);
        fetchAccounts();
      } else {
        setError('Failed to update account');
      }
    } catch (error) {
      setError('Failed to update account');
    }
  };

  const handleDelete = async (accountName: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      const response = await fetch('/api/chart-of-accounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: accountName })
      });

      if (response.ok) {
        fetchAccounts();
      } else {
        setError('Failed to delete account');
      }
    } catch (error) {
      setError('Failed to delete account');
    }
  };

  const handleAddNew = (parentAccount?: string) => {
    setAddingAccount(parentAccount || '');
    setFormData({
      account_name: '',
      account_type: 'Asset',
      parent_account: parentAccount || '',
      is_group: false,
      root_type: 'Asset'
    });
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setAddingAccount(null);
        fetchAccounts();
      } else {
        setError('Failed to create account');
      }
    } catch (error) {
      setError('Failed to create account');
    }
  };

  const renderAccountTree = (accounts: Account[], level = 0, parentPath = '') => {
    return accounts.map((account) => {
      const isExpanded = expandedAccounts.has(account.name);
      const isEditing = editingAccount === account.name;
      const isAdding = addingAccount === account.name;
      const hasChildren = account.children && account.children.length > 0;
      
      return (
        <div key={account.name}>
          <div 
            className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-200`}
            style={{ paddingLeft: `${level * 24 + 16}px` }}
          >
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    placeholder="Account Name"
                  />
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                    value={formData.account_type}
                    onChange={(e) => setFormData({...formData, account_type: e.target.value, root_type: e.target.value})}
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.is_group}
                      onChange={(e) => setFormData({...formData, is_group: e.target.checked})}
                    />
                    <span className="text-sm">Is Group</span>
                  </label>
                  <div className="flex space-x-2 ml-auto">
                    <button
                      onClick={() => handleSave(account.name)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingAccount(null)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {hasChildren && (
                      <button
                        onClick={() => toggleExpand(account.name)}
                        className="p-1 hover:bg-gray-200 rounded mr-2"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    )}
                    {account.is_group ? (
                      isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-blue-500 mr-2" />
                      ) : (
                        <Folder className="w-4 h-4 text-blue-500 mr-2" />
                      )
                    ) : (
                      <div className="w-4 h-4 bg-gray-300 rounded-full mr-2" />
                    )}
                    <span className={`font-medium ${account.is_group ? 'text-gray-900' : 'text-gray-700'}`}>
                      {account.account_name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">({account.name})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.account_type)}`}>
                    {account.account_type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {account.root_type}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.name)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {account.is_group && (
                      <button
                        onClick={() => handleAddNew(account.name)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Add Sub Account"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {isAdding && (
            <div className="px-4 py-3 bg-green-50 border-b border-green-200" style={{ paddingLeft: `${(level + 1) * 24 + 16}px` }}>
              <div className="space-y-3">
                <div className="text-sm font-medium text-green-800">Add New Account</div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    placeholder="Account Name"
                  />
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                    value={formData.account_type}
                    onChange={(e) => setFormData({...formData, account_type: e.target.value, root_type: e.target.value})}
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.is_group}
                      onChange={(e) => setFormData({...formData, is_group: e.target.checked})}
                    />
                    <span className="text-sm">Is Group</span>
                  </label>
                  <div className="flex space-x-2 ml-auto">
                    <button
                      onClick={handleCreate}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAddingAccount(null)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {hasChildren && isExpanded && renderAccountTree(account.children, level + 1, account.name)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading Chart of Accounts...</div>
      </div>
    );
  }

  const accountTree = buildAccountTree(accounts);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Accounts
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
                fetchAccounts();
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => handleAddNew()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Account
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Account Structure ({accounts.length} accounts)
            </h3>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Group Account
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Detail Account
              </div>
            </div>
          </div>
        </div>
        
        {accountTree.length > 0 ? (
          <div>
            {renderAccountTree(accountTree)}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
