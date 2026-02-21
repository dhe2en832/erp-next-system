import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { erpnextClient } from '@/lib/erpnext';
import { createAuditLog } from '@/lib/accounting-period-closing';
import { requirePermission, canReopenPeriod } from '@/lib/accounting-period-permissions';
import type { AccountingPeriod, PeriodClosingConfig } from '@/types/accounting-period';

const reopenRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required'),
  company: z.string().min(1, 'Company is required'),
  reason: z.string().min(1, 'Reason is required for reopening'),
});

/**
 * Send notifications for period reopening
 * Stub implementation - can be enhanced with actual email/notification service
 * 
 * @param period - The reopened period
 * @param reason - The reason for reopening
 */
async function sendReopenNotifications(period: AccountingPeriod, reason: string): Promise<void> {
  // TODO: Implement actual notification sending
  // For now, just log
  console.log(`Notification: Period ${period.period_name} has been reopened. Reason: ${reason}`);
  
  // In production, this would:
  // 1. Get users with 'Accounts Manager' role
  // 2. Send email/in-app notification
  // 3. Log notification sent
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions for reopening periods
    const user = await requirePermission(request, canReopenPeriod);

    const body = await request.json();
    const { period_name, company, reason } = reopenRequestSchema.parse(body);

    // Step 1: Get period
    const period = await erpnextClient.getDoc<AccountingPeriod>('Accounting Period', period_name);
    
    if (period.company !== company) {
      return NextResponse.json(
        { success: false, error: 'Period does not belong to specified company' },
        { status: 400 }
      );
    }

    // Step 2: Validate period status is "Closed"
    if (period.status === 'Permanently Closed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot reopen permanently closed period',
          details: { 
            current_status: period.status,
            message: 'Permanent closure cannot be reversed'
          }
        },
        { status: 422 }
      );
    }

    if (period.status !== 'Closed') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot reopen period with status: ${period.status}`,
          details: { current_status: period.status }
        },
        { status: 409 }
      );
    }

    // Step 3: Use authenticated user from permission check
    const currentUser = user.name;

    // Step 4: Validate that next period is not closed
    const nextPeriodStart = new Date(period.end_date);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);
    const nextPeriodStartStr = nextPeriodStart.toISOString().split('T')[0];

    const nextPeriodFilters = [
      ['company', '=', period.company],
      ['start_date', '>=', nextPeriodStartStr],
      ['status', 'in', ['Closed', 'Permanently Closed']]
    ];

    const closedNextPeriods = await erpnextClient.getList<AccountingPeriod>('Accounting Period', {
      filters: nextPeriodFilters,
      fields: ['name', 'period_name', 'status', 'start_date'],
      limit: 1
    });

    if (closedNextPeriods.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NEXT_PERIOD_CLOSED',
          message: `Cannot reopen period: subsequent period ${closedNextPeriods[0].period_name} is already ${closedNextPeriods[0].status}`,
          details: {
            next_period: closedNextPeriods[0].period_name,
            next_period_status: closedNextPeriods[0].status
          }
        },
        { status: 422 }
      );
    }

    // Step 5: Cancel and delete closing journal entry (if exists)
    if (period.closing_journal_entry) {
      try {
        await erpnextClient.cancel('Journal Entry', period.closing_journal_entry);
        await erpnextClient.delete('Journal Entry', period.closing_journal_entry);
      } catch (error: any) {
        console.error('Error deleting closing journal:', error);
        // Continue even if journal deletion fails (it might already be deleted)
      }
    }

    // Step 6: Update period status
    const beforeSnapshot = JSON.stringify({
      status: period.status,
      closed_by: period.closed_by,
      closed_on: period.closed_on,
      closing_journal_entry: period.closing_journal_entry
    });

    const updatedPeriod = await erpnextClient.update('Accounting Period', period.name, {
      status: 'Open',
      closed_by: null,
      closed_on: null,
      closing_journal_entry: null,
    });

    // Step 7: Create audit log entry
    await createAuditLog({
      accounting_period: period.name,
      action_type: 'Reopened',
      action_by: currentUser,
      action_date: new Date().toISOString(),
      reason: reason,
      before_snapshot: beforeSnapshot,
      after_snapshot: JSON.stringify(updatedPeriod),
    });

    // Step 8: Send notifications
    await sendReopenNotifications(updatedPeriod, reason);

    return NextResponse.json({
      success: true,
      data: updatedPeriod,
      message: `Period ${period.period_name} reopened successfully`,
    });
  } catch (error: any) {
    console.error('Period reopening error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    // Handle permission errors
    if (error.statusCode === 403) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AUTHORIZATION_ERROR',
          message: error.message,
          details: error.details
        },
        { status: 403 }
      );
    }

    // Handle authentication errors
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
