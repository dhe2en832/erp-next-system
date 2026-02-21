'use client';

/**
 * Toast Example Component
 * 
 * Demonstrates how to use the toast notification system
 * with the accounting period error handler integration.
 */

import { useToast } from '../../../lib/toast-context';
import {
  showErrorToast,
  showPeriodCreatedToast,
  showPeriodClosedToast,
  showPeriodReopenedToast,
  showValidationResultsToast,
  showConfigUpdatedToast,
} from '../../../lib/toast-error-handler';

export default function ToastExample() {
  const toast = useToast();

  // Example: Basic toast usage
  const handleBasicSuccess = () => {
    toast.success('Operasi Berhasil', 'Data telah disimpan dengan sukses');
  };

  const handleBasicError = () => {
    toast.error('Operasi Gagal', 'Terjadi kesalahan saat menyimpan data');
  };

  const handleBasicWarning = () => {
    toast.warning('Perhatian', 'Beberapa field belum diisi dengan benar');
  };

  const handleBasicInfo = () => {
    toast.info('Informasi', 'Proses sedang berjalan, mohon tunggu...');
  };

  // Example: Period-specific toasts
  const handlePeriodCreated = () => {
    showPeriodCreatedToast('Januari 2024', toast);
  };

  const handlePeriodClosed = () => {
    showPeriodClosedToast('Januari 2024', toast);
  };

  const handlePeriodReopened = () => {
    showPeriodReopenedToast('Januari 2024', toast);
  };

  // Example: Validation results
  const handleValidationPassed = () => {
    showValidationResultsToast(true, 0, toast);
  };

  const handleValidationFailed = () => {
    showValidationResultsToast(false, 3, toast);
  };

  // Example: Config update
  const handleConfigUpdated = () => {
    showConfigUpdatedToast(toast);
  };

  // Example: Error handling
  const handleApiError = () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          message: 'Tanggal mulai harus lebih kecil dari tanggal akhir',
        },
      },
    };
    showErrorToast(mockError, toast);
  };

  // Example: Multiple toasts
  const handleMultipleToasts = () => {
    toast.success('Langkah 1 selesai');
    setTimeout(() => toast.success('Langkah 2 selesai'), 500);
    setTimeout(() => toast.success('Langkah 3 selesai'), 1000);
    setTimeout(() => toast.success('Semua langkah selesai!'), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Toast Notification Examples
        </h2>

        <div className="space-y-6">
          {/* Basic Toasts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Basic Toast Types
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={handleBasicSuccess}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Success
              </button>
              <button
                onClick={handleBasicError}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Error
              </button>
              <button
                onClick={handleBasicWarning}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                Warning
              </button>
              <button
                onClick={handleBasicInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Info
              </button>
            </div>
          </div>

          {/* Period-Specific Toasts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Period-Specific Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={handlePeriodCreated}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Period Created
              </button>
              <button
                onClick={handlePeriodClosed}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Period Closed
              </button>
              <button
                onClick={handlePeriodReopened}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Period Reopened
              </button>
            </div>
          </div>

          {/* Validation Toasts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Validation Results
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleValidationPassed}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Validation Passed
              </button>
              <button
                onClick={handleValidationFailed}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                Validation Failed
              </button>
            </div>
          </div>

          {/* Other Actions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Other Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={handleConfigUpdated}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Config Updated
              </button>
              <button
                onClick={handleApiError}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                API Error
              </button>
              <button
                onClick={handleMultipleToasts}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Multiple Toasts
              </button>
            </div>
          </div>
        </div>

        {/* Usage Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Click the buttons above to see different toast notifications.
            Toasts will appear in the top-right corner of the screen.
          </p>
        </div>
      </div>
    </div>
  );
}
