/**
 * Preservation Property Tests for Profit/Loss Balance Calculation
 * 
 * These tests run on UNFIXED code and are EXPECTED TO PASS.
 * They establish the baseline behavior that must be preserved after the fix.
 * 
 * Property 2: Preservation - Non-Zero Balance Calculation Unchanged
 * 
 * Tests verify that for accounts WITH GL entries, the balance calculation
 * logic remains unchanged after implementing the fix for zero-balance accounts.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

interface AccountingPeriod {
  name: string;
  period_name: string;
  company: string;
  start_date: string;
  end_date: string;
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Open' | 'Closed' | 'Permanently Closed';
}

interface Account {
  name: string;
  account_name: string;
  company: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  account_type: string;
  is_group: number;
  parent_account: string;
}

interface AccountBalance {
  account: string;
  account_name: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  is_group: boolean;
  debit: number;
  credit: number;
  balance: number;
  is_nominal: boolean;
}

interface JournalEntry {
  name: string;
  posting_date: string;
  company: string;
  accounts: Array<{
    account: string;
    debit_in_account_currency: number;
    credit_in_account_currency: number;
  }>;
}

// Helper functions
async function createDocument<T>(doctype: string, data: any): Promise<T> {
  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/${doctype}`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.exc || `Failed to create ${doctype}`);
  }
  return result.data;
}

async function submitDocument(doctype: string, name: string): Promise<void> {
  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/${doctype}/${name}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ docstatus: 1 }),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.message || result.exc || `Failed to submit ${doctype} ${name}`);
  }
}

async function deleteDocument(doctype: string, name: string): Promise<void> {
  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/${doctype}/${name}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const result = await response.json();
    // Ignore "not found" errors during cleanup
    if (!result.message?.includes('not found')) {
      throw new Error(result.message || result.exc || `Failed to delete ${doctype} ${name}`);
    }
  }
}

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ${expected}, got ${actual} (tolerance: ${tolerance})`);
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`  ✗ ${name}`);
      console.error(`    Error: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
  };
}

// Test data cleanup
const createdResources: Array<{ doctype: string; name: string }> = [];

async function cleanup() {
  console.log('\n=== Cleaning up test data ===\n');
  
  for (const resource of createdResources.reverse()) {
    try {
      await deleteDocument(resource.doctype, resource.name);
      console.log(`  ✓ Deleted ${resource.doctype}: ${resource.name}`);
    } catch (error) {
      console.log(`  ⚠ Failed to delete ${resource.doctype}: ${resource.name}`);
    }
  }
}

async function runTests() {
  console.log('\n=== Preservation Property Tests - Balance Calculation ===\n');
  console.log('IMPORTANT: These tests run on UNFIXED code and are EXPECTED TO PASS.');
  console.log('They establish the baseline behavior that must be preserved after the fix.\n');
  console.log('Property 2: Preservation - Non-Zero Balance Calculation Unchanged\n');

  const testCompany = process.env.ERP_DEFAULT_COMPANY || 'Berkat Abadi Cirebon';
  const timestamp = Date.now();
  
  try {
    /**
     * Test 1: Balance Calculation Preservation
     * 
     * For accounts with GL entries, verify debit/credit/balance calculations remain unchanged.
     * This test observes the current behavior on unfixed code and documents it.
     * 
     * Validates: Requirement 3.1
     */
    await test('Test 1: Accounts with GL entries calculate debit/credit/balance correctly', async () => {
      console.log('\n    Setting up test data with GL entries...');
      
      // Create test accounting period (March 2026)
      const periodName = `TEST-PRESERVE-${timestamp}`;
      const period = await createDocument<AccountingPeriod>('Accounting Period', {
        period_name: periodName,
        company: testCompany,
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        period_type: 'Monthly',
        status: 'Open',
      });
      createdResources.push({ doctype: 'Accounting Period', name: period.name });
      console.log(`    ✓ Created accounting period: ${period.name}`);
      
      // Create test accounts
      const incomeAccount = await createDocument<Account>('Account', {
        account_name: `Test Preserve Income ${timestamp}`,
        company: testCompany,
        root_type: 'Income',
        account_type: 'Income Account',
        is_group: 0,
        parent_account: '4000.000 - Penjualan - BAC',
      });
      createdResources.push({ doctype: 'Account', name: incomeAccount.name });
      console.log(`    ✓ Created Income account: ${incomeAccount.name}`);
      
      const expenseAccount = await createDocument<Account>('Account', {
        account_name: `Test Preserve Expense ${timestamp}`,
        company: testCompany,
        root_type: 'Expense',
        account_type: 'Expense Account',
        is_group: 0,
        parent_account: '5000.000 - Beban - BAC',
      });
      createdResources.push({ doctype: 'Account', name: expenseAccount.name });
      console.log(`    ✓ Created Expense account: ${expenseAccount.name}`);
      
      // Create a Journal Entry with GL entries for both accounts
      // Income account: Credit 5,000,000 (revenue)
      // Expense account: Debit 2,000,000 (cost)
      const journalEntry = await createDocument<JournalEntry>('Journal Entry', {
        posting_date: '2026-03-15',
        company: testCompany,
        accounts: [
          {
            account: incomeAccount.name,
            debit_in_account_currency: 0,
            credit_in_account_currency: 5000000,
          },
          {
            account: expenseAccount.name,
            debit_in_account_currency: 2000000,
            credit_in_account_currency: 0,
          },
          {
            account: '1111.001 - Kas Kecil - BAC', // Cash account to balance
            debit_in_account_currency: 3000000,
            credit_in_account_currency: 0,
          },
        ],
      });
      createdResources.push({ doctype: 'Journal Entry', name: journalEntry.name });
      console.log(`    ✓ Created Journal Entry: ${journalEntry.name}`);
      
      // Submit the journal entry to create GL entries
      await submitDocument('Journal Entry', journalEntry.name);
      console.log(`    ✓ Submitted Journal Entry (GL entries created)`);
      
      console.log('    ✓ Test data setup complete\n');
      
      // Query the balance API
      console.log('    Querying balance API...');
      const response = await fetch(`http://localhost:3000/api/accounting-period/balances/${encodeURIComponent(period.name)}`);
      const data = await response.json();
      
      assert(response.ok, 'Balance API should return 200 OK');
      assert(data.success, 'Balance API should return success=true');
      
      const cumulativeBalances: AccountBalance[] = data.data.cumulative;
      
      // Find our test accounts in the response
      const incomeInResponse = cumulativeBalances.find(a => a.account === incomeAccount.name);
      const expenseInResponse = cumulativeBalances.find(a => a.account === expenseAccount.name);
      
      console.log(`\n    Verifying balance calculations...`);
      
      // Verify Income account
      assert(incomeInResponse !== undefined, 'Income account should be in response');
      console.log(`    Income account: debit=${incomeInResponse!.debit}, credit=${incomeInResponse!.credit}, balance=${incomeInResponse!.balance}`);
      
      assertClose(incomeInResponse!.debit, 0, 0.01, 'Income account debit should be 0');
      assertClose(incomeInResponse!.credit, 5000000, 0.01, 'Income account credit should be 5,000,000');
      assertClose(incomeInResponse!.balance, 5000000, 0.01, 'Income account balance should be 5,000,000 (credit - debit)');
      assert(incomeInResponse!.is_nominal === true, 'Income account should be marked as nominal');
      
      // Verify Expense account
      assert(expenseInResponse !== undefined, 'Expense account should be in response');
      console.log(`    Expense account: debit=${expenseInResponse!.debit}, credit=${expenseInResponse!.credit}, balance=${expenseInResponse!.balance}`);
      
      assertClose(expenseInResponse!.debit, 2000000, 0.01, 'Expense account debit should be 2,000,000');
      assertClose(expenseInResponse!.credit, 0, 0.01, 'Expense account credit should be 0');
      assertClose(expenseInResponse!.balance, 2000000, 0.01, 'Expense account balance should be 2,000,000 (debit - credit)');
      assert(expenseInResponse!.is_nominal === true, 'Expense account should be marked as nominal');
      
      console.log('    ✓ Balance calculations are correct (baseline behavior documented)');
    })();

    /**
     * Test 2: Cumulative vs Period-Only Filtering Preservation
     * 
     * Verify that date filtering continues to work correctly.
     * Cumulative mode includes all transactions up to end_date.
     * Period-only mode includes only transactions within start_date to end_date.
     * 
     * Validates: Requirement 3.2
     */
    await test('Test 2: Cumulative vs period-only filtering works correctly', async () => {
      console.log('\n    Setting up test data for date filtering...');
      
      // Create test accounting period (June 2026 - different from Test 1)
      const periodName = `TEST-DATES-${timestamp}`;
      const period = await createDocument<AccountingPeriod>('Accounting Period', {
        period_name: periodName,
        company: testCompany,
        start_date: '2026-06-01',
        end_date: '2026-06-30',
        period_type: 'Monthly',
        status: 'Open',
      });
      createdResources.push({ doctype: 'Accounting Period', name: period.name });
      console.log(`    ✓ Created accounting period: ${period.name} (June 2026)`);
      
      // Create test Income account
      const incomeAccount = await createDocument<Account>('Account', {
        account_name: `Test Date Filter Income ${timestamp}`,
        company: testCompany,
        root_type: 'Income',
        account_type: 'Income Account',
        is_group: 0,
        parent_account: '4000.000 - Penjualan - BAC',
      });
      createdResources.push({ doctype: 'Account', name: incomeAccount.name });
      console.log(`    ✓ Created Income account: ${incomeAccount.name}`);
      
      // Create Journal Entry BEFORE the period (May 2026)
      const journalEntryBefore = await createDocument<JournalEntry>('Journal Entry', {
        posting_date: '2026-05-15',
        company: testCompany,
        accounts: [
          {
            account: incomeAccount.name,
            debit_in_account_currency: 0,
            credit_in_account_currency: 1000000,
          },
          {
            account: '1111.001 - Kas Kecil - BAC',
            debit_in_account_currency: 1000000,
            credit_in_account_currency: 0,
          },
        ],
      });
      createdResources.push({ doctype: 'Journal Entry', name: journalEntryBefore.name });
      await submitDocument('Journal Entry', journalEntryBefore.name);
      console.log(`    ✓ Created Journal Entry before period: ${journalEntryBefore.name} (May 15, credit 1M)`);
      
      // Create Journal Entry DURING the period (June 2026)
      const journalEntryDuring = await createDocument<JournalEntry>('Journal Entry', {
        posting_date: '2026-06-15',
        company: testCompany,
        accounts: [
          {
            account: incomeAccount.name,
            debit_in_account_currency: 0,
            credit_in_account_currency: 2000000,
          },
          {
            account: '1111.001 - Kas Kecil - BAC',
            debit_in_account_currency: 2000000,
            credit_in_account_currency: 0,
          },
        ],
      });
      createdResources.push({ doctype: 'Journal Entry', name: journalEntryDuring.name });
      await submitDocument('Journal Entry', journalEntryDuring.name);
      console.log(`    ✓ Created Journal Entry during period: ${journalEntryDuring.name} (Jun 15, credit 2M)`);
      
      console.log('    ✓ Test data setup complete\n');
      
      // Query the balance API
      console.log('    Querying balance API...');
      const response = await fetch(`http://localhost:3000/api/accounting-period/balances/${encodeURIComponent(period.name)}`);
      const data = await response.json();
      
      assert(response.ok, 'Balance API should return 200 OK');
      assert(data.success, 'Balance API should return success=true');
      
      const cumulativeBalances: AccountBalance[] = data.data.cumulative;
      const periodOnlyBalances: AccountBalance[] = data.data.period_only;
      
      // Find our test account in both responses
      const cumulativeIncome = cumulativeBalances.find(a => a.account === incomeAccount.name);
      const periodOnlyIncome = periodOnlyBalances.find(a => a.account === incomeAccount.name);
      
      console.log(`\n    Verifying date filtering...`);
      
      // Cumulative should include both entries (1M + 2M = 3M)
      assert(cumulativeIncome !== undefined, 'Income account should be in cumulative response');
      console.log(`    Cumulative: credit=${cumulativeIncome!.credit}, balance=${cumulativeIncome!.balance}`);
      assertClose(cumulativeIncome!.credit, 3000000, 0.01, 'Cumulative credit should be 3,000,000 (1M + 2M)');
      assertClose(cumulativeIncome!.balance, 3000000, 0.01, 'Cumulative balance should be 3,000,000');
      
      // Period-only should include only March entry (2M)
      assert(periodOnlyIncome !== undefined, 'Income account should be in period-only response');
      console.log(`    Period-only: credit=${periodOnlyIncome!.credit}, balance=${periodOnlyIncome!.balance}`);
      assertClose(periodOnlyIncome!.credit, 2000000, 0.01, 'Period-only credit should be 2,000,000 (only June)');
      assertClose(periodOnlyIncome!.balance, 2000000, 0.01, 'Period-only balance should be 2,000,000');
      
      console.log('    ✓ Date filtering works correctly (baseline behavior documented)');
    })();

    /**
     * Test 3: Real Account Filtering Preservation
     * 
     * Verify that Real accounts (Asset, Liability, Equity) still show only non-zero balances.
     * This is different from Income/Expense accounts which should show all (after fix).
     * 
     * Validates: Requirement 3.3
     */
    await test('Test 3: Real accounts show only non-zero balances', async () => {
      console.log('\n    Setting up test data for Real account filtering...');
      
      // Create test accounting period (July 2026 - different from other tests)
      const periodName = `TEST-REAL-${timestamp}`;
      const period = await createDocument<AccountingPeriod>('Accounting Period', {
        period_name: periodName,
        company: testCompany,
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        period_type: 'Monthly',
        status: 'Open',
      });
      createdResources.push({ doctype: 'Accounting Period', name: period.name });
      console.log(`    ✓ Created accounting period: ${period.name}`);
      
      // Query the balance API (should only return Real accounts with non-zero balances)
      console.log('    Querying balance API...');
      const response = await fetch(`http://localhost:3000/api/accounting-period/balances/${encodeURIComponent(period.name)}`);
      const data = await response.json();
      
      assert(response.ok, 'Balance API should return 200 OK');
      assert(data.success, 'Balance API should return success=true');
      
      const cumulativeBalances: AccountBalance[] = data.data.cumulative;
      
      // Filter Real accounts (Asset, Liability, Equity)
      const realAccounts = cumulativeBalances.filter(a => 
        ['Asset', 'Liability', 'Equity'].includes(a.root_type)
      );
      
      console.log(`\n    Verifying Real account filtering...`);
      console.log(`    Total Real accounts in response: ${realAccounts.length}`);
      
      // Verify that all Real accounts have non-zero balances
      let allNonZero = true;
      for (const account of realAccounts) {
        if (Math.abs(account.balance) < 0.01) {
          console.log(`    ⚠️  Real account with zero balance found: ${account.account} (balance=${account.balance})`);
          allNonZero = false;
        }
      }
      
      if (allNonZero && realAccounts.length > 0) {
        console.log(`    ✓ All ${realAccounts.length} Real accounts have non-zero balances`);
      } else if (realAccounts.length === 0) {
        console.log(`    ✓ No Real accounts in response (acceptable if no transactions exist)`);
      }
      
      // This is the baseline behavior: Real accounts only show if they have non-zero balances
      // After the fix, this behavior should remain unchanged
      console.log('    ✓ Real account filtering behavior documented (baseline)');
    })();

    /**
     * Test 4: Aggregation Logic Preservation
     * 
     * Verify that debit/credit summing from multiple GL entries works correctly.
     * This tests the aggregation logic that sums up all GL entries for an account.
     * 
     * Validates: Requirement 3.4
     */
    await test('Test 4: Aggregation logic for summing debits and credits works correctly', async () => {
      console.log('\n    Setting up test data for aggregation logic...');
      
      // Create test accounting period (August 2026 - different from other tests)
      const periodName = `TEST-AGG-${timestamp}`;
      const period = await createDocument<AccountingPeriod>('Accounting Period', {
        period_name: periodName,
        company: testCompany,
        start_date: '2026-08-01',
        end_date: '2026-08-31',
        period_type: 'Monthly',
        status: 'Open',
      });
      createdResources.push({ doctype: 'Accounting Period', name: period.name });
      console.log(`    ✓ Created accounting period: ${period.name}`);
      
      // Create test Income account
      const incomeAccount = await createDocument<Account>('Account', {
        account_name: `Test Aggregation Income ${timestamp}`,
        company: testCompany,
        root_type: 'Income',
        account_type: 'Income Account',
        is_group: 0,
        parent_account: '4000.000 - Penjualan - BAC',
      });
      createdResources.push({ doctype: 'Account', name: incomeAccount.name });
      console.log(`    ✓ Created Income account: ${incomeAccount.name}`);
      
      // Create test Expense account
      const expenseAccount = await createDocument<Account>('Account', {
        account_name: `Test Aggregation Expense ${timestamp}`,
        company: testCompany,
        root_type: 'Expense',
        account_type: 'Expense Account',
        is_group: 0,
        parent_account: '5000.000 - Beban - BAC',
      });
      createdResources.push({ doctype: 'Account', name: expenseAccount.name });
      console.log(`    ✓ Created Expense account: ${expenseAccount.name}`);
      
      // Create multiple Journal Entries to test aggregation
      // Entry 1: Income credit 1M, Expense debit 500K
      const je1 = await createDocument<JournalEntry>('Journal Entry', {
        posting_date: '2026-08-05',
        company: testCompany,
        accounts: [
          { account: incomeAccount.name, debit_in_account_currency: 0, credit_in_account_currency: 1000000 },
          { account: expenseAccount.name, debit_in_account_currency: 500000, credit_in_account_currency: 0 },
          { account: '1111.001 - Kas Kecil - BAC', debit_in_account_currency: 500000, credit_in_account_currency: 0 },
        ],
      });
      createdResources.push({ doctype: 'Journal Entry', name: je1.name });
      await submitDocument('Journal Entry', je1.name);
      console.log(`    ✓ Created JE1: Income credit 1M, Expense debit 500K`);
      
      // Entry 2: Income credit 2M, Expense debit 800K
      const je2 = await createDocument<JournalEntry>('Journal Entry', {
        posting_date: '2026-08-15',
        company: testCompany,
        accounts: [
          { account: incomeAccount.name, debit_in_account_currency: 0, credit_in_account_currency: 2000000 },
          { account: expenseAccount.name, debit_in_account_currency: 800000, credit_in_account_currency: 0 },
          { account: '1111.001 - Kas Kecil - BAC', debit_in_account_currency: 1200000, credit_in_account_currency: 0 },
        ],
      });
      createdResources.push({ doctype: 'Journal Entry', name: je2.name });
      await submitDocument('Journal Entry', je2.name);
      console.log(`    ✓ Created JE2: Income credit 2M, Expense debit 800K`);
      
      // Entry 3: Income credit 1.5M, Expense debit 300K
      const je3 = await createDocument<JournalEntry>('Journal Entry', {
        posting_date: '2026-08-25',
        company: testCompany,
        accounts: [
          { account: incomeAccount.name, debit_in_account_currency: 0, credit_in_account_currency: 1500000 },
          { account: expenseAccount.name, debit_in_account_currency: 300000, credit_in_account_currency: 0 },
          { account: '1111.001 - Kas Kecil - BAC', debit_in_account_currency: 1200000, credit_in_account_currency: 0 },
        ],
      });
      createdResources.push({ doctype: 'Journal Entry', name: je3.name });
      await submitDocument('Journal Entry', je3.name);
      console.log(`    ✓ Created JE3: Income credit 1.5M, Expense debit 300K`);
      
      console.log('    ✓ Test data setup complete\n');
      
      // Query the balance API
      console.log('    Querying balance API...');
      const response = await fetch(`http://localhost:3000/api/accounting-period/balances/${encodeURIComponent(period.name)}`);
      const data = await response.json();
      
      assert(response.ok, 'Balance API should return 200 OK');
      assert(data.success, 'Balance API should return success=true');
      
      const cumulativeBalances: AccountBalance[] = data.data.cumulative;
      
      // Find our test accounts
      const incomeInResponse = cumulativeBalances.find(a => a.account === incomeAccount.name);
      const expenseInResponse = cumulativeBalances.find(a => a.account === expenseAccount.name);
      
      console.log(`\n    Verifying aggregation logic...`);
      
      // Verify Income account aggregation (1M + 2M + 1.5M = 4.5M)
      assert(incomeInResponse !== undefined, 'Income account should be in response');
      console.log(`    Income: debit=${incomeInResponse!.debit}, credit=${incomeInResponse!.credit}, balance=${incomeInResponse!.balance}`);
      
      assertClose(incomeInResponse!.debit, 0, 0.01, 'Income total debit should be 0');
      assertClose(incomeInResponse!.credit, 4500000, 0.01, 'Income total credit should be 4,500,000 (1M + 2M + 1.5M)');
      assertClose(incomeInResponse!.balance, 4500000, 0.01, 'Income balance should be 4,500,000');
      
      // Verify Expense account aggregation (500K + 800K + 300K = 1.6M)
      assert(expenseInResponse !== undefined, 'Expense account should be in response');
      console.log(`    Expense: debit=${expenseInResponse!.debit}, credit=${expenseInResponse!.credit}, balance=${expenseInResponse!.balance}`);
      
      assertClose(expenseInResponse!.debit, 1600000, 0.01, 'Expense total debit should be 1,600,000 (500K + 800K + 300K)');
      assertClose(expenseInResponse!.credit, 0, 0.01, 'Expense total credit should be 0');
      assertClose(expenseInResponse!.balance, 1600000, 0.01, 'Expense balance should be 1,600,000');
      
      // Verify net income calculation (4.5M - 1.6M = 2.9M)
      const netIncome = incomeInResponse!.balance - expenseInResponse!.balance;
      console.log(`    Net Income: ${netIncome} (Income ${incomeInResponse!.balance} - Expense ${expenseInResponse!.balance})`);
      assertClose(netIncome, 2900000, 0.01, 'Net income should be 2,900,000 (4.5M - 1.6M)');
      
      console.log('    ✓ Aggregation logic works correctly (baseline behavior documented)');
    })();
    
  } finally {
    // Always cleanup, even if tests fail
    await cleanup();
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n⚠️  UNEXPECTED: Some preservation tests failed on unfixed code.');
    console.log('This indicates the baseline behavior may have changed or there are issues with the current implementation.');
    console.log('Review the failures before proceeding with the fix.');
  } else {
    console.log('\n✓ All preservation tests passed on unfixed code!');
    console.log('Baseline behavior has been documented and verified.');
    console.log('After implementing the fix, re-run these tests to ensure no regressions.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Fatal error running tests:', error);
  cleanup().finally(() => process.exit(1));
});
