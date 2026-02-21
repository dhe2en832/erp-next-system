/**
 * Scheduled Job: Check Accounting Period Notifications
 * 
 * This script checks all open accounting periods and sends notifications
 * based on the configuration:
 * - Reminder notifications N days before end date
 * - Overdue notifications for periods past end date
 * - Escalation notifications M days after end date
 * 
 * This should be run as a cron job (e.g., daily at 9 AM)
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  processNotificationsForPeriod,
  calculateDaysFromEndDate
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

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

/**
 * Fetch all open accounting periods
 */
async function fetchOpenPeriods(): Promise<AccountingPeriod[]> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('ERPNext API credentials not configured');
  }

  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Accounting Period?fields=["*"]&filters=[["status","=","Open"]]&limit_page_length=999`,
    {
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch open periods: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch period closing configuration
 */
async function fetchPeriodClosingConfig(): Promise<PeriodClosingConfig> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('ERPNext API credentials not configured');
  }

  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Period Closing Config/Period Closing Config`,
    {
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch period closing config: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Main function to check periods and send notifications
 */
async function checkPeriodsAndSendNotifications(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Checking Accounting Periods for Notifications');
  console.log(`Run Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Fetch configuration
    const config = await fetchPeriodClosingConfig();
    console.log(`\nConfiguration loaded:`);
    console.log(`  Email notifications enabled: ${config.enable_email_notifications}`);
    console.log(`  Reminder days before end: ${config.reminder_days_before_end}`);
    console.log(`  Escalation days after end: ${config.escalation_days_after_end}`);

    if (!config.enable_email_notifications) {
      console.log('\nEmail notifications are disabled. Exiting.');
      return;
    }

    // Fetch open periods
    const openPeriods = await fetchOpenPeriods();
    console.log(`\nFound ${openPeriods.length} open period(s)`);

    if (openPeriods.length === 0) {
      console.log('No open periods to check. Exiting.');
      return;
    }

    // Process each period
    let remindersSent = 0;
    let overduesSent = 0;
    let escalationsSent = 0;

    for (const period of openPeriods) {
      const daysFromEnd = calculateDaysFromEndDate(period.end_date);
      
      console.log(`\nChecking period: ${period.period_name}`);
      console.log(`  Company: ${period.company}`);
      console.log(`  End Date: ${period.end_date}`);
      console.log(`  Days from end: ${daysFromEnd}`);

      try {
        // Check if reminder should be sent
        if (daysFromEnd === config.reminder_days_before_end) {
          console.log(`  → Sending reminder notification (${daysFromEnd} days before end)`);
          await processNotificationsForPeriod(period, config);
          remindersSent++;
        }
        // Check if overdue notification should be sent
        else if (daysFromEnd < 0 && daysFromEnd > -config.escalation_days_after_end) {
          console.log(`  → Sending overdue notification (${Math.abs(daysFromEnd)} days after end)`);
          await processNotificationsForPeriod(period, config);
          overduesSent++;
        }
        // Check if escalation should be sent
        else if (daysFromEnd === -config.escalation_days_after_end) {
          console.log(`  → Sending escalation notification (${Math.abs(daysFromEnd)} days after end)`);
          await processNotificationsForPeriod(period, config);
          escalationsSent++;
        }
        else {
          console.log(`  → No notification needed at this time`);
        }
      } catch (error: any) {
        console.error(`  ✗ Error processing period ${period.period_name}:`, error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Notification Summary:');
    console.log(`  Reminders sent: ${remindersSent}`);
    console.log(`  Overdue notifications sent: ${overduesSent}`);
    console.log(`  Escalations sent: ${escalationsSent}`);
    console.log(`  Total notifications: ${remindersSent + overduesSent + escalationsSent}`);
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n✗ Error checking periods:', error.message);
    throw error;
  }
}

// Run the job
checkPeriodsAndSendNotifications()
  .then(() => {
    console.log('\n✓ Job completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Job failed:', error);
    process.exit(1);
  });
