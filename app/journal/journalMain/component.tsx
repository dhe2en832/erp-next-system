'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';
import AccountSearchDialog from '@/components/AccountSearchDialog';
import { formatDate, parseDate } from '@/utils/format';
import { ArrowLeft, Save, FileText, Plus, Trash2 } from 'lucide-react';

interface JournalMainProps {
  onBack: () => void;
  selectedCompany: string;
  journalName?: string;
}

interface JournalFormData {
  posting_date: string;
  voucher_type: string;
  user_remark: string;
  company: string;
  docstatus?: number;
}

interface AccountEntry {
  account: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  user_remark: string;
}

interface Account {
  name: string;
  account_name: string;
  account_type?: string;
}

export default function JournalMain({ onBack, selectedCompany, journalName }: JournalMainProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accounts, setAccounts] = useState<AccountEntry[]>([
    { account: '', debit_in_account_currency: 0, credit_in_account_currency: 0, user_remark: '' }
  ]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<JournalFormData>({
    posting_date: '',
    voucher_type: 'Journal Entry',
    user_remark: '',
    company: selectedCompany,
    docstatus: 0,
  });

  // Set default date on mount
  useEffect(() => {
    const today = new Date();
    setFormData(prev => ({ ...prev, posting_date: formatDate(today.toISOString().split('T')[0]) }));
  }, []);

  // Fetch all accounts for selection
  const fetchAllAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/accounts?company=${encodeURIComponent(selectedCompany)}`, { 
        credentials: 'include' 
      });
      const data = await res.json();
      if (data.success) {
        // Filter out stock accounts to prevent the error
        const filtered = (data.data || []).filter((acc: Account) => 
          acc.account_type !== 'Stock' && !acc.name.includes('Persediaan')
        );
        setAllAccounts(filtered);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar akun:', err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) {
      fetchAllAccounts();
    }
  }, [selectedCompany, fetchAllAccounts]);

  // Load existing journal if journalName is provided
  const loadJournal = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/finance/journal/${encodeURIComponent(journalName!)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setFormData({
          posting_date: formatDate(data.data.posting_date || new Date().toISOString().split('T')[0]),
          voucher_type: data.data.voucher_type || 'Journal Entry',
          user_remark: data.data.user_remark || '',
          company: data.data.company || selectedCompany,
          docstatus: data.data.docstatus || 0,
        });
        
        // Load accounts
        if (data.data.accounts && Array.isArray(data.data.accounts)) {
          setAccounts(data.data.accounts.map((acc: Record<string, unknown>) => ({
            account: (acc.account as string) || '',
            debit_in_account_currency: parseFloat((acc.debit_in_account_currency || acc.debit || 0) as string),
            credit_in_account_currency: parseFloat((acc.credit_in_account_currency || acc.credit || 0) as string),
            user_remark: (acc.user_remark as string) || '',
          })));
        }
      } else {
        setError(data.message || 'Gagal memuat data journal');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat data journal');
    } finally {
      setLoading(false);
    }
  }, [journalName, selectedCompany]);

  useEffect(() => {
    if (journalName) {
      loadJournal();
    }
  }, [journalName, loadJournal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate accounts
    const validAccounts = accounts.filter(acc => acc.account && (acc.debit_in_account_currency > 0 || acc.credit_in_account_currency > 0));
    
    if (validAccounts.length < 2) {
      setError('Minimal 2 akun harus diisi (debit dan kredit harus balance)');
      setSaving(false);
      return;
    }

    const totalDebit = validAccounts.reduce((sum, acc) => sum + Number(acc.debit_in_account_currency || 0), 0);
    const totalCredit = validAccounts.reduce((sum, acc) => sum + Number(acc.credit_in_account_currency || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError(`Total Debit (Rp ${totalDebit.toLocaleString('id-ID')}) dan Kredit (Rp ${totalCredit.toLocaleString('id-ID')}) harus sama`);
      setSaving(false);
      return;
    }

    try {
      const url = journalName
        ? `/api/finance/journal/${encodeURIComponent(journalName)}`
        : '/api/finance/journal';
      
      const method = journalName ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        posting_date: parseDate(formData.posting_date), // Convert DD/MM/YYYY to YYYY-MM-DD
        accounts: validAccounts,
        total_debit: totalDebit,
        total_credit: totalCredit,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(journalName ? 'Journal berhasil diupdate' : 'Journal berhasil dibuat');
        setTimeout(() => {
          router.replace('/journal');
        }, 1500);
      } else {
        setError(data.message || 'Gagal menyimpan journal');
      }
    } catch {
      setError('Terjadi kesalahan saat menyimpan journal');
    } finally {
      setSaving(false);
    }
  };

  const addAccountRow = () => {
    setAccounts([...accounts, { account: '', debit_in_account_currency: 0, credit_in_account_currency: 0, user_remark: '' }]);
  };

  const removeAccountRow = (index: number) => {
    if (accounts.length > 1) {
      setAccounts(accounts.filter((_, i) => i !== index));
    }
  };

  const updateAccountRow = (index: number, field: keyof AccountEntry, value: string | number) => {
    const updated = [...accounts];
    updated[index] = { ...updated[index], [field]: value };
    setAccounts(updated);
  };

  const handleOpenAccountDialog = (index: number) => {
    setSelectedRowIndex(index);
    setShowAccountDialog(true);
  };

  const handleSelectAccount = (accountName: string) => {
    if (selectedRowIndex !== null) {
      updateAccountRow(selectedRowIndex, 'account', accountName);
    }
  };

  const totalDebit = accounts.reduce((sum, acc) => sum + Number(acc.debit_in_account_currency || 0), 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + Number(acc.credit_in_account_currency || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const isSubmitted = formData.docstatus === 1;

  if (loading) {
    return <LoadingSpinner message="Memuat data journal..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {journalName ? 'Edit Journal Entry' : 'Buat Journal Entry Baru'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {journalName || 'Formulir journal entry baru'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Warning for submitted journal */}
          {isSubmitted && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium">⚠️ Journal ini sudah di-submit</p>
              <p className="mt-1">Journal yang sudah di-submit tidak dapat diedit. Silakan batalkan (cancel) terlebih dahulu jika ingin mengubah.</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Posting <span className="text-red-500">*</span>
              </label>
              <BrowserStyleDatePicker
                value={formData.posting_date}
                onChange={(value: string) => setFormData({ ...formData, posting_date: value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="DD/MM/YYYY"
                disabled={isSubmitted}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Voucher <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.voucher_type}
                onChange={(e) => setFormData({ ...formData, voucher_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitted}
              >
                <option value="Journal Entry">Journal Entry</option>
                <option value="Opening Entry">Opening Entry</option>
                <option value="Bank Entry">Bank Entry</option>
                <option value="Cash Entry">Cash Entry</option>
                <option value="Credit Card Entry">Credit Card Entry</option>
                <option value="Debit Note">Debit Note</option>
                <option value="Credit Note">Credit Note</option>
                <option value="Contra Entry">Contra Entry</option>
                <option value="Excise Entry">Excise Entry</option>
                <option value="Write Off">Write Off</option>
                <option value="Depreciation">Depreciation</option>
                <option value="Exchange Rate Revaluation">Exchange Rate Revaluation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Perusahaan
            </label>
            <input
              type="text"
              disabled
              value={formData.company}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan
            </label>
            <textarea
              rows={4}
              value={formData.user_remark}
              onChange={(e) => setFormData({ ...formData, user_remark: e.target.value })}
              placeholder="Tambahkan catatan untuk journal entry ini..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitted}
            />
          </div>

          {/* Account Entries Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Detail Akun <span className="text-red-500">*</span></h3>
              <button
                type="button"
                onClick={addAccountRow}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitted}
              >
                <Plus className="w-4 h-4" />
                Tambah Baris
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit (Rp)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit (Rp)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((acc, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm bg-gray-50"
                              value={acc.account}
                              readOnly
                              placeholder="Klik tombol untuk pilih akun..."
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenAccountDialog(index)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isSubmitted}
                            >
                              Pilih
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm"
                            value={acc.user_remark}
                            onChange={(e) => updateAccountRow(index, 'user_remark', e.target.value)}
                            placeholder="Keterangan..."
                            disabled={isSubmitted}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm text-right"
                            value={acc.debit_in_account_currency ? acc.debit_in_account_currency.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '');
                              updateAccountRow(index, 'debit_in_account_currency', parseFloat(rawValue) || 0);
                            }}
                            placeholder="0"
                            disabled={isSubmitted}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm text-right"
                            value={acc.credit_in_account_currency ? acc.credit_in_account_currency.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '');
                              updateAccountRow(index, 'credit_in_account_currency', parseFloat(rawValue) || 0);
                            }}
                            placeholder="0"
                            disabled={isSubmitted}
                          />
                        </td>
                        <td className="px-4 py-2">
                          {accounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAccountRow(index)}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isSubmitted}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total:</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold ${isBalanced ? 'text-gray-900' : 'text-red-600'}`}>
                        Rp {totalDebit.toLocaleString('id-ID')}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-bold ${isBalanced ? 'text-gray-900' : 'text-red-600'}`}>
                        Rp {totalCredit.toLocaleString('id-ID')}
                      </td>
                      <td></td>
                    </tr>
                    {!isBalanced && (
                      <tr>
                        <td colSpan={6} className="px-4 py-2 text-center text-sm text-red-600 bg-red-50">
                          ⚠️ Debit dan Kredit harus balance!
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Account Entries - Only show if viewing existing journal */}
          {journalName && false && accounts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Detail Akun</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accounts.map((acc, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{acc.account}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{acc.user_remark || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {acc.debit_in_account_currency > 0 
                              ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(acc.debit_in_account_currency)
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {acc.credit_in_account_currency > 0 
                              ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(acc.credit_in_account_currency)
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-700 text-right">Total:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                            accounts.reduce((sum, acc) => sum + acc.debit_in_account_currency, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                            accounts.reduce((sum, acc) => sum + acc.credit_in_account_currency, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Catatan:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Total Debit dan Kredit harus sama (balance)</li>
                  <li>Minimal 2 akun harus diisi</li>
                  <li>Akun persediaan tidak bisa digunakan (gunakan transaksi stock)</li>
                  <li>Untuk kas masuk/keluar, gunakan menu Kas Masuk atau Kas Keluar</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !isBalanced || isSubmitted}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {journalName ? 'Update' : 'Simpan'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Search Dialog */}
      <AccountSearchDialog
        isOpen={showAccountDialog}
        onClose={() => setShowAccountDialog(false)}
        onSelect={handleSelectAccount}
        accounts={allAccounts}
        title="Pilih Akun"
        currentValue={selectedRowIndex !== null ? accounts[selectedRowIndex]?.account : ''}
      />
    </div>
  );
}
