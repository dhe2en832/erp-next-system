/**
 * Format alamat dari HTML ke plain text
 * @param html - String HTML dari ERPNext
 * @returns Plain text yang diformat dengan baik
 */
export function formatAddress(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * Format currency dengan locale Indonesia
 * @param value - Nilai angka
 * @returns String yang diformat sebagai currency IDR
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Format number dengan locale Indonesia
 * @param value - Nilai angka
 * @returns String yang diformat dengan pemisah ribuan
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('id-ID');
}

/**
 * Format date ke format Indonesia
 * @param dateString - String tanggal
 * @returns String tanggal yang diformat
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
