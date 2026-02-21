/**
 * Unit Tests for Accounting Period Notifications
 * 
 * This file contains unit tests for specific notification scenarios:
 * - Reminder notification before end date
 * - Overdue notification after end date
 * - Escalation notification M days after end
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  calculateDaysFromEndDate,
  shouldSendNotification,
  getUsersWithRole
} from '../lib/accounting-period-notifications';
import { AccountingPeriod, PeriodClosingConfig } from '../types/accounting-period';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Helper to create a test period with specific end date offset
 */
function createTestPeriod(daysFromToday: number, status: 'Open' | 'Closed' | 'Permanently Closed' = 'Open'): AccountingPeriod {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysFromToday);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  return {
    name: `TEST-PERIOD-${Date.now()}`,
    period_name: `Test Period ${Date.now()}`,
    company: 'Test Company',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    period_type: 'Monthly',
    status,
    fiscal_year: '2024',
    creation: new Date().toISOString(),
    modified: new Date().toISOString(),
    modified_by: 'Administrator',
    owner: 'Administrator'
  };
}

/**
 * Helper to create test config
 */
function createTestConfig(
  reminderDays: number = 3,
  escalationDays: number = 7,
  emailEnabled: boolean = true
): PeriodClosingConfig {
  return {
    name: 'Period Closing Config',
    retained_earnings_account: 'Retained Earnings - TC',
    enable_bank_reconciliation_check: true,
    enable_draft_transaction_check: true,
    enable_unposted_transaction_check: true,
    enable_sales_invoice_check: true,
    enable_purchase_invoice_check: true,
    enable_inventory_check: true,
    enable_payroll_check: true,
    closing_role: 'Accounts Manager',
    reopen_role: 'Accounts Manager',
    reminder_days_before_end: reminderDays,
    escalation_days_after_end: escalationDays,
    enable_email_notifications: emailEnabled
  };
}

/**
 * Test: Reminder notification 3 days before end date
 * **Validates: Requirements 9.1, 9.2**
 */
async function testReminderNotificationBeforeEndDate(): Promise<void> {
  console.log('\n=== Test: Reminder Notification Before End Date ===');

  const config = createTestConfig(3, 7, true);
  const period = createTestPeriod(3); // 3 days from today

  const checks = shouldSendNotification(period, config);

  if (!checks.sendReminder) {
    throw new Error('Expected sendReminder to be true for period 3 days before end');
  }

  if (checks.sendOverdue) {
    throw new Error('Expected sendOverdue to be false for period before end date');
  }

  if (checks.sendEscalation) {
    throw new Error('Expected sendEscalation to be false for period before end date');
  }

  if (checks.daysFromEnd !== 3) {
    throw new Error(`Expected daysFromEnd to be 3, got ${checks.daysFromEnd}`);
  }

  console.log('✓ Reminder notification correctly triggered 3 days before end date');
  console.log(`  Days from end: ${checks.daysFromEnd}`);
  console.log(`  Send reminder: ${checks.sendReminder}`);
}

/**
 * Test: No reminder notification 2 days before end date
 * **Validates: Requirements 9.1, 9.2**
 */
async function testNoReminderNotification2DaysBeforeEnd(): Promise<void> {
  console.log('\n=== Test: No Reminder Notification 2 Days Before End ===');

  const config = createTestConfig(3, 7, true);
  const period = createTestPeriod(2); // 2 days from today

  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder) {
    throw new Error('Expected sendReminder to be false for period 2 days before end (config is 3 days)');
  }

  if (checks.sendOverdue) {
    throw new Error('Expected sendOverdue to be false for period before end date');
  }

  if (checks.sendEscalation) {
    throw new Error('Expected sendEscalation to be false for period before end date');
  }

  console.log('✓ No reminder notification 2 days before end (correctly skipped)');
  console.log(`  Days from end: ${checks.daysFromEnd}`);
}

/**
 * Test: Overdue notification 1 day after end date
 * **Validates: Requirements 9.1**
 */
async function testOverdueNotificationAfterEndDate(): Promise<void> {
  console.log('\n=== Test: Overdue Notification After End Date ===');

  const config = createTestConfig(3, 7, true);
  const period = createTestPeriod(-1); // 1 day past end date

  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder) {
    throw new Error('Expected sendReminder to be false for period after end date');
  }

  if (!checks.sendOverdue) {
    throw new Error('Expected sendOverdue to be true for period 1 day after end');
  }

  if (checks.sendEscalation) {
    throw new Error('Expected sendEscalation to be false for period only 1 day after end (escalation is 7 days)');
  }

  if (checks.daysFromEnd !== -1) {
    throw new Error(`Expected daysFromEnd to be -1, got ${checks.daysFromEnd}`);
  }

  console.log('✓ Overdue notification correctly triggered 1 day after end date');
  console.log(`  Days from end: ${checks.daysFromEnd}`);
  console.log(`  Send overdue: ${checks.sendOverdue}`);
}

/**
 * Test: Overdue notification 5 days after end date
 * **Validates: Requirements 9.1**
 */
async function testOverdueNotification5DaysAfterEnd(): Promise<void> {
  console.log('\n=== Test: Overdue Notification 5 Days After End ===');

  const config = createTestConfig(3, 7, true);
  const period = createTestPeriod(-5); // 5 days past end date

  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder) {
    throw new Error('Expected sendReminder to be false for period after end date');
  }

  if (!checks.sendOverdue) {
    throw new Error('Expected sendOverdue to be true for period 5 days after end');
  }

  if (checks.sendEscalation) {
    throw new Error('Expected sendEscalation to be false for period only 5 days after end (escalation is 7 days)');
  }

  console.log('✓ Overdue notification correctly triggered 5 days after end date');
  console.log(`  Days from end: ${checks.daysFromEnd}`);
}

/**
 * Test: Escalation notification 7 days after end date
 * **Validates: Requirements 9.3**
 */
async function testEscalationNotification7DaysAfterEnd(): Promise<void> {
  console.log('\n=== Test: Escalation Notification 7 Days After End ===');

  const config = createTestConfig(3, 7, true);
  const period = createTestPeriod(-7); // 7 days past end date

  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder) {
    throw new Error('Expected sendReminder to be false for period after end date');
  }

  if (checks.sendOverdue) {
    throw new Error('Expected sendOverdue to be false at escalation threshold');
  }

  if (!checks.sendEscalation) {
    throw new Error('Expected sendEscalation to be true for period 7 days after end');
  }

  if (checks.daysFromEnd !== -7) {
    throw new Error(`Expected daysFromEnd to be -7, got ${checks.daysFromEnd}`);
  }

  console.log('✓ Escalation notification correctly triggered 7 days after end date');
  console.log(`  Days from end: ${checks.daysFromEnd}`);
  console.log(`  Send escalation: ${checks.sendEscalation}`);
}

/**
 * Test: No notification for closed period
 * **Validates: Requirements 9.1**
 */
async function testNoNotificationForClosedPeriod(): Promise<void> {
  console.log('\n=== Test: No Notification for Closed Period ===');

  const config = createTestConfig(3, 7, true);
  const period = createTestPeriod(3, 'Closed'); // 3 days before end, but closed

  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder || checks.sendOverdue || checks.sendEscalation) {
    throw new Error(
      `Expected no notifications for closed period, but got: ` +
      `reminder=${checks.sendReminder}, overdue=${checks.sendOverdue}, escalation=${checks.sendEscalation}`
    );
  }

  console.log('✓ No notifications sent for closed period');
}

/**
 * Test: No notification when email is disabled
 * **Validates: Requirements 9.1**
 */
async function testNoNotificationWhenEmailDisabled(): Promise<void> {
  console.log('\n=== Test: No Notification When Email Disabled ===');

  const config = createTestConfig(3, 7, false); // Email disabled
  const period = createTestPeriod(3); // 3 days before end

  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder || checks.sendOverdue || checks.sendEscalation) {
    throw new Error(
      `Expected no notifications when email is disabled, but got: ` +
      `reminder=${checks.sendReminder}, overdue=${checks.sendOverdue}, escalation=${checks.sendEscalation}`
    );
  }

  console.log('✓ No notifications sent when email is disabled');
}

/**
 * Test: Days calculation for various dates
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */
async function testDaysCalculationForVariousDates(): Promise<void> {
  console.log('\n=== Test: Days Calculation for Various Dates ===');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Test today - allow for timezone differences (0 or -1 is acceptable)
  const todayStr = today.toISOString().split('T')[0];
  const daysToday = calculateDaysFromEndDate(todayStr);
  if (daysToday !== 0 && daysToday !== -1) {
    throw new Error(`Expected 0 or -1 days for today (timezone), got ${daysToday}`);
  }

  // Test 3 days in future
  const future3 = new Date(today);
  future3.setDate(future3.getDate() + 3);
  const future3Str = future3.toISOString().split('T')[0];
  const daysFuture3 = calculateDaysFromEndDate(future3Str);
  if (daysFuture3 < 2 || daysFuture3 > 3) {
    throw new Error(`Expected 2-3 days for future date (timezone), got ${daysFuture3}`);
  }

  // Test 7 days in past
  const past7 = new Date(today);
  past7.setDate(past7.getDate() - 7);
  const past7Str = past7.toISOString().split('T')[0];
  const daysPast7 = calculateDaysFromEndDate(past7Str);
  if (daysPast7 < -8 || daysPast7 > -7) {
    throw new Error(`Expected -7 to -8 days for past date (timezone), got ${daysPast7}`);
  }

  console.log('✓ Days calculation accurate for today, future, and past dates');
  console.log(`  Today: ${daysToday} days`);
  console.log(`  3 days future: ${daysFuture3} days`);
  console.log(`  7 days past: ${daysPast7} days`);
}

/**
 * Test: Multiple notification scenarios in sequence
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */
async function testMultipleNotificationScenariosInSequence(): Promise<void> {
  console.log('\n=== Test: Multiple Notification Scenarios in Sequence ===');

  const config = createTestConfig(3, 7, true);

  // Scenario 1: 5 days before end - no notification
  const period5Before = createTestPeriod(5);
  const checks5Before = shouldSendNotification(period5Before, config);
  if (checks5Before.sendReminder || checks5Before.sendOverdue || checks5Before.sendEscalation) {
    throw new Error('Expected no notification 5 days before end');
  }

  // Scenario 2: 3 days before end - reminder
  const period3Before = createTestPeriod(3);
  const checks3Before = shouldSendNotification(period3Before, config);
  if (!checks3Before.sendReminder) {
    throw new Error('Expected reminder 3 days before end');
  }

  // Scenario 3: 1 day before end - no notification
  const period1Before = createTestPeriod(1);
  const checks1Before = shouldSendNotification(period1Before, config);
  if (checks1Before.sendReminder || checks1Before.sendOverdue || checks1Before.sendEscalation) {
    throw new Error('Expected no notification 1 day before end');
  }

  // Scenario 4: On end date - no notification
  const periodOnEnd = createTestPeriod(0);
  const checksOnEnd = shouldSendNotification(periodOnEnd, config);
  if (checksOnEnd.sendReminder || checksOnEnd.sendEscalation) {
    throw new Error('Expected no reminder or escalation on end date');
  }

  // Scenario 5: 3 days after end - overdue
  const period3After = createTestPeriod(-3);
  const checks3After = shouldSendNotification(period3After, config);
  if (!checks3After.sendOverdue) {
    throw new Error('Expected overdue 3 days after end');
  }

  // Scenario 6: 7 days after end - escalation
  const period7After = createTestPeriod(-7);
  const checks7After = shouldSendNotification(period7After, config);
  if (!checks7After.sendEscalation) {
    throw new Error('Expected escalation 7 days after end');
  }

  // Scenario 7: 10 days after end - no notification
  const period10After = createTestPeriod(-10);
  const checks10After = shouldSendNotification(period10After, config);
  if (checks10After.sendReminder || checks10After.sendOverdue || checks10After.sendEscalation) {
    throw new Error('Expected no notification 10 days after end');
  }

  console.log('✓ All notification scenarios in sequence work correctly');
  console.log('  5 days before: no notification');
  console.log('  3 days before: reminder');
  console.log('  1 day before: no notification');
  console.log('  On end date: no notification');
  console.log('  3 days after: overdue');
  console.log('  7 days after: escalation');
  console.log('  10 days after: no notification');
}

/**
 * Test: Get users with role (integration test)
 * **Validates: Requirements 9.1, 9.3**
 */
async function testGetUsersWithRole(): Promise<void> {
  console.log('\n=== Test: Get Users with Role ===');

  try {
    // Test getting Accounts Manager users
    const accountsManagers = await getUsersWithRole('Accounts Manager');
    
    if (!Array.isArray(accountsManagers)) {
      throw new Error('Expected getUsersWithRole to return an array');
    }

    console.log(`✓ Found ${accountsManagers.length} user(s) with Accounts Manager role`);
    
    if (accountsManagers.length > 0) {
      const firstUser = accountsManagers[0];
      if (!firstUser.email || !firstUser.full_name) {
        throw new Error('User object should have email and full_name properties');
      }
      console.log(`  Example user: ${firstUser.full_name} (${firstUser.email})`);
    }

    // Test getting System Manager users
    const systemManagers = await getUsersWithRole('System Manager');
    
    if (!Array.isArray(systemManagers)) {
      throw new Error('Expected getUsersWithRole to return an array');
    }

    console.log(`✓ Found ${systemManagers.length} user(s) with System Manager role`);

  } catch (error: any) {
    if (error.message.includes('ERPNext API credentials not configured')) {
      console.log('⚠ Skipping test: ERPNext API credentials not configured');
      return;
    }
    throw error;
  }
}

/**
 * Test: Custom reminder and escalation days
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */
async function testCustomReminderAndEscalationDays(): Promise<void> {
  console.log('\n=== Test: Custom Reminder and Escalation Days ===');

  // Test with 5 days reminder and 10 days escalation
  const customConfig = createTestConfig(5, 10, true);

  // Test reminder at 5 days
  const period5Before = createTestPeriod(5);
  const checks5Before = shouldSendNotification(period5Before, customConfig);
  if (!checks5Before.sendReminder) {
    throw new Error('Expected reminder 5 days before end with custom config');
  }

  // Test no reminder at 3 days
  const period3Before = createTestPeriod(3);
  const checks3Before = shouldSendNotification(period3Before, customConfig);
  if (checks3Before.sendReminder) {
    throw new Error('Expected no reminder 3 days before end with custom config (reminder is 5 days)');
  }

  // Test escalation at 10 days
  const period10After = createTestPeriod(-10);
  const checks10After = shouldSendNotification(period10After, customConfig);
  if (!checks10After.sendEscalation) {
    throw new Error('Expected escalation 10 days after end with custom config');
  }

  // Test no escalation at 7 days
  const period7After = createTestPeriod(-7);
  const checks7After = shouldSendNotification(period7After, customConfig);
  if (checks7After.sendEscalation) {
    throw new Error('Expected no escalation 7 days after end with custom config (escalation is 10 days)');
  }

  console.log('✓ Custom reminder and escalation days work correctly');
  console.log(`  Reminder at ${customConfig.reminder_days_before_end} days before end`);
  console.log(`  Escalation at ${customConfig.escalation_days_after_end} days after end`);
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Unit Tests for Notification Scenarios');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Reminder Notification Before End Date', fn: testReminderNotificationBeforeEndDate },
    { name: 'No Reminder Notification 2 Days Before End', fn: testNoReminderNotification2DaysBeforeEnd },
    { name: 'Overdue Notification After End Date', fn: testOverdueNotificationAfterEndDate },
    { name: 'Overdue Notification 5 Days After End', fn: testOverdueNotification5DaysAfterEnd },
    { name: 'Escalation Notification 7 Days After End', fn: testEscalationNotification7DaysAfterEnd },
    { name: 'No Notification for Closed Period', fn: testNoNotificationForClosedPeriod },
    { name: 'No Notification When Email Disabled', fn: testNoNotificationWhenEmailDisabled },
    { name: 'Days Calculation for Various Dates', fn: testDaysCalculationForVariousDates },
    { name: 'Multiple Notification Scenarios in Sequence', fn: testMultipleNotificationScenariosInSequence },
    { name: 'Get Users with Role', fn: testGetUsersWithRole },
    { name: 'Custom Reminder and Escalation Days', fn: testCustomReminderAndEscalationDays },
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
