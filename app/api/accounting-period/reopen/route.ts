import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { period_name, company, reason, force_permanent = false } = body;

    if (!period_name || !company || !reason) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period name, company, and reason are required' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await client.get('Accounting Period', period_name);

    // Validate period status
    if (period.status === 'Open') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period is already open' },
        { status: 422 }
      );
    }

    // Check if trying to reopen permanently closed period without force flag
    if (period.status === 'Permanently Closed' && !force_permanent) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Cannot reopen a permanently closed period without force_permanent flag' },
        { status: 422 }
      );
    }

    // Check if next period is closed
    const nextPeriods = await client.getList('Accounting Period', {
      filters: [
        ['company', '=', company],
        ['start_date', '>', period.end_date],
        ['status', 'in', ['Closed', 'Permanently Closed']],
      ],
      fields: ['name', 'period_name', 'start_date'],
      limit: 1,
      order_by: 'start_date asc',
    });

    if (nextPeriods.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'VALIDATION_ERROR', 
          message: `Cannot reopen period because next period "${nextPeriods[0].period_name}" is already closed` 
        },
        { status: 422 }
      );
    }

    // Get session cookie to identify actual user
    const sessionCookie = request.cookies.get('sid')?.value;
    const currentUser = await client.getCurrentUser(sessionCookie);

    // Update period status to Open
    const now = new Date();
    const erpnextDatetime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    const updateData: any = {
      status: 'Open',
      closed_by: null,
      closed_on: null,
    };

    // Only clear closing_journal_entry if it exists and is not NO_CLOSING_JOURNAL
    if (period.closing_journal_entry && period.closing_journal_entry !== 'NO_CLOSING_JOURNAL') {
      updateData.closing_journal_entry = null;
    }

    // If reopening permanently closed period, also clear permanent closure fields
    if (period.status === 'Permanently Closed') {
      updateData.permanently_closed_by = null;
      updateData.permanently_closed_on = null;
    }

    // CRITICAL: Set all closed_documents[].closed = 0 to allow transactions
    // This is required because ERPNext checks both status AND closed_documents flags
    if (period.closed_documents && Array.isArray(period.closed_documents)) {
      updateData.closed_documents = period.closed_documents.map((doc: any) => ({
        ...doc,
        closed: 0
      }));
    }

    await client.update('Accounting Period', period_name, updateData);

    // Create audit log with appropriate reason
    const auditReason = period.status === 'Permanently Closed' 
      ? `Reopened from permanent closure: ${reason}` 
      : reason;

    await client.insert('Period Closing Log', {
      accounting_period: period_name,
      action_type: 'Reopened',
      action_by: currentUser,
      action_date: erpnextDatetime,
      reason: auditReason,
      before_snapshot: JSON.stringify({ status: period.status }),
      after_snapshot: JSON.stringify({ status: 'Open' }),
    });

    return NextResponse.json({
      success: true,
      message: 'Period reopened successfully',
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/accounting-period/reopen', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
