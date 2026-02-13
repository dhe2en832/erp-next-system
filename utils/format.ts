import dayjs from 'dayjs';
import 'dayjs/locale/id';

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
 * Format date ke format Indonesia (DD/MM/YYYY)
 * @param dateString - String tanggal atau Date object
 * @returns String tanggal yang diformat
 */
export function formatDate(dateString: string | Date): string {
  const result = dayjs(dateString).locale('id').format('DD/MM/YYYY');
  return result;
}

/**
 * Parse DD/MM/YYYY ke YYYY-MM-DD untuk API
 * @param dateString - String tanggal dalam format DD/MM/YYYY
 * @returns String tanggal dalam format YYYY-MM-DD
 */
export function parseDate(dateString: string): string {
  if (!dateString) return '';
  
  // Log for debugging
  if (dateString === 'Invalid Date') {
    console.error('parseDate received "Invalid Date" string');
    return '';
  }
  
  // Handle DD/MM/YYYY format manually to ensure correct parsing
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      
      // Validate day, month, year
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum)) {
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          // Use dayjs to validate the date actually exists
          const date = dayjs(`${yearNum}-${monthNum}-${dayNum}`);
          if (date.isValid()) {
            return date.format('YYYY-MM-DD');
          }
        }
      }
    }
  }
  
  // Try to parse with dayjs for other formats
  const date = dayjs(dateString, ['YYYY-MM-DD'], true);
  
  if (date.isValid()) {
    return date.format('YYYY-MM-DD');
  }
  
  console.warn('parseDate failed to parse:', dateString);
  return '';
}
