'use client';

import { useState, useEffect } from 'react';

interface JournalEntry {
  name: string;
  voucher_type: string;
  posting_date: string;
  total_debit: number;
  total_credit: number;
  status: string;
  user_remark: string;
}

export default function JournalPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    from_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
  });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to get company from localStorage first, then from cookie
    let savedCompany = localStorage.getItem('selected_company');
    
    if (!savedCompany) {
      // Fallback to cookie if localStorage is empty
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        // Store in localStorage for future use
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
  }, []);

  useEffect(() => {
    fetchJournalEntries();
  }, [dateFilter]); // Remove selectedCompany from dependencies

  const fetchJournalEntries = async () => {
    // Clear previous error when starting to fetch
    setError('');
    
    // Check for company selection with better logic
    let companyToUse = selectedCompany;
    
    // If no company in state, try to get it fresh
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
    
    // Update state if we found company from storage
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      const response = await fetch("/api/finance/journal");
      const data = await response.json();
      
      if (data.success) {
        setJournalEntries(data.data || []);
        setError('');
      } else {
        setError('Simple test failed: ' + data.message);
      }
    } catch (err) {
      setError('Failed to fetch journal entries');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Jurnal Umum</h1>
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
              onClick={() => setDateFilter({ 
                from_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                to_date: new Date().toISOString().split('T')[0]
              })}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Reset Filter
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
        <ul className="divide-y divide-gray-200">
          {journalEntries.map((entry) => (
            <li key={entry.name}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {entry.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      Tipe: {entry.voucher_type}
                    </p>
                    {entry.user_remark && (
                      <p className="mt-1 text-sm text-gray-500">
                        Catatan: {entry.user_remark}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : entry.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Tanggal: {entry.posting_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <span className="text-red-600 font-medium">
                      Debit: Rp {entry.total_debit.toLocaleString('id-ID')}
                    </span>
                    <span className="ml-4 text-green-600 font-medium">
                      Credit: Rp {entry.total_credit.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {journalEntries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada jurnal ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
