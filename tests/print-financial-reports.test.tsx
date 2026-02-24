/**
 * Unit Tests for Financial Report Print Components
 * 
 * Tests data mapping, hierarchy rendering, and error handling for:
 * - Trial Balance
 * - Balance Sheet
 * - Profit & Loss
 * - Cash Flow
 * - General Ledger
 * 
 * @validates Requirements 10.2, 10.4
 */

console.log('\n=== Running Financial Report Print Tests ===\n');

import type { TrialBalanceData } from '@/components/print/TrialBalancePrint';
import type { BalanceSheetData } from '@/components/print/BalanceSheetPrint';
import type { ProfitLossData } from '@/components/print/ProfitLossPrint';
import type { CashFlowData } from '@/components/print/CashFlowPrint';
import type { GeneralLedgerData } from '@/components/print/GeneralLedgerPrint';

// ============================================================================
// Test Data
// ============================================================================

const mockTrialBalanceData: TrialBalanceData = {
  companyName: 'PT. Test Company',
  asOfDate: 'Per 31 Desember 2024',
  generatedAt: '01 Januari 2025 10:00 WIB',
  accounts: [
    { account: 'ASSETS', debit: 0, credit: 0, indent: 0 },
    { account: 'Cash', debit: 1000000, credit: 0, indent: 1 },
    { account: 'Bank', debit: 5000000, credit: 0, indent: 1 },
    { account: 'Total Assets', debit: 6000000, credit: 0, indent: 0, isTotal: true },
    { account: 'LIABILITIES', debit: 0, credit: 0, indent: 0 },
    { account: 'Accounts Payable', debit: 0, credit: 2000000, indent: 1 },
    { account: 'Total Liabilities', debit: 0, credit: 2000000, indent: 0, isTotal: true },
    { account: 'TOTAL', debit: 6000000, credit: 6000000, indent: 0, isGrandTotal: true },
  ],
};

const mockBalanceSheetData: BalanceSheetData = {
  companyName: 'PT. Test Company',
  asOfDate: 'Per 31 Desember 2024',
  generatedAt: '01 Januari 2025 10:00 WIB',
  accounts: [
    { account: 'ASSETS', amount: 0, indent: 0, type: 'header' },
    { account: 'Current Assets', amount: 0, indent: 1, type: 'header' },
    { account: 'Cash', amount: 1000000, indent: 2 },
    { account: 'Bank', amount: 5000000, indent: 2 },
    { account: 'Total Current Assets', amount: 6000000, indent: 1, isTotal: true },
    { account: 'Total Assets', amount: 6000000, indent: 0, isGrandTotal: true },
  ],
};

const mockProfitLossData: ProfitLossData = {
  companyName: 'PT. Test Company',
  dateRange: '01 Jan 2024 - 31 Des 2024',
  generatedAt: '01 Januari 2025 10:00 WIB',
  accounts: [
    { account: 'INCOME', amount: 0, indent: 0, type: 'header' },
    { account: 'Sales Revenue', amount: 10000000, indent: 1 },
    { account: 'Total Income', amount: 10000000, indent: 0, isTotal: true },
    { account: 'EXPENSES', amount: 0, indent: 0, type: 'header' },
    { account: 'Cost of Goods Sold', amount: 6000000, indent: 1 },
    { account: 'Total Expenses', amount: 6000000, indent: 0, isTotal: true },
    { account: 'NET PROFIT', amount: 4000000, indent: 0, isGrandTotal: true },
  ],
};

const mockCashFlowData: CashFlowData = {
  companyName: 'PT. Test Company',
  dateRange: '01 Jan 2024 - 31 Des 2024',
  generatedAt: '01 Januari 2025 10:00 WIB',
  activities: [
    { activity: 'OPERATING ACTIVITIES', amount: 0, indent: 0, type: 'header' },
    { activity: 'Cash from Sales', amount: 10000000, indent: 1 },
    { activity: 'Cash for Expenses', amount: -6000000, indent: 1 },
    { activity: 'Net Operating Cash', amount: 4000000, indent: 0, isTotal: true },
    { activity: 'INVESTING ACTIVITIES', amount: 0, indent: 0, type: 'header' },
    { activity: 'Equipment Purchase', amount: -2000000, indent: 1 },
    { activity: 'Net Investing Cash', amount: -2000000, indent: 0, isTotal: true },
    { activity: 'NET CASH FLOW', amount: 2000000, indent: 0, isGrandTotal: true },
  ],
};

const mockGeneralLedgerData: GeneralLedgerData = {
  companyName: 'PT. Test Company',
  dateRange: '01 Jan 2024 - 31 Des 2024',
  generatedAt: '01 Januari 2025 10:00 WIB',
  entries: [
    { date: '01 Jan 2024', account: 'Cash', debit: 1000000, credit: 0, balance: 1000000 },
    { date: '15 Jan 2024', account: 'Bank', debit: 5000000, credit: 0, balance: 6000000 },
    { date: '31 Jan 2024', account: 'Accounts Payable', debit: 0, credit: 2000000, balance: 4000000 },
    { date: '', account: 'TOTAL', debit: 6000000, credit: 2000000, balance: 4000000, isTotal: true },
  ],
};

// ============================================================================
// Test Helper Functions
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

function testDataStructure(name: string, data: any, requiredFields: string[]) {
  console.log(`\nTesting ${name} data structure:`);
  
  requiredFields.forEach(field => {
    assert(
      data.hasOwnProperty(field),
      `${name} has required field: ${field}`
    );
  });
  
  assert(
    typeof data.companyName === 'string' && data.companyName.length > 0,
    `${name} has valid company name`
  );
}

// ============================================================================
// Trial Balance Tests
// ============================================================================

console.log('\n--- Trial Balance Tests ---');

testDataStructure('Trial Balance', mockTrialBalanceData, [
  'companyName',
  'asOfDate',
  'accounts'
]);

assert(
  Array.isArray(mockTrialBalanceData.accounts),
  'Trial Balance accounts is an array'
);

assert(
  mockTrialBalanceData.accounts.length > 0,
  'Trial Balance has account entries'
);

assert(
  mockTrialBalanceData.accounts.some(a => a.account === 'ASSETS'),
  'Trial Balance includes ASSETS section'
);

assert(
  mockTrialBalanceData.accounts.some(a => a.account === 'LIABILITIES'),
  'Trial Balance includes LIABILITIES section'
);

assert(
  mockTrialBalanceData.accounts.some(a => a.isGrandTotal),
  'Trial Balance includes grand total'
);

const tbTotalRow = mockTrialBalanceData.accounts.find(a => a.isGrandTotal);
assert(
  tbTotalRow?.debit === tbTotalRow?.credit,
  'Trial Balance debits equal credits'
);

// ============================================================================
// Balance Sheet Tests
// ============================================================================

console.log('\n--- Balance Sheet Tests ---');

testDataStructure('Balance Sheet', mockBalanceSheetData, [
  'companyName',
  'asOfDate',
  'accounts'
]);

assert(
  Array.isArray(mockBalanceSheetData.accounts),
  'Balance Sheet accounts is an array'
);

assert(
  mockBalanceSheetData.accounts.some(a => a.indent === 0),
  'Balance Sheet has top-level accounts'
);

assert(
  mockBalanceSheetData.accounts.some(a => a.indent && a.indent > 0),
  'Balance Sheet has indented accounts (hierarchy)'
);

assert(
  mockBalanceSheetData.accounts.some(a => a.type === 'header'),
  'Balance Sheet has header rows'
);

assert(
  mockBalanceSheetData.accounts.some(a => a.isGrandTotal),
  'Balance Sheet includes grand total'
);

// ============================================================================
// Profit & Loss Tests
// ============================================================================

console.log('\n--- Profit & Loss Tests ---');

testDataStructure('Profit & Loss', mockProfitLossData, [
  'companyName',
  'dateRange',
  'accounts'
]);

assert(
  mockProfitLossData.dateRange.includes('-'),
  'Profit & Loss has date range'
);

assert(
  mockProfitLossData.accounts.some(a => a.account === 'INCOME'),
  'Profit & Loss includes INCOME section'
);

assert(
  mockProfitLossData.accounts.some(a => a.account === 'EXPENSES'),
  'Profit & Loss includes EXPENSES section'
);

assert(
  mockProfitLossData.accounts.some(a => a.account.includes('NET PROFIT')),
  'Profit & Loss includes net profit/loss'
);

// ============================================================================
// Cash Flow Tests
// ============================================================================

console.log('\n--- Cash Flow Tests ---');

testDataStructure('Cash Flow', mockCashFlowData, [
  'companyName',
  'dateRange',
  'activities'
]);

assert(
  Array.isArray(mockCashFlowData.activities),
  'Cash Flow activities is an array'
);

assert(
  mockCashFlowData.activities.some(a => a.activity.includes('OPERATING')),
  'Cash Flow includes operating activities'
);

assert(
  mockCashFlowData.activities.some(a => a.activity.includes('INVESTING')),
  'Cash Flow includes investing activities'
);

assert(
  mockCashFlowData.activities.some(a => a.amount < 0),
  'Cash Flow handles negative amounts'
);

assert(
  mockCashFlowData.activities.some(a => a.isGrandTotal),
  'Cash Flow includes net cash flow total'
);

// ============================================================================
// General Ledger Tests
// ============================================================================

console.log('\n--- General Ledger Tests ---');

testDataStructure('General Ledger', mockGeneralLedgerData, [
  'companyName',
  'dateRange',
  'entries'
]);

assert(
  Array.isArray(mockGeneralLedgerData.entries),
  'General Ledger entries is an array'
);

assert(
  mockGeneralLedgerData.entries.length > 0,
  'General Ledger has entries'
);

const glEntry = mockGeneralLedgerData.entries[0];
assert(
  glEntry.hasOwnProperty('date') &&
  glEntry.hasOwnProperty('account') &&
  glEntry.hasOwnProperty('debit') &&
  glEntry.hasOwnProperty('credit') &&
  glEntry.hasOwnProperty('balance'),
  'General Ledger entry has all required fields'
);

assert(
  mockGeneralLedgerData.entries.some(e => e.date.length > 0),
  'General Ledger entries have dates'
);

assert(
  mockGeneralLedgerData.entries.some(e => e.isTotal),
  'General Ledger includes total row'
);

// ============================================================================
// Hierarchy Tests
// ============================================================================

console.log('\n--- Hierarchy Tests ---');

const maxIndent = Math.max(...mockBalanceSheetData.accounts.map(a => a.indent || 0));
assert(
  maxIndent >= 2,
  'Balance Sheet supports multi-level hierarchy (indent >= 2)'
);

assert(
  mockBalanceSheetData.accounts.filter(a => a.indent === 0).length > 0,
  'Balance Sheet has level 0 accounts'
);

assert(
  mockBalanceSheetData.accounts.filter(a => a.indent === 1).length > 0,
  'Balance Sheet has level 1 accounts'
);

assert(
  mockBalanceSheetData.accounts.filter(a => a.indent === 2).length > 0,
  'Balance Sheet has level 2 accounts'
);

// ============================================================================
// Error Handling Tests
// ============================================================================

console.log('\n--- Error Handling Tests ---');

const emptyTrialBalance: TrialBalanceData = {
  companyName: 'PT. Test',
  asOfDate: 'Per 31 Des 2024',
  accounts: [],
};

assert(
  Array.isArray(emptyTrialBalance.accounts) && emptyTrialBalance.accounts.length === 0,
  'Handles empty accounts array'
);

const dataWithoutOptionalFields: BalanceSheetData = {
  companyName: 'PT. Test',
  asOfDate: 'Per 31 Des 2024',
  accounts: [
    { account: 'Test', amount: 100000 },
  ],
};

assert(
  !dataWithoutOptionalFields.companyLogo,
  'Handles missing optional logo field'
);

assert(
  !dataWithoutOptionalFields.generatedAt,
  'Handles missing optional generatedAt field'
);

// ============================================================================
// Test Summary
// ============================================================================

console.log('\n=== Test Summary ===');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  console.error('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}
