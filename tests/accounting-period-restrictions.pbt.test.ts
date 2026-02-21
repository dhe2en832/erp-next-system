/**
 * Property-Based Tests for Transaction Restrictions
 * Feature: accounting-period-closing
 * 
 * Property 17: Transaction Restriction in Closed Periods
 * Property 18: Administrator Override with Logging
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import { 
  validateTransactionAgainstClosedPeriod,
  logAdministratorOverride,
  type TransactionValidationParams 
} from '../lib/accounting-period-restrictions';
import { erpnextClient } from '../lib/erpnext';
import type { AccountingPeriod } from '../types/accounting-period';

// Test configuration
const TEST_COMPANY = 'Batasku';
const NUM_RUNS = 100;

// Helper to generate random string
function randomString(length: number): string {
  return Math.random().toString(36).substring(2, length + 2);
}

// Helper to generate random date within range
function randomDateInRange(start: Date, end: Date): string {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime).toISOString().split('T')[0];
}

// Helper to pick random element from array
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Test runner
async function runTests() {
  console.log('Starting Property-Based Tests for Transaction Restrictions...\n');

  await testProperty17_TransactionRestrictionInClosedPeriods();
  await testProperty18_AdministratorOverrideWithLogging();

  console.log('\n✅ All property-based tests completed successfully!');
}

/**
 * Property 17: Transaction Restriction in Closed Periods
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
async function testProperty17_TransactionRestrictionInClosedPeriods() {
  console.log('Testing Property 17: Transaction Restriction in Closed Periods');
  console.log('Running', NUM_RUNS, 'iterations...\n');

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < NUM_RUNS; i++) {
    try {
      // Generate random test data
      const periodName = `TEST-RESTRICT-${randomString(10)}`;
      const doctype = randomElement(['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry']);
      const user = `user${randomString(8)}@example.com`;
      
      // Create a closed period
      const period = await erpnextClient.insert('Accounting Period', {
        period_name: periodName,
        company: TEST_COMPANY,
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        period_type: 'Monthly',
        status: 'Closed',
        closed_by: 'Administrator',
        closed_on: new Date().toISOString(),
      });

      // Generate random posting date within the closed period
      const posting_date = randomDateInRange(new Date('2024-06-01'), new Date('2024-06-30'));

      // Test with regular user (should be rejected)
      const validationParams: TransactionValidationParams = {
        company: TEST_COMPANY,
        posting_date,
        doctype,
        docname: `TEST-DOC-${Date.now()}`,
        user,
        userRoles: ['Accounts User'],
      };

      const result = await validateTransactionAgainstClosedPeriod(validationParams);

      // Verify property: Regular users should be rejected
      if (!result.allowed && 
          result.period && 
          result.period.status === 'Closed' && 
          result.reason && 
          result.reason.includes('closed') &&
          !result.requiresLogging) {
        passedTests++;
      } else {
        console.error(`❌ Test ${i + 1} failed: Regular user was not properly rejected`);
        failedTests++;
      }

      // Cleanup
      await erpnextClient.delete('Accounting Period', period.name);

    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        // Skip duplicate entries
        continue;
      }
      console.error(`❌ Test ${i + 1} error:`, error.message);
      failedTests++;
    }
  }

  console.log(`Property 17 Results: ${passedTests}/${NUM_RUNS} passed, ${failedTests} failed\n`);
  
  if (failedTests > 0) {
    throw new Error(`Property 17 failed ${failedTests} tests`);
  }
}

/**
 * Property 18: Administrator Override with Logging
 * **Validates: Requirements 5.4, 5.5**
 */
async function testProperty18_AdministratorOverrideWithLogging() {
  console.log('Testing Property 18: Administrator Override with Logging');
  console.log('Running', NUM_RUNS, 'iterations...\n');

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < NUM_RUNS; i++) {
    try {
      // Generate random test data
      const periodName = `TEST-ADMIN-${randomString(10)}`;
      const doctype = randomElement(['Journal Entry', 'Sales Invoice', 'Purchase Invoice']);
      const adminRole = randomElement(['System Manager', 'Accounts Manager']);
      const action = randomElement(['create', 'update', 'delete']);
      
      // Create a closed period
      const period = await erpnextClient.insert('Accounting Period', {
        period_name: periodName,
        company: TEST_COMPANY,
        start_date: '2024-04-01',
        end_date: '2024-04-30',
        period_type: 'Monthly',
        status: 'Closed',
        closed_by: 'Administrator',
        closed_on: new Date().toISOString(),
      });

      // Generate random posting date within the closed period
      const posting_date = randomDateInRange(new Date('2024-04-01'), new Date('2024-04-30'));

      // Test with admin user (should be allowed with logging)
      const validationParams: TransactionValidationParams = {
        company: TEST_COMPANY,
        posting_date,
        doctype,
        docname: `TEST-ADMIN-DOC-${Date.now()}`,
        user: 'Administrator',
        userRoles: [adminRole],
      };

      const result = await validateTransactionAgainstClosedPeriod(validationParams);

      // Verify property: Admin users should be allowed with logging required
      if (result.allowed && 
          result.period && 
          result.period.status === 'Closed' && 
          result.requiresLogging) {
        
        // Test logging functionality
        const logEntry = await logAdministratorOverride({
          period: result.period,
          doctype,
          docname: validationParams.docname!,
          user: validationParams.user,
          action: action as 'create' | 'update' | 'delete',
          reason: `Test ${action} operation`,
        });

        // Verify log entry was created with all required fields
        const retrievedLog = await erpnextClient.getDoc('Period Closing Log', logEntry.name);
        
        if (retrievedLog.accounting_period === result.period.name &&
            retrievedLog.action_type === 'Transaction Modified' &&
            retrievedLog.action_by === validationParams.user &&
            retrievedLog.affected_transaction === validationParams.docname &&
            retrievedLog.transaction_doctype === doctype &&
            retrievedLog.reason) {
          passedTests++;
        } else {
          console.error(`❌ Test ${i + 1} failed: Log entry missing required fields`);
          failedTests++;
        }

        // Cleanup log entry
        await erpnextClient.delete('Period Closing Log', logEntry.name);
      } else {
        console.error(`❌ Test ${i + 1} failed: Admin user was not properly allowed or logging not required`);
        failedTests++;
      }

      // Cleanup period
      await erpnextClient.delete('Accounting Period', period.name);

    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        continue;
      }
      console.error(`❌ Test ${i + 1} error:`, error.message);
      failedTests++;
    }
  }

  console.log(`Property 18 Results: ${passedTests}/${NUM_RUNS} passed, ${failedTests} failed\n`);
  
  if (failedTests > 0) {
    throw new Error(`Property 18 failed ${failedTests} tests`);
  }
}

// Additional property tests

/**
 * Test: Permanently Closed Periods Reject All Users
 */
async function testPermanentlyClosedPeriodsRejectAll() {
  console.log('Testing: Permanently Closed Periods Reject All Users');
  console.log('Running', NUM_RUNS, 'iterations...\n');

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < NUM_RUNS; i++) {
    try {
      const periodName = `TEST-PERM-${randomString(10)}`;
      const doctype = randomElement(['Journal Entry', 'Sales Invoice']);
      const userRole = randomElement(['System Manager', 'Accounts Manager', 'Accounts User']);
      
      // Create a permanently closed period
      const period = await erpnextClient.insert('Accounting Period', {
        period_name: periodName,
        company: TEST_COMPANY,
        start_date: '2024-05-01',
        end_date: '2024-05-31',
        period_type: 'Monthly',
        status: 'Permanently Closed',
        closed_by: 'Administrator',
        closed_on: new Date().toISOString(),
        permanently_closed_by: 'Administrator',
        permanently_closed_on: new Date().toISOString(),
      });

      const posting_date = randomDateInRange(new Date('2024-05-01'), new Date('2024-05-31'));

      const validationParams: TransactionValidationParams = {
        company: TEST_COMPANY,
        posting_date,
        doctype,
        docname: `TEST-DOC-${Date.now()}`,
        user: 'Administrator',
        userRoles: [userRole],
      };

      const result = await validateTransactionAgainstClosedPeriod(validationParams);

      // Verify: ALL users should be rejected for permanently closed periods
      if (!result.allowed && 
          result.period && 
          result.period.status === 'Permanently Closed' && 
          result.reason && 
          result.reason.includes('permanently closed') &&
          !result.requiresLogging) {
        passedTests++;
      } else {
        console.error(`❌ Test ${i + 1} failed: Permanently closed period allowed transaction`);
        failedTests++;
      }

      await erpnextClient.delete('Accounting Period', period.name);

    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        continue;
      }
      console.error(`❌ Test ${i + 1} error:`, error.message);
      failedTests++;
    }
  }

  console.log(`Permanently Closed Test Results: ${passedTests}/${NUM_RUNS} passed, ${failedTests} failed\n`);
  
  if (failedTests > 0) {
    throw new Error(`Permanently closed test failed ${failedTests} tests`);
  }
}

/**
 * Test: Open Periods Allow All Users
 */
async function testOpenPeriodsAllowAll() {
  console.log('Testing: Open Periods Allow All Users');
  console.log('Running', NUM_RUNS, 'iterations...\n');

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < NUM_RUNS; i++) {
    try {
      const periodName = `TEST-OPEN-${randomString(10)}`;
      const doctype = randomElement(['Journal Entry', 'Sales Invoice']);
      const userRole = randomElement(['Accounts User', 'Sales User']);
      
      // Create an open period
      const period = await erpnextClient.insert('Accounting Period', {
        period_name: periodName,
        company: TEST_COMPANY,
        start_date: '2024-07-01',
        end_date: '2024-07-31',
        period_type: 'Monthly',
        status: 'Open',
      });

      const posting_date = randomDateInRange(new Date('2024-07-01'), new Date('2024-07-31'));

      const validationParams: TransactionValidationParams = {
        company: TEST_COMPANY,
        posting_date,
        doctype,
        docname: `TEST-DOC-${Date.now()}`,
        user: `user${randomString(8)}@example.com`,
        userRoles: [userRole],
      };

      const result = await validateTransactionAgainstClosedPeriod(validationParams);

      // Verify: Transactions in open periods should be allowed
      if (result.allowed && !result.requiresLogging) {
        passedTests++;
      } else {
        console.error(`❌ Test ${i + 1} failed: Open period rejected transaction`);
        failedTests++;
      }

      await erpnextClient.delete('Accounting Period', period.name);

    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        continue;
      }
      console.error(`❌ Test ${i + 1} error:`, error.message);
      failedTests++;
    }
  }

  console.log(`Open Period Test Results: ${passedTests}/${NUM_RUNS} passed, ${failedTests} failed\n`);
  
  if (failedTests > 0) {
    throw new Error(`Open period test failed ${failedTests} tests`);
  }
}

// Run all tests
runTests()
  .then(() => {
    console.log('✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tests failed:', error.message);
    process.exit(1);
  });
