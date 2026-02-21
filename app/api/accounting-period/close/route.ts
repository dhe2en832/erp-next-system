import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { erpnextClient } from '@/lib/erpnext';
import { 
  createClosingJournalEntry, 
  calculateAllAccountBalances,
  createAuditLog,
  sendClosingNotifications
} from '@/lib/accounting-period-closing';
import { requirePermission, canClosePeriod } from '@/lib/accounting-period-permissions';
import type { AccountingPeriod, PeriodClosingConfig } from '@/types/accounting-period';

const closeRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required'),
  company: z.string().min(1, 'Company is required'),
  force: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Check user permissions for closing periods
    const user = await requirePermission(request, canClosePeriod);

    const body = await request.json();
    const { period_name, company, force } = closeRequestSchema.parse(body);

    // Get period
    const period = await erpnextClient.getDoc<AccountingPeriod>('Accounting Period', period_name);
    
    if (period.company !== company) {
      return NextResponse.json(
        { success: false, error: 'Period does not belong to specified company' },
        { status: 400 }
      );
    }

    if (period.status !== 'Open') {
      return NextResponse.json(
        { success: false, error: `Period is already ${period.status}` },
        { status: 409 }
      );
    }

    // Get configuration
    const config = await erpnextClient.getDoc<PeriodClosingConfig>(
      'Period Closing Config',
      'Period Closing Config'
    );

    // Use authenticated user from permission check
    const currentUser = user.name;

    // Run validations (unless forced)
    if (!force) {
      const validationResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/accounting-period/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period_name, company }),
        }
      );

      const validationResult = await validationResponse.json();

      if (!validationResult.all_passed) {
        const failedValidations = validationResult.validations.filter(
          (v: any) => !v.passed && v.severity === 'error'
        );

        if (failedValidations.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_FAILED',
              message: `Cannot close period: ${failedValidations.length} validation(s) failed`,
              details: { failed_validations: failedValidations },
            },
            { status: 422 }
          );
        }
      }
    }

    // Create closing journal entry
    const closingJournal = await createClosingJournalEntry(
      period,
      config.retained_earnings_account
    );

    // Calculate and save account balances snapshot
    const accountBalances = await calculateAllAccountBalances(period);

    // Update period status
    const beforeSnapshot = JSON.stringify({ status: period.status });
    const updatedPeriod = await erpnextClient.update('Accounting Period', period.name, {
      status: 'Closed',
      closed_by: currentUser,
      closed_on: new Date().toISOString(),
      closing_journal_entry: closingJournal.name,
    });

    // Create audit log entry
    await createAuditLog({
      accounting_period: period.name,
      action_type: 'Closed',
      action_by: currentUser,
      action_date: new Date().toISOString(),
      before_snapshot: beforeSnapshot,
      after_snapshot: JSON.stringify(updatedPeriod),
    });

    // Send notifications
    await sendClosingNotifications(updatedPeriod);

    return NextResponse.json({
      success: true,
      data: {
        period: updatedPeriod,
        closing_journal: closingJournal,
        account_balances: accountBalances,
      },
      message: `Period ${period.period_name} closed successfully`,
    });
  } catch (error: any) {
    console.error('Period closing error:', error);
    
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
