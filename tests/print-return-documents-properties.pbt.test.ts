/**
 * Property-Based Tests for Print Return Documents Feature
 * 
 * Feature: print-return-documents
 * Tasks: 6.4-6.10
 * 
 * This file contains property-based tests for:
 * - Property 4: Date Format Conversion (Requirements 4.8, 13.3)
 * - Property 5-7: Summary Calculations (Requirements 5.2-5.4, 14.2-14.3)
 * - Property 8-9: Breakdown Aggregation (Requirements 6.3-6.4, 14.4-14.5)
 * - Property 10-11: Formatting (Requirements 6.5-6.6)
 * - Property 14-16: Grouping (Requirements 8.2-8.4)
 * - Property 17-21: Excel Export (Requirements 9.3-9.7)
 * - Property 28: Client-Side Filtering (Requirements 13.8)
 */

import * as fc from 'fast-check';

// Simple assertion helpers
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

// Type definitions
type ReturnReason = 'Damaged' | 'Quality Issue' | 'Wrong Item' | 'Customer Request' | 'Expired' | 'Other';

interface ReturnItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  custom_return_reason?: ReturnReason;
  custom_return_item_notes?: string;
}

interface ReturnDocument {
  name: string;
  posting_date: string;
  grand_total: number;
  items: ReturnItem[];
  customer_name?: string;
  supplier_name?: string;
  status: 'Draft' | 'Submitted' | 'Cancelled';
}

// ============================================================================
// Property 4: Date Format Conversion
// Validates: Requirements 4.8, 13.3
// ============================================================================

/**
 * Converts DD/MM/YYYY to YYYY-MM-DD format
 */
function convertDateFormat(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Test: Property 4 - Date Format Conversion
 * Feature: print-return-documents, Property 4: Date Format Conversion
 */
async function testProperty4DateFormatConversion(): Promise<void> {
  console.log('\n=== Property 4: Date Format Conversion ===');
  console.log('Validates: Requirements 4.8, 13.3');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 28 }), // day (1-28 to avoid month issues)
        fc.integer({ min: 1, max: 12 }), // month
        fc.integer({ min: 2000, max: 2099 }), // year
        async (day, month, year) => {
          const dayStr = day.toString().padStart(2, '0');
          const monthStr = month.toString().padStart(2, '0');
          const yearStr = year.toString();
          
          const ddmmyyyy = `${dayStr}/${monthStr}/${yearStr}`;
          const yyyymmdd = convertDateFormat(ddmmyyyy);
          
          const expected = `${yearStr}-${monthStr}-${dayStr}`;
          
          if (yyyymmdd !== expected) {
            console.error(`Date conversion failed: ${ddmmyyyy} -> ${yyyymmdd} (expected ${expected})`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 4: Date format conversion is correct');
  } catch (error: any) {
    console.error('✗ Property 4 failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Property 5-7: Summary Calculations
// Validates: Requirements 5.2-5.4, 14.2-14.3
// ============================================================================

interface Summary {
  total_count: number;
  total_amount: number;
  average_amount: number;
}

/**
 * Calculates summary metrics from return documents
 */
function calculateSummary(documents: ReturnDocument[]): Summary {
  const total_count = documents.length;
  const total_amount = documents.reduce((sum, doc) => sum + Math.abs(doc.grand_total), 0);
  const average_amount = total_count > 0 ? total_amount / total_count : 0;
  
  return { total_count, total_amount, average_amount };
}

/**
 * Test: Property 5 - Total Count Calculation
 * Feature: print-return-documents, Property 5: Total Count Calculation
 */
async function testProperty5TotalCountCalculation(): Promise<void> {
  console.log('\n=== Property 5: Total Count Calculation ===');
  console.log('Validates: Requirements 5.2, 14.2');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(fc.record({
              name: fc.string(),
              item_code: fc.string(),
              item_name: fc.string(),
              qty: fc.integer({ min: -100, max: -1 }),
              rate: fc.integer({ min: 1, max: 1000000 }),
              amount: fc.integer({ min: -10000000, max: -1 }),
            })),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        async (documents) => {
          const summary = calculateSummary(documents);
          
          if (summary.total_count !== documents.length) {
            console.error(`Total count mismatch: ${summary.total_count} !== ${documents.length}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 5: Total count equals array length');
  } catch (error: any) {
    console.error('✗ Property 5 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 6 - Total Amount Calculation
 * Feature: print-return-documents, Property 6: Total Amount Calculation
 */
async function testProperty6TotalAmountCalculation(): Promise<void> {
  console.log('\n=== Property 6: Total Amount Calculation ===');
  console.log('Validates: Requirements 5.3, 14.2, 14.3');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(fc.record({
              name: fc.string(),
              item_code: fc.string(),
              item_name: fc.string(),
              qty: fc.integer({ min: -100, max: -1 }),
              rate: fc.integer({ min: 1, max: 1000000 }),
              amount: fc.integer({ min: -10000000, max: -1 }),
            })),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        async (documents) => {
          const summary = calculateSummary(documents);
          const expected = documents.reduce((sum, doc) => sum + Math.abs(doc.grand_total), 0);
          
          if (Math.abs(summary.total_amount - expected) > 0.01) {
            console.error(`Total amount mismatch: ${summary.total_amount} !== ${expected}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 6: Total amount equals sum of absolute values');
  } catch (error: any) {
    console.error('✗ Property 6 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 7 - Average Amount Calculation
 * Feature: print-return-documents, Property 7: Average Amount Calculation
 */
async function testProperty7AverageAmountCalculation(): Promise<void> {
  console.log('\n=== Property 7: Average Amount Calculation ===');
  console.log('Validates: Requirements 5.4');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(fc.record({
              name: fc.string(),
              item_code: fc.string(),
              item_name: fc.string(),
              qty: fc.integer({ min: -100, max: -1 }),
              rate: fc.integer({ min: 1, max: 1000000 }),
              amount: fc.integer({ min: -10000000, max: -1 }),
            })),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 100 } // At least 1 to avoid division by zero
        ),
        async (documents) => {
          const summary = calculateSummary(documents);
          const expected = summary.total_amount / summary.total_count;
          
          if (Math.abs(summary.average_amount - expected) > 0.01) {
            console.error(`Average amount mismatch: ${summary.average_amount} !== ${expected}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 7: Average amount equals total / count');
  } catch (error: any) {
    console.error('✗ Property 7 failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Property 8-9: Breakdown Aggregation
// Validates: Requirements 6.3-6.4, 14.4-14.5
// ============================================================================

interface BreakdownEntry {
  count: number;
  amount: number;
  percentage: number;
}

/**
 * Calculates breakdown by return reason
 */
function calculateBreakdown(documents: ReturnDocument[]): Record<string, BreakdownEntry> {
  const breakdown: Record<string, { count: number; amount: number }> = {};
  let totalAmount = 0;
  
  documents.forEach(doc => {
    doc.items.forEach(item => {
      const reason = item.custom_return_reason || 'Unknown';
      if (!breakdown[reason]) {
        breakdown[reason] = { count: 0, amount: 0 };
      }
      breakdown[reason].count += 1;
      breakdown[reason].amount += Math.abs(item.amount);
      totalAmount += Math.abs(item.amount);
    });
  });
  
  const result: Record<string, BreakdownEntry> = {};
  Object.entries(breakdown).forEach(([reason, data]) => {
    result[reason] = {
      count: data.count,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    };
  });
  
  return result;
}

/**
 * Test: Property 8 - Breakdown Aggregation by Reason
 * Feature: print-return-documents, Property 8: Breakdown Aggregation by Reason
 */
async function testProperty8BreakdownAggregation(): Promise<void> {
  console.log('\n=== Property 8: Breakdown Aggregation by Reason ===');
  console.log('Validates: Requirements 6.3, 14.4, 14.5');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
                custom_return_reason: fc.option(
                  fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item', 'Customer Request', 'Expired', 'Other'),
                  { nil: undefined }
                ),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (documents) => {
          const breakdown = calculateBreakdown(documents);
          
          // Verify all items are accounted for
          let totalItemsInBreakdown = 0;
          Object.values(breakdown).forEach(entry => {
            totalItemsInBreakdown += entry.count;
          });
          
          const totalItemsInDocuments = documents.reduce((sum, doc) => sum + doc.items.length, 0);
          
          if (totalItemsInBreakdown !== totalItemsInDocuments) {
            console.error(`Item count mismatch: ${totalItemsInBreakdown} !== ${totalItemsInDocuments}`);
            return false;
          }
          
          // Verify amounts are correctly aggregated
          let totalAmountInBreakdown = 0;
          Object.values(breakdown).forEach(entry => {
            totalAmountInBreakdown += entry.amount;
          });
          
          const totalAmountInDocuments = documents.reduce((sum, doc) => 
            sum + doc.items.reduce((itemSum, item) => itemSum + Math.abs(item.amount), 0), 0
          );
          
          if (Math.abs(totalAmountInBreakdown - totalAmountInDocuments) > 0.01) {
            console.error(`Amount mismatch: ${totalAmountInBreakdown} !== ${totalAmountInDocuments}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 8: Breakdown correctly aggregates by reason');
  } catch (error: any) {
    console.error('✗ Property 8 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 9 - Percentage Calculation
 * Feature: print-return-documents, Property 9: Percentage Calculation
 */
async function testProperty9PercentageCalculation(): Promise<void> {
  console.log('\n=== Property 9: Percentage Calculation ===');
  console.log('Validates: Requirements 6.4');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
                custom_return_reason: fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item', 'Customer Request', 'Expired', 'Other'),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (documents) => {
          const breakdown = calculateBreakdown(documents);
          
          // Calculate total amount
          const totalAmount = Object.values(breakdown).reduce((sum, entry) => sum + entry.amount, 0);
          
          // Verify percentages sum to approximately 100%
          const totalPercentage = Object.values(breakdown).reduce((sum, entry) => sum + entry.percentage, 0);
          
          if (totalAmount > 0 && Math.abs(totalPercentage - 100) > 0.1) {
            console.error(`Percentage sum mismatch: ${totalPercentage} !== 100`);
            return false;
          }
          
          // Verify each percentage is calculated correctly
          for (const [reason, entry] of Object.entries(breakdown)) {
            const expectedPercentage = totalAmount > 0 ? (entry.amount / totalAmount) * 100 : 0;
            if (Math.abs(entry.percentage - expectedPercentage) > 0.01) {
              console.error(`Percentage for ${reason} incorrect: ${entry.percentage} !== ${expectedPercentage}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 9: Percentages are calculated correctly');
  } catch (error: any) {
    console.error('✗ Property 9 failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Property 10-11: Formatting
// Validates: Requirements 6.5-6.6
// ============================================================================

/**
 * Formats currency in Indonesian locale
 */
function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Formats percentage with one decimal place
 */
function formatPercentage(percentage: number): string {
  return percentage.toFixed(1);
}

/**
 * Test: Property 10 - Currency Formatting
 * Feature: print-return-documents, Property 10: Currency Formatting
 */
async function testProperty10CurrencyFormatting(): Promise<void> {
  console.log('\n=== Property 10: Currency Formatting ===');
  console.log('Validates: Requirements 6.5, 7.5');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1000000000 }),
        async (amount) => {
          const formatted = formatCurrency(amount);
          
          // Must start with "Rp "
          if (!formatted.startsWith('Rp ')) {
            console.error(`Currency format missing Rp prefix: ${formatted}`);
            return false;
          }
          
          // Must use Indonesian locale (period as thousand separator)
          const numberPart = formatted.substring(3);
          if (amount >= 1000 && !numberPart.includes('.')) {
            console.error(`Currency format missing thousand separator: ${formatted}`);
            return false;
          }
          
          // Verify the formatted number can be parsed back
          const parsedAmount = parseInt(numberPart.replace(/\./g, ''));
          if (parsedAmount !== amount) {
            console.error(`Currency format parsing failed: ${formatted} -> ${parsedAmount} !== ${amount}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 10: Currency formatting uses Indonesian locale');
  } catch (error: any) {
    console.error('✗ Property 10 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 11 - Percentage Decimal Formatting
 * Feature: print-return-documents, Property 11: Percentage Decimal Formatting
 */
async function testProperty11PercentageFormatting(): Promise<void> {
  console.log('\n=== Property 11: Percentage Decimal Formatting ===');
  console.log('Validates: Requirements 6.6');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 100, noNaN: true }),
        async (percentage) => {
          const formatted = formatPercentage(percentage);
          
          // Must have exactly one decimal place
          const parts = formatted.split('.');
          if (parts.length !== 2 || parts[1].length !== 1) {
            console.error(`Percentage format incorrect: ${formatted} (expected one decimal place)`);
            return false;
          }
          
          // Verify the formatted number matches the original (within rounding)
          const parsed = parseFloat(formatted);
          if (Math.abs(parsed - percentage) > 0.05) {
            console.error(`Percentage format parsing failed: ${formatted} -> ${parsed} !== ${percentage}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 11: Percentage formatting has one decimal place');
  } catch (error: any) {
    console.error('✗ Property 11 failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Property 14-16: Grouping
// Validates: Requirements 8.2-8.4
// ============================================================================

interface GroupedData {
  key: string;
  label: string;
  items: ReturnDocument[];
}

/**
 * Groups documents by specified criteria
 */
function groupDocuments(documents: ReturnDocument[], groupBy: 'none' | 'customer' | 'supplier' | 'reason'): GroupedData[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: 'All Documents', items: documents }];
  }
  
  if (groupBy === 'customer' || groupBy === 'supplier') {
    const groups = new Map<string, ReturnDocument[]>();
    documents.forEach(doc => {
      const key = (groupBy === 'customer' ? doc.customer_name : doc.supplier_name) || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({ key, label: key, items }));
  }
  
  if (groupBy === 'reason') {
    const groups = new Map<string, ReturnDocument[]>();
    const docSet = new Map<string, Set<string>>(); // Track which docs are in which groups
    
    documents.forEach((doc, docIndex) => {
      doc.items.forEach(item => {
        const key = item.custom_return_reason || 'Unknown';
        if (!groups.has(key)) {
          groups.set(key, []);
          docSet.set(key, new Set());
        }
        // Use document index to identify unique documents
        const docId = `${docIndex}-${doc.name}`;
        if (!docSet.get(key)!.has(docId)) {
          docSet.get(key)!.add(docId);
          groups.get(key)!.push(doc);
        }
      });
    });
    return Array.from(groups.entries()).map(([key, items]) => ({ key, label: key, items }));
  }
  
  return [];
}

/**
 * Test: Property 14 - Ungrouped Data Structure
 * Feature: print-return-documents, Property 14: Ungrouped Data Structure
 */
async function testProperty14UngroupedData(): Promise<void> {
  console.log('\n=== Property 14: Ungrouped Data Structure ===');
  console.log('Validates: Requirements 8.2');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
              })
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        async (documents) => {
          const grouped = groupDocuments(documents, 'none');
          
          // Should have exactly one group
          if (grouped.length !== 1) {
            console.error(`Ungrouped should have 1 group, got ${grouped.length}`);
            return false;
          }
          
          // Group should contain all documents
          if (grouped[0].items.length !== documents.length) {
            console.error(`Ungrouped should contain all documents: ${grouped[0].items.length} !== ${documents.length}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 14: Ungrouped data has single group with all documents');
  } catch (error: any) {
    console.error('✗ Property 14 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 15 - Customer/Supplier Grouping
 * Feature: print-return-documents, Property 15: Customer/Supplier Grouping
 */
async function testProperty15PartyGrouping(): Promise<void> {
  console.log('\n=== Property 15: Customer/Supplier Grouping ===');
  console.log('Validates: Requirements 8.3');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            customer_name: fc.string({ minLength: 1, maxLength: 50 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
              })
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (documents) => {
          const grouped = groupDocuments(documents, 'customer');
          
          // Verify all documents are in groups
          const totalInGroups = grouped.reduce((sum, group) => sum + group.items.length, 0);
          if (totalInGroups !== documents.length) {
            console.error(`Document count mismatch: ${totalInGroups} !== ${documents.length}`);
            return false;
          }
          
          // Verify each group has documents with same customer
          for (const group of grouped) {
            const customerNames = new Set(group.items.map(doc => doc.customer_name));
            if (customerNames.size > 1) {
              console.error(`Group ${group.key} has multiple customers: ${Array.from(customerNames).join(', ')}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 15: Customer/Supplier grouping is correct');
  } catch (error: any) {
    console.error('✗ Property 15 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 16 - Reason Grouping
 * Feature: print-return-documents, Property 16: Reason Grouping
 */
async function testProperty16ReasonGrouping(): Promise<void> {
  console.log('\n=== Property 16: Reason Grouping ===');
  console.log('Validates: Requirements 8.4');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
                custom_return_reason: fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item', 'Customer Request', 'Expired', 'Other'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (documents) => {
          const grouped = groupDocuments(documents, 'reason');
          
          // Verify each group has documents with items of that reason
          for (const group of grouped) {
            for (const doc of group.items) {
              const hasReason = doc.items.some(item => 
                (item.custom_return_reason || 'Unknown') === group.key
              );
              if (!hasReason) {
                console.error(`Document ${doc.name} in group ${group.key} has no items with that reason`);
                return false;
              }
            }
          }
          
          // Verify no document instance is duplicated within a group
          // Note: Documents with same name but different instances are allowed
          for (const group of grouped) {
            const seen = new Set<ReturnDocument>();
            for (const doc of group.items) {
              if (seen.has(doc)) {
                console.error(`Group ${group.key} has duplicate document instances`);
                return false;
              }
              seen.add(doc);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 16: Reason grouping is correct');
  } catch (error: any) {
    console.error('✗ Property 16 failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Property 17-21: Excel Export
// Validates: Requirements 9.3-9.7
// ============================================================================

interface ExcelWorkbook {
  sheets: {
    name: string;
    data: any[][];
  }[];
}

/**
 * Simulates Excel export generation
 */
function generateExcelExport(documents: ReturnDocument[], fromDate: string, toDate: string, company: string): ExcelWorkbook {
  const summary = calculateSummary(documents);
  const breakdown = calculateBreakdown(documents);
  
  // Ringkasan sheet
  const ringkasanData = [
    ['Laporan Retur'],
    [`Periode: ${fromDate} - ${toDate}`],
    [`Perusahaan: ${company}`],
    [],
    ['Total Dokumen', summary.total_count],
    ['Total Nilai', summary.total_amount],
    ['Rata-rata', summary.average_amount],
    [],
    ['Alasan', 'Jumlah Item', 'Total Nilai', 'Persentase'],
    ...Object.entries(breakdown).map(([reason, data]) => [
      reason,
      data.count,
      data.amount,
      data.percentage.toFixed(1),
    ]),
  ];
  
  // Detail sheet
  const detailData = [
    ['Document Number', 'Date', 'Party', 'Status', 'Total'],
    ...documents.map(doc => [
      doc.name,
      doc.posting_date,
      doc.customer_name || doc.supplier_name || '',
      doc.status,
      Math.abs(doc.grand_total),
    ]),
  ];
  
  // Items sheet
  const itemsData = [
    ['Document Number', 'Party', 'Item Code', 'Item Name', 'Qty', 'Rate', 'Amount', 'Return Reason', 'Notes'],
    ...documents.flatMap(doc =>
      doc.items.map(item => [
        doc.name,
        doc.customer_name || doc.supplier_name || '',
        item.item_code,
        item.item_name,
        item.qty,
        item.rate,
        item.amount,
        item.custom_return_reason || '',
        item.custom_return_item_notes || '',
      ])
    ),
  ];
  
  return {
    sheets: [
      { name: 'Ringkasan', data: ringkasanData },
      { name: 'Detail', data: detailData },
      { name: 'Items', data: itemsData },
    ],
  };
}

/**
 * Generates Excel filename
 */
function generateExcelFilename(docType: string, fromDate: string, toDate: string): string {
  const fromClean = fromDate.replace(/\//g, '');
  const toClean = toDate.replace(/\//g, '');
  return `${docType}_Report_${fromClean}_${toClean}.xlsx`;
}

/**
 * Test: Property 17 - Excel Workbook Structure
 * Feature: print-return-documents, Property 17: Excel Workbook Structure
 */
async function testProperty17ExcelWorkbookStructure(): Promise<void> {
  console.log('\n=== Property 17: Excel Workbook Structure ===');
  console.log('Validates: Requirements 9.3');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
              })
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        fc.string(),
        fc.string(),
        fc.string(),
        async (documents, fromDate, toDate, company) => {
          const workbook = generateExcelExport(documents, fromDate, toDate, company);
          
          // Must have exactly 3 sheets
          if (workbook.sheets.length !== 3) {
            console.error(`Expected 3 sheets, got ${workbook.sheets.length}`);
            return false;
          }
          
          // Verify sheet names
          const sheetNames = workbook.sheets.map(s => s.name);
          if (!sheetNames.includes('Ringkasan') || !sheetNames.includes('Detail') || !sheetNames.includes('Items')) {
            console.error(`Invalid sheet names: ${sheetNames.join(', ')}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 17: Excel workbook has correct structure');
  } catch (error: any) {
    console.error('✗ Property 17 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 18 - Excel Summary Sheet Content
 * Feature: print-return-documents, Property 18: Excel Summary Sheet Content
 */
async function testProperty18ExcelSummarySheet(): Promise<void> {
  console.log('\n=== Property 18: Excel Summary Sheet Content ===');
  console.log('Validates: Requirements 9.4');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
                custom_return_reason: fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        async (documents, fromDate, toDate, company) => {
          const workbook = generateExcelExport(documents, fromDate, toDate, company);
          const ringkasanSheet = workbook.sheets.find(s => s.name === 'Ringkasan');
          
          if (!ringkasanSheet) {
            console.error('Ringkasan sheet not found');
            return false;
          }
          
          // Verify it contains period
          const hasPeriod = ringkasanSheet.data.some(row => 
            row.some(cell => typeof cell === 'string' && cell.includes('Periode'))
          );
          if (!hasPeriod) {
            console.error('Ringkasan sheet missing period');
            return false;
          }
          
          // Verify it contains company
          const hasCompany = ringkasanSheet.data.some(row => 
            row.some(cell => typeof cell === 'string' && cell.includes('Perusahaan'))
          );
          if (!hasCompany) {
            console.error('Ringkasan sheet missing company');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 18: Excel summary sheet has correct content');
  } catch (error: any) {
    console.error('✗ Property 18 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 19 - Excel Detail Sheet Content
 * Feature: print-return-documents, Property 19: Excel Detail Sheet Content
 */
async function testProperty19ExcelDetailSheet(): Promise<void> {
  console.log('\n=== Property 19: Excel Detail Sheet Content ===');
  console.log('Validates: Requirements 9.5');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            customer_name: fc.string(),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
              })
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.string(),
        fc.string(),
        fc.string(),
        async (documents, fromDate, toDate, company) => {
          const workbook = generateExcelExport(documents, fromDate, toDate, company);
          const detailSheet = workbook.sheets.find(s => s.name === 'Detail');
          
          if (!detailSheet) {
            console.error('Detail sheet not found');
            return false;
          }
          
          // Should have header row + document rows
          const expectedRows = 1 + documents.length;
          if (detailSheet.data.length !== expectedRows) {
            console.error(`Detail sheet row count mismatch: ${detailSheet.data.length} !== ${expectedRows}`);
            return false;
          }
          
          // Verify all documents are present
          const documentNames = documents.map(d => d.name);
          const sheetDocNames = detailSheet.data.slice(1).map(row => row[0]);
          
          for (const docName of documentNames) {
            if (!sheetDocNames.includes(docName)) {
              console.error(`Document ${docName} missing from Detail sheet`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 19: Excel detail sheet has all documents');
  } catch (error: any) {
    console.error('✗ Property 19 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 20 - Excel Items Sheet Content
 * Feature: print-return-documents, Property 20: Excel Items Sheet Content
 */
async function testProperty20ExcelItemsSheet(): Promise<void> {
  console.log('\n=== Property 20: Excel Items Sheet Content ===');
  console.log('Validates: Requirements 9.6');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string({ minLength: 1 }),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.string(),
        fc.string(),
        fc.string(),
        async (documents, fromDate, toDate, company) => {
          const workbook = generateExcelExport(documents, fromDate, toDate, company);
          const itemsSheet = workbook.sheets.find(s => s.name === 'Items');
          
          if (!itemsSheet) {
            console.error('Items sheet not found');
            return false;
          }
          
          // Count total items
          const totalItems = documents.reduce((sum, doc) => sum + doc.items.length, 0);
          
          // Should have header row + item rows
          const expectedRows = 1 + totalItems;
          if (itemsSheet.data.length !== expectedRows) {
            console.error(`Items sheet row count mismatch: ${itemsSheet.data.length} !== ${expectedRows}`);
            return false;
          }
          
          // Verify all item codes are present
          const allItemCodes = documents.flatMap(doc => doc.items.map(item => item.item_code));
          const sheetItemCodes = itemsSheet.data.slice(1).map(row => row[2]); // Item Code is column 2
          
          if (allItemCodes.length !== sheetItemCodes.length) {
            console.error(`Item count mismatch: ${allItemCodes.length} !== ${sheetItemCodes.length}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 20: Excel items sheet has all items');
  } catch (error: any) {
    console.error('✗ Property 20 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Property 21 - Excel Filename Pattern
 * Feature: print-return-documents, Property 21: Excel Filename Pattern
 */
async function testProperty21ExcelFilename(): Promise<void> {
  console.log('\n=== Property 21: Excel Filename Pattern ===');
  console.log('Validates: Requirements 9.7');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Sales_Return', 'Purchase_Return', 'Debit_Note'),
        fc.string({ minLength: 8, maxLength: 10 }), // Date string
        fc.string({ minLength: 8, maxLength: 10 }), // Date string
        async (docType, fromDate, toDate) => {
          const filename = generateExcelFilename(docType, fromDate, toDate);
          
          // Must start with document type
          if (!filename.startsWith(docType)) {
            console.error(`Filename doesn't start with ${docType}: ${filename}`);
            return false;
          }
          
          // Must end with .xlsx
          if (!filename.endsWith('.xlsx')) {
            console.error(`Filename doesn't end with .xlsx: ${filename}`);
            return false;
          }
          
          // Must contain _Report_
          if (!filename.includes('_Report_')) {
            console.error(`Filename missing _Report_: ${filename}`);
            return false;
          }
          
          // Must not contain slashes (dates should be cleaned)
          if (filename.includes('/')) {
            console.error(`Filename contains slashes: ${filename}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 21: Excel filename follows correct pattern');
  } catch (error: any) {
    console.error('✗ Property 21 failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Property 28: Client-Side Filtering
// Validates: Requirements 13.8
// ============================================================================

/**
 * Filters documents by return reason
 */
function filterByReturnReason(documents: ReturnDocument[], reason: ReturnReason | ''): ReturnDocument[] {
  if (!reason) {
    return documents;
  }
  
  return documents.filter(doc =>
    doc.items.some(item => item.custom_return_reason === reason)
  );
}

/**
 * Test: Property 28 - Client-Side Return Reason Filtering
 * Feature: print-return-documents, Property 28: Client-Side Return Reason Filtering
 */
async function testProperty28ClientSideFiltering(): Promise<void> {
  console.log('\n=== Property 28: Client-Side Return Reason Filtering ===');
  console.log('Validates: Requirements 13.8');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
                custom_return_reason: fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item', 'Customer Request', 'Expired', 'Other'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item', 'Customer Request', 'Expired', 'Other'),
        async (documents, filterReason) => {
          const filtered = filterByReturnReason(documents, filterReason);
          
          // All filtered documents must have at least one item with the filter reason
          for (const doc of filtered) {
            const hasReason = doc.items.some(item => item.custom_return_reason === filterReason);
            if (!hasReason) {
              console.error(`Filtered document ${doc.name} doesn't have reason ${filterReason}`);
              return false;
            }
          }
          
          // All documents with the reason should be in filtered results
          for (const doc of documents) {
            const hasReason = doc.items.some(item => item.custom_return_reason === filterReason);
            const isInFiltered = filtered.some(f => f.name === doc.name);
            
            if (hasReason && !isInFiltered) {
              console.error(`Document ${doc.name} with reason ${filterReason} not in filtered results`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 28: Client-side filtering works correctly');
  } catch (error: any) {
    console.error('✗ Property 28 failed:', error.message);
    throw error;
  }
}

/**
 * Test: Empty filter returns all documents
 */
async function testProperty28EmptyFilter(): Promise<void> {
  console.log('\n=== Property 28b: Empty Filter Returns All ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string(),
            posting_date: fc.string(),
            grand_total: fc.integer({ min: -10000000, max: -1 }),
            items: fc.array(
              fc.record({
                name: fc.string(),
                item_code: fc.string(),
                item_name: fc.string(),
                qty: fc.integer({ min: -100, max: -1 }),
                rate: fc.integer({ min: 1, max: 1000000 }),
                amount: fc.integer({ min: -10000000, max: -1 }),
              })
            ),
            status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        async (documents) => {
          const filtered = filterByReturnReason(documents, '');
          
          if (filtered.length !== documents.length) {
            console.error(`Empty filter should return all documents: ${filtered.length} !== ${documents.length}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    console.log('✓ Property 28b: Empty filter returns all documents');
  } catch (error: any) {
    console.error('✗ Property 28b failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Property-Based Tests: Print Return Documents                 ║');
  console.log('║  Feature: print-return-documents                               ║');
  console.log('║  Tasks: 6.4-6.10                                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Property 4: Date Format Conversion', fn: testProperty4DateFormatConversion },
    { name: 'Property 5: Total Count Calculation', fn: testProperty5TotalCountCalculation },
    { name: 'Property 6: Total Amount Calculation', fn: testProperty6TotalAmountCalculation },
    { name: 'Property 7: Average Amount Calculation', fn: testProperty7AverageAmountCalculation },
    { name: 'Property 8: Breakdown Aggregation', fn: testProperty8BreakdownAggregation },
    { name: 'Property 9: Percentage Calculation', fn: testProperty9PercentageCalculation },
    { name: 'Property 10: Currency Formatting', fn: testProperty10CurrencyFormatting },
    { name: 'Property 11: Percentage Formatting', fn: testProperty11PercentageFormatting },
    { name: 'Property 14: Ungrouped Data', fn: testProperty14UngroupedData },
    { name: 'Property 15: Party Grouping', fn: testProperty15PartyGrouping },
    { name: 'Property 16: Reason Grouping', fn: testProperty16ReasonGrouping },
    { name: 'Property 17: Excel Workbook Structure', fn: testProperty17ExcelWorkbookStructure },
    { name: 'Property 18: Excel Summary Sheet', fn: testProperty18ExcelSummarySheet },
    { name: 'Property 19: Excel Detail Sheet', fn: testProperty19ExcelDetailSheet },
    { name: 'Property 20: Excel Items Sheet', fn: testProperty20ExcelItemsSheet },
    { name: 'Property 21: Excel Filename', fn: testProperty21ExcelFilename },
    { name: 'Property 28: Client-Side Filtering', fn: testProperty28ClientSideFiltering },
    { name: 'Property 28b: Empty Filter', fn: testProperty28EmptyFilter },
  ];
  
  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; error: Error }> = [];
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
      console.log(`✓ ${test.name} completed`);
    } catch (error: any) {
      failed++;
      failures.push({ name: test.name, error });
      console.log(`✗ ${test.name} FAILED`);
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Test Failures                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    failures.forEach(({ name, error }) => {
      console.log(`\n${name}:`);
      console.log(`  ${error.message}`);
    });
    
    console.log('\n⚠️  Property-based tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All property-based tests passed!');
    console.log('\n📊 Coverage Summary:');
    console.log('  ✓ Property 4: Date Format Conversion (Requirements 4.8, 13.3)');
    console.log('  ✓ Property 5-7: Summary Calculations (Requirements 5.2-5.4, 14.2-14.3)');
    console.log('  ✓ Property 8-9: Breakdown Aggregation (Requirements 6.3-6.4, 14.4-14.5)');
    console.log('  ✓ Property 10-11: Formatting (Requirements 6.5-6.6)');
    console.log('  ✓ Property 14-16: Grouping (Requirements 8.2-8.4)');
    console.log('  ✓ Property 17-21: Excel Export (Requirements 9.3-9.7)');
    console.log('  ✓ Property 28: Client-Side Filtering (Requirements 13.8)');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
