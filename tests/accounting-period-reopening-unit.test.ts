/**
 * Unit Tests for Accounting Period Reopening
 * 
 * This file contains unit tests for:
 * - Test successful reopen
 * - Test reopen rejection when next period closed
 * - Test reopen with insufficient permissions
 * - Test reopen for permanently closed period (rejected)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { erpnextClient } from '../lib/erpnext';
import {
  createClosingJournalEntry,
  calculateAllAccountBalances,
  createAuditLog,
  type AccountingPeriod,
} from '../lib/accounting-period-closing';

// Test configuration
const TEST_COMPANY = 'Batasku';
const RETAINED_EARNINGS_ACCOUNT = 'Retained Earnings - B';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Helper function to create a test period
async function createTestPeriod(suffix: string, startDate: string, endDate: string): Promise<AccountingPeriod> {
  const period = await erpnextClient.insert('Accounting Period', {
    period_name: `Test Period ${suffix}`,
    company: TEST_COMPANY,
    start_date: startDate,
    end_date: endDate,
    period_type: 'Monthly',
    status: 'Open',
  });

  return period as AccountingPeriod;
}

// Helper function to create test GL entries
async function createTestGLEntries(
  period: AccountingPeriod,
  incomeAmount: number,
  expenseAmount: number
): Promise<void> {
  const accounts = [
    {
      account: 'Sales - B',
      debit_in_account_currency: 0,
      credit_in_account_currency: incomeAmount,
    },
    {
      account: 'Cost of Goods Sold - B',
      debit_in_account_currency: expenseAmount,
      credit_in_account_currency: 0,
    },
    {
      account: 'Cash - B',
      debit_in_account_currency: incomeAmount - expenseAmount,
      credit_in_account_currency: 0,
    },
  ];

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
    
    if (period.closing_journal_entry) {
      try {
        await erpnextClient.cancel('Journal Entry', period.closing_journal_entry);
        await erpnextClient.delete('Journal Entry', period.closing_journal_entry);
      } catch (error) {
        console.error('Error deleting closing journal:', error);
      }
    }

    await erpnextClient.delete('Accounting Period', periodName);
  } catch (error) {
    console.error('Error cleaning up test period:', error);
  }
}

// Helper function to close a period
async function closePeriod(period: AccountingPeriod): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/accounting-period/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      period_name: period.name,
      company: TEST_COMPANY,
      force: true, // Skip validations for testing
    }),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Failed to close period: ${result.error || result.message}`);
  }

  return result.data.period;
}

/**
 * Test 1: Successful reopen
 * 
 * Verifies that a closed period can be successfully reopened when no subsequent 
 * periods are closed.
 * 
 * Requirements: 6.1, 6.3, 6.4
 */
async function testSuccessfulReopen(): Promise<void> {
  console.log('\n=== Test 1: Successful Reopen ===');
  
  const period = await createTestPeriod('REOPEN-SUCCESS-' + Date.now(), '2024-01-01', '2024-01-31');
  
  try {
    // Create test data
    await createTestGLEntries(period, 100000, 60000);

    // Close the period
    const closedPeriod = await closePeriod(period);

    // Verify period is closed
    if (closedPeriod.status !== 'Closed') {
      throw new Error(`Test 1 FAILED: Period should be closed, got "${closedPeriod.status}"`);
    }

    // Store closing journal entry name for verification
    const closingJournalName = closedPeriod.closing_journal_entry;

    // Reopen the period
    const reopenResponse = await fetch(`${BASE_URL}/api/accounting-period/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        reason: 'Testing successful reopen',
      }),
    });

    const reopenResult = await reopenResponse.json();

    // Verify: Response is successful
    if (!reopenResult.success) {
      throw new Error(
        `Test 1 FAILED: Expected success=true, got ${reopenResult.success}. Error: ${reopenResult.error || reopenResult.message}`
      );
    }

    // Verify: Period status is Open
    if (reopenResult.data.status !== 'Open') {
      throw new Error(
        `Test 1 FAILED: Expected status "Open", got "${reopenResult.data.status}"`
      );
    }

    // Verify: closed_by is cleared
    if (reopenResult.data.closed_by !== null && reopenResult.data.closed_by !== undefined) {
      throw new Error(
        `Test 1 FAILED: closed_by should be cleared, got "${reopenResult.data.closed_by}"`
      );
    }

    // Verify: closed_on is cleared
    if (reopenResult.data.closed_on !== null && reopenResult.data.closed_on !== undefined) {
      throw new Error(
        `Test 1 FAILED: closed_on should be cleared, got "${reopenResult.data.closed_on}"`
      );
    }

    // Verify: closing_journal_entry is cleared
    if (reopenResult.data.closing_journal_entry !== null && reopenResult.data.closing_journal_entry !== undefined) {
      throw new Error(
        `Test 1 FAILED: closing_journal_entry should be cleared, got "${reopenResult.data.closing_journal_entry}"`
      );
    }

    // Verify: Closing journal is deleted
    let journalDeleted = false;
    try {
      await erpnextClient.get('Journal Entry', closingJournalName);
    } catch (error: any) {
      journalDeleted = true;
    }

    if (!journalDeleted) {
      throw new Error('Test 1 FAILED: Closing journal should be deleted');
    }

    // Verify: Audit log entry exists
    const auditLogs = await erpnextClient.getList('Period Closing Log', {
      filters: [
        ['accounting_period', '=', period.name],
        ['action_type', '=', 'Reopened']
      ],
      fields: ['name', 'action_type', 'reason'],
      limit_page_length: 999999
    });

    if (auditLogs.length === 0) {
      throw new Error('Test 1 FAILED: Audit log entry should exist for reopening');
    }

    console.log('✓ Test 1 PASSED: Period successfully reopened');
    console.log(`  Period: ${period.period_name}`);
    console.log(`  Status: Closed → Open`);
    console.log(`  Closing journal deleted: ${closingJournalName}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test 2: Reopen rejection when next period closed
 * 
 * Verifies that reopening is rejected when a subsequent period is already closed.
 * 
 * Requirements: 6.2
 */
async function testReopenRejectionNextPeriodClosed(): Promise<void> {
  console.log('\n=== Test 2: Reopen Rejection When Next Period Closed ===');
  
  const period1 = await createTestPeriod('REOPEN-REJECT1-' + Date.now(), '2024-02-01', '2024-02-29');
  const period2 = await createTestPeriod('REOPEN-REJECT2-' + Date.now(), '2024-03-01', '2024-03-31');
  
  try {
    // Create test data in both periods
    await createTestGLEntries(period1, 100000, 60000);
    await createTestGLEntries(period2, 150000, 90000);

    // Close both periods
    const closedPeriod1 = await closePeriod(period1);
    const closedPeriod2 = await closePeriod(period2);

    // Verify both periods are closed
    if (closedPeriod1.status !== 'Closed' || closedPeriod2.status !== 'Closed') {
      throw new Error('Test 2 FAILED: Both periods should be closed');
    }

    // Attempt to reopen period1 (should fail)
    const reopenResponse = await fetch(`${BASE_URL}/api/accounting-period/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period1.name,
        company: TEST_COMPANY,
        reason: 'Testing rejection',
      }),
    });

    const reopenResult = await reopenResponse.json();

    // Verify: Response is not successful
    if (reopenResult.success) {
      throw new Error('Test 2 FAILED: Reopen should be rejected when next period is closed');
    }

    // Verify: Error code is NEXT_PERIOD_CLOSED
    if (reopenResult.error !== 'NEXT_PERIOD_CLOSED') {
      throw new Error(
        `Test 2 FAILED: Expected error "NEXT_PERIOD_CLOSED", got "${reopenResult.error}"`
      );
    }

    // Verify: Error message mentions next period
    if (!reopenResult.message || !reopenResult.message.includes(period2.period_name)) {
      throw new Error(
        `Test 2 FAILED: Error message should mention next period "${period2.period_name}"`
      );
    }

    // Verify: Period1 is still closed
    const fetchedPeriod1 = await erpnextClient.get('Accounting Period', period1.name);
    if (fetchedPeriod1.status !== 'Closed') {
      throw new Error(
        `Test 2 FAILED: Period1 should remain "Closed", got "${fetchedPeriod1.status}"`
      );
    }

    console.log('✓ Test 2 PASSED: Reopen correctly rejected when next period is closed');
    console.log(`  Period1: ${period1.period_name} (remains Closed)`);
    console.log(`  Period2: ${period2.period_name} (Closed)`);
    console.log(`  Error: ${reopenResult.error}`);
  } finally {
    await cleanupTestPeriod(period1.name);
    await cleanupTestPeriod(period2.name);
  }
}

/**
 * Test 3: Reopen with insufficient permissions
 * 
 * Verifies that users without proper permissions cannot reopen periods.
 * 
 * Note: This test is currently stubbed as the implementation uses 'Administrator'
 * for all operations. In production, this would test actual role-based access control.
 * 
 * Requirements: 6.1
 */
async function testReopenInsufficientPermissions(): Promise<void> {
  console.log('\n=== Test 3: Reopen with Insufficient Permissions ===');
  
  console.log('⚠ Test 3 SKIPPED: Permission checking not fully implemented yet');
  console.log('  Current implementation uses Administrator for all operations');
  console.log('  In production, this would verify role-based access control');
  
  // TODO: Implement when user authentication and role checking is added
  // const period = await createTestPeriod('REOPEN-PERM-' + Date.now(), '2024-04-01', '2024-04-30');
  // 
  // try {
  //   await createTestGLEntries(period, 100000, 60000);
  //   const closedPeriod = await closePeriod(period);
  //   
  //   // Attempt to reopen with non-admin user
  //   const reopenResponse = await fetch(`${BASE_URL}/api/accounting-period/reopen`, {
  //     method: 'POST',
  //     headers: { 
  //       'Content-Type': 'application/json',
  //       'X-User': 'accounts_user' // Non-admin user
  //     },
  //     body: JSON.stringify({
  //       period_name: period.name,
  //       company: TEST_COMPANY,
  //       reason: 'Testing permissions',
  //     }),
  //   });
  //   
  //   const reopenResult = await reopenResponse.json();
  //   
  //   if (reopenResult.success) {
  //     throw new Error('Test 3 FAILED: Reopen should be rejected for non-admin user');
  //   }
  //   
  //   if (reopenResponse.status !== 403) {
  //     throw new Error(`Test 3 FAILED: Expected status 403, got ${reopenResponse.status}`);
  //   }
  // } finally {
  //   await cleanupTestPeriod(period.name);
  // }
}

/**
 * Test 4: Reopen for permanently closed period (rejected)
 * 
 * Verifies that permanently closed periods cannot be reopened.
 * 
 * Requirements: 6.1
 */
async function testReopenPermanentlyClosedPeriod(): Promise<void> {
  console.log('\n=== Test 4: Reopen for Permanently Closed Period (Rejected) ===');
  
  const period = await createTestPeriod('REOPEN-PERM-' + Date.now(), '2024-05-01', '2024-05-31');
  
  try {
    // Create test data
    await createTestGLEntries(period, 100000, 60000);

    // Close the period
    const closedPeriod = await closePeriod(period);

    // Manually set status to Permanently Closed
    const permanentlyClosedPeriod = await erpnextClient.update('Accounting Period', period.name, {
      status: 'Permanently Closed',
      permanently_closed_by: 'Administrator',
      permanently_closed_on: new Date().toISOString(),
    });

    // Verify period is permanently closed
    if (permanentlyClosedPeriod.status !== 'Permanently Closed') {
      throw new Error(
        `Test 4 FAILED: Period should be permanently closed, got "${permanentlyClosedPeriod.status}"`
      );
    }

    // Attempt to reopen (should fail)
    const reopenResponse = await fetch(`${BASE_URL}/api/accounting-period/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        reason: 'Testing permanent close rejection',
      }),
    });

    const reopenResult = await reopenResponse.json();

    // Verify: Response is not successful
    if (reopenResult.success) {
      throw new Error('Test 4 FAILED: Reopen should be rejected for permanently closed period');
    }

    // Verify: Error message mentions status
    if (!reopenResult.error || !reopenResult.error.includes('Permanently Closed')) {
      throw new Error(
        `Test 4 FAILED: Error should mention "Permanently Closed", got "${reopenResult.error}"`
      );
    }

    // Verify: Period is still permanently closed
    const fetchedPeriod = await erpnextClient.get('Accounting Period', period.name);
    if (fetchedPeriod.status !== 'Permanently Closed') {
      throw new Error(
        `Test 4 FAILED: Period should remain "Permanently Closed", got "${fetchedPeriod.status}"`
      );
    }

    console.log('✓ Test 4 PASSED: Reopen correctly rejected for permanently closed period');
    console.log(`  Period: ${period.period_name}`);
    console.log(`  Status: Permanently Closed (unchanged)`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Unit Tests for Period Reopening');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Test 1', fn: testSuccessfulReopen },
    { name: 'Test 2', fn: testReopenRejectionNextPeriodClosed },
    { name: 'Test 3', fn: testReopenInsufficientPermissions },
    { name: 'Test 4', fn: testReopenPermanentlyClosedPeriod },
  ];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    try {
      await test.fn();
      if (test.name === 'Test 3') {
        skipped++;
      } else {
        passed++;
      }
    } catch (error: any) {
      console.error(`\n✗ ${test.name} FAILED:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
