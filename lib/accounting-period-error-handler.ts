/**
 * Centralized Error Handling Utility untuk Accounting Period Closing
 * 
 * Utility ini menyediakan:
 * - Error classification dan mapping
 * - User-friendly error messages dalam Bahasa Indonesia
 * - Retry logic untuk transient errors
 * - Structured error responses
 */

import { parseErpError } from '../utils/erp-error';

// ============================================================================
// Error Types dan Interfaces
// ============================================================================

export type ErrorCategory = 
  | 'VALIDATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'BUSINESS_LOGIC_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTEGRATION_ERROR'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  required_role?: string;
  user_roles?: string[];
  failed_validations?: any[];
  resource?: string;
  identifier?: string;
  current_status?: string;
  requested_action?: string;
  backend?: string;
  operation?: string;
  backend_error?: string;
  [key: string]: any;
}

export interface ApiErrorResponse {
  success: false;
  error: ErrorCategory;
  message: string;
  details?: ErrorDetails;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class IntegrationError extends Error {
  constructor(
    message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

// ============================================================================
// Error Code Mapping ke User-Friendly Messages
// ============================================================================

const ERROR_MESSAGES: Record<string, string> = {
  // Validation Errors
  'INVALID_DATE_RANGE': 'Tanggal mulai harus lebih kecil dari tanggal akhir',
  'PERIOD_OVERLAP': 'Periode tumpang tindih dengan periode yang sudah ada',
  'MISSING_REQUIRED_FIELD': 'Field wajib tidak boleh kosong',
  'INVALID_PERIOD_TYPE': 'Tipe periode tidak valid',
  'INVALID_STATUS': 'Status periode tidak valid',
  
  // Authorization Errors
  'INSUFFICIENT_PERMISSIONS': 'Anda tidak memiliki izin untuk melakukan operasi ini',
  'ROLE_REQUIRED': 'Role yang diperlukan tidak dimiliki',
  'ADMIN_ONLY': 'Operasi ini hanya dapat dilakukan oleh administrator',
  
  // Business Logic Errors
  'VALIDATION_FAILED': 'Validasi gagal, periode tidak dapat ditutup',
  'NEXT_PERIOD_CLOSED': 'Periode berikutnya sudah ditutup, tidak dapat membuka kembali',
  'MUST_BE_CLOSED_FIRST': 'Periode harus ditutup terlebih dahulu',
  'PERMANENTLY_CLOSED': 'Periode sudah ditutup permanen dan tidak dapat diubah',
  'INVALID_CONFIRMATION': 'Konfirmasi tidak valid',
  
  // Not Found Errors
  'PERIOD_NOT_FOUND': 'Periode akuntansi tidak ditemukan',
  'COMPANY_NOT_FOUND': 'Perusahaan tidak ditemukan',
  'ACCOUNT_NOT_FOUND': 'Akun tidak ditemukan',
  'CONFIG_NOT_FOUND': 'Konfigurasi tidak ditemukan',
  
  // Conflict Errors
  'ALREADY_CLOSED': 'Periode sudah ditutup',
  'ALREADY_OPEN': 'Periode sudah terbuka',
  'ALREADY_PERMANENTLY_CLOSED': 'Periode sudah ditutup permanen',
  'CONCURRENT_MODIFICATION': 'Data telah diubah oleh pengguna lain',
  
  // Integration Errors
  'ERPNEXT_TIMEOUT': 'Koneksi ke ERPNext timeout',
  'ERPNEXT_ERROR': 'Terjadi kesalahan pada ERPNext',
  'DATABASE_ERROR': 'Terjadi kesalahan pada database',
  'NETWORK_ERROR': 'Terjadi kesalahan jaringan',
};

/**
 * Mendapatkan user-friendly message dari error code
 */
export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || 'Terjadi kesalahan yang tidak diketahui';
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Mengklasifikasikan error berdasarkan tipe dan konten
 */
export function classifyError(error: any): {
  category: ErrorCategory;
  statusCode: number;
  message: string;
  details?: ErrorDetails;
} {
  // Custom error classes
  if (error instanceof ValidationError) {
    return {
      category: 'VALIDATION_ERROR',
      statusCode: 400,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      category: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof BusinessLogicError) {
    return {
      category: 'BUSINESS_LOGIC_ERROR',
      statusCode: 422,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      category: 'NOT_FOUND',
      statusCode: 404,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ConflictError) {
    return {
      category: 'CONFLICT',
      statusCode: 409,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof IntegrationError) {
    return {
      category: 'INTEGRATION_ERROR',
      statusCode: 502,
      message: error.message,
      details: error.details,
    };
  }

  // Network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED'
  ) {
    return {
      category: 'NETWORK_ERROR',
      statusCode: 503,
      message: 'Terjadi kesalahan jaringan. Silakan coba lagi.',
      details: { code: error.code },
    };
  }

  // HTTP response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 404) {
      return {
        category: 'NOT_FOUND',
        statusCode: 404,
        message: parseErpError(data, 'Resource tidak ditemukan'),
      };
    }

    if (status === 403) {
      return {
        category: 'AUTHORIZATION_ERROR',
        statusCode: 403,
        message: parseErpError(data, 'Anda tidak memiliki izin untuk operasi ini'),
      };
    }

    if (status === 409) {
      return {
        category: 'CONFLICT',
        statusCode: 409,
        message: parseErpError(data, 'Terjadi konflik data'),
      };
    }

    if (status >= 500) {
      return {
        category: 'INTEGRATION_ERROR',
        statusCode: 502,
        message: parseErpError(data, 'Terjadi kesalahan pada server ERPNext'),
        details: {
          backend: 'ERPNext',
          backend_error: data?.message || data?.error,
        },
      };
    }
  }

  // Generic error
  return {
    category: 'INTERNAL_ERROR',
    statusCode: 500,
    message: error.message || 'Terjadi kesalahan internal',
  };
}

// ============================================================================
// Retry Logic untuk Transient Errors
// ============================================================================

/**
 * Mengecek apakah error adalah transient error yang bisa di-retry
 */
export function isTransientError(error: any): boolean {
  // Network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED'
  ) {
    return true;
  }

  // HTTP 5xx errors (kecuali 501 Not Implemented)
  if (error.response) {
    const status = error.response.status;
    return status === 502 || status === 503 || status === 504;
  }

  return false;
}

/**
 * Menjalankan operasi dengan retry logic untuk transient errors
 * 
 * @param operation - Fungsi async yang akan dijalankan
 * @param maxRetries - Maksimal jumlah retry (default: 3)
 * @param delayMs - Delay awal dalam milliseconds (default: 1000)
 * @param backoffMultiplier - Multiplier untuk exponential backoff (default: 2)
 * @returns Promise dengan hasil operasi
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Hanya retry untuk transient errors
      if (isTransientError(error) && attempt < maxRetries) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        
        if (onRetry) {
          onRetry(attempt, error);
        }

        await sleep(delay);
        continue;
      }

      // Tidak retry, throw error
      throw error;
    }
  }

  throw lastError;
}

/**
 * Helper function untuk sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// API Response Helpers
// ============================================================================

/**
 * Membuat error response yang terstruktur
 */
export function createErrorResponse(
  error: any,
  includeStack: boolean = false
): ApiErrorResponse {
  const classified = classifyError(error);

  const response: ApiErrorResponse = {
    success: false,
    error: classified.category,
    message: classified.message,
  };

  if (classified.details) {
    response.details = classified.details;
  }

  // Include stack trace hanya di development
  if (includeStack && process.env.NODE_ENV === 'development' && error.stack) {
    response.details = {
      ...response.details,
      stack: error.stack,
    };
  }

  return response;
}

/**
 * Mendapatkan HTTP status code dari error
 */
export function getStatusCode(error: any): number {
  const classified = classifyError(error);
  return classified.statusCode;
}

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Log error dengan format yang konsisten
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: Record<string, any>
): void {
  const classified = classifyError(error);

  console.error(`[${context}] ${classified.category}:`, {
    message: classified.message,
    details: classified.details,
    ...additionalInfo,
    stack: error.stack,
  });

  // Di production, kirim ke monitoring service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with Sentry or other monitoring service
    // Sentry.captureException(error, {
    //   tags: { context, category: classified.category },
    //   extra: { details: classified.details, ...additionalInfo },
    // });
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required fields dan throw ValidationError jika ada yang missing
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Field wajib tidak boleh kosong: ${missingFields.join(', ')}`,
      {
        missing_fields: missingFields,
      }
    );
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Format tanggal tidak valid', {
      start_date: startDate,
      end_date: endDate,
    });
  }

  if (start >= end) {
    throw new ValidationError(
      getErrorMessage('INVALID_DATE_RANGE'),
      {
        start_date: startDate,
        end_date: endDate,
        constraint: 'start_date_must_be_before_end_date',
      }
    );
  }
}

/**
 * Validate period status untuk operasi tertentu
 */
export function validatePeriodStatus(
  currentStatus: string,
  allowedStatuses: string[],
  operation: string
): void {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new ConflictError(
      `Tidak dapat ${operation}: status periode saat ini adalah "${currentStatus}"`,
      {
        current_status: currentStatus,
        allowed_statuses: allowedStatuses,
        requested_action: operation,
      }
    );
  }
}

/**
 * Validate user role
 */
export function validateUserRole(
  userRoles: string[],
  requiredRole: string,
  operation: string
): void {
  if (!userRoles.includes(requiredRole)) {
    throw new AuthorizationError(
      `Anda tidak memiliki izin untuk ${operation}. Role yang diperlukan: ${requiredRole}`,
      {
        required_role: requiredRole,
        user_roles: userRoles,
      }
    );
  }
}
