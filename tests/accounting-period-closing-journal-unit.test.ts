/**
 * Unit Tests for Accounting Period Closing Journal Edge Cases
 * 
 * This file contains unit tests for:
 * - Net income (profit) scenario
 * - Net loss scenario
 * - Zero net income scenario
 * - Multiple income/expense accounts scenario
 * 
 * **Requirements: 3.2, 3.3, 3.4**
 */

import {
  getNominalAccountBalances,
  createClosingJournalEntry,
  calculateNetIncome,
  type AccountBalance,
  type AccountingPeriod,
} from '../lib/accounting-period-closing';
import { erpnextClient } from '../lib/erpnext';

// Test configuration
const TEST_COMPANY = 'Batasku';
const RETAINED_EARNINGS_ACCOUNT = 'Retained Earnings - B';

// Helper function to create a test period
async function createTestPeriod(suffix: string): Promise<AccountingPeriod> {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');
  
  const period = await erpnextClient.insert('Accounting Period', {
    period_name: `Test Period ${suffix}`,
    company: TEST_COMPANY,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    period_type: 'Monthly',
    status: 'Open',
  });

  return period as AccountingPeriod;
}

// Helper function to create test GL entries
async function createTestGLEntries(
  period: AccountingPeriod,
  incomeAccounts: Array<{ account: string; amount: number }>,
  expenseAccounts: Array<{ account: string; amount: number }>
): Promise<void> {
  const accounts = [];

  // Add income accounts (credit)
  for (const income of incomeAccounts) {
    accounts.push({
      account: income.account,
      debit_in_account_currency: 0,
      credit_in_account_currency: income.amount,
    });
  }

  // Add expense accounts (debit)
  for (const expense of expenseAccounts) {
    accounts.push({
      account: expense.account,
      debit_in_account_currency: expense.amount,
      credit_in_account_currency: 0,
    });
  }

  // Add balancing entry (cash account)
  const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.amount, 0);
  const totalExpense = expenseAccounts.reduce((sum, a) => sum + a.amount, 0);
  const balance = totalIncome - totalExpense;

  if (balance !== 0) {
    accounts.push({
      account: 'Cash - B',
      debit_in_account_currency: balance > 0 ? balance : 0,
      credit_in_account_currency: balance < 0 ? Math.abs(balance) : 0,
    });
  }

  const journal = await erpnextClient.insert('Journal Entry', {
    voucher_type: 'Journal Entry',
    posting_date: period.start_date,
    company: period.company,
    accounts: accounts,
    user_remark: 'Test transaction',
  });

  await erpnextClient.submit('Journal Entry', journal.name);
}

// Helper function to cleanup test data
async function cleanupTestPeriod(periodName: string): Promise<void> {
  try {
    const period = await erpnextClient.get('Accounting Period', periodName);
    
    // Cancel and delete closing journal if exists
    if (period.closing_journal_entry) {
      try {
        await erpnextClient.cancel('Journal Entry', period.closing_journal_entry);
        await erpnextClient.delete('Journal Entry', period.closing_journal_entry);
      } catch (error) {
        console.error('Error deleting closing journal:', error);
      }
    }

    // Delete period
    await erpnextClient.delete('Accounting Period', periodName);
  } catch (error) {
    console.error('Error cleaning up test period:', error);
  }
}

/**
 * Test Case 1: Net Income (Profit) Scenario
 * 
 * When income > expense, the closing journal should:
 * - Debit all income accounts
 * - Credit all expense accounts
 * - Credit retained earnings with the profit amount
 */
async function testNetIncomeScenario(): Promise<void> {
  console.log('\n=== Test Case 1: Net Income (Profit) Scenario ===');
  
  const period = await createTestPeriod('NetIncome-' + Date.now());
  
  try {
    const incomeAmount = 500000;
    const expenseAmount = 300000;
    const expectedProfit = incomeAmount - expenseAmount; // 200000

    // Create test data with profit
    await createTestGLEntries(
      period,
      [{ account: 'Sales - B', amount: incomeAmount }],
      [{ account: 'Cost of Goods Sold - B', amount: expenseAmount }]
    );

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: Income account is debited
    const incomeEntry = closingJournal.accounts.find((a: any) => a.account === 'Sales - B');
    if (!incomeEntry || incomeEntry.debit_in_account_currency !== incomeAmount) {
      throw new Error(
        `Income account should be debited ${incomeAmount}, got ${incomeEntry?.debit_in_account_currency}`
      );
    }

    // Verify: Expense account is credited
    const expenseEntry = closingJournal.accounts.find(
      (a: any) => a.account === 'Cost of Goods Sold - B'
    );
    if (!expenseEntry || expenseEntry.credit_in_account_currency !== expenseAmount) {
      throw new Error(
        `Expense account should be credited ${expenseAmount}, got ${expenseEntry?.credit_in_account_currency}`
      );
    }

    // Verify: Retained earnings is credited with profit
    const retainedEntry = closingJournal.accounts.find(
      (a: any) => a.account === RETAINED_EARNINGS_ACCOUNT
    );
    if (!retainedEntry || retainedEntry.credit_in_account_currency !== expectedProfit) {
      throw new Error(
        `Retained earnings should be credited ${expectedProfit}, got ${retainedEntry?.credit_in_account_currency}`
      );
    }

    console.log('✓ Test Case 1 PASSED: Net income scenario handled correctly');
    console.log(`  Income: ${incomeAmount}, Expense: ${expenseAmount}, Profit: ${expectedProfit}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test Case 2: Net Loss Scenario
 * 
 * When expense > income, the closing journal should:
 * - Debit all income accounts
 * - Credit all expense accounts
 * - Debit retained earnings with the loss amount
 */
async function testNetLossScenario(): Promise<void> {
  console.log('\n=== Test Case 2: Net Loss Scenario ===');
  
  const period = await createTestPeriod('NetLoss-' + Date.now());
  
  try {
    const incomeAmount = 200000;
    const expenseAmount = 350000;
    const expectedLoss = incomeAmount - expenseAmount; // -150000

    // Create test data with loss
    await createTestGLEntries(
      period,
      [{ account: 'Sales - B', amount: incomeAmount }],
      [{ account: 'Cost of Goods Sold - B', amount: expenseAmount }]
    );

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: Income account is debited
    const incomeEntry = closingJournal.accounts.find((a: any) => a.account === 'Sales - B');
    if (!incomeEntry || incomeEntry.debit_in_account_currency !== incomeAmount) {
      throw new Error(
        `Income account should be debited ${incomeAmount}, got ${incomeEntry?.debit_in_account_currency}`
      );
    }

    // Verify: Expense account is credited
    const expenseEntry = closingJournal.accounts.find(
      (a: any) => a.account === 'Cost of Goods Sold - B'
    );
    if (!expenseEntry || expenseEntry.credit_in_account_currency !== expenseAmount) {
      throw new Error(
        `Expense account should be credited ${expenseAmount}, got ${expenseEntry?.credit_in_account_currency}`
      );
    }

    // Verify: Retained earnings is debited with loss
    const retainedEntry = closingJournal.accounts.find(
      (a: any) => a.account === RETAINED_EARNINGS_ACCOUNT
    );
    if (!retainedEntry || retainedEntry.debit_in_account_currency !== Math.abs(expectedLoss)) {
      throw new Error(
        `Retained earnings should be debited ${Math.abs(expectedLoss)}, got ${retainedEntry?.debit_in_account_currency}`
      );
    }

    console.log('✓ Test Case 2 PASSED: Net loss scenario handled correctly');
    console.log(`  Income: ${incomeAmount}, Expense: ${expenseAmount}, Loss: ${expectedLoss}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test Case 3: Zero Net Income Scenario
 * 
 * When income = expense, the closing journal should:
 * - Debit all income accounts
 * - Credit all expense accounts
 * - No retained earnings entry (or zero amount)
 */
async function testZeroNetIncomeScenario(): Promise<void> {
  console.log('\n=== Test Case 3: Zero Net Income Scenario ===');
  
  const period = await createTestPeriod('ZeroNet-' + Date.now());
  
  try {
    const amount = 250000;

    // Create test data with zero net income
    await createTestGLEntries(
      period,
      [{ account: 'Sales - B', amount: amount }],
      [{ account: 'Cost of Goods Sold - B', amount: amount }]
    );

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: Income account is debited
    const incomeEntry = closingJournal.accounts.find((a: any) => a.account === 'Sales - B');
    if (!incomeEntry || incomeEntry.debit_in_account_currency !== amount) {
      throw new Error(
        `Income account should be debited ${amount}, got ${incomeEntry?.debit_in_account_currency}`
      );
    }

    // Verify: Expense account is credited
    const expenseEntry = closingJournal.accounts.find(
      (a: any) => a.account === 'Cost of Goods Sold - B'
    );
    if (!expenseEntry || expenseEntry.credit_in_account_currency !== amount) {
      throw new Error(
        `Expense account should be credited ${amount}, got ${expenseEntry?.credit_in_account_currency}`
      );
    }

    // Verify: No retained earnings entry or zero amount
    const retainedEntry = closingJournal.accounts.find(
      (a: any) => a.account === RETAINED_EARNINGS_ACCOUNT
    );
    
    // Should not have retained earnings entry when net income is zero
    if (retainedEntry) {
      const retainedAmount = 
        retainedEntry.credit_in_account_currency - retainedEntry.debit_in_account_currency;
      if (Math.abs(retainedAmount) > 0.01) {
        throw new Error(
          `Retained earnings should be zero, got ${retainedAmount}`
        );
      }
    }

    console.log('✓ Test Case 3 PASSED: Zero net income scenario handled correctly');
    console.log(`  Income: ${amount}, Expense: ${amount}, Net Income: 0`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test Case 4: Multiple Income/Expense Accounts Scenario
 * 
 * When there are multiple income and expense accounts, the closing journal should:
 * - Debit all income accounts individually
 * - Credit all expense accounts individually
 * - Calculate correct net income from all accounts
 * - Create single retained earnings entry with net amount
 */
async function testMultipleAccountsScenario(): Promise<void> {
  console.log('\n=== Test Case 4: Multiple Income/Expense Accounts Scenario ===');
  
  const period = await createTestPeriod('MultiAccounts-' + Date.now());
  
  try {
    const incomeAccounts = [
      { account: 'Sales - B', amount: 300000 },
      { account: 'Service - B', amount: 150000 },
    ];
    
    const expenseAccounts = [
      { account: 'Cost of Goods Sold - B', amount: 180000 },
      { account: 'Expenses Included In Valuation - B', amount: 70000 },
    ];

    const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.amount, 0); // 450000
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + a.amount, 0); // 250000
    const expectedNetIncome = totalIncome - totalExpense; // 200000

    // Create test data with multiple accounts
    await createTestGLEntries(period, incomeAccounts, expenseAccounts);

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: All income accounts are debited
    for (const income of incomeAccounts) {
      const entry = closingJournal.accounts.find((a: any) => a.account === income.account);
      if (!entry || entry.debit_in_account_currency !== income.amount) {
        throw new Error(
          `Income account ${income.account} should be debited ${income.amount}, got ${entry?.debit_in_account_currency}`
        );
      }
    }

    // Verify: All expense accounts are credited
    for (const expense of expenseAccounts) {
      const entry = closingJournal.accounts.find((a: any) => a.account === expense.account);
      if (!entry || entry.credit_in_account_currency !== expense.amount) {
        throw new Error(
          `Expense account ${expense.account} should be credited ${expense.amount}, got ${entry?.credit_in_account_currency}`
        );
      }
    }

    // Verify: Retained earnings has correct net income
    const retainedEntry = closingJournal.accounts.find(
      (a: any) => a.account === RETAINED_EARNINGS_ACCOUNT
    );
    if (!retainedEntry || retainedEntry.credit_in_account_currency !== expectedNetIncome) {
      throw new Error(
        `Retained earnings should be credited ${expectedNetIncome}, got ${retainedEntry?.credit_in_account_currency}`
      );
    }

    // Verify: Journal is balanced
    let totalDebit = 0;
    let totalCredit = 0;
    for (const account of closingJournal.accounts) {
      totalDebit += account.debit_in_account_currency || 0;
      totalCredit += account.credit_in_account_currency || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Journal should be balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
      );
    }

    console.log('✓ Test Case 4 PASSED: Multiple accounts scenario handled correctly');
    console.log(`  Total Income: ${totalIncome}, Total Expense: ${totalExpense}, Net Income: ${expectedNetIncome}`);
    console.log(`  Income Accounts: ${incomeAccounts.length}, Expense Accounts: ${expenseAccounts.length}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Unit Tests for Closing Journal Edge Cases');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Net Income Scenario', fn: testNetIncomeScenario },
    { name: 'Net Loss Scenario', fn: testNetLossScenario },
    { name: 'Zero Net Income Scenario', fn: testZeroNetIncomeScenario },
    { name: 'Multiple Accounts Scenario', fn: testMultipleAccountsScenario },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error: any) {
      console.error(`\n✗ ${test.name} FAILED:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
