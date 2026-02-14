'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PaymentTerm {
  payment_term: string;
  description: string;
  invoice_portion: number;
  due_date_based_on: string;
  credit_days: number;
}

interface PaymentTermsFormData {
  template_name: string;
  terms: PaymentTerm[];
}

export default function PaymentTermsMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateName = searchParams.get('name');

  const [loading, setLoading] = useState(!!templateName);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<PaymentTermsFormData>({
    template_name: '',
    terms: [{ payment_term: '', description: '', invoice_portion: 100, due_date_based_on: 'Day(s) after invoice date', credit_days: 0 }],
  });

  useEffect(() => {
    if (templateName) {
      setIsEditMode(true);
      fetchDetail(templateName);
    }
  }, [templateName]);

  const fetchDetail = async (name: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/setup/payment-terms/detail?name=${encodeURIComponent(name)}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success && data.data) {
        const d = data.data;
        setFormData({
          template_name: d.template_name || d.name || '',
          terms: d.terms && d.terms.length > 0 ? d.terms.map((t: any) => ({
            payment_term: t.payment_term || '',
            description: t.description || '',
            invoice_portion: t.invoice_portion || 0,
            due_date_based_on: t.due_date_based_on || 'Day(s) after invoice date',
            credit_days: t.credit_days || 0,
          })) : [{ payment_term: '', description: '', invoice_portion: 100, due_date_based_on: 'Day(s) after invoice date', credit_days: 0 }],
        });
      } else {
        setError('Gagal memuat detail termin pembayaran');
      }
    } catch (err) {
      console.error('Error fetching payment terms detail:', err);
      setError('Gagal memuat detail termin pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = () => {
    setFormData({
      ...formData,
      terms: [...formData.terms, { payment_term: '', description: '', invoice_portion: 0, due_date_based_on: 'Day(s) after invoice date', credit_days: 0 }],
    });
  };

  const handleRemoveTerm = (index: number) => {
    if (formData.terms.length <= 1) return;
    setFormData({ ...formData, terms: formData.terms.filter((_, i) => i !== index) });
  };

  const handleTermChange = (index: number, field: keyof PaymentTerm, value: string | number) => {
    const newTerms = [...formData.terms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    setFormData({ ...formData, terms: newTerms });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const url = isEditMode
        ? `/api/setup/payment-terms/detail?name=${encodeURIComponent(templateName!)}`
        : '/api/setup/payment-terms';

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(isEditMode ? 'Template berhasil diperbarui!' : 'Template berhasil ditambahkan!');
        setTimeout(() => router.push('/payment-terms'), 1500);
      } else {
        setError(data.message || 'Gagal menyimpan template');
      }
    } catch (err) {
      console.error('Error saving payment terms:', err);
      setError('Gagal menyimpan template');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data termin pembayaran..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Termin Pembayaran' : 'Tambah Template Termin Pembayaran'}
          </h1>
          {isEditMode && <p className="text-sm text-gray-500">{templateName}</p>}
        </div>
        <button
          onClick={() => router.push('/payment-terms')}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          Kembali
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Template *</label>
          <input
            type="text"
            required
            value={formData.template_name}
            onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Contoh: Net 30"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900">Detail Termin</h2>
            <button
              type="button"
              onClick={handleAddTerm}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              + Tambah Baris
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Termin</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Porsi Faktur (%)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Basis Jatuh Tempo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hari Kredit</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.terms.map((term, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={term.payment_term}
                        onChange={(e) => handleTermChange(index, 'payment_term', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Contoh: Lunas"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={term.invoice_portion}
                        onChange={(e) => handleTermChange(index, 'invoice_portion', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={term.due_date_based_on}
                        onChange={(e) => handleTermChange(index, 'due_date_based_on', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="Day(s) after invoice date">Hari setelah tanggal faktur</option>
                        <option value="Day(s) after the end of the invoice month">Hari setelah akhir bulan faktur</option>
                        <option value="Month(s) after the end of the invoice month">Bulan setelah akhir bulan faktur</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        value={term.credit_days}
                        onChange={(e) => handleTermChange(index, 'credit_days', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        disabled={formData.terms.length <= 1}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/payment-terms')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {formLoading ? 'Menyimpan...' : (isEditMode ? 'Perbarui' : 'Simpan')}
          </button>
        </div>
      </form>
    </div>
  );
}
