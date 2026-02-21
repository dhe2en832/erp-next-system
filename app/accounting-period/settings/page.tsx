'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { PeriodClosingConfig, UpdateConfigRequest } from '../../../types/accounting-period';

export default function SettingsPage() {
  const [config, setConfig] = useState<PeriodClosingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    retainedEarningsAccount?: string;
    reminderDays?: string;
    escalationDays?: string;
  }>({});
  
  // Form state
  const [retainedEarningsAccount, setRetainedEarningsAccount] = useState('');
  const [enableBankReconciliation, setEnableBankReconciliation] = useState(true);
  const [enableDraftTransaction, setEnableDraftTransaction] = useState(true);
  const [enableUnpostedTransaction, setEnableUnpostedTransaction] = useState(true);
  const [enableSalesInvoice, setEnableSalesInvoice] = useState(true);
  const [enablePurchaseInvoice, setEnablePurchaseInvoice] = useState(true);
  const [enableInventory, setEnableInventory] = useState(true);
  const [enablePayroll, setEnablePayroll] = useState(true);
  const [closingRole, setClosingRole] = useState('Accounts Manager');
  const [reopenRole, setReopenRole] = useState('Accounts Manager');
  const [reminderDays, setReminderDays] = useState(3);
  const [escalationDays, setEscalationDays] = useState(7);
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accounting-period/config', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        const cfg = data.data;
        setConfig(cfg);
        
        // Populate form
        setRetainedEarningsAccount(cfg.retained_earnings_account || '');
        setEnableBankReconciliation(cfg.enable_bank_reconciliation_check);
        setEnableDraftTransaction(cfg.enable_draft_transaction_check);
        setEnableUnpostedTransaction(cfg.enable_unposted_transaction_check);
        setEnableSalesInvoice(cfg.enable_sales_invoice_check);
        setEnablePurchaseInvoice(cfg.enable_purchase_invoice_check);
        setEnableInventory(cfg.enable_inventory_check);
        setEnablePayroll(cfg.enable_payroll_check);
        setClosingRole(cfg.closing_role);
        setReopenRole(cfg.reopen_role);
        setReminderDays(cfg.reminder_days_before_end);
        setEscalationDays(cfg.escalation_days_after_end);
        setEnableEmailNotifications(cfg.enable_email_notifications);
      } else {
        setError(data.message || 'Gagal memuat konfigurasi');
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      setError('Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Clear previous errors
    setValidationErrors({});
    setError('');
    setSuccess('');

    // Validate inputs
    const errors: typeof validationErrors = {};
    
    // Validate retained earnings account (required)
    if (!retainedEarningsAccount || retainedEarningsAccount.trim() === '') {
      errors.retainedEarningsAccount = 'Retained Earnings Account wajib diisi';
    }
    
    // Validate reminder days (must be >= 0 and <= 30)
    if (reminderDays < 0) {
      errors.reminderDays = 'Jumlah hari tidak boleh negatif';
    } else if (reminderDays > 30) {
      errors.reminderDays = 'Jumlah hari tidak boleh lebih dari 30';
    }
    
    // Validate escalation days (must be >= 0 and <= 30)
    if (escalationDays < 0) {
      errors.escalationDays = 'Jumlah hari tidak boleh negatif';
    } else if (escalationDays > 30) {
      errors.escalationDays = 'Jumlah hari tidak boleh lebih dari 30';
    }
    
    // If there are validation errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Mohon perbaiki kesalahan validasi sebelum menyimpan');
      return;
    }

    setSaving(true);

    try {
      const updateData: UpdateConfigRequest = {
        retained_earnings_account: retainedEarningsAccount,
        enable_bank_reconciliation_check: enableBankReconciliation,
        enable_draft_transaction_check: enableDraftTransaction,
        enable_unposted_transaction_check: enableUnpostedTransaction,
        enable_sales_invoice_check: enableSalesInvoice,
        enable_purchase_invoice_check: enablePurchaseInvoice,
        enable_inventory_check: enableInventory,
        enable_payroll_check: enablePayroll,
        closing_role: closingRole,
        reopen_role: reopenRole,
        reminder_days_before_end: reminderDays,
        escalation_days_after_end: escalationDays,
        enable_email_notifications: enableEmailNotifications
      };

      const response = await fetch('/api/accounting-period/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Konfigurasi berhasil disimpan');
        setConfig(data.data);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setRetainedEarningsAccount(config.retained_earnings_account || '');
      setEnableBankReconciliation(config.enable_bank_reconciliation_check);
      setEnableDraftTransaction(config.enable_draft_transaction_check);
      setEnableUnpostedTransaction(config.enable_unposted_transaction_check);
      setEnableSalesInvoice(config.enable_sales_invoice_check);
      setEnablePurchaseInvoice(config.enable_purchase_invoice_check);
      setEnableInventory(config.enable_inventory_check);
      setEnablePayroll(config.enable_payroll_check);
      setClosingRole(config.closing_role);
      setReopenRole(config.reopen_role);
      setReminderDays(config.reminder_days_before_end);
      setEscalationDays(config.escalation_days_after_end);
      setEnableEmailNotifications(config.enable_email_notifications);
      setError('');
      setSuccess('');
      setValidationErrors({});
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat konfigurasi..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Penutupan Periode</h1>
        <p className="text-sm text-gray-500">Konfigurasi sistem penutupan periode akuntansi</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Retained Earnings Account */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Akun Laba Ditahan</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retained Earnings Account <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={retainedEarningsAccount}
              onChange={(e) => {
                setRetainedEarningsAccount(e.target.value);
                // Clear validation error when user types
                if (validationErrors.retainedEarningsAccount) {
                  setValidationErrors(prev => ({ ...prev, retainedEarningsAccount: undefined }));
                }
              }}
              placeholder="Contoh: 3200 - Retained Earnings"
              className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                validationErrors.retainedEarningsAccount 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {validationErrors.retainedEarningsAccount && (
              <p className="mt-1 text-xs text-red-600">
                {validationErrors.retainedEarningsAccount}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Akun ekuitas yang digunakan untuk mencatat laba/rugi bersih saat penutupan periode
            </p>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Validasi Sebelum Penutupan</h2>
          <p className="text-sm text-gray-600 mb-4">
            Pilih validasi yang harus dilakukan sebelum periode dapat ditutup
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableDraftTransaction}
                onChange={(e) => setEnableDraftTransaction(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa transaksi draft (tidak ada transaksi dengan status draft)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableUnpostedTransaction}
                onChange={(e) => setEnableUnpostedTransaction(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa transaksi yang belum diposting ke GL
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableBankReconciliation}
                onChange={(e) => setEnableBankReconciliation(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa rekonsiliasi bank (semua transaksi bank sudah direkonsiliasi)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableSalesInvoice}
                onChange={(e) => setEnableSalesInvoice(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa invoice penjualan (semua invoice sudah diproses)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enablePurchaseInvoice}
                onChange={(e) => setEnablePurchaseInvoice(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa invoice pembelian (semua invoice sudah diproses)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableInventory}
                onChange={(e) => setEnableInventory(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa transaksi inventory (semua stock entries sudah diposting)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enablePayroll}
                onChange={(e) => setEnablePayroll(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Periksa transaksi payroll (semua payroll entries sudah dicatat)
              </span>
            </label>
          </div>
        </div>

        {/* Role Assignments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hak Akses</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tentukan role yang memiliki izin untuk melakukan penutupan dan pembukaan kembali periode
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role untuk Penutupan Periode
              </label>
              <input
                type="text"
                value={closingRole}
                onChange={(e) => setClosingRole(e.target.value)}
                placeholder="Contoh: Accounts Manager"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                User dengan role ini dapat menutup periode akuntansi
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role untuk Pembukaan Kembali Periode
              </label>
              <input
                type="text"
                value={reopenRole}
                onChange={(e) => setReopenRole(e.target.value)}
                placeholder="Contoh: Accounts Manager"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                User dengan role ini dapat membuka kembali periode yang sudah ditutup
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Notifikasi</h2>
          <p className="text-sm text-gray-600 mb-4">
            Konfigurasi pengingat dan notifikasi untuk penutupan periode
          </p>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableEmailNotifications}
                onChange={(e) => setEnableEmailNotifications(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Aktifkan notifikasi email
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pengingat Sebelum Akhir Periode (hari)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={reminderDays}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setReminderDays(value);
                  // Clear validation error when user types
                  if (validationErrors.reminderDays) {
                    setValidationErrors(prev => ({ ...prev, reminderDays: undefined }));
                  }
                }}
                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  validationErrors.reminderDays 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.reminderDays && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.reminderDays}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Sistem akan mengirim pengingat N hari sebelum tanggal akhir periode
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eskalasi Setelah Akhir Periode (hari)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={escalationDays}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setEscalationDays(value);
                  // Clear validation error when user types
                  if (validationErrors.escalationDays) {
                    setValidationErrors(prev => ({ ...prev, escalationDays: undefined }));
                  }
                }}
                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  validationErrors.escalationDays 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.escalationDays && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.escalationDays}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Sistem akan mengirim notifikasi eskalasi ke administrator jika periode masih terbuka M hari setelah tanggal akhir
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
