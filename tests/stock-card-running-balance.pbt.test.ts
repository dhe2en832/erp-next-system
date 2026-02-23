/**
 * Property-Based Test: Running Balance Calculation Accuracy
 * 
 * Feature: stock-card-report, Property 3: Running Balance Calculation Accuracy
 * 
 * Property: For any sequence of transactions, the running balance at each transaction
 * should equal the sum of all previous transaction quantities plus the current transaction quantity.
 * 
 * Validates: Requirements 1.3, 1.6
 * Task: 3.1 Write property test for running balance calculation
 */

import * as fc from 'fast-check';
import { calculateRunningBalance } from '../lib/stock-card-utils';
import { StockLedgerEntry } from '../types/stock-card';

/**
 * Generator for stock ledger entries with random quantities
 */
const stockLedgerEntryArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  actual_qty: fc.integer({ min: -1000, max: 1000 }),
  posting_date: fc.integer({ min: 1577836800000, max: 1767225600000 }) // 2020-01-01 to 2025-12-31
    .map((timestamp: number) => {
      const date = new Date(timestamp);
      return date.toISOString().split('T')[0];
    }),
  posting_time: fc.tuple(
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([h, m, s]: [number, number, number]) => 
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  ),
  item_code: fc.constant('TEST-ITEM'),
  warehouse: fc.constant('Main Store'),
  qty_after_transaction: fc.constant(0), // Will be calculated
  voucher_type: fc.constantFrom(
    'Sales Invoice' as const,
    'Purchase Receipt' as const,
    'Delivery Note' as const,
    'Stock Entry' as const,
    'Stock Reconciliation' as const
  ),
  voucher_no: fc.string({ minLength: 1, maxLength: 20 }),
  stock_uom: fc.constant('Nos'),
  valuation_rate: fc.integer({ min: 1, max: 10000 }),
  stock_value_difference: fc.constant(0),
  company: fc.constant('Test Company')
});

/**
 * Property Test: Running balance calculation accuracy
 */
async function testRunningBalanceProperty(): Promise<void> {
  console.log('Running property test: Running Balance Calculation Accuracy...');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 1, maxLength: 50 }),
        async (entries: StockLedgerEntry[]) => {
          // Sort entries chronologically
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          // Ensure unique names for each entry
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
          });
          
          // Calculate expected running balance manually
          let expectedBalance = 0;
          
          for (const entry of sortedEntries) {
            expectedBalance += entry.actual_qty;
            
            // Calculate running balance using the utility function
            const calculatedBalance = calculateRunningBalance(sortedEntries, entry);
            
            // Property: The calculated balance should equal the expected balance
            if (calculatedBalance !== expectedBalance) {
              throw new Error(
                `Running balance mismatch at ${entry.name}: ` +
                `expected ${expectedBalance}, got ${calculatedBalance}`
              );
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    testsPassed++;
    console.log('✓ Property holds: Running balance calculation is accurate across all test cases');
    
  } catch (error: any) {
    testsFailed++;
    console.error('✗ Property violated:', error.message);
    
    if (error.counterexample) {
      console.error('Counterexample found:', JSON.stringify(error.counterexample, null, 2));
    }
    
    throw error;
  }
  
  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
}

/**
 * Property Test: Running balance with zero quantities
 */
async function testRunningBalanceWithZeros(): Promise<void> {
  console.log('\nRunning property test: Running balance with zero quantities...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 1, maxLength: 20 })
          .map((entries: StockLedgerEntry[]) => 
            entries.map(entry => ({
              ...entry,
              actual_qty: Math.random() < 0.7 ? 0 : entry.actual_qty
            }))
          ),
        async (entries: StockLedgerEntry[]) => {
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
          });
          
          let expectedBalance = 0;
          
          for (const entry of sortedEntries) {
            expectedBalance += entry.actual_qty;
            const calculatedBalance = calculateRunningBalance(sortedEntries, entry);
            
            if (calculatedBalance !== expectedBalance) {
              throw new Error(
                `Balance mismatch with zeros at ${entry.name}: ` +
                `expected ${expectedBalance}, got ${calculatedBalance}`
              );
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Running balance handles zero quantities correctly');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Running balance is monotonic with respect to transaction order
 */
async function testRunningBalanceMonotonicity(): Promise<void> {
  console.log('\nRunning property test: Running balance monotonicity...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 2, maxLength: 30 }),
        async (entries: StockLedgerEntry[]) => {
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
          });
          
          // Property: Each balance should be the previous balance plus current quantity
          for (let i = 1; i < sortedEntries.length; i++) {
            const prevBalance = calculateRunningBalance(sortedEntries, sortedEntries[i - 1]);
            const currBalance = calculateRunningBalance(sortedEntries, sortedEntries[i]);
            const expectedCurrBalance = prevBalance + sortedEntries[i].actual_qty;
            
            if (currBalance !== expectedCurrBalance) {
              throw new Error(
                `Monotonicity violated at index ${i}: ` +
                `prev=${prevBalance}, curr=${currBalance}, expected=${expectedCurrBalance}`
              );
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Running balance maintains monotonicity');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('\n=== Property-Based Tests: Running Balance Calculation ===\n');
  
  try {
    await testRunningBalanceProperty();
    await testRunningBalanceWithZeros();
    await testRunningBalanceMonotonicity();
    
    console.log('\n✅ All property tests passed!\n');
  } catch (error) {
    console.error('\n❌ Property test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
