/**
 * Toast Error Handler Integration
 * 
 * Integrates the centralized error handler with the toast notification system.
 * Provides utilities to display errors, warnings, and success messages as toasts.
 */

import { 
  classifyError, 
  ErrorCategory,
  ApiErrorResponse 
} from './accounting-period-error-handler';

// ============================================================================
// Types
// ============================================================================

interface ToastFunctions {
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

// ============================================================================
// Error to Toast Mapping
// ============================================================================

/**
 * Display error as toast notification
 */
export function showErrorToast(
  error: any,
  toast: ToastFunctions,
  customTitle?: string
): void {
  const classified = classifyError(error);
  
  const title = customTitle || getErrorTitle(classified.category);
  const message = classified.message;

  // Use error toast for most errors
  if (classified.category === 'VALIDATION_ERROR' || 
      classified.category === 'BUSINESS_LOGIC_ERROR') {
    toast.warning(title, message, 7000);
  } else {
    toast.error(title, message, 7000);
  }
}

/**
 * Display API error response as toast
 */
export function showApiErrorToast(
  errorResponse: ApiErrorResponse,
  toast: ToastFunctions,
  customTitle?: string
): void {
  const title = customTitle || getErrorTitle(errorResponse.error);
  const message = errorResponse.message;

  if (errorResponse.error === 'VALIDATION_ERROR' || 
      errorResponse.error === 'BUSINESS_LOGIC_ERROR') {
    toast.warning(title, message, 7000);
  } else {
    toast.error(title, message, 7000);
  }
}

/**
 * Display success message for completed actions
 */
export function showSuccessToast(
  action: string,
  toast: ToastFunctions,
  details?: string
): void {
  const titles: Record<string, string> = {
    'period_created': 'Periode Berhasil Dibuat',
    'period_closed': 'Periode Berhasil Ditutup',
    'period_reopened': 'Periode Berhasil Dibuka Kembali',
    'period_permanently_closed': 'Periode Berhasil Ditutup Permanen',
    'period_updated': 'Periode Berhasil Diperbarui',
    'config_updated': 'Konfigurasi Berhasil Diperbarui',
    'validation_passed': 'Validasi Berhasil',
  };

  const title = titles[action] || 'Operasi Berhasil';
  toast.success(title, details, 5000);
}

/**
 * Display warning message for validations
 */
export function showValidationWarningToast(
  message: string,
  toast: ToastFunctions,
  details?: string
): void {
  toast.warning(message, details, 7000);
}

/**
 * Display info message
 */
export function showInfoToast(
  message: string,
  toast: ToastFunctions,
  details?: string
): void {
  toast.info(message, details, 5000);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user-friendly title based on error category
 */
function getErrorTitle(category: ErrorCategory): string {
  const titles: Record<ErrorCategory, string> = {
    'VALIDATION_ERROR': 'Validasi Gagal',
    'AUTHORIZATION_ERROR': 'Akses Ditolak',
    'BUSINESS_LOGIC_ERROR': 'Operasi Tidak Valid',
    'NOT_FOUND': 'Data Tidak Ditemukan',
    'CONFLICT': 'Konflik Data',
    'INTEGRATION_ERROR': 'Kesalahan Sistem',
    'NETWORK_ERROR': 'Kesalahan Jaringan',
    'INTERNAL_ERROR': 'Kesalahan Internal',
  };

  return titles[category] || 'Terjadi Kesalahan';
}

// ============================================================================
// Convenience Functions for Common Actions
// ============================================================================

/**
 * Show toast for period creation
 */
export function showPeriodCreatedToast(
  periodName: string,
  toast: ToastFunctions
): void {
  showSuccessToast('period_created', toast, `Periode "${periodName}" telah dibuat`);
}

/**
 * Show toast for period closing
 */
export function showPeriodClosedToast(
  periodName: string,
  toast: ToastFunctions
): void {
  showSuccessToast('period_closed', toast, `Periode "${periodName}" telah ditutup`);
}

/**
 * Show toast for period reopening
 */
export function showPeriodReopenedToast(
  periodName: string,
  toast: ToastFunctions
): void {
  showSuccessToast('period_reopened', toast, `Periode "${periodName}" telah dibuka kembali`);
}

/**
 * Show toast for permanent closing
 */
export function showPeriodPermanentlyClosedToast(
  periodName: string,
  toast: ToastFunctions
): void {
  showSuccessToast(
    'period_permanently_closed', 
    toast, 
    `Periode "${periodName}" telah ditutup permanen`
  );
}

/**
 * Show toast for validation results
 */
export function showValidationResultsToast(
  passed: boolean,
  failedCount: number,
  toast: ToastFunctions
): void {
  if (passed) {
    showSuccessToast('validation_passed', toast, 'Semua validasi berhasil');
  } else {
    showValidationWarningToast(
      'Validasi Gagal',
      toast,
      `${failedCount} validasi tidak berhasil`
    );
  }
}

/**
 * Show toast for configuration update
 */
export function showConfigUpdatedToast(
  toast: ToastFunctions
): void {
  showSuccessToast('config_updated', toast, 'Pengaturan telah diperbarui');
}
