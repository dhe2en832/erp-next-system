import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { erpnextClient } from '@/lib/erpnext';
import { createAuditLog } from '@/lib/accounting-period-closing';
import { requirePermission, canPermanentlyClosePeriod } from '@/lib/accounting-period-permissions';
import type { AccountingPeriod } from '@/types/accounting-period';

const permanentCloseRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required'),
  company: z.string().min(1, 'Company is required'),
  confirmation: z.string().refine(
    (val) => val === 'PERMANENT',
    { message: 'Confirmation must be "PERMANENT"' }
  ),
});

/**
 * Send notifications for permanent closing
 * Stub implementation - can be enhanced with actual email/notification service
 * 
 * @param period - The permanently closed period
 */
async function sendPermanentClosingNotifications(period: AccountingPeriod): Promise<void> {
  // TODO: Implement actual notification sending
  // For now, just log
  console.log(`Notification: Period ${period.period_name} has been permanently closed. This action cannot be undone.`);
  
  // In production, this would:
  // 1. Get users with 'System Manager' and 'Accounts Manager' roles
  // 2. Send email/in-app notification with warning
  // 3. Log notification sent
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions for permanent closing (System Manager only)
    const user = await requirePermission(request, canPermanentlyClosePeriod);

    const body = await request.json();
    const { period_name, company, confirmation } = permanentCloseRequestSchema.parse(body);

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
          error: 'Period is already permanently closed',
          details: { current_status: period.status }
        },
        { status: 409 }
      );
    }

    if (period.status !== 'Closed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Period must be closed before permanent closing',
          details: { current_status: period.status, required_status: 'Closed' }
        },
        { status: 422 }
      );
    }

    // Step 3: Use authenticated user from permission check
    const currentUser = user.name;

    // Step 4: Update period status to "Permanently Closed"
    const beforeSnapshot = JSON.stringify({
      status: period.status,
      closed_by: period.closed_by,
      closed_on: period.closed_on
    });

    const updatedPeriod = await erpnextClient.update('Accounting Period', period.name, {
      status: 'Permanently Closed',
      permanently_closed_by: currentUser,
      permanently_closed_on: new Date().toISOString(),
    });

    // Step 5: Create audit log entry
    await createAuditLog({
      accounting_period: period.name,
      action_type: 'Permanently Closed',
      action_by: currentUser,
      action_date: new Date().toISOString(),
      before_snapshot: beforeSnapshot,
      after_snapshot: JSON.stringify(updatedPeriod),
    });

    // Step 6: Send notifications
    await sendPermanentClosingNotifications(updatedPeriod);

    return NextResponse.json({
      success: true,
      data: updatedPeriod,
      message: `Period ${period.period_name} permanently closed. This action cannot be undone.`,
    });
  } catch (error: any) {
    console.error('Permanent closing error:', error);
    
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
