/**
 * Unit Tests for Accounting Period Permanent Closing
 * 
 * This file contains unit tests for:
 * - Test successful permanent close
 * - Test permanent close with insufficient permissions
 * - Test permanent close without confirmation
 * - Test transaction rejection in permanently closed period
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { erpnextClient } from '../lib/erpnext';
import {
  createClosingJournalEntry,
  calculateAllAccountBalances,
  createAuditLog,
  type AccountingPeriod,
} from '../lib/accounting-period-closing';
import { validateTransactionAgainstClosedPeriod } from '../lib/accounting-period-restrictions';

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
 * Test 1: Successful permanent close
 * 
 * Verifies that a closed period can be successfully permanently closed.
 * 
 * Requirements: 7.1, 7.3
 */
async function testSuccessfulPermanentClose(): Promise<void> {
  console.log('\n=== Test 1: Successful Permanent Close ===');
  
  const period = await createTestPeriod('PERM-SUCCESS-' + Date.now(), '2024-06-01', '2024-06-30');
  
  try {
    // Create test data
    await createTestGLEntries(period, 100000, 60000);

    // Close the period
    const closedPeriod = await closePeriod(period);

    // Verify period is closed
    if (closedPeriod.status !== 'Closed') {
      throw new Error(`Test 1 FAILED: Period should be closed, got "${closedPeriod.status}"`);
    }

    // Permanently close the period
    const permCloseResponse = await fetch(`${BASE_URL}/api/accounting-period/permanent-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        confirmation: 'PERMANENT',
      }),
    });

    const permCloseResult = await permCloseResponse.json();

    // Verify: Response is successful
    if (!permCloseResult.success) {
      throw new Error(
        `Test 1 FAILED: Expected success=true, got ${permCloseResult.success}. Error: ${permCloseResult.error || permCloseResult.message}`
      );
    }

    // Verify: Period status is Permanently Closed
    if (permCloseResult.data.status !== 'Permanently Closed') {
      throw new Error(
        `Test 1 FAILED: Expected status "Permanently Closed", got "${permCloseResult.data.status}"`
      );
    }

    // Verify: permanently_closed_by is set
    if (!permCloseResult.data.permanently_closed_by) {
      throw new Error('Test 1 FAILED: permanently_closed_by should be set');
    }

    // Verify: permanently_closed_on is set
    if (!permCloseResult.data.permanently_closed_on) {
      throw new Error('Test 1 FAILED: permanently_closed_on should be set');
    }

    // Verify: Closing journal entry is still present
    if (!permCloseResult.data.closing_journal_entry) {
      throw new Error('Test 1 FAILED: closing_journal_entry should still be present');
    }

    // Verify: Audit log entry exists
    const auditLogs = await erpnextClient.getList('Period Closing Log', {
      filters: [
        ['accounting_period', '=', period.name],
        ['action_type', '=', 'Permanently Closed']
      ],
      fields: ['name', 'action_type', 'action_by'],
      limit_page_length: 999999
    });

    if (auditLogs.length === 0) {
      throw new Error('Test 1 FAILED: Audit log entry should exist for permanent closing');
    }

    console.log('✓ Test 1 PASSED: Period successfully permanently closed');
    console.log(`  Period: ${period.period_name}`);
    console.log(`  Status: Closed → Permanently Closed`);
    console.log(`  Permanently closed by: ${permCloseResult.data.permanently_closed_by}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test 2: Permanent close with insufficient permissions
 * 
 * Verifies that only System Manager can permanently close periods.
 * 
 * Note: This test is currently stubbed as the implementation uses 'Administrator'
 * for all operations. In production, this would test actual role-based access control.
 * 
 * Requirements: 7.2
 */
async function testPermanentCloseInsufficientPermissions(): Promise<void> {
  console.log('\n=== Test 2: Permanent Close with Insufficient Permissions ===');
  
  console.log('⚠ Test 2 SKIPPED: Permission checking not fully implemented yet');
  console.log('  Current implementation uses Administrator for all operations');
  console.log('  In production, this would verify only System Manager can permanently close');
  
  // TODO: Implement when user authentication and role checking is added
  // const period = await createTestPeriod('PERM-PERM-' + Date.now(), '2024-07-01', '2024-07-31');
  // 
  // try {
  //   await createTestGLEntries(period, 100000, 60000);
  //   const closedPeriod = await closePeriod(period);
  //   
  //   // Attempt to permanently close with non-System Manager user
  //   const permCloseResponse = await fetch(`${BASE_URL}/api/accounting-period/permanent-close`, {
  //     method: 'POST',
  //     headers: { 
  //       'Content-Type': 'application/json',
  //       'X-User': 'accounts_manager' // Non-System Manager user
  //     },
  //     body: JSON.stringify({
  //       period_name: period.name,
  //       company: TEST_COMPANY,
  //       confirmation: 'PERMANENT',
  //     }),
  //   });
  //   
  //   const permCloseResult = await permCloseResponse.json();
  //   
  //   if (permCloseResult.success) {
  //     throw new Error('Test 2 FAILED: Permanent close should be rejected for non-System Manager');
  //   }
  //   
  //   if (permCloseResponse.status !== 403) {
  //     throw new Error(`Test 2 FAILED: Expected status 403, got ${permCloseResponse.status}`);
  //   }
  // } finally {
  //   await cleanupTestPeriod(period.name);
  // }
}

/**
 * Test 3: Permanent close without confirmation
 * 
 * Verifies that permanent close requires the exact confirmation string "PERMANENT".
 * 
 * Requirements: 7.2
 */
async function testPermanentCloseWithoutConfirmation(): Promise<void> {
  console.log('\n=== Test 3: Permanent Close Without Confirmation ===');
  
  const period = await createTestPeriod('PERM-NOCONF-' + Date.now(), '2024-08-01', '2024-08-31');
  
  try {
    // Create test data
    await createTestGLEntries(period, 100000, 60000);

    // Close the period
    const closedPeriod = await closePeriod(period);

    // Test 3a: Missing confirmation
    const noConfResponse = await fetch(`${BASE_URL}/api/accounting-period/permanent-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        confirmation: '',
      }),
    });

    const noConfResult = await noConfResponse.json();

    if (noConfResult.success) {
      throw new Error('Test 3a FAILED: Permanent close should be rejected without confirmation');
    }

    // Test 3b: Wrong confirmation string
    const wrongConfResponse = await fetch(`${BASE_URL}/api/accounting-period/permanent-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        confirmation: 'permanent', // lowercase
      }),
    });

    const wrongConfResult = await wrongConfResponse.json();

    if (wrongConfResult.success) {
      throw new Error('Test 3b FAILED: Permanent close should be rejected with wrong confirmation');
    }

    // Test 3c: Verify period is still Closed (not Permanently Closed)
    const fetchedPeriod = await erpnextClient.get('Accounting Period', period.name);
    if (fetchedPeriod.status !== 'Closed') {
      throw new Error(
        `Test 3c FAILED: Period should remain "Closed", got "${fetchedPeriod.status}"`
      );
    }

    console.log('✓ Test 3 PASSED: Permanent close correctly requires confirmation string');
    console.log(`  Period: ${period.period_name}`);
    console.log(`  Status: Closed (unchanged)`);
    console.log(`  Empty confirmation: REJECTED`);
    console.log(`  Wrong confirmation: REJECTED`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test 4: Transaction rejection in permanently closed period
 * 
 * Verifies that all transaction modifications are rejected in permanently 
 * closed periods, even for administrators.
 * 
 * Requirements: 7.4
 */
async function testTransactionRejectionInPermanentlyClosedPeriod(): Promise<void> {
  console.log('\n=== Test 4: Transaction Rejection in Permanently Closed Period ===');
  
  const period = await createTestPeriod('PERM-REJECT-' + Date.now(), '2024-09-01', '2024-09-30');
  
  try {
    // Create test data
    await createTestGLEntries(period, 100000, 60000);

    // Close the period
    const closedPeriod = await closePeriod(period);

    // Permanently close the period
    const permCloseResponse = await fetch(`${BASE_URL}/api/accounting-period/permanent-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        confirmation: 'PERMANENT',
      }),
    });

    const permCloseResult = await permCloseResponse.json();

    if (!permCloseResult.success) {
      throw new Error('Test 4 FAILED: Failed to permanently close period');
    }

    // Test 4a: Administrator cannot create transaction
    const adminValidation = await validateTransactionAgainstClosedPeriod({
      company: TEST_COMPANY,
      posting_date: period.start_date,
      doctype: 'Journal Entry',
      docname: 'TEST-JE-001',
      user: 'Administrator',
      userRoles: ['System Manager', 'Accounts Manager'],
    });

    if (adminValidation.allowed) {
      throw new Error(
        'Test 4a FAILED: Administrator should not be allowed to create transactions in permanently closed period'
      );
    }

    if (!adminValidation.reason?.toLowerCase().includes('permanently closed')) {
      throw new Error(
        `Test 4a FAILED: Error message should mention "permanently closed", got "${adminValidation.reason}"`
      );
    }

    // Test 4b: Regular user cannot create transaction
    const userValidation = await validateTransactionAgainstClosedPeriod({
      company: TEST_COMPANY,
      posting_date: period.start_date,
      doctype: 'Sales Invoice',
      docname: 'TEST-SI-001',
      user: 'test@example.com',
      userRoles: ['Accounts User'],
    });

    if (userValidation.allowed) {
      throw new Error(
        'Test 4b FAILED: Regular user should not be allowed to create transactions in permanently closed period'
      );
    }

    // Test 4c: Verify requiresLogging is false (no override possible)
    if (adminValidation.requiresLogging) {
      throw new Error(
        'Test 4c FAILED: requiresLogging should be false for permanently closed periods'
      );
    }

    // Test 4d: Verify period status is still Permanently Closed
    const fetchedPeriod = await erpnextClient.get('Accounting Period', period.name);
    if (fetchedPeriod.status !== 'Permanently Closed') {
      throw new Error(
        `Test 4d FAILED: Period should remain "Permanently Closed", got "${fetchedPeriod.status}"`
      );
    }

    console.log('✓ Test 4 PASSED: Transactions correctly rejected in permanently closed period');
    console.log(`  Period: ${period.period_name} (Permanently Closed)`);
    console.log(`  Administrator validation: REJECTED`);
    console.log(`  Regular user validation: REJECTED`);
    console.log(`  Override allowed: NO`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

/**
 * Test 5: Permanent close for Open period (rejected)
 * 
 * Verifies that only Closed periods can be permanently closed.
 * 
 * Requirements: 7.1
 */
async function testPermanentCloseForOpenPeriod(): Promise<void> {
  console.log('\n=== Test 5: Permanent Close for Open Period (Rejected) ===');
  
  const period = await createTestPeriod('PERM-OPEN-' + Date.now(), '2024-10-01', '2024-10-31');
  
  try {
    // Create test data
    await createTestGLEntries(period, 100000, 60000);

    // Verify period is Open
    const fetchedPeriod = await erpnextClient.get('Accounting Period', period.name);
    if (fetchedPeriod.status !== 'Open') {
      throw new Error(`Test 5 FAILED: Period should be "Open", got "${fetchedPeriod.status}"`);
    }

    // Attempt to permanently close without closing first (should fail)
    const permCloseResponse = await fetch(`${BASE_URL}/api/accounting-period/permanent-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_name: period.name,
        company: TEST_COMPANY,
        confirmation: 'PERMANENT',
      }),
    });

    const permCloseResult = await permCloseResponse.json();

    // Verify: Response is not successful
    if (permCloseResult.success) {
      throw new Error('Test 5 FAILED: Permanent close should be rejected for Open period');
    }

    // Verify: Error message mentions status requirement
    if (!permCloseResult.error || !permCloseResult.error.toLowerCase().includes('closed')) {
      throw new Error(
        `Test 5 FAILED: Error should mention period must be closed, got "${permCloseResult.error}"`
      );
    }

    // Verify: Period is still Open
    const stillOpenPeriod = await erpnextClient.get('Accounting Period', period.name);
    if (stillOpenPeriod.status !== 'Open') {
      throw new Error(
        `Test 5 FAILED: Period should remain "Open", got "${stillOpenPeriod.status}"`
      );
    }

    console.log('✓ Test 5 PASSED: Permanent close correctly rejected for Open period');
    console.log(`  Period: ${period.period_name}`);
    console.log(`  Status: Open (unchanged)`);
    console.log(`  Error: ${permCloseResult.error}`);
  } finally {
    await cleanupTestPeriod(period.name);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Unit Tests for Permanent Closing');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Test 1', fn: testSuccessfulPermanentClose },
    { name: 'Test 2', fn: testPermanentCloseInsufficientPermissions },
    { name: 'Test 3', fn: testPermanentCloseWithoutConfirmation },
    { name: 'Test 4', fn: testTransactionRejectionInPermanentlyClosedPeriod },
    { name: 'Test 5', fn: testPermanentCloseForOpenPeriod },
  ];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    try {
      await test.fn();
      if (test.name === 'Test 2') {
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
