/**
 * Property-Based Tests for Accounting Period Notifications
 * 
 * This file contains property-based tests for notification timing and behavior.
 * 
 * **Property 28: Notification Timing**
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  calculateDaysFromEndDate,
  shouldSendNotification
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
 * Generate a random date offset from today
 */
function generateRandomDateOffset(minDays: number, maxDays: number): string {
  const today = new Date();
  const offsetDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + offsetDays);
  return targetDate.toISOString().split('T')[0];
}

/**
 * Generate a random accounting period
 */
function generateRandomPeriod(endDateOffset: number): AccountingPeriod {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + endDateOffset);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  return {
    name: `TEST-PERIOD-${Date.now()}-${Math.random()}`,
    period_name: `Test Period ${Date.now()}`,
    company: 'Test Company',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    period_type: 'Monthly',
    status: 'Open',
    fiscal_year: '2024',
    creation: new Date().toISOString(),
    modified: new Date().toISOString(),
    modified_by: 'Administrator',
    owner: 'Administrator'
  };
}

/**
 * Generate a random config
 */
function generateRandomConfig(): PeriodClosingConfig {
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
    reminder_days_before_end: Math.floor(Math.random() * 7) + 1, // 1-7 days
    escalation_days_after_end: Math.floor(Math.random() * 14) + 1, // 1-14 days
    enable_email_notifications: true
  };
}

/**
 * Property 28: Notification Timing
 * 
 * For any open accounting period with email notifications enabled:
 * - A reminder should be sent exactly N days before the end date (where N = reminder_days_before_end)
 * - An escalation should be sent exactly M days after the end date (where M = escalation_days_after_end)
 * - No notifications should be sent for closed or permanently closed periods
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
 */
async function testProperty28_NotificationTiming(): Promise<void> {
  console.log('\n=== Property 28: Notification Timing ===');

  const numTests = 100;
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < numTests; i++) {
    try {
      const config = generateRandomConfig();
      
      // Test Case 1: Reminder should be sent N days before end
      const reminderPeriod = generateRandomPeriod(config.reminder_days_before_end);
      const reminderChecks = shouldSendNotification(reminderPeriod, config);
      
      if (!reminderChecks.sendReminder) {
        throw new Error(
          `Expected reminder to be sent ${config.reminder_days_before_end} days before end, ` +
          `but sendReminder was false. Days from end: ${reminderChecks.daysFromEnd}`
        );
      }
      
      if (reminderChecks.sendOverdue || reminderChecks.sendEscalation) {
        throw new Error(
          `Expected only reminder to be sent, but overdue=${reminderChecks.sendOverdue}, ` +
          `escalation=${reminderChecks.sendEscalation}`
        );
      }

      // Test Case 2: Escalation should be sent M days after end
      const escalationPeriod = generateRandomPeriod(-config.escalation_days_after_end);
      const escalationChecks = shouldSendNotification(escalationPeriod, config);
      
      if (!escalationChecks.sendEscalation) {
        throw new Error(
          `Expected escalation to be sent ${config.escalation_days_after_end} days after end, ` +
          `but sendEscalation was false. Days from end: ${escalationChecks.daysFromEnd}`
        );
      }
      
      if (escalationChecks.sendReminder) {
        throw new Error(
          `Expected only escalation to be sent, but reminder=${escalationChecks.sendReminder}`
        );
      }

      // Test Case 3: No notifications for closed periods
      const closedPeriod = { ...reminderPeriod, status: 'Closed' as const };
      const closedChecks = shouldSendNotification(closedPeriod, config);
      
      if (closedChecks.sendReminder || closedChecks.sendOverdue || closedChecks.sendEscalation) {
        throw new Error(
          `Expected no notifications for closed period, but got: ` +
          `reminder=${closedChecks.sendReminder}, overdue=${closedChecks.sendOverdue}, ` +
          `escalation=${closedChecks.sendEscalation}`
        );
      }

      // Test Case 4: No notifications when email is disabled
      const disabledConfig = { ...config, enable_email_notifications: false };
      const disabledChecks = shouldSendNotification(reminderPeriod, disabledConfig);
      
      if (disabledChecks.sendReminder || disabledChecks.sendOverdue || disabledChecks.sendEscalation) {
        throw new Error(
          `Expected no notifications when email is disabled, but got: ` +
          `reminder=${disabledChecks.sendReminder}, overdue=${disabledChecks.sendOverdue}, ` +
          `escalation=${disabledChecks.sendEscalation}`
        );
      }

      // Test Case 5: Overdue notification for periods between end and escalation
      const overdueOffset = -Math.floor(config.escalation_days_after_end / 2);
      if (overdueOffset < 0 && overdueOffset > -config.escalation_days_after_end) {
        const overduePeriod = generateRandomPeriod(overdueOffset);
        const overdueChecks = shouldSendNotification(overduePeriod, config);
        
        if (!overdueChecks.sendOverdue) {
          throw new Error(
            `Expected overdue notification ${Math.abs(overdueOffset)} days after end, ` +
            `but sendOverdue was false. Days from end: ${overdueChecks.daysFromEnd}`
          );
        }
        
        if (overdueChecks.sendReminder || overdueChecks.sendEscalation) {
          throw new Error(
            `Expected only overdue to be sent, but reminder=${overdueChecks.sendReminder}, ` +
            `escalation=${overdueChecks.sendEscalation}`
          );
        }
      }

      passed++;
    } catch (error: any) {
      failed++;
      failures.push(`Test ${i + 1}: ${error.message}`);
      if (failed <= 5) {
        console.error(`  ✗ Test ${i + 1} failed: ${error.message}`);
      }
    }
  }

  console.log(`\nProperty 28 Results: ${passed}/${numTests} passed`);
  
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed. First 5 failures:`);
    failures.slice(0, 5).forEach(f => console.error(`  - ${f}`));
    throw new Error(`Property 28 failed: ${failed}/${numTests} tests failed`);
  }

  console.log('✓ Property 28: Notification Timing - PASSED');
}

/**
 * Test: Days calculation accuracy
 * 
 * Verify that calculateDaysFromEndDate returns accurate day differences
 */
async function testDaysCalculationAccuracy(): Promise<void> {
  console.log('\n=== Test: Days Calculation Accuracy ===');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Test future dates - allow for timezone differences
  for (let days = 1; days <= 30; days++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    const dateStr = futureDate.toISOString().split('T')[0];
    
    const calculated = calculateDaysFromEndDate(dateStr);
    
    // Allow for timezone differences (±1 day)
    if (Math.abs(calculated - days) > 1) {
      throw new Error(
        `Expected ${days} days for future date ${dateStr}, got ${calculated}`
      );
    }
  }

  // Test past dates - allow for timezone differences
  for (let days = 1; days <= 30; days++) {
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - days);
    const dateStr = pastDate.toISOString().split('T')[0];
    
    const calculated = calculateDaysFromEndDate(dateStr);
    
    // Allow for timezone differences (±1 day)
    if (Math.abs(calculated - (-days)) > 1) {
      throw new Error(
        `Expected ${-days} days for past date ${dateStr}, got ${calculated}`
      );
    }
  }

  // Test today - allow for timezone differences
  const todayStr = today.toISOString().split('T')[0];
  const calculatedToday = calculateDaysFromEndDate(todayStr);
  
  if (Math.abs(calculatedToday) > 1) {
    throw new Error(
      `Expected 0 or ±1 days for today ${todayStr} (timezone), got ${calculatedToday}`
    );
  }

  console.log('✓ Days calculation is accurate for past, present, and future dates (with timezone tolerance)');
}

/**
 * Test: Notification timing edge cases
 * 
 * Test edge cases for notification timing
 */
async function testNotificationTimingEdgeCases(): Promise<void> {
  console.log('\n=== Test: Notification Timing Edge Cases ===');

  const config: PeriodClosingConfig = {
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
    reminder_days_before_end: 3,
    escalation_days_after_end: 7,
    enable_email_notifications: true
  };

  // Edge Case 1: Period ending today
  const todayPeriod = generateRandomPeriod(0);
  const todayChecks = shouldSendNotification(todayPeriod, config);
  
  if (todayChecks.sendReminder || todayChecks.sendEscalation) {
    throw new Error(
      `Expected no reminder or escalation for period ending today, but got: ` +
      `reminder=${todayChecks.sendReminder}, escalation=${todayChecks.sendEscalation}`
    );
  }

  // Edge Case 2: Period 1 day after end (should send overdue)
  const oneDayAfterPeriod = generateRandomPeriod(-1);
  const oneDayAfterChecks = shouldSendNotification(oneDayAfterPeriod, config);
  
  if (!oneDayAfterChecks.sendOverdue) {
    throw new Error('Expected overdue notification 1 day after end');
  }

  // Edge Case 3: Period exactly at escalation threshold
  const escalationPeriod = generateRandomPeriod(-config.escalation_days_after_end);
  const escalationChecks = shouldSendNotification(escalationPeriod, config);
  
  if (!escalationChecks.sendEscalation) {
    throw new Error(
      `Expected escalation at ${config.escalation_days_after_end} days after end`
    );
  }

  // Edge Case 4: Period way past escalation (should not send any notification)
  const wayPastPeriod = generateRandomPeriod(-config.escalation_days_after_end - 10);
  const wayPastChecks = shouldSendNotification(wayPastPeriod, config);
  
  if (wayPastChecks.sendReminder || wayPastChecks.sendOverdue || wayPastChecks.sendEscalation) {
    throw new Error(
      `Expected no notifications for period way past escalation, but got: ` +
      `reminder=${wayPastChecks.sendReminder}, overdue=${wayPastChecks.sendOverdue}, ` +
      `escalation=${wayPastChecks.sendEscalation}`
    );
  }

  // Edge Case 5: Permanently closed period
  const permanentlyClosedPeriod = { ...todayPeriod, status: 'Permanently Closed' as const };
  const permanentlyClosedChecks = shouldSendNotification(permanentlyClosedPeriod, config);
  
  if (permanentlyClosedChecks.sendReminder || permanentlyClosedChecks.sendOverdue || permanentlyClosedChecks.sendEscalation) {
    throw new Error('Expected no notifications for permanently closed period');
  }

  console.log('✓ All edge cases handled correctly');
}

/**
 * Test: Configuration boundary values
 * 
 * Test notification behavior with extreme configuration values
 */
async function testConfigurationBoundaryValues(): Promise<void> {
  console.log('\n=== Test: Configuration Boundary Values ===');

  // Test with minimum values (1 day)
  const minConfig: PeriodClosingConfig = {
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
    reminder_days_before_end: 1,
    escalation_days_after_end: 1,
    enable_email_notifications: true
  };

  const reminderPeriod1 = generateRandomPeriod(1);
  const reminderChecks1 = shouldSendNotification(reminderPeriod1, minConfig);
  
  if (!reminderChecks1.sendReminder) {
    throw new Error('Expected reminder 1 day before end with min config');
  }

  const escalationPeriod1 = generateRandomPeriod(-1);
  const escalationChecks1 = shouldSendNotification(escalationPeriod1, minConfig);
  
  if (!escalationChecks1.sendEscalation) {
    throw new Error('Expected escalation 1 day after end with min config');
  }

  // Test with maximum values (30 days)
  const maxConfig: PeriodClosingConfig = {
    ...minConfig,
    reminder_days_before_end: 30,
    escalation_days_after_end: 30
  };

  const reminderPeriod30 = generateRandomPeriod(30);
  const reminderChecks30 = shouldSendNotification(reminderPeriod30, maxConfig);
  
  if (!reminderChecks30.sendReminder) {
    throw new Error('Expected reminder 30 days before end with max config');
  }

  const escalationPeriod30 = generateRandomPeriod(-30);
  const escalationChecks30 = shouldSendNotification(escalationPeriod30, maxConfig);
  
  if (!escalationChecks30.sendEscalation) {
    throw new Error('Expected escalation 30 days after end with max config');
  }

  console.log('✓ Configuration boundary values handled correctly');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Property-Based Tests for Notifications');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Days Calculation Accuracy', fn: testDaysCalculationAccuracy },
    { name: 'Notification Timing Edge Cases', fn: testNotificationTimingEdgeCases },
    { name: 'Configuration Boundary Values', fn: testConfigurationBoundaryValues },
    { name: 'Property 28: Notification Timing', fn: testProperty28_NotificationTiming },
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
