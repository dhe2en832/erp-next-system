/**
 * Unit tests for utility functions
 * Task 14: Validation, formatting, and calculation utilities
 * Requirements: 7.1, 7.2, 11.2, 11.3, 15.3, 15.4, 16.1, 16.2, 16.3, 16.4
 */

import {
  validateReturnQuantity,
  validateReturnReason,
  validateRequiredFields
} from '../../lib/purchase-return-validation';
import {
  formatCurrency,
  formatDate,
  parseDate
} from '../../utils/format';
import {
  calculateLineAmount,
  calculateTotal,
  calculateRemainingQty
} from '../../lib/purchase-return-calculations';
import { PurchaseReturnFormData, ReturnReason } from '../../types/purchase-return';

// Simple test runner
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.error(`    ${error}`);
    process.exit(1);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength(expected: number) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual.length}`);
      }
    },
    toContain(expected: any) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
      }
    }
  };
}

describe('Validation Utilities (Req 7.1, 7.2)', () => {
  describe('validateReturnQuantity', () => {
    it('should return true for valid quantity within remaining', () => {
      expect(validateReturnQuantity(5, 10)).toBe(true);
    });

    it('should return false for quantity exceeding remaining', () => {
      expect(validateReturnQuantity(15, 10)).toBe(false);
    });

    it('should return false for zero quantity', () => {
      expect(validateReturnQuantity(0, 10)).toBe(false);
    });

    it('should return false for negative quantity', () => {
      expect(validateReturnQuantity(-5, 10)).toBe(false);
    });
  });

  describe('validateReturnReason', () => {
    it('should return true for valid reasons', () => {
      const validReasons: ReturnReason[] = ['Damaged', 'Quality Issue', 'Wrong Item', 'Supplier Request', 'Expired', 'Other'];
      validReasons.forEach(reason => {
        expect(validateReturnReason(reason)).toBe(true);
      });
    });

    it('should return false for invalid reason', () => {
      expect(validateReturnReason('Invalid Reason')).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate complete form data', () => {
      const formData: PurchaseReturnFormData = {
        supplier: 'SUP-001',
        supplier_name: 'Test Supplier',
        posting_date: '15/01/2024',
        purchase_receipt: 'PR-001',
        items: [
          {
            item_code: 'ITEM-001',
            item_name: 'Test Item',
            qty: 5,
            rate: 100,
            amount: 500,
            uom: 'Pcs',
            warehouse: 'Main',
            purchase_receipt_item: 'row-1',
            received_qty: 10,
            returned_qty: 0,
            remaining_qty: 10,
            return_reason: 'Damaged',
            selected: true
          }
        ]
      };

      const result = validateRequiredFields(formData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing supplier', () => {
      const formData: PurchaseReturnFormData = {
        supplier: '',
        supplier_name: '',
        posting_date: '15/01/2024',
        purchase_receipt: 'PR-001',
        items: []
      };

      const result = validateRequiredFields(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supplier is required');
    });

    it('should detect missing items', () => {
      const formData: PurchaseReturnFormData = {
        supplier: 'SUP-001',
        supplier_name: 'Test Supplier',
        posting_date: '15/01/2024',
        purchase_receipt: 'PR-001',
        items: []
      };

      const result = validateRequiredFields(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one item must be selected');
    });
  });
});

describe('Formatting Utilities (Req 11.2, 11.3, 15.3, 15.4)', () => {
  describe('formatCurrency', () => {
    it('should format currency in Indonesian Rupiah (Req 11.3)', () => {
      expect(formatCurrency(1000000)).toBe('Rp 1.000.000,00');
    });

    it('should handle decimal values', () => {
      expect(formatCurrency(1234.56)).toBe('Rp 1.234,56');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('Rp 0,00');
    });
  });

  describe('formatDate', () => {
    it('should format date to DD/MM/YYYY (Req 11.2, 15.3)', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBe('15/01/2024');
    });
  });

  describe('parseDate', () => {
    it('should convert DD/MM/YYYY to YYYY-MM-DD (Req 15.4)', () => {
      expect(parseDate('15/01/2024')).toBe('2024-01-15');
    });

    it('should handle empty string', () => {
      expect(parseDate('')).toBe('');
    });
  });
});

describe('Calculation Utilities (Req 16.1, 16.2, 16.3, 16.4)', () => {
  describe('calculateLineAmount', () => {
    it('should calculate line amount correctly (Req 16.1)', () => {
      expect(calculateLineAmount(5, 100)).toBe(500);
    });

    it('should handle decimal rates', () => {
      const result = calculateLineAmount(3, 99.99);
      const expected = 299.97;
      if (Math.abs(result - expected) > 0.01) {
        throw new Error(`Expected ${expected} but got ${result}`);
      }
    });

    it('should handle zero quantity', () => {
      expect(calculateLineAmount(0, 100)).toBe(0);
    });
  });

  describe('calculateTotal', () => {
    it('should sum all selected items (Req 16.2)', () => {
      const items = [
        {
          item_code: 'ITEM-001',
          item_name: 'Item 1',
          qty: 5,
          rate: 100,
          amount: 500,
          uom: 'Pcs',
          warehouse: 'Main',
          purchase_receipt_item: 'row-1',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Damaged' as ReturnReason,
          selected: true
        },
        {
          item_code: 'ITEM-002',
          item_name: 'Item 2',
          qty: 3,
          rate: 200,
          amount: 600,
          uom: 'Pcs',
          warehouse: 'Main',
          purchase_receipt_item: 'row-2',
          received_qty: 5,
          returned_qty: 0,
          remaining_qty: 5,
          return_reason: 'Quality Issue' as ReturnReason,
          selected: true
        }
      ];

      expect(calculateTotal(items)).toBe(1100);
    });

    it('should ignore unselected items', () => {
      const items = [
        {
          item_code: 'ITEM-001',
          item_name: 'Item 1',
          qty: 5,
          rate: 100,
          amount: 500,
          uom: 'Pcs',
          warehouse: 'Main',
          purchase_receipt_item: 'row-1',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Damaged' as ReturnReason,
          selected: true
        },
        {
          item_code: 'ITEM-002',
          item_name: 'Item 2',
          qty: 3,
          rate: 200,
          amount: 600,
          uom: 'Pcs',
          warehouse: 'Main',
          purchase_receipt_item: 'row-2',
          received_qty: 5,
          returned_qty: 0,
          remaining_qty: 5,
          return_reason: 'Quality Issue' as ReturnReason,
          selected: false
        }
      ];

      expect(calculateTotal(items)).toBe(500);
    });
  });

  describe('calculateRemainingQty', () => {
    it('should calculate remaining quantity correctly (Req 7.1, 7.2)', () => {
      expect(calculateRemainingQty(10, 3)).toBe(7);
    });

    it('should return zero when fully returned', () => {
      expect(calculateRemainingQty(10, 10)).toBe(0);
    });

    it('should not return negative values', () => {
      expect(calculateRemainingQty(10, 15)).toBe(0);
    });
  });
});

console.log('\n✅ All utility function tests passed!');
console.log('✅ Task 14 completed: All validation, formatting, and calculation utilities verified');
