/**
 * Accounting Period Notification Service
 * 
 * This module provides notification functionality for accounting period closing:
 * - Email notifications for reminders, overdue, and escalations
 * - Notification timing based on configuration
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
 */

import { AccountingPeriod, PeriodClosingConfig } from '@/types/accounting-period';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

export interface NotificationRecipient {
  email: string;
  full_name: string;
}

export interface NotificationParams {
  recipients: NotificationRecipient[];
  subject: string;
  message: string;
  reference_doctype?: string;
  reference_name?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface ReminderNotificationParams {
  period: AccountingPeriod;
  daysUntilEnd: number;
}

export interface OverdueNotificationParams {
  period: AccountingPeriod;
  daysAfterEnd: number;
}

export interface EscalationNotificationParams {
  period: AccountingPeriod;
  daysAfterEnd: number;
}

/**
 * Send email notification via ERPNext
 */
export async function sendEmailNotification(params: NotificationParams): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('ERPNext API credentials not configured');
  }

  const emailData = {
    recipients: params.recipients.map(r => r.email).join(','),
    subject: params.subject,
    message: params.message,
    reference_doctype: params.reference_doctype,
    reference_name: params.reference_name,
    send_email: 1,
    communication_medium: 'Email',
    sent_or_received: 'Sent',
  };

  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Communication`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email notification: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Get users with a specific role
 */
export async function getUsersWithRole(role: string): Promise<NotificationRecipient[]> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('ERPNext API credentials not configured');
  }

  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/User?fields=["name","email","full_name"]&filters=[["Has Role","role","=","${role}"]]&limit_page_length=999`,
    {
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch users with role ${role}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.map((user: any) => ({
    email: user.email,
    full_name: user.full_name || user.name
  }));
}

/**
 * Send reminder notification (N days before end date)
 * **Validates: Requirements 9.1, 9.2, 9.5**
 */
export async function sendReminderNotification(params: ReminderNotificationParams): Promise<void> {
  const recipients = await getUsersWithRole('Accounts Manager');

  if (recipients.length === 0) {
    console.warn('No users with Accounts Manager role found for reminder notification');
    return;
  }

  const subject = `[REMINDER] Accounting Period Closing: ${params.period.period_name}`;
  const message = `
    <h3>Accounting Period Closing Reminder</h3>
    <p>This is a reminder that the accounting period <strong>${params.period.period_name}</strong> will end in <strong>${params.daysUntilEnd} day(s)</strong>.</p>
    
    <p><strong>Period Details:</strong></p>
    <ul>
      <li>Period Name: ${params.period.period_name}</li>
      <li>Company: ${params.period.company}</li>
      <li>Start Date: ${params.period.start_date}</li>
      <li>End Date: ${params.period.end_date}</li>
      <li>Status: ${params.period.status}</li>
    </ul>
    
    <p>Please ensure all transactions are completed and prepare for the period closing process.</p>
    
    <p><em>This is an automated notification from the Accounting Period Closing system.</em></p>
  `;

  await sendEmailNotification({
    recipients,
    subject,
    message,
    reference_doctype: 'Accounting Period',
    reference_name: params.period.name,
    priority: 'medium'
  });
}

/**
 * Send overdue notification (period ended but still open)
 * **Validates: Requirements 9.1, 9.5**
 */
export async function sendOverdueNotification(params: OverdueNotificationParams): Promise<void> {
  const recipients = await getUsersWithRole('Accounts Manager');

  if (recipients.length === 0) {
    console.warn('No users with Accounts Manager role found for overdue notification');
    return;
  }

  const subject = `[OVERDUE] Accounting Period Still Open: ${params.period.period_name}`;
  const message = `
    <h3>Accounting Period Overdue</h3>
    <p>The accounting period <strong>${params.period.period_name}</strong> ended <strong>${params.daysAfterEnd} day(s) ago</strong> and is still open.</p>
    
    <p><strong>Period Details:</strong></p>
    <ul>
      <li>Period Name: ${params.period.period_name}</li>
      <li>Company: ${params.period.company}</li>
      <li>Start Date: ${params.period.start_date}</li>
      <li>End Date: ${params.period.end_date}</li>
      <li>Status: ${params.period.status}</li>
    </ul>
    
    <p><strong>Action Required:</strong> Please close this period as soon as possible to maintain data integrity and compliance.</p>
    
    <p><em>This is an automated notification from the Accounting Period Closing system.</em></p>
  `;

  await sendEmailNotification({
    recipients,
    subject,
    message,
    reference_doctype: 'Accounting Period',
    reference_name: params.period.name,
    priority: 'high'
  });
}

/**
 * Send escalation notification (M days after end, escalate to administrators)
 * **Validates: Requirements 9.3, 9.5**
 */
export async function sendEscalationNotification(params: EscalationNotificationParams): Promise<void> {
  const recipients = await getUsersWithRole('System Manager');

  if (recipients.length === 0) {
    console.warn('No users with System Manager role found for escalation notification');
    return;
  }

  const subject = `[ESCALATION] Urgent: Accounting Period Not Closed: ${params.period.period_name}`;
  const message = `
    <h3>URGENT: Accounting Period Escalation</h3>
    <p><strong style="color: red;">ESCALATION REQUIRED:</strong> The accounting period <strong>${params.period.period_name}</strong> ended <strong>${params.daysAfterEnd} day(s) ago</strong> and has not been closed.</p>
    
    <p><strong>Period Details:</strong></p>
    <ul>
      <li>Period Name: ${params.period.period_name}</li>
      <li>Company: ${params.period.company}</li>
      <li>Start Date: ${params.period.start_date}</li>
      <li>End Date: ${params.period.end_date}</li>
      <li>Status: ${params.period.status}</li>
      <li>Days Overdue: ${params.daysAfterEnd}</li>
    </ul>
    
    <p><strong>Immediate Action Required:</strong></p>
    <ul>
      <li>Review the period status and any blocking issues</li>
      <li>Coordinate with the accounting team to close the period</li>
      <li>Ensure compliance with financial reporting deadlines</li>
    </ul>
    
    <p><em>This is an automated escalation notification from the Accounting Period Closing system.</em></p>
  `;

  await sendEmailNotification({
    recipients,
    subject,
    message,
    reference_doctype: 'Accounting Period',
    reference_name: params.period.name,
    priority: 'high'
  });
}

/**
 * Calculate days until or after period end date
 */
export function calculateDaysFromEndDate(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if notification should be sent based on configuration
 */
export function shouldSendNotification(
  period: AccountingPeriod,
  config: PeriodClosingConfig
): {
  sendReminder: boolean;
  sendOverdue: boolean;
  sendEscalation: boolean;
  daysFromEnd: number;
} {
  if (!config.enable_email_notifications || period.status !== 'Open') {
    return {
      sendReminder: false,
      sendOverdue: false,
      sendEscalation: false,
      daysFromEnd: 0
    };
  }

  const daysFromEnd = calculateDaysFromEndDate(period.end_date);

  return {
    sendReminder: daysFromEnd === config.reminder_days_before_end,
    sendOverdue: daysFromEnd < 0 && daysFromEnd > -config.escalation_days_after_end,
    sendEscalation: daysFromEnd === -config.escalation_days_after_end,
    daysFromEnd
  };
}

/**
 * Process notifications for a single period
 */
export async function processNotificationsForPeriod(
  period: AccountingPeriod,
  config: PeriodClosingConfig
): Promise<void> {
  const checks = shouldSendNotification(period, config);

  if (checks.sendReminder) {
    await sendReminderNotification({
      period,
      daysUntilEnd: checks.daysFromEnd
    });
    console.log(`Sent reminder notification for period ${period.period_name}`);
  }

  if (checks.sendOverdue) {
    await sendOverdueNotification({
      period,
      daysAfterEnd: Math.abs(checks.daysFromEnd)
    });
    console.log(`Sent overdue notification for period ${period.period_name}`);
  }

  if (checks.sendEscalation) {
    await sendEscalationNotification({
      period,
      daysAfterEnd: Math.abs(checks.daysFromEnd)
    });
    console.log(`Sent escalation notification for period ${period.period_name}`);
  }
}
