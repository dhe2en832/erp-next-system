/**
 * Credit Note Calculation Utilities
 * 
 * Provides calculation functions for Credit Note amounts and commissions
 * 
 * Requirements: 1.12, 1.13, 5.2, 7.12
 */

import { CreditNoteFormItem } from '@/types/credit-note';

/**
 * Calculate proportional commission for a credit note item
 * 
 * When creating a credit note, the commission should be proportional to the
 * quantity being returned. The result is negative to represent a reduction.
 * 
 * Formula: -(originalCommission × returnQty / originalQty)
 * 
 * @param originalCommission - Commission value from the original sales invoice item
 * @param returnQty - Quantity being returned
 * @param originalQty - Original quantity from the sales invoice
 * @returns Negative commission value proportional to return quantity
 * 
 * Requirements: 1.12, 7.12
 * 
 * @example
 * calculateCreditNoteCommission(1000, 5, 10) // -500
 * calculateCreditNoteCommission(1500, 3, 6) // -750
 * calculateCreditNoteCommission(100, 1, 1) // -100 (full return)
 */
export function calculateCreditNoteCommission(
  originalCommission: number,
  returnQty: number,
  originalQty: number
): number {
  // Handle edge case: avoid division by zero
  if (originalQty === 0) {
    return 0;
  }

  // Calculate proportional commission (negative)
  const proportionalCommission = -(originalCommission * returnQty / originalQty);

  // Round to 2 decimal places to avoid floating point precision issues
  return Math.round(proportionalCommission * 100) / 100;
}

/**
 * Calculate total value of credit note from selected items
 * 
 * Sums up the amounts of all selected items to get the total credit note value.
 * Only items with selected=true are included in the calculation.
 * 
 * @param items - Array of credit note form items
 * @returns Total amount (positive value for display)
 * 
 * Requirements: 1.13, 5.2
 * 
 * @example
 * calculateCreditNoteTotal([
 *   { qty: 5, rate: 100, selected: true, ... },
 *   { qty: 3, rate: 200, selected: true, ... },
 *   { qty: 2, rate: 150, selected: false, ... }
 * ]) // 1100 (500 + 600, third item not selected)
 */
export function calculateCreditNoteTotal(items: CreditNoteFormItem[]): number {
  const total = items
    .filter(item => item.selected)
    .reduce((sum, item) => {
      const itemAmount = item.qty * item.rate;
      return sum + itemAmount;
    }, 0);

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}

/**
 * Calculate remaining returnable quantity
 * 
 * Determines how much quantity can still be returned for an item by
 * subtracting already returned quantity from the original quantity.
 * 
 * @param originalQty - Original quantity from the sales invoice
 * @param returnedQty - Quantity already returned in previous credit notes
 * @returns Remaining quantity that can be returned
 * 
 * Requirements: 5.2
 * 
 * @example
 * calculateRemainingQty(10, 0) // 10 (nothing returned yet)
 * calculateRemainingQty(10, 3) // 7 (3 already returned)
 * calculateRemainingQty(10, 10) // 0 (fully returned)
 */
export function calculateRemainingQty(
  originalQty: number,
  returnedQty: number
): number {
  const remaining = originalQty - returnedQty;

  // Ensure we don't return negative values
  return Math.max(0, remaining);
}

/**
 * Calculate total commission adjustment for credit note
 * 
 * Sums up all commission values from selected items to get the total
 * commission adjustment. The result is negative to represent a reduction.
 * 
 * @param items - Array of credit note form items with commission values
 * @returns Total commission adjustment (negative value)
 * 
 * Requirements: 1.13, 7.12
 * 
 * @example
 * calculateTotalCommissionAdjustment([
 *   { custom_komisi_sales: 500, selected: true, ... },
 *   { custom_komisi_sales: 300, selected: true, ... },
 *   { custom_komisi_sales: 200, selected: false, ... }
 * ]) // -800 (negative sum of selected items)
 */
export function calculateTotalCommissionAdjustment(
  items: CreditNoteFormItem[]
): number {
  const total = items
    .filter(item => item.selected)
    .reduce((sum, item) => {
      // Commission values should already be calculated as negative
      // But we ensure the result is negative
      const commission = calculateCreditNoteCommission(
        item.custom_komisi_sales,
        item.qty,
        item.delivered_qty
      );
      return sum + commission;
    }, 0);

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}

/**
 * Calculate item amount
 * 
 * Simple helper to calculate line item amount from quantity and rate.
 * 
 * @param qty - Quantity
 * @param rate - Unit price
 * @returns Line item amount
 * 
 * @example
 * calculateItemAmount(5, 100) // 500
 * calculateItemAmount(2.5, 200) // 500
 */
export function calculateItemAmount(qty: number, rate: number): number {
  const amount = qty * rate;
  return Math.round(amount * 100) / 100;
}
