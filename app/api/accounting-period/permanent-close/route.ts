import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_name, company, confirmation } = body;

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period name and company are required' },
        { status: 400 }
      );
    }

    if (confirmation !== 'PERMANENT') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Confirmation must be "PERMANENT"' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await erpnextClient.get('Accounting Period', period_name);

    // Validate period status
    if (period.status !== 'Closed') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period must be closed before it can be permanently closed' },
        { status: 422 }
      );
    }

    // Update period status to Permanently Closed
    const now = new Date();
    const erpnextDatetime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await erpnextClient.update('Accounting Period', period_name, {
      status: 'Permanently Closed',
      permanently_closed_by: 'Administrator',
      permanently_closed_on: erpnextDatetime,
    });

    // Create audit log
    await erpnextClient.insert('Period Closing Log', {
      accounting_period: period_name,
      action_type: 'Permanently Closed',
      action_by: 'Administrator',
      action_date: erpnextDatetime,
      before_snapshot: JSON.stringify({ status: 'Closed' }),
      after_snapshot: JSON.stringify({ status: 'Permanently Closed' }),
    });

    return NextResponse.json({
      success: true,
      message: 'Period permanently closed successfully',
    });
  } catch (error: any) {
    console.error('Error permanently closing period:', error);
    return NextResponse.json(
      { success: false, error: 'PERMANENT_CLOSE_ERROR', message: error.message || 'Failed to permanently close period' },
      { status: 500 }
    );
  }
}
