import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const warehouse = searchParams.get('warehouse');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Handle detail request
    if (name) {
      const data = await client.get('Stock Reconciliation', name);
      return NextResponse.json({ success: true, data });
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters - preserve all filtering logic
    const filters: any[][] = [['company', '=', company]];
    if (search) filters.push(['name', 'like', `%${search}%`]);
    if (warehouse) filters.push(['warehouse', '=', warehouse]);
    if (status) filters.push(['status', '=', status]);
    if (fromDate) filters.push(['posting_date', '>=', fromDate]);
    if (toDate) filters.push(['posting_date', '<=', toDate]);

    const limitPageLength = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';
    const orderBy = searchParams.get('order_by') || 'creation desc, posting_date desc, posting_time desc';

    const data = await client.getList('Stock Reconciliation', {
      fields: ['name', 'posting_date', 'posting_time', 'company', 'purpose'],
      filters,
      order_by: orderBy,
      limit_page_length: parseInt(limitPageLength),
      start: parseInt(limitStart)
    });

    const totalRecords = await client.getCount('Stock Reconciliation', { filters });

    return NextResponse.json({
      success: true,
      data: data || [],
      total_records: totalRecords,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/reconciliation', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    const body = await request.json();
    const { name, warehouse, posting_date, posting_time, purpose, items, company } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name is required for update' }, { status: 400 });
    }
    if (!warehouse || !company) {
      return NextResponse.json({ success: false, message: 'Warehouse and company are required' }, { status: 400 });
    }

    // Preserve reconciliation item child table handling
    const total_qty = items.reduce((total: number, item: any) => total + (item.qty || 0), 0);
    const total_difference = items.reduce((total: number, item: any) => total + ((item.qty || 0) - (item.current_qty || 0)), 0);

    const reconciliationData = {
      posting_date,
      posting_time,
      company,
      warehouse,
      purpose: purpose || 'Stock Reconciliation',
      total_qty,
      total_difference,
      items: items.map((item: any) => ({
        item_code: item.item_code,
        warehouse,
        current_qty: item.current_qty || 0,
        qty: item.qty || 0,
      })),
    };

    const data = await client.update('Stock Reconciliation', name, reconciliationData);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/inventory/reconciliation', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
