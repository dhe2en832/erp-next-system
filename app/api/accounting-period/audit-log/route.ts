import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const period_name = searchParams.get('period_name');
    const action_type = searchParams.get('action_type');
    const action_by = searchParams.get('action_by');
    const limit = parseInt(searchParams.get('limit') || '50');
    const start = parseInt(searchParams.get('start') || '0');

    const filters: any[][] = [];
    
    if (period_name) {
      filters.push(['accounting_period', '=', period_name]);
    }
    
    if (action_type) {
      filters.push(['action_type', '=', action_type]);
    }
    
    if (action_by) {
      filters.push(['action_by', '=', action_by]);
    }

    const logs = await erpnextClient.getList('Period Closing Log', {
      filters: filters.length > 0 ? filters : undefined,
      fields: [
        'name',
        'accounting_period',
        'action_type',
        'action_by',
        'action_date',
        'reason',
        'affected_transaction',
        'transaction_doctype',
      ],
      limit,
      start,
      order_by: 'action_date desc',
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { success: false, error: 'FETCH_ERROR', message: error.message || 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
