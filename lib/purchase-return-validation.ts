import { PurchaseReturnFormData, ReturnReason } from '@/types/purchase-return';

/**
 * Validation utilities for Purchase Return and Debit Note
 * Requirements: 7.1, 7.2, 11.2, 11.3
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate return quantity
 * Requirements: 7.3, 7.4
 */
export function validateReturnQuantity(qty: number, remainingQty: number): boolean {
  return qty > 0 && qty <= remainingQty;
}

/**
 * Validate return reason
 * Requirements: 8.2
 */
export function validateReturnReason(reason: string): boolean {
  const validReasons: ReturnReason[] = ['Damaged', 'Quality Issue', 'Wrong Item', 'Supplier Request', 'Expired', 'Other'];
  return validReasons.includes(reason as ReturnReason);
}

/**
 * Validate required fields for purchase return form
 * Requirements: 7.5, 7.6, 8.5, 8.6
 */
export function validateRequiredFields(formData: PurchaseReturnFormData): ValidationResult {
  const errors: string[] = [];

  // Validate supplier
  if (!formData.supplier || !formData.supplier.trim()) {
    errors.push('Supplier is required');
  }

  // Validate posting date
  if (!formData.posting_date || !formData.posting_date.trim()) {
    errors.push('Posting date is required');
  }

  // Validate purchase receipt/invoice reference
  if (!formData.purchase_receipt || !formData.purchase_receipt.trim()) {
    errors.push('Reference document is required');
  }

  // Validate at least one item is selected
  const selectedItems = formData.items.filter(item => item.selected && item.qty > 0);
  if (selectedItems.length === 0) {
    errors.push('At least one item must be selected');
  }

  // Validate each selected item
  formData.items.forEach((item, index) => {
    if (item.selected) {
      // Validate quantity
      if (item.qty <= 0) {
        errors.push(`Item ${index + 1}: Return quantity must be greater than zero`);
      }
      if (item.qty > item.remaining_qty) {
        errors.push(`Item ${index + 1}: Return quantity cannot exceed remaining quantity (${item.remaining_qty})`);
      }

      // Validate return reason
      if (!item.return_reason || (item.return_reason as string) === '') {
        errors.push(`Item ${index + 1}: Return reason is required`);
      }

      // Validate notes for "Other" reason
      if (item.return_reason === 'Other' && (!item.return_notes || !item.return_notes.trim())) {
        errors.push(`Item ${index + 1}: Notes are required when return reason is "Other"`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate date format (DD/MM/YYYY)
 * Requirements: 15.3
 */
export function validateDateFormat(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(datePattern);
  
  if (!match) return false;
  
  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Basic validation
  if (dayNum < 1 || dayNum > 31) return false;
  if (monthNum < 1 || monthNum > 12) return false;
  if (yearNum < 1900 || yearNum > 2100) return false;
  
  // Check if date is valid (e.g., not 31/02/2024)
  const date = new Date(yearNum, monthNum - 1, dayNum);
  return date.getFullYear() === yearNum && 
         date.getMonth() === monthNum - 1 && 
         date.getDate() === dayNum;
}

/**
 * Get validation error message for a specific field
 */
export function getFieldError(errors: string[], fieldName: string): string | undefined {
  return errors.find(error => error.toLowerCase().includes(fieldName.toLowerCase()));
}

/**
 * Check if form has any validation errors
 */
export function hasValidationErrors(errors: string[]): boolean {
  return errors.length > 0;
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format for API
 * Requirements: 15.3
 */
export function convertDateToAPIFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(datePattern);
  
  if (!match) return dateStr; // Return as-is if not in expected format
  
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Convert date from YYYY-MM-DD to DD/MM/YYYY format for display
 * Requirements: 15.3
 */
export function convertDateToDisplayFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateStr.match(datePattern);
  
  if (!match) return dateStr; // Return as-is if not in expected format
  
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Validate required fields for debit note form
 * Requirements: 7.5, 7.6, 8.5, 8.6
 */
export function validateDebitNoteRequiredFields(formData: {
  supplier?: string;
  posting_date?: string;
  purchase_invoice?: string;
  items: { selected: boolean; qty: number; remaining_qty: number; return_reason?: string; return_notes?: string }[];
}): ValidationResult {
  const errors: string[] = [];

  // Validate supplier
  if (!formData.supplier || !formData.supplier.trim()) {
    errors.push('Supplier is required');
  }

  // Validate posting date
  if (!formData.posting_date || !formData.posting_date.trim()) {
    errors.push('Posting date is required');
  }

  // Validate purchase invoice reference
  if (!formData.purchase_invoice || !formData.purchase_invoice.trim()) {
    errors.push('Reference document is required');
  }

  // Validate at least one item is selected
  const selectedItems = formData.items.filter((item) => item.selected && item.qty > 0);
  if (selectedItems.length === 0) {
    errors.push('At least one item must be selected');
  }

  // Validate each selected item
  formData.items.forEach((item, index: number) => {
    if (item.selected) {
      // Validate quantity
      if (item.qty <= 0) {
        errors.push(`Item ${index + 1}: Return quantity must be greater than zero`);
      }
      if (item.qty > item.remaining_qty) {
        errors.push(`Item ${index + 1}: Return quantity cannot exceed remaining quantity (${item.remaining_qty})`);
      }

      // Validate return reason
      if (!item.return_reason || (item.return_reason as string) === '') {
        errors.push(`Item ${index + 1}: Return reason is required`);
      }

      // Validate notes for "Other" reason
      if (item.return_reason === 'Other' && (!item.return_notes || !item.return_notes.trim())) {
        errors.push(`Item ${index + 1}: Notes are required when return reason is "Other"`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
