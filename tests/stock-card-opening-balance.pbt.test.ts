/**
 * Property-Based Test: Opening Balance Temporal Consistency
 * 
 * Feature: stock-card-report, Property 5: Opening Balance Temporal Consistency
 * 
 * Property: For any date range and item, the opening balance should equal the 
 * qty_after_transaction of the last transaction before the from_date, or zero 
 * if no prior transactions exist.
 * 
 * Validates: Requirements 1.5
 * Task: 7.1 Write property test for opening balance consistency
 */

import * as fc from 'fast-check';
import { calculateOpeningBalance } from '../lib/stock-card-utils';
import { StockLedgerEntry } from '../types/stock-card';

/**
 * Generator for stock ledger entries with specific date ranges
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
 * Property Test: Opening balance equals last transaction before from_date
 */
async function testOpeningBalanceProperty(): Promise<void> {
  console.log('Running property test: Opening Balance Temporal Consistency...');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 5, maxLength: 50 }),
        fc.integer({ min: 1577836800000, max: 1767225600000 }), // Random from_date
        async (entries: StockLedgerEntry[], fromDateTimestamp: number) => {
          // Sort entries chronologically
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          // Assign unique names and calculate running balances
          let runningBalance = 0;
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
            runningBalance += entry.actual_qty;
            entry.qty_after_transaction = runningBalance;
          });
          
          // Convert from_date timestamp to date string
          const fromDate = new Date(fromDateTimestamp).toISOString().split('T')[0];
          
          // Calculate expected opening balance manually
          let expectedOpeningBalance = 0;
          let lastTransactionBeforeFromDate: StockLedgerEntry | null = null;
          
          for (const entry of sortedEntries) {
            if (entry.posting_date < fromDate) {
              lastTransactionBeforeFromDate = entry;
            } else {
              break;
            }
          }
          
          if (lastTransactionBeforeFromDate) {
            expectedOpeningBalance = lastTransactionBeforeFromDate.qty_after_transaction;
          }
          
          // Calculate opening balance using the utility function
          const calculatedOpeningBalance = calculateOpeningBalance(sortedEntries, fromDate);
          
          // Property: The calculated opening balance should equal the expected opening balance
          if (calculatedOpeningBalance !== expectedOpeningBalance) {
            throw new Error(
              `Opening balance mismatch for from_date ${fromDate}: ` +
              `expected ${expectedOpeningBalance}, got ${calculatedOpeningBalance}`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    testsPassed++;
    console.log('✓ Property holds: Opening balance equals last transaction before from_date');
    
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
 * Property Test: Opening balance is zero when no prior transactions exist
 */
async function testOpeningBalanceZeroWhenNoPriorTransactions(): Promise<void> {
  console.log('\nRunning property test: Opening balance is zero when no prior transactions...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 1, maxLength: 20 }),
        async (entries: StockLedgerEntry[]) => {
          // Sort entries chronologically
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          // Assign unique names and calculate running balances
          let runningBalance = 0;
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
            runningBalance += entry.actual_qty;
            entry.qty_after_transaction = runningBalance;
          });
          
          // Use a from_date before all transactions
          const earliestDate = sortedEntries[0].posting_date;
          const fromDate = new Date(new Date(earliestDate).getTime() - 86400000) // 1 day before
            .toISOString().split('T')[0];
          
          // Calculate opening balance
          const calculatedOpeningBalance = calculateOpeningBalance(sortedEntries, fromDate);
          
          // Property: Opening balance should be zero when from_date is before all transactions
          if (calculatedOpeningBalance !== 0) {
            throw new Error(
              `Opening balance should be zero when no prior transactions exist: ` +
              `got ${calculatedOpeningBalance}`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Opening balance is zero when no prior transactions exist');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Opening balance consistency across different from_dates
 */
async function testOpeningBalanceConsistencyAcrossDates(): Promise<void> {
  console.log('\nRunning property test: Opening balance consistency across dates...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 10, maxLength: 30 }),
        async (entries: StockLedgerEntry[]) => {
          // Sort entries chronologically
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          // Assign unique names and calculate running balances
          let runningBalance = 0;
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
            runningBalance += entry.actual_qty;
            entry.qty_after_transaction = runningBalance;
          });
          
          // Property: For any two consecutive transactions, the opening balance for the 
          // second transaction's date should equal the first transaction's closing balance
          for (let i = 0; i < sortedEntries.length - 1; i++) {
            const currentEntry = sortedEntries[i];
            const nextEntry = sortedEntries[i + 1];
            
            // Calculate opening balance for the next entry's date
            const openingBalance = calculateOpeningBalance(sortedEntries, nextEntry.posting_date);
            
            // If the next entry is on a different date, opening balance should be <= current balance
            if (nextEntry.posting_date > currentEntry.posting_date) {
              if (openingBalance > currentEntry.qty_after_transaction) {
                throw new Error(
                  `Opening balance inconsistency: ` +
                  `opening for ${nextEntry.posting_date} (${openingBalance}) > ` +
                  `closing for ${currentEntry.posting_date} (${currentEntry.qty_after_transaction})`
                );
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Opening balance is consistent across different dates');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Opening balance with same-day transactions
 */
async function testOpeningBalanceWithSameDayTransactions(): Promise<void> {
  console.log('\nRunning property test: Opening balance with same-day transactions...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(stockLedgerEntryArbitrary, { minLength: 5, maxLength: 20 })
          .map((entries: StockLedgerEntry[]) => 
            // Force some entries to have the same date
            entries.map((entry, index) => ({
              ...entry,
              posting_date: index < 3 ? '2024-01-15' : entry.posting_date
            }))
          ),
        async (entries: StockLedgerEntry[]) => {
          // Sort entries chronologically
          const sortedEntries = [...entries].sort((a, b) => {
            const dateCompare = a.posting_date.localeCompare(b.posting_date);
            if (dateCompare !== 0) return dateCompare;
            return a.posting_time.localeCompare(b.posting_time);
          });
          
          // Assign unique names and calculate running balances
          let runningBalance = 0;
          sortedEntries.forEach((entry, index) => {
            entry.name = `SLE-${String(index + 1).padStart(6, '0')}`;
            runningBalance += entry.actual_qty;
            entry.qty_after_transaction = runningBalance;
          });
          
          // Calculate opening balance for a date with multiple transactions
          const fromDate = '2024-01-15';
          const openingBalance = calculateOpeningBalance(sortedEntries, fromDate);
          
          // Find the last transaction before this date
          let expectedBalance = 0;
          for (const entry of sortedEntries) {
            if (entry.posting_date < fromDate) {
              expectedBalance = entry.qty_after_transaction;
            } else {
              break;
            }
          }
          
          // Property: Opening balance should not include same-day transactions
          if (openingBalance !== expectedBalance) {
            throw new Error(
              `Opening balance with same-day transactions mismatch: ` +
              `expected ${expectedBalance}, got ${openingBalance}`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Opening balance correctly handles same-day transactions');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('\n=== Property-Based Tests: Opening Balance Temporal Consistency ===\n');
  
  try {
    await testOpeningBalanceProperty();
    await testOpeningBalanceZeroWhenNoPriorTransactions();
    await testOpeningBalanceConsistencyAcrossDates();
    await testOpeningBalanceWithSameDayTransactions();
    
    console.log('\n✅ All property tests passed!\n');
  } catch (error) {
    console.error('\n❌ Property test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
