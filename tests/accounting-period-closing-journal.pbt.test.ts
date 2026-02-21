/**
 * Property-Based Tests for Accounting Period Closing Journal
 * 
 * This file contains property tests for:
 * - Property 7: Nominal Account Identification
 * - Property 8: Closing Journal Zeros Nominal Accounts
 * - Property 9: Net Income Calculation
 * - Property 10: Closing Journal Marker
 * - Property 11: Closing Journal Auto-Submit
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
  // Create a journal entry with income and expense accounts
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
 * Property 7: Nominal Account Identification
 * 
 * **Validates: Requirements 3.1**
 * 
 * For any accounting period, the closing process should identify all and only 
 * those accounts with root_type "Income" or "Expense" and non-zero balance as 
 * nominal accounts.
 */
async function testProperty7_NominalAccountIdentification(): Promise<void> {
  console.log('\n=== Property 7: Nominal Account Identification ===');
  
  const period = await createTestPeriod('P7-' + Date.now());
  
  try {
    // Create test data with known income and expense accounts
    await createTestGLEntries(
      period,
      [
        { account: 'Sales - B', amount: 100000 },
        { account: 'Service - B', amount: 50000 },
      ],
      [
        { account: 'Cost of Goods Sold - B', amount: 60000 },
        { account: 'Expenses Included In Valuation - B', amount: 20000 },
      ]
    );

    // Get nominal accounts
    const nominalAccounts = await getNominalAccountBalances(period);

    // Verify: All returned accounts should be Income or Expense
    for (const account of nominalAccounts) {
      if (account.root_type !== 'Income' && account.root_type !== 'Expense') {
        throw new Error(
          `Property 7 FAILED: Account ${account.account} has root_type ${account.root_type}, expected Income or Expense`
        );
      }
    }

    // Verify: All returned accounts should have non-zero balance
    for (const account of nominalAccounts) {
      if (Math.abs(account.balance) < 0.01) {
        throw new Error(
          `Property 7 FAILED: Account ${account.account} has zero balance but was included`
        );
      }
    }

    // Verify: is_nominal flag should be true
    for (const account of nominalAccounts) {
      if (!account.is_nominal) {
        throw new Error(
          `Property 7 FAILED: Account ${account.account} has is_nominal=false`
        );
      }
    }

    console.log(`✓ Property 7 PASSED: Identified ${nominalAccounts.length} nominal accounts correctly`);
    console.log('  Accounts:', nominalAccounts.map(a => `${a.account} (${a.root_type}): ${a.balance}`));
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Property 8: Closing Journal Zeros Nominal Accounts
 * 
 * **Validates: Requirements 3.2, 3.3**
 * 
 * For any accounting period with nominal accounts, the closing journal entry 
 * should create entries such that the sum of all debits equals the sum of all 
 * credits, and each nominal account's balance becomes zero after posting the 
 * closing journal.
 */
async function testProperty8_ClosingJournalZerosNominalAccounts(): Promise<void> {
  console.log('\n=== Property 8: Closing Journal Zeros Nominal Accounts ===');
  
  const period = await createTestPeriod('P8-' + Date.now());
  
  try {
    // Create test data
    await createTestGLEntries(
      period,
      [
        { account: 'Sales - B', amount: 150000 },
        { account: 'Service - B', amount: 75000 },
      ],
      [
        { account: 'Cost of Goods Sold - B', amount: 90000 },
        { account: 'Expenses Included In Valuation - B', amount: 35000 },
      ]
    );

    // Get nominal accounts before closing
    const nominalAccountsBefore = await getNominalAccountBalances(period);

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: Journal is balanced (total debit = total credit)
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of closingJournal.accounts) {
      totalDebit += account.debit_in_account_currency || 0;
      totalCredit += account.credit_in_account_currency || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Property 8 FAILED: Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
      );
    }

    // Verify: Each nominal account has a closing entry
    for (const nominalAccount of nominalAccountsBefore) {
      const closingEntry = closingJournal.accounts.find(
        (a: any) => a.account === nominalAccount.account
      );

      if (!closingEntry) {
        throw new Error(
          `Property 8 FAILED: No closing entry found for account ${nominalAccount.account}`
        );
      }

      // Verify: Income accounts are debited
      if (nominalAccount.root_type === 'Income') {
        if (Math.abs(closingEntry.debit_in_account_currency - Math.abs(nominalAccount.balance)) > 0.01) {
          throw new Error(
            `Property 8 FAILED: Income account ${nominalAccount.account} should be debited ${Math.abs(nominalAccount.balance)}, got ${closingEntry.debit_in_account_currency}`
          );
        }
      }

      // Verify: Expense accounts are credited
      if (nominalAccount.root_type === 'Expense') {
        if (Math.abs(closingEntry.credit_in_account_currency - Math.abs(nominalAccount.balance)) > 0.01) {
          throw new Error(
            `Property 8 FAILED: Expense account ${nominalAccount.account} should be credited ${Math.abs(nominalAccount.balance)}, got ${closingEntry.credit_in_account_currency}`
          );
        }
      }
    }

    console.log('✓ Property 8 PASSED: Closing journal correctly zeros out all nominal accounts');
    console.log(`  Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Property 9: Net Income Calculation
 * 
 * **Validates: Requirements 3.4**
 * 
 * For any accounting period, the net income recorded in the closing journal 
 * should equal the sum of all income account balances minus the sum of all 
 * expense account balances for that period.
 */
async function testProperty9_NetIncomeCalculation(): Promise<void> {
  console.log('\n=== Property 9: Net Income Calculation ===');
  
  const period = await createTestPeriod('P9-' + Date.now());
  
  try {
    const incomeAmount = 200000;
    const expenseAmount = 120000;
    const expectedNetIncome = incomeAmount - expenseAmount;

    // Create test data
    await createTestGLEntries(
      period,
      [{ account: 'Sales - B', amount: incomeAmount }],
      [{ account: 'Cost of Goods Sold - B', amount: expenseAmount }]
    );

    // Get nominal accounts
    const nominalAccounts = await getNominalAccountBalances(period);

    // Calculate net income
    const calculatedNetIncome = calculateNetIncome(nominalAccounts);

    // Verify: Calculated net income matches expected
    if (Math.abs(calculatedNetIncome - expectedNetIncome) > 0.01) {
      throw new Error(
        `Property 9 FAILED: Net income calculation incorrect. Expected: ${expectedNetIncome}, Got: ${calculatedNetIncome}`
      );
    }

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: Retained earnings entry matches net income
    const retainedEarningsEntry = closingJournal.accounts.find(
      (a: any) => a.account === RETAINED_EARNINGS_ACCOUNT
    );

    if (!retainedEarningsEntry) {
      throw new Error('Property 9 FAILED: No retained earnings entry found');
    }

    const retainedEarningsAmount = 
      retainedEarningsEntry.credit_in_account_currency - 
      retainedEarningsEntry.debit_in_account_currency;

    if (Math.abs(retainedEarningsAmount - expectedNetIncome) > 0.01) {
      throw new Error(
        `Property 9 FAILED: Retained earnings amount incorrect. Expected: ${expectedNetIncome}, Got: ${retainedEarningsAmount}`
      );
    }

    console.log('✓ Property 9 PASSED: Net income calculation is correct');
    console.log(`  Income: ${incomeAmount}, Expense: ${expenseAmount}, Net Income: ${calculatedNetIncome}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Property 10: Closing Journal Marker
 * 
 * **Validates: Requirements 3.5**
 * 
 * For any closing journal entry created by the system, it should have the 
 * is_closing_entry flag set to true (or 1) and voucher_type set to "Closing Entry".
 */
async function testProperty10_ClosingJournalMarker(): Promise<void> {
  console.log('\n=== Property 10: Closing Journal Marker ===');
  
  const period = await createTestPeriod('P10-' + Date.now());
  
  try {
    // Create test data
    await createTestGLEntries(
      period,
      [{ account: 'Sales - B', amount: 100000 }],
      [{ account: 'Cost of Goods Sold - B', amount: 60000 }]
    );

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Verify: voucher_type is "Closing Entry"
    if (closingJournal.voucher_type !== 'Closing Entry') {
      throw new Error(
        `Property 10 FAILED: voucher_type should be "Closing Entry", got "${closingJournal.voucher_type}"`
      );
    }

    // Verify: is_closing_entry flag is set
    if (closingJournal.is_closing_entry !== 1) {
      throw new Error(
        `Property 10 FAILED: is_closing_entry should be 1, got ${closingJournal.is_closing_entry}`
      );
    }

    // Verify: accounting_period is set
    if (closingJournal.accounting_period !== period.name) {
      throw new Error(
        `Property 10 FAILED: accounting_period should be ${period.name}, got ${closingJournal.accounting_period}`
      );
    }

    console.log('✓ Property 10 PASSED: Closing journal has correct markers');
    console.log(`  voucher_type: ${closingJournal.voucher_type}`);
    console.log(`  is_closing_entry: ${closingJournal.is_closing_entry}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Property 11: Closing Journal Auto-Submit
 * 
 * **Validates: Requirements 3.6**
 * 
 * For any closing journal entry created during period closing, the journal 
 * should be automatically submitted (docstatus = 1) without requiring manual 
 * submission.
 */
async function testProperty11_ClosingJournalAutoSubmit(): Promise<void> {
  console.log('\n=== Property 11: Closing Journal Auto-Submit ===');
  
  const period = await createTestPeriod('P11-' + Date.now());
  
  try {
    // Create test data
    await createTestGLEntries(
      period,
      [{ account: 'Sales - B', amount: 100000 }],
      [{ account: 'Cost of Goods Sold - B', amount: 60000 }]
    );

    // Create closing journal
    const closingJournal = await createClosingJournalEntry(period, RETAINED_EARNINGS_ACCOUNT);

    // Fetch the journal entry to check its status
    const journalEntry = await erpnextClient.get('Journal Entry', closingJournal.name);

    // Verify: docstatus is 1 (submitted)
    if (journalEntry.docstatus !== 1) {
      throw new Error(
        `Property 11 FAILED: Journal should be auto-submitted (docstatus=1), got docstatus=${journalEntry.docstatus}`
      );
    }

    console.log('✓ Property 11 PASSED: Closing journal is auto-submitted');
    console.log(`  Journal Entry: ${closingJournal.name}, docstatus: ${journalEntry.docstatus}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Property-Based Tests for Closing Journal Creation');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Property 7', fn: testProperty7_NominalAccountIdentification },
    { name: 'Property 8', fn: testProperty8_ClosingJournalZerosNominalAccounts },
    { name: 'Property 9', fn: testProperty9_NetIncomeCalculation },
    { name: 'Property 10', fn: testProperty10_ClosingJournalMarker },
    { name: 'Property 11', fn: testProperty11_ClosingJournalAutoSubmit },
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
