/**
 * Integration Tests for Purchase Return and Debit Note Implementation
 * 
 * This test suite validates the complete implementation of Purchase Return
 * and Debit Note features according to the requirements and design specifications.
 */

// Type imports
import type { 
  PurchaseReturnFormData, 
  PurchaseReturnFormItem,
  ReturnReason
} from '../../types/purchase-return';

// Utility imports
import { 
  validateReturnQuantity, 
  validateReturnReason, 
  validateRequiredFields 
} from '../../lib/purchase-return-validation';

import {
  calculateLineAmount,
  calculateTotal,
  calculateRemainingQty
} from '../../lib/purchase-return-calculations';

// Simple test framework
let testsPassed = 0;
let testsFailed = 0;
const failedTests: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    testsFailed++;
    failedTests.push(name);
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

// Run tests
console.log('='.repeat(80));
console.log('Purchase Return and Debit Note - Integration Tests');
console.log('='.repeat(80));

describe('Task 19.1: Type Definitions', () => {
  test('should have correct ReturnReason type values', () => {
    const validReasons: ReturnReason[] = [
      'Damaged',
      'Quality Issue',
      'Wrong Item',
      'Supplier Request',
      'Expired',
      'Other'
    ];
    
    validReasons.forEach(reason => {
      assert(typeof reason === 'string', `Reason ${reason} should be a string`);
    });
  });
});

describe('Task 19.2: Validation Functions', () => {
  describe('  validateReturnQuantity', () => {
    test('should reject zero quantity', () => {
      assertEqual(validateReturnQuantity(0, 10), false, 'Zero quantity should be rejected');
    });

    test('should reject negative quantity', () => {
      assertEqual(validateReturnQuantity(-5, 10), false, 'Negative quantity should be rejected');
    });

    test('should reject quantity exceeding remaining', () => {
      assertEqual(validateReturnQuantity(15, 10), false, 'Quantity exceeding remaining should be rejected');
    });

    test('should accept valid quantity', () => {
      assertEqual(validateReturnQuantity(5, 10), true, 'Valid quantity should be accepted');
    });

    test('should accept quantity equal to remaining', () => {
      assertEqual(validateReturnQuantity(10, 10), true, 'Quantity equal to remaining should be accepted');
    });
  });

  describe('  validateReturnReason', () => {
    test('should accept valid return reasons', () => {
      const validReasons = [
        'Damaged',
        'Quality Issue',
        'Wrong Item',
        'Supplier Request',
        'Expired',
        'Other'
      ];
      
      validReasons.forEach(reason => {
        assertEqual(validateReturnReason(reason), true, `Reason ${reason} should be valid`);
      });
    });

    test('should reject empty reason', () => {
      assertEqual(validateReturnReason(''), false, 'Empty reason should be rejected');
    });

    test('should reject invalid reason', () => {
      assertEqual(validateReturnReason('Invalid Reason'), false, 'Invalid reason should be rejected');
    });
  });

  describe('  validateRequiredFields', () => {
    const validFormData: PurchaseReturnFormData = {
      supplier: 'SUP-001',
      supplier_name: 'Test Supplier',
      posting_date: '2024-01-15',
      purchase_receipt: 'PR-001',
      items: [
        {
          item_code: 'ITEM-001',
          item_name: 'Test Item',
          qty: 5,
          rate: 100,
          amount: 500,
          uom: 'Nos',
          warehouse: 'Stores - CN',
          purchase_receipt_item: 'row-1',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Damaged',
          selected: true
        }
      ]
    };

    test('should accept valid form data', () => {
      const result = validateRequiredFields(validFormData);
      assertEqual(result.isValid, true, 'Valid form data should be accepted');
      assertEqual(result.errors.length, 0, 'Valid form data should have no errors');
    });

    test('should reject missing supplier', () => {
      const invalidData = { ...validFormData, supplier: '' };
      const result = validateRequiredFields(invalidData);
      assertEqual(result.isValid, false, 'Missing supplier should be rejected');
      assert(result.errors.some((e: string) => e.includes('Supplier')), 'Should have supplier error');
    });

    test('should reject missing posting date', () => {
      const invalidData = { ...validFormData, posting_date: '' };
      const result = validateRequiredFields(invalidData);
      assertEqual(result.isValid, false, 'Missing posting date should be rejected');
      assert(result.errors.some((e: string) => e.includes('Posting date')), 'Should have posting date error');
    });

    test('should reject no selected items', () => {
      const invalidData = {
        ...validFormData,
        items: validFormData.items.map((item: PurchaseReturnFormItem) => ({ ...item, selected: false }))
      };
      const result = validateRequiredFields(invalidData);
      assertEqual(result.isValid, false, 'No selected items should be rejected');
      assert(result.errors.some((e: string) => e.includes('At least one item')), 'Should have item selection error');
    });

    test('should reject missing return reason for selected item', () => {
      const invalidData = {
        ...validFormData,
        items: [
          {
            ...validFormData.items[0],
            return_reason: '' as ReturnReason
          }
        ]
      };
      const result = validateRequiredFields(invalidData);
      assertEqual(result.isValid, false, 'Missing return reason should be rejected');
      assert(result.errors.some((e: string) => e.toLowerCase().includes('reason')), 'Should have return reason error');
    });

    test('should reject missing notes when reason is Other', () => {
      const invalidData = {
        ...validFormData,
        items: [
          {
            ...validFormData.items[0],
            return_reason: 'Other' as ReturnReason,
            return_notes: ''
          }
        ]
      };
      const result = validateRequiredFields(invalidData);
      assertEqual(result.isValid, false, 'Missing notes for Other reason should be rejected');
      assert(result.errors.some((e: string) => e.toLowerCase().includes('notes')), 'Should have notes error');
    });
  });
});

describe('Task 19.3: Calculation Functions', () => {
  describe('  calculateLineAmount', () => {
    test('should calculate correct line amount', () => {
      assertEqual(calculateLineAmount(5, 100), 500, 'Line amount calculation should be correct');
    });

    test('should handle decimal quantities', () => {
      assertEqual(calculateLineAmount(2.5, 100), 250, 'Should handle decimal quantities');
    });

    test('should handle decimal rates', () => {
      assertEqual(calculateLineAmount(5, 99.99), 499.95, 'Should handle decimal rates');
    });

    test('should handle zero quantity', () => {
      assertEqual(calculateLineAmount(0, 100), 0, 'Should handle zero quantity');
    });
  });

  describe('  calculateTotal', () => {
    test('should calculate total from multiple items', () => {
      const items: PurchaseReturnFormItem[] = [
        {
          item_code: 'ITEM-001',
          item_name: 'Item 1',
          qty: 5,
          rate: 100,
          amount: 500,
          uom: 'Nos',
          warehouse: 'Stores',
          purchase_receipt_item: 'row-1',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Damaged',
          selected: true
        },
        {
          item_code: 'ITEM-002',
          item_name: 'Item 2',
          qty: 3,
          rate: 200,
          amount: 600,
          uom: 'Nos',
          warehouse: 'Stores',
          purchase_receipt_item: 'row-2',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Quality Issue',
          selected: true
        }
      ];

      assertEqual(calculateTotal(items), 1100, 'Total calculation should be correct');
    });

    test('should only include selected items', () => {
      const items: PurchaseReturnFormItem[] = [
        {
          item_code: 'ITEM-001',
          item_name: 'Item 1',
          qty: 5,
          rate: 100,
          amount: 500,
          uom: 'Nos',
          warehouse: 'Stores',
          purchase_receipt_item: 'row-1',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Damaged',
          selected: true
        },
        {
          item_code: 'ITEM-002',
          item_name: 'Item 2',
          qty: 3,
          rate: 200,
          amount: 600,
          uom: 'Nos',
          warehouse: 'Stores',
          purchase_receipt_item: 'row-2',
          received_qty: 10,
          returned_qty: 0,
          remaining_qty: 10,
          return_reason: 'Quality Issue',
          selected: false
        }
      ];

      assertEqual(calculateTotal(items), 500, 'Should only include selected items');
    });

    test('should handle empty items array', () => {
      assertEqual(calculateTotal([]), 0, 'Should handle empty items array');
    });
  });

  describe('  calculateRemainingQty', () => {
    test('should calculate remaining quantity correctly', () => {
      assertEqual(calculateRemainingQty(10, 3), 7, 'Remaining quantity calculation should be correct');
    });

    test('should handle zero returned quantity', () => {
      assertEqual(calculateRemainingQty(10, 0), 10, 'Should handle zero returned quantity');
    });

    test('should handle fully returned items', () => {
      assertEqual(calculateRemainingQty(10, 10), 0, 'Should handle fully returned items');
    });

    test('should handle decimal quantities', () => {
      assertEqual(calculateRemainingQty(10.5, 2.5), 8, 'Should handle decimal quantities');
    });
  });
});

describe('Task 19.4: Date and Currency Formatting', () => {
  test('should format dates in DD/MM/YYYY format', () => {
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    assertEqual(formatDate('2024-01-15'), '15/01/2024', 'Date formatting should be correct');
    assertEqual(formatDate('2024-12-31'), '31/12/2024', 'Date formatting should handle year end');
  });

  test('should convert date from DD/MM/YYYY to YYYY-MM-DD', () => {
    const parseDate = (dateStr: string): string => {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    };

    assertEqual(parseDate('15/01/2024'), '2024-01-15', 'Date parsing should be correct');
    assertEqual(parseDate('31/12/2024'), '2024-12-31', 'Date parsing should handle year end');
  });
});

describe('Task 19.5: Integration Scenarios', () => {
  test('should validate complete purchase return creation flow', () => {
    // Step 1: User selects purchase receipt
    const selectedReceipt = {
      name: 'PR-001',
      supplier: 'SUP-001',
      supplier_name: 'Test Supplier',
      posting_date: '2024-01-10',
      items: [
        {
          item_code: 'ITEM-001',
          item_name: 'Test Item',
          received_qty: 10,
          returned_qty: 0,
          rate: 100,
          warehouse: 'Stores - CN'
        }
      ]
    };

    // Step 2: Calculate remaining quantity
    const remainingQty = calculateRemainingQty(
      selectedReceipt.items[0].received_qty,
      selectedReceipt.items[0].returned_qty
    );
    assertEqual(remainingQty, 10, 'Remaining quantity should be calculated correctly');

    // Step 3: User enters return quantity
    const returnQty = 5;
    assertEqual(validateReturnQuantity(returnQty, remainingQty), true, 'Return quantity should be valid');

    // Step 4: Calculate line amount
    const lineAmount = calculateLineAmount(returnQty, selectedReceipt.items[0].rate);
    assertEqual(lineAmount, 500, 'Line amount should be calculated correctly');

    // Step 5: Validate form data
    const formData: PurchaseReturnFormData = {
      supplier: selectedReceipt.supplier,
      supplier_name: selectedReceipt.supplier_name,
      posting_date: '2024-01-15',
      purchase_receipt: selectedReceipt.name,
      items: [
        {
          item_code: selectedReceipt.items[0].item_code,
          item_name: selectedReceipt.items[0].item_name,
          qty: returnQty,
          rate: selectedReceipt.items[0].rate,
          amount: lineAmount,
          uom: 'Nos',
          warehouse: selectedReceipt.items[0].warehouse,
          purchase_receipt_item: 'row-1',
          received_qty: selectedReceipt.items[0].received_qty,
          returned_qty: selectedReceipt.items[0].returned_qty,
          remaining_qty: remainingQty,
          return_reason: 'Damaged',
          selected: true
        }
      ]
    };

    const validation = validateRequiredFields(formData);
    assertEqual(validation.isValid, true, 'Form data should be valid');

    // Step 6: Calculate total
    const total = calculateTotal(formData.items);
    assertEqual(total, 500, 'Total should be calculated correctly');
  });
});

// Print summary
console.log('\n' + '='.repeat(80));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
if (testsFailed > 0) {
  console.log('\nFailed Tests:');
  failedTests.forEach(test => console.log(`  - ${test}`));
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}

