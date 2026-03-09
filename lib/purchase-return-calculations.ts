import { PurchaseReturnFormItem } from '@/types/purchase-return';
import { DebitNoteFormItem } from '@/types/debit-note';

/**
 * Calculation utilities for Purchase Return and Debit Note
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

/**
 * Calculate line amount (qty × rate)
 * Requirements: 16.1
 */
export function calculateLineAmount(qty: number, rate: number): number {
  return qty * rate;
}

/**
 * Calculate total amount from all selected items
 * Requirements: 16.2
 */
export function calculateTotal(items: PurchaseReturnFormItem[] | DebitNoteFormItem[]): number {
  return items
    .filter(item => item.selected && item.qty > 0)
    .reduce((sum, item) => sum + calculateLineAmount(item.qty, item.rate), 0);
}

/**
 * Calculate remaining returnable quantity
 * Requirements: 7.1, 7.2
 */
export function calculateRemainingQty(deliveredQty: number, returnedQty: number): number {
  return Math.max(0, deliveredQty - returnedQty);
}

/**
 * Calculate count of selected items
 * Requirements: 16.7
 */
export function calculateSelectedItemsCount(items: PurchaseReturnFormItem[] | DebitNoteFormItem[]): number {
  return items.filter(item => item.selected && item.qty > 0).length;
}

/**
 * Update item amount when quantity changes
 * Requirements: 16.3
 */
export function updateItemAmount(item: PurchaseReturnFormItem | DebitNoteFormItem, newQty: number): number {
  return calculateLineAmount(newQty, item.rate);
}

/**
 * Recalculate all item amounts
 * Requirements: 16.4
 */
export function recalculateAllAmounts(items: (PurchaseReturnFormItem | DebitNoteFormItem)[]): (PurchaseReturnFormItem | DebitNoteFormItem)[] {
  return items.map(item => ({
    ...item,
    amount: calculateLineAmount(item.qty, item.rate)
  }));
}

/**
 * Format amount for display (Indonesian Rupiah)
 * Requirements: 11.3
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Round amount to 2 decimal places
 */
export function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}
