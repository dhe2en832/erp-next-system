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
    const period = await client.get('Accounting Period', period_name);

    // Validate period status
    if (period.status !== 'Closed') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period must be closed before it can be permanently closed' },
        { status: 422 }
      );
    }

    // Get session cookie to identify actual user
    const sessionCookie = request.cookies.get('sid')?.value;
    const currentUser = await client.getCurrentUser(sessionCookie);

    // Update period status to Permanently Closed
    const now = new Date();
    const erpnextDatetime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await client.update('Accounting Period', period_name, {
      status: 'Permanently Closed',
      permanently_closed_by: currentUser,
      permanently_closed_on: erpnextDatetime,
    });

    // Create audit log
    await client.insert('Period Closing Log', {
      accounting_period: period_name,
      action_type: 'Permanently Closed',
      action_by: currentUser,
      action_date: erpnextDatetime,
      before_snapshot: JSON.stringify({ status: 'Closed' }),
      after_snapshot: JSON.stringify({ status: 'Permanently Closed' }),
    });

    return NextResponse.json({
      success: true,
      message: 'Period permanently closed successfully',
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/accounting-period/permanent-close', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
