'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft, Save, FileText } from 'lucide-react';

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
}

interface AccountEntry {
  account: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  user_remark: string;
}

export default function JournalMain({ onBack, selectedCompany, journalName }: JournalMainProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);

  const [formData, setFormData] = useState<JournalFormData>({
    posting_date: new Date().toISOString().split('T')[0],
    voucher_type: 'Journal Entry',
    user_remark: '',
    company: selectedCompany,
  });

  // Load existing journal if journalName is provided
  useEffect(() => {
    if (journalName) {
      loadJournal();
    }
  }, [journalName]);

  const loadJournal = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/finance/journal/${encodeURIComponent(journalName!)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setFormData({
          posting_date: data.data.posting_date || new Date().toISOString().split('T')[0],
          voucher_type: data.data.voucher_type || 'Journal Entry',
          user_remark: data.data.user_remark || '',
          company: data.data.company || selectedCompany,
        });
        
        // Load accounts
        if (data.data.accounts && Array.isArray(data.data.accounts)) {
          setAccounts(data.data.accounts.map((acc: any) => ({
            account: acc.account || '',
            debit_in_account_currency: parseFloat(acc.debit_in_account_currency || acc.debit || 0),
            credit_in_account_currency: parseFloat(acc.credit_in_account_currency || acc.credit || 0),
            user_remark: acc.user_remark || '',
          })));
        }
      } else {
        setError(data.message || 'Gagal memuat data journal');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data journal');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = journalName
        ? `/api/finance/journal/${encodeURIComponent(journalName)}`
        : '/api/finance/journal';
      
      const method = journalName ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(journalName ? 'Journal berhasil diupdate' : 'Journal berhasil dibuat');
        setTimeout(() => {
          router.push('/journal');
        }, 1500);
      } else {
        setError(data.message || 'Gagal menyimpan journal');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menyimpan journal');
    } finally {
      setSaving(false);
    }
  };

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
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Posting <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.posting_date}
                onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            />
          </div>

          {/* Account Entries - Only show if viewing existing journal */}
          {journalName && accounts.length > 0 && (
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
                <p>
                  Formulir ini adalah versi sederhana untuk membuat journal entry. 
                  Untuk fitur lengkap dengan accounting entries, gunakan halaman Kas Masuk atau Kas Keluar.
                </p>
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
              disabled={saving}
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
    </div>
  );
}
