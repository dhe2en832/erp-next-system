'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { formatDate, parseDate } from '../../../utils/format';
import AccountSearchDialog from '../../../components/AccountSearchDialog';

export const dynamic = 'force-dynamic';

interface KasItem {
  keterangan: string;
  nominal: number;
  kategori: string;
}

interface Account {
  name: string;
  account_name: string;
  account_type?: string;
}

interface JournalAccount {
  account: string;
  debit?: number;
  credit?: number;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
  user_remark?: string;
}

interface JournalData {
  name: string;
  posting_date: string;
  accounts: JournalAccount[];
}

export default function KasMasukForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const journalName = searchParams.get('name'); // Get name from URL
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [journalEntryName, setJournalEntryName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [postingDate, setPostingDate] = useState('');
  const [cashAccount, setCashAccount] = useState('');
  const [items, setItems] = useState<KasItem[]>([
    { keterangan: '', nominal: 0, kategori: '' }
  ]);

  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const fetchCashAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/accounts/cash-bank?company=${encodeURIComponent(selectedCompany)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setCashAccounts(data.data || []);
    } catch { /* silent */ }
  }, [selectedCompany]);

  const fetchIncomeAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/accounts/expense?company=${encodeURIComponent(selectedCompany)}&type=income`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setIncomeAccounts(data.data || []);
    } catch { /* silent */ }
  }, [selectedCompany]);

  const fetchJournalData = useCallback(async () => {
    if (!journalName) return;
    setFetchingData(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/journal/${encodeURIComponent(journalName)}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success && data.data) {
        const journal: JournalData = data.data;
        
        // Set posting date - convert from ISO to DD/MM/YYYY
        setPostingDate(formatDate(journal.posting_date || new Date().toISOString().split('T')[0]));
        
        // Parse accounts to extract cash account and items
        const accounts = journal.accounts || [];
        
        // Find cash account (debit entry for kas masuk)
        const cashEntry = accounts.find((acc) => 
          (acc.debit_in_account_currency && acc.debit_in_account_currency > 0) ||
          (acc.debit && acc.debit > 0)
        );
        if (cashEntry) {
          setCashAccount(cashEntry.account);
        }
        
        // Find income accounts (credit entries) - filter out entries with "Kas Masuk -" in user_remark
        const incomeEntries = accounts.filter((acc) => {
          const hasCredit = (acc.credit_in_account_currency && acc.credit_in_account_currency > 0) ||
                           (acc.credit && acc.credit > 0);
          const isNotCashSummary = !acc.user_remark || !acc.user_remark.includes('Kas Masuk -');
          return hasCredit && isNotCashSummary;
        });
        
        if (incomeEntries.length > 0) {
          const parsedItems = incomeEntries.map((acc) => {
            // Extract keterangan from user_remark, removing "Kas Masuk: " prefix if present
            let keterangan = acc.user_remark || '';
            if (keterangan.startsWith('Kas Masuk: ')) {
              keterangan = keterangan.substring('Kas Masuk: '.length);
            }
            
            return {
              keterangan,
              nominal: acc.credit_in_account_currency || acc.credit || 0,
              kategori: acc.account || '',
            };
          });
          setItems(parsedItems);
        }
        
        setJournalEntryName(journal.name);
      } else {
        setError(data.message || 'Gagal memuat data journal');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat data journal');
    } finally {
      setFetchingData(false);
    }
  }, [journalName]);

  // Set default date on mount
  useEffect(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    const todayString = localDate.toISOString().split('T')[0];
    setPostingDate(formatDate(new Date(todayString)));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCashAccounts();
      fetchIncomeAccounts();
    }
  }, [selectedCompany, fetchCashAccounts, fetchIncomeAccounts]);

  // Fetch journal entry data if in edit mode
  useEffect(() => {
    if (journalName && selectedCompany) {
      setIsEditMode(true);
      fetchJournalData();
    }
  }, [journalName, selectedCompany, fetchJournalData]);

  const addRow = () => {
    setItems([...items, { keterangan: '', nominal: 0, kategori: '' }]);
  };

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof KasItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleOpenAccountDialog = (index: number) => {
    setSelectedRowIndex(index);
    setShowAccountDialog(true);
  };

  const handleSelectAccount = (accountName: string) => {
    if (selectedRowIndex !== null) {
      updateRow(selectedRowIndex, 'kategori', accountName);
    }
  };

  const totalNominal = items.reduce((sum, item) => sum + Number(item.nominal || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setJournalEntryName('');

    if (!cashAccount) {
      setError('Akun Kas/Bank harus dipilih');
      setLoading(false);
      return;
    }

    const validItems = items.filter(i => i.keterangan && i.nominal > 0 && i.kategori);
    if (validItems.length === 0) {
      setError('Minimal satu item dengan keterangan, nominal, dan kategori harus diisi');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/finance/journal/kas-masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          posting_date: parseDate(postingDate), // Convert DD/MM/YYYY to YYYY-MM-DD
          cash_account: cashAccount,
          company: selectedCompany,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Jurnal Kas Masuk berhasil dibuat!');
        setJournalEntryName(data.data?.name || '');
        setItems([{ keterangan: '', nominal: 0, kategori: '' }]);
        
        // Redirect ke list kas masuk setelah 1.5 detik
        setTimeout(() => {
          router.replace('/kas-masuk');
        }, 1500);
      } else {
        setError(data.message || 'Gagal membuat jurnal kas masuk');
      }
    } catch {
      setError('Terjadi kesalahan saat membuat jurnal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Edit Kas Masuk' : 'Kas Masuk'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isEditMode ? `Edit jurnal: ${journalEntryName}` : 'Buat jurnal penerimaan kas multi-item'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/kas-masuk')}
                className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]"
              >
                Lihat List
              </button>
              <button
                onClick={() => router.push('/journal')}
                className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 min-h-[44px]"
              >
                Lihat Jurnal
              </button>
            </div>
          </div>
        </div>
      </div>

      {fetchingData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Memuat data journal...
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p>{successMessage}</p>
            {journalEntryName && (
              <p className="mt-1 font-semibold">Nomor Jurnal: {journalEntryName}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Posting <span className="text-red-500">*</span></label>
                <BrowserStyleDatePicker
                  value={postingDate}
                  onChange={(value: string) => setPostingDate(value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akun Kas/Bank <span className="text-red-500">*</span></label>
                <select
                  required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={cashAccount}
                  onChange={(e) => setCashAccount(e.target.value)}
                >
                  <option value="">Pilih Akun Kas/Bank...</option>
                  {cashAccounts.map((acc) => (
                    <option key={acc.name} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perusahaan</label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm bg-gray-50"
                  value={selectedCompany}
                  readOnly
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900">Detail Penerimaan</h3>
                <button
                  type="button"
                  onClick={addRow}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  + Tambah Baris
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nominal (Rp)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori (Akun Pendapatan)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm"
                            value={item.keterangan}
                            onChange={(e) => updateRow(index, 'keterangan', e.target.value)}
                            placeholder="Keterangan penerimaan..."
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm text-right"
                            value={item.nominal ? item.nominal.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '');
                              const numValue = parseFloat(rawValue) || 0;
                              updateRow(index, 'nominal', numValue);
                            }}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm bg-gray-50"
                              value={item.kategori}
                              readOnly
                              placeholder="Klik tombol untuk pilih akun..."
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenAccountDialog(index)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 whitespace-nowrap"
                            >
                              Pilih
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Hapus
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total:</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        Rp {totalNominal.toLocaleString('id-ID')}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || fetchingData || isEditMode}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                title={isEditMode ? 'Edit mode: data hanya untuk view' : ''}
              >
                {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {isEditMode ? 'View Mode (Read Only)' : loading ? 'Memproses...' : 'Buat Jurnal Kas Masuk'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Search Dialog */}
      <AccountSearchDialog
        isOpen={showAccountDialog}
        onClose={() => setShowAccountDialog(false)}
        onSelect={handleSelectAccount}
        accounts={incomeAccounts}
        title="Pilih Akun Pendapatan"
        currentValue={selectedRowIndex !== null ? items[selectedRowIndex]?.kategori : ''}
      />
    </div>
  );
}
