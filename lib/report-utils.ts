/**
 * Utility functions for report pages
 * Handles date formatting, currency formatting, and summary calculations
 */

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for API calls
 */
export function formatToYYYYMMDD(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return ddmmyyyy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY for display
 */
export function formatToDDMMYYYY(yyyymmdd: string): string {
  if (!yyyymmdd) return '';
  const parts = yyyymmdd.split('-');
  if (parts.length !== 3) return yyyymmdd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Format number as Indonesian Rupiah currency
 */
export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

/**
 * Calculate invoice summary totals
 */
export function calculateInvoiceSummary(invoices: Record<string, unknown>[]) {
  const count = invoices.length;
  const total = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const average = count > 0 ? total / count : 0;

  return {
    count,
    total,
    average
  };
}

/**
 * Calculate payment summary totals
 */
export function calculatePaymentSummary(payments: Record<string, unknown>[]) {
  const count = payments.length;
  const totalReceived = payments
    .filter(p => p.payment_type === 'Receive')
    .reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);
  const totalPaid = payments
    .filter(p => p.payment_type === 'Pay')
    .reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);
  const netBalance = totalReceived - totalPaid;

  return {
    count,
    totalReceived,
    totalPaid,
    netBalance
  };
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('paid') || statusLower.includes('completed') || statusLower.includes('submitted')) {
    return 'bg-green-100 text-green-800';
  }
  if (statusLower.includes('draft') || statusLower.includes('unpaid')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (statusLower.includes('cancelled')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get first day of current month in YYYY-MM-DD format
 */
export function getFirstDayOfMonth(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
}
