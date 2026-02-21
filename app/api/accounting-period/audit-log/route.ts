import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClient } from '@/lib/erpnext';
import { requirePermission, canViewAuditLog } from '@/lib/accounting-period-permissions';
import type { AuditLogResponse, PeriodClosingLog } from '@/types/accounting-period';

export async function GET(request: NextRequest) {
  try {
    // Check user permissions for viewing audit logs
    await requirePermission(request, canViewAuditLog);

    const searchParams = request.nextUrl.searchParams;
    
    // Get filter parameters
    const period_name = searchParams.get('period_name');
    const action_type = searchParams.get('action_type');
    const action_by = searchParams.get('action_by');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = parseInt(searchParams.get('start') || '0');

    const client = await getERPNextClient();

    // Build filters
    const filters: any[] = [];

    if (period_name) {
      filters.push(['accounting_period', '=', period_name]);
    }

    if (action_type) {
      filters.push(['action_type', '=', action_type]);
    }

    if (action_by) {
      filters.push(['action_by', '=', action_by]);
    }

    if (from_date) {
      filters.push(['action_date', '>=', from_date]);
    }

    if (to_date) {
      filters.push(['action_date', '<=', to_date]);
    }

    // Get audit logs with pagination
    const logs = await client.getList('Period Closing Log', {
      filters: filters.length > 0 ? filters : undefined,
      fields: [
        'name',
        'accounting_period',
        'action_type',
        'action_by',
        'action_date',
        'reason',
        'before_snapshot',
        'after_snapshot',
        'affected_transaction',
        'transaction_doctype',
        'ip_address',
        'user_agent'
      ],
      limit_start: start,
      limit_page_length: limit,
      order_by: 'action_date desc'
    });

    // Get total count for pagination
    const totalCount = await client.getCount('Period Closing Log', {
      filters: filters.length > 0 ? filters : undefined
    });

    const response: AuditLogResponse = {
      success: true,
      data: logs as PeriodClosingLog[],
      total_count: totalCount
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    
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
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch audit logs'
      },
      { status: 500 }
    );
  }
}
