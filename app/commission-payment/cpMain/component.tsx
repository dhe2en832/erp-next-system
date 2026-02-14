'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PayableInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  grand_total: number;
  custom_total_komisi_sales: number;
  selected: boolean;
}

interface SalesPerson {
  name: string;
  full_name: string;
}

export default function CommissionPaymentMain() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [salesPerson, setSalesPerson] = useState('');
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [paidFromAccount, setPaidFromAccount] = useState('111100 - Kas - BAC');
  const [commissionExpenseAccount, setCommissionExpenseAccount] = useState('519000 - Biaya Komisi Penjualan - BAC');
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  useEffect(() => {
    if (selectedCompany) fetchSalesPersons();
  }, [selectedCompany]);

  const lookupEmployee = async (spName: string) => {
    setEmployeeId('');
    setEmployeeName('');
    if (!spName) return;
    try {
      const response = await fetch(`/api/setup/employees?sales_person=${encodeURIComponent(spName)}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setEmployeeId(data.data[0].name);
        setEmployeeName(data.data[0].employee_name || data.data[0].name);
      }
    } catch { /* silent */ }
  };

  const handleSalesPersonChange = (value: string) => {
    setSalesPerson(value);
    lookupEmployee(value);
  };

  const fetchSalesPersons = async () => {
    try {
      const response = await fetch('/api/sales/sales-persons', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSalesPersons(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching sales persons:', err);
    }
  };

  const loadPayableInvoices = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ company: selectedCompany });
      if (salesPerson) params.set('sales_person', salesPerson);

      const response = await fetch(`/api/finance/commission/payable-invoices?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setInvoices((data.data || []).map((inv: any) => ({ ...inv, selected: true })));
      } else {
        setError(data.message || 'Gagal memuat faktur');
      }
    } catch (err) {
      console.error('Error loading payable invoices:', err);
      setError('Gagal memuat faktur');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, salesPerson]);

  const toggleInvoice = (index: number) => {
    const newInvoices = [...invoices];
    newInvoices[index].selected = !newInvoices[index].selected;
    setInvoices(newInvoices);
  };

  const toggleAll = (checked: boolean) => {
    setInvoices(invoices.map(inv => ({ ...inv, selected: checked })));
  };

  const selectedInvoices = invoices.filter(inv => inv.selected);
  const totalAmount = selectedInvoices.reduce((sum, inv) => sum + (inv.custom_total_komisi_sales || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInvoices.length === 0) {
      setError('Pilih minimal satu faktur untuk pembayaran komisi');
      return;
    }
    if (!salesPerson) {
      setError('Sales person harus dipilih');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const response = await fetch('/api/finance/commission/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          company: selectedCompany,
          sales_person: salesPerson,
          employee_id: employeeId || undefined,
          posting_date: postingDate,
          mode_of_payment: modeOfPayment,
          paid_from_account: paidFromAccount,
          commission_expense_account: commissionExpenseAccount,
          invoices: selectedInvoices.map(inv => ({
            invoice_name: inv.name,
            commission_amount: inv.custom_total_komisi_sales || 0,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Pembayaran komisi berhasil!');
        setTimeout(() => router.push('/commission-payment'), 2000);
      } else {
        setError(data.message || 'Gagal memproses pembayaran komisi');
      }
    } catch (err) {
      console.error('Error submitting commission payment:', err);
      setError('Gagal memproses pembayaran komisi');
    } finally {
      setFormLoading(false);
    }
  };

  if (!selectedCompany) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">Perusahaan Belum Dipilih</h3>
          <p className="text-yellow-600 mt-2">Silakan pilih perusahaan terlebih dahulu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bayar Komisi Sales</h1>
          <p className="text-sm text-gray-500">Pilih faktur dan proses pembayaran komisi</p>
        </div>
        <button
          onClick={() => router.push('/commission-payment')}
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

      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informasi Pembayaran</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person *</label>
              <select
                required
                value={salesPerson}
                onChange={(e) => handleSalesPersonChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Pilih Sales Person --</option>
                {salesPersons.map(sp => (
                  <option key={sp.name} value={sp.name}>{sp.full_name || sp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
              <select
                value={modeOfPayment}
                onChange={(e) => setModeOfPayment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="Cash">Tunai</option>
                <option value="Bank Transfer">Transfer Bank</option>
                <option value="Check">Cek/Giro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Akun Bayar Dari</label>
              <input
                type="text"
                value={paidFromAccount}
                onChange={(e) => setPaidFromAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Contoh: 111100 - Kas - BAC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Akun Biaya Komisi</label>
              <input
                type="text"
                value={commissionExpenseAccount}
                onChange={(e) => setCommissionExpenseAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Contoh: 519000 - Biaya Komisi Penjualan - BAC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee (Party)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={employeeId ? `${employeeId} — ${employeeName}` : '(auto-detect dari Sales Person)'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm text-gray-500"
                />
              </div>
              {employeeId && (
                <p className="text-xs text-green-600 mt-1">✓ Employee ditemukan, JE akan menggunakan Party Type = Employee</p>
              )}
              {salesPerson && !employeeId && (
                <p className="text-xs text-yellow-600 mt-1">⚠ Employee tidak ditemukan untuk sales person ini</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={loadPayableInvoices}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Muat Komisi Terhutang'}
            </button>
          </div>
        </div>

        {invoices.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Faktur dengan Komisi Terhutang</h2>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={invoices.every(inv => inv.selected)}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pilih Semua</span>
                </label>
                <span className="text-sm font-medium text-gray-700">
                  {selectedInvoices.length} dari {invoices.length} dipilih
                </span>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">Pilih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Faktur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Faktur</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Komisi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((inv, index) => (
                  <tr key={inv.name} className={`hover:bg-gray-50 ${inv.selected ? 'bg-indigo-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={inv.selected}
                        onChange={() => toggleInvoice(index)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">{inv.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{inv.customer_name || inv.customer}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{inv.posting_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">Rp {(inv.grand_total || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-orange-600 text-right">Rp {(inv.custom_total_komisi_sales || 0).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Total Komisi Dibayar:</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-indigo-700">Rp {totalAmount.toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {invoices.length > 0 && (
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/commission-payment')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading || selectedInvoices.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {formLoading ? 'Memproses...' : `Bayar Komisi (Rp ${totalAmount.toLocaleString('id-ID')})`}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
