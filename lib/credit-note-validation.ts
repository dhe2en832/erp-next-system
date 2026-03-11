/**
 * Credit Note Validation Utilities
 * 
 * Provides validation functions for Credit Note form data
 * 
 * Requirements: 5.1, 5.2, 5.3, 11.1, 11.3, 11.5
 */

import { CreditNoteFormData } from '@/types/credit-note';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate return quantity
 * 
 * Ensures that:
 * - Return quantity is greater than 0
 * - Return quantity does not exceed remaining returnable quantity
 * 
 * @param returnQty - The quantity to be returned
 * @param remainingQty - The remaining returnable quantity (original - returned)
 * @returns Validation result with error message if invalid
 * 
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @example
 * validateReturnQuantity(5, 10) // { valid: true }
 * validateReturnQuantity(0, 10) // { valid: false, message: '...' }
 * validateReturnQuantity(15, 10) // { valid: false, message: '...' }
 */
export function validateReturnQuantity(
  returnQty: number,
  remainingQty: number
): ValidationResult {
  // Check if quantity is positive
  if (returnQty <= 0) {
    return {
      valid: false,
      message: 'Jumlah retur harus lebih besar dari 0'
    };
  }

  // Check if quantity exceeds remaining
  if (returnQty > remainingQty) {
    return {
      valid: false,
      message: `Jumlah retur (${returnQty}) melebihi jumlah yang dapat diretur (${remainingQty})`
    };
  }

  return { valid: true };
}

/**
 * Validate return reason and notes
 * 
 * Ensures that:
 * - Return reason is selected
 * - If reason is "Other", notes must be provided
 * 
 * @param reason - The selected return reason
 * @param notes - Additional notes (required for "Other" reason)
 * @returns Validation result with error message if invalid
 * 
 * Requirements: 11.3, 11.5
 * 
 * @example
 * validateReturnReason('Damaged', '') // { valid: true }
 * validateReturnReason('Other', 'Some notes') // { valid: true }
 * validateReturnReason('', '') // { valid: false, message: '...' }
 * validateReturnReason('Other', '') // { valid: false, message: '...' }
 */
export function validateReturnReason(
  reason: string,
  notes?: string
): ValidationResult {
  // Check if reason is selected
  if (!reason || reason === '') {
    return {
      valid: false,
      message: 'Alasan retur harus dipilih'
    };
  }

  // Check if notes are provided for "Other" reason
  if (reason === 'Other' && (!notes || notes.trim() === '')) {
    return {
      valid: false,
      message: 'Catatan tambahan wajib diisi untuk alasan "Other"'
    };
  }

  return { valid: true };
}

/**
 * Validate required fields in Credit Note form data
 * 
 * Ensures that:
 * - Customer is selected
 * - Posting date is provided
 * - Sales Invoice is selected
 * - At least one item is selected with qty > 0
 * - All selected items have valid return reason
 * 
 * @param formData - The Credit Note form data to validate
 * @returns Validation result with error message if invalid
 * 
 * Requirements: 11.1, 11.3, 11.5
 * 
 * @example
 * validateRequiredFields(validFormData) // { valid: true }
 * validateRequiredFields(invalidFormData) // { valid: false, message: '...' }
 */
export function validateRequiredFields(
  formData: CreditNoteFormData
): ValidationResult {
  // Validate customer
  if (!formData.customer || formData.customer.trim() === '') {
    return {
      valid: false,
      message: 'Customer harus dipilih'
    };
  }

  // Validate posting date
  if (!formData.posting_date || formData.posting_date.trim() === '') {
    return {
      valid: false,
      message: 'Tanggal posting harus diisi'
    };
  }

  // Validate sales invoice
  if (!formData.sales_invoice || formData.sales_invoice.trim() === '') {
    return {
      valid: false,
      message: 'Sales Invoice harus dipilih'
    };
  }

  // Validate items
  if (!formData.items || formData.items.length === 0) {
    return {
      valid: false,
      message: 'Minimal satu item harus dipilih'
    };
  }

  // Check if at least one item is selected with qty > 0
  const selectedItems = formData.items.filter(item => item.selected && item.qty > 0);
  if (selectedItems.length === 0) {
    return {
      valid: false,
      message: 'Minimal satu item harus dipilih dengan jumlah lebih dari 0'
    };
  }

  // Validate each selected item
  for (const item of selectedItems) {
    // Validate return quantity
    const qtyValidation = validateReturnQuantity(item.qty, item.remaining_qty);
    if (!qtyValidation.valid) {
      return {
        valid: false,
        message: `Item ${item.item_name}: ${qtyValidation.message}`
      };
    }

    // Validate return reason
    const reasonValidation = validateReturnReason(item.return_reason, item.return_notes);
    if (!reasonValidation.valid) {
      return {
        valid: false,
        message: `Item ${item.item_name}: ${reasonValidation.message}`
      };
    }
  }

  return { valid: true };
}

/**
 * Validate date format (DD/MM/YYYY)
 * 
 * @param dateStr - Date string to validate
 * @returns Validation result with error message if invalid
 * 
 * Requirements: 11.2
 * 
 * @example
 * validateDateFormat('31/12/2024') // { valid: true }
 * validateDateFormat('2024-12-31') // { valid: false, message: '...' }
 * validateDateFormat('invalid') // { valid: false, message: '...' }
 */
export function validateDateFormat(dateStr: string): ValidationResult {
  if (!dateStr || dateStr.trim() === '') {
    return {
      valid: false,
      message: 'Tanggal tidak boleh kosong'
    };
  }

  // Check DD/MM/YYYY format
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(datePattern);

  if (!match) {
    return {
      valid: false,
      message: 'Format tanggal harus DD/MM/YYYY'
    };
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Validate ranges
  if (monthNum < 1 || monthNum > 12) {
    return {
      valid: false,
      message: 'Bulan harus antara 01-12'
    };
  }

  if (dayNum < 1 || dayNum > 31) {
    return {
      valid: false,
      message: 'Hari harus antara 01-31'
    };
  }

  // Check if date is valid
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return {
      valid: false,
      message: 'Tanggal tidak valid'
    };
  }

  return { valid: true };
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format
 * 
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date string in YYYY-MM-DD format
 * 
 * @example
 * convertDateToAPIFormat('31/12/2024') // '2024-12-31'
 */
export function convertDateToAPIFormat(dateStr: string): string {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Convert date from YYYY-MM-DD to DD/MM/YYYY format
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date string in DD/MM/YYYY format
 * 
 * @example
 * convertDateToDisplayFormat('2024-12-31') // '31/12/2024'
 */
export function convertDateToDisplayFormat(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
