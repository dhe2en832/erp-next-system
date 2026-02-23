/**
 * Utility functions for Stock Card Report (Laporan Kartu Stok)
 * 
 * Requirements: 1.3, 1.4, 12.2
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/id';
import { StockLedgerEntry, PartyType } from '@/types/stock-card';

// Enable strict date parsing
dayjs.extend(customParseFormat);

/**
 * Calculate running balance for a specific transaction in a sequence
 * 
 * This function calculates the cumulative balance up to and including
 * the current transaction by summing all actual_qty values from the
 * start of the sequence up to the current transaction.
 * 
 * Requirements: 1.3
 * 
 * @param transactions - Array of stock ledger entries (should be sorted chronologically)
 * @param currentTransaction - The transaction to calculate balance for
 * @returns The running balance after the current transaction
 * 
 * @example
 * const transactions = [
 *   { actual_qty: 10, posting_date: '2024-01-01' },
 *   { actual_qty: -5, posting_date: '2024-01-02' },
 *   { actual_qty: 3, posting_date: '2024-01-03' }
 * ];
 * const balance = calculateRunningBalance(transactions, transactions[1]);
 * // Returns: 5 (10 - 5)
 */
export function calculateRunningBalance(
  transactions: StockLedgerEntry[],
  currentTransaction: StockLedgerEntry
): number {
  let balance = 0;
  
  for (const txn of transactions) {
    balance += txn.actual_qty;
    
    // Stop when we reach the current transaction
    if (txn.name === currentTransaction.name) {
      break;
    }
  }
  
  return balance;
}

/**
 * Format date and time for display in Indonesian format
 * 
 * Combines posting_date and posting_time into a readable format
 * Example: "15 Jan 2024 14:30"
 * 
 * Requirements: 1.4
 * 
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM:SS format (optional)
 * @returns Formatted date and time string in Indonesian locale
 * 
 * @example
 * formatStockCardDate('2024-01-15', '14:30:00');
 * // Returns: "15 Jan 2024 14:30"
 * 
 * formatStockCardDate('2024-01-15');
 * // Returns: "15 Jan 2024"
 */
export function formatStockCardDate(date: string, time?: string): string {
  if (!date) return '-';
  
  const dateObj = dayjs(date).locale('id');
  
  if (!dateObj.isValid()) {
    return '-';
  }
  
  // Format date as "DD MMM YYYY"
  let formatted = dateObj.format('DD MMM YYYY');
  
  // Add time if provided (only HH:MM, ignore seconds)
  if (time) {
    const timeParts = time.split(':');
    if (timeParts.length >= 2) {
      formatted += ` ${timeParts[0]}:${timeParts[1]}`;
    }
  }
  
  return formatted;
}

/**
 * Classify transaction direction based on quantity sign and voucher type
 * 
 * Positive quantities indicate incoming stock (Masuk)
 * Negative quantities indicate outgoing stock (Keluar)
 * Special case: Stock Reconciliation always counts as 'in' regardless of quantity
 * 
 * Requirements: 1.4
 * 
 * @param actual_qty - The quantity change (positive or negative)
 * @param voucher_type - The type of transaction (optional)
 * @returns 'in' for positive quantities or Stock Reconciliation, 'out' for negative quantities
 * 
 * @example
 * classifyTransactionDirection(10);  // Returns: 'in'
 * classifyTransactionDirection(-5);  // Returns: 'out'
 * classifyTransactionDirection(0);   // Returns: 'in'
 * classifyTransactionDirection(7, 'Stock Reconciliation');  // Returns: 'in'
 * classifyTransactionDirection(-3, 'Stock Reconciliation'); // Returns: 'in'
 */
export function classifyTransactionDirection(actual_qty: number, voucher_type?: string): 'in' | 'out' {
  // Stock Reconciliation always counts as 'in' (stock adjustment)
  if (voucher_type === 'Stock Reconciliation') {
    return 'in';
  }
  
  return actual_qty >= 0 ? 'in' : 'out';
}

/**
 * Extract party information from a stock ledger entry
 * 
 * Determines the party type (Customer or Supplier) and party name
 * based on the transaction type and available fields.
 * 
 * Requirements: 1.2
 * 
 * @param entry - Stock ledger entry
 * @returns Object containing party_type and party_name, or null values if not applicable
 * 
 * @example
 * const entry = {
 *   voucher_type: 'Sales Invoice',
 *   party_name: 'ABC Corp'
 * };
 * getPartyInfo(entry);
 * // Returns: { party_type: 'Customer', party_name: 'ABC Corp' }
 */
export function getPartyInfo(entry: StockLedgerEntry): {
  party_type: PartyType | null;
  party_name: string | null;
} {
  // If party information is already enriched, return it
  if (entry.party_type && entry.party_name) {
    return {
      party_type: entry.party_type,
      party_name: entry.party_name
    };
  }
  
  // Determine party type based on transaction type
  let party_type: PartyType | null = null;
  
  if (entry.voucher_type === 'Sales Invoice' || entry.voucher_type === 'Delivery Note') {
    party_type = 'Customer';
  } else if (entry.voucher_type === 'Purchase Receipt') {
    party_type = 'Supplier';
  }
  
  return {
    party_type,
    party_name: entry.party_name || null
  };
}

/**
 * Validate date range with proper error messages in Indonesian
 * 
 * Checks if the date range is valid:
 * - Both dates must be provided
 * - Both dates must be in valid DD/MM/YYYY format
 * - End date must be after or equal to start date
 * 
 * Requirements: 12.2
 * 
 * @param from_date - Start date in DD/MM/YYYY format
 * @param to_date - End date in DD/MM/YYYY format
 * @returns Object with isValid boolean and error message if invalid
 * 
 * @example
 * validateDateRange('01/01/2024', '31/01/2024');
 * // Returns: { isValid: true, message: '' }
 * 
 * validateDateRange('31/01/2024', '01/01/2024');
 * // Returns: { isValid: false, message: 'Tanggal akhir harus setelah tanggal awal' }
 */
export function validateDateRange(
  from_date: string,
  to_date: string
): { isValid: boolean; message: string } {
  // Check if both dates are provided
  if (!from_date || !to_date) {
    return {
      isValid: false,
      message: 'Tanggal awal dan tanggal akhir wajib diisi'
    };
  }
  
  // Parse dates in DD/MM/YYYY format
  const fromParts = from_date.split('/');
  const toParts = to_date.split('/');
  
  // Validate format
  if (fromParts.length !== 3 || toParts.length !== 3) {
    return {
      isValid: false,
      message: 'Format tanggal tidak valid. Gunakan DD/MM/YYYY'
    };
  }
  
  // Parse and validate dates
  const fromDay = parseInt(fromParts[0]);
  const fromMonth = parseInt(fromParts[1]);
  const fromYear = parseInt(fromParts[2]);
  
  const toDay = parseInt(toParts[0]);
  const toMonth = parseInt(toParts[1]);
  const toYear = parseInt(toParts[2]);
  
  // Check if all parts are valid numbers
  if (
    isNaN(fromDay) || isNaN(fromMonth) || isNaN(fromYear) ||
    isNaN(toDay) || isNaN(toMonth) || isNaN(toYear)
  ) {
    return {
      isValid: false,
      message: 'Format tanggal tidak valid. Gunakan DD/MM/YYYY'
    };
  }
  
  // Validate day and month ranges
  if (fromDay < 1 || fromDay > 31 || toDay < 1 || toDay > 31) {
    return {
      isValid: false,
      message: 'Tanggal tidak valid'
    };
  }
  
  if (fromMonth < 1 || fromMonth > 12 || toMonth < 1 || toMonth > 12) {
    return {
      isValid: false,
      message: 'Tanggal tidak valid'
    };
  }
  
  // Create date objects for comparison using strict parsing
  const fromDate = dayjs(`${fromYear}-${String(fromMonth).padStart(2, '0')}-${String(fromDay).padStart(2, '0')}`, 'YYYY-MM-DD', true);
  const toDate = dayjs(`${toYear}-${String(toMonth).padStart(2, '0')}-${String(toDay).padStart(2, '0')}`, 'YYYY-MM-DD', true);
  
  // Check if dates are valid (this will catch invalid dates like 32/01/2024 or 29/02/2023)
  if (!fromDate.isValid() || !toDate.isValid()) {
    return {
      isValid: false,
      message: 'Tanggal tidak valid'
    };
  }
  
  // Check if end date is after start date
  if (toDate.isBefore(fromDate)) {
    return {
      isValid: false,
      message: 'Tanggal akhir harus setelah tanggal awal'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Calculate opening balance for a given date
 * 
 * The opening balance is the qty_after_transaction of the last transaction
 * that occurred before the specified from_date. If no transactions exist
 * before the from_date, the opening balance is zero.
 * 
 * Requirements: 1.5
 * 
 * @param transactions - Array of stock ledger entries (should be sorted chronologically)
 * @param from_date - The date to calculate opening balance for (YYYY-MM-DD format)
 * @returns The opening balance before the from_date
 * 
 * @example
 * const transactions = [
 *   { posting_date: '2024-01-01', actual_qty: 10, qty_after_transaction: 10 },
 *   { posting_date: '2024-01-05', actual_qty: 5, qty_after_transaction: 15 },
 *   { posting_date: '2024-01-10', actual_qty: -3, qty_after_transaction: 12 }
 * ];
 * const opening = calculateOpeningBalance(transactions, '2024-01-08');
 * // Returns: 15 (balance after the last transaction before 2024-01-08)
 * 
 * const opening2 = calculateOpeningBalance(transactions, '2024-01-01');
 * // Returns: 0 (no transactions before 2024-01-01)
 */
export function calculateOpeningBalance(
  transactions: StockLedgerEntry[],
  from_date: string
): number {
  let openingBalance = 0;
  
  // Find the last transaction before from_date
  for (const txn of transactions) {
    if (txn.posting_date < from_date) {
      openingBalance = txn.qty_after_transaction;
    } else {
      // Since transactions are sorted, we can stop once we reach from_date
      break;
    }
  }
  
  return openingBalance;
}
