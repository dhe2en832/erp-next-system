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

    const client = await getERPNextClientForRequest(request);

    // Handle detail request
    if (name) {
      const data = await client.get('Stock Reconciliation', name) as any;
      return NextResponse.json({ success: true, data });
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters
    const filters: any[][] = [['company', '=', company]];
    if (search) filters.push(['name', 'like', `%${search}%`]);
    if (warehouse) filters.push(['warehouse', '=', warehouse]);
    if (status) {
      // Map UI status to docstatus
      if (status === 'Draft') filters.push(['docstatus', '=', 0]);
      else if (status === 'Submitted') filters.push(['docstatus', '=', 1]);
      else if (status === 'Cancelled') filters.push(['docstatus', '=', 2]);
    }
    if (fromDate) filters.push(['posting_date', '>=', fromDate]);
    if (toDate) filters.push(['posting_date', '<=', toDate]);

    const limitPageLength = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';
    const orderBy = searchParams.get('order_by') || 'creation desc, posting_date desc, posting_time desc';

    const data = await client.getList('Stock Reconciliation', {
      fields: ['name', 'posting_date', 'posting_time', 'company', 'warehouse', 'purpose', 'docstatus'],
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

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { warehouse, posting_date, posting_time, purpose, items, company } = body;

    if (!warehouse || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse and company are required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    const reconciliationData = {
      doctype: 'Stock Reconciliation',
      posting_date,
      posting_time,
      company,
      warehouse,
      purpose: purpose || 'Stock Reconciliation',
      items: items.map((item: any) => ({
        item_code: item.item_code,
        warehouse,
        qty: item.qty || 0,
        valuation_rate: item.valuation_rate || 0,
      })),
    };

    const data = await client.insert('Stock Reconciliation', reconciliationData) as any;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/inventory/reconciliation', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { name, warehouse, posting_date, posting_time, purpose, items, company } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required for update' },
        { status: 400 }
      );
    }

    if (!warehouse || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse and company are required' },
        { status: 400 }
      );
    }

    // Check if document is already submitted
    const existing = await client.get('Stock Reconciliation', name) as any;
    if (existing.docstatus === 1) {
      return NextResponse.json(
        { success: false, message: 'Cannot update submitted document' },
        { status: 400 }
      );
    }

    const reconciliationData = {
      posting_date,
      posting_time,
      company,
      warehouse,
      purpose: purpose || 'Stock Reconciliation',
      items: items.map((item: any) => ({
        item_code: item.item_code,
        warehouse,
        qty: item.qty || 0,
        valuation_rate: item.valuation_rate || 0,
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

export async function DELETE(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required for delete' },
        { status: 400 }
      );
    }

    // Check if document is submitted
    const existing = await client.get('Stock Reconciliation', name) as any;
    if (existing.docstatus === 1) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete submitted document. Cancel it first.' },
        { status: 400 }
      );
    }

    await client.delete('Stock Reconciliation', name);

    return NextResponse.json({ success: true, message: 'Stock Reconciliation deleted successfully' });
  } catch (error: unknown) {
    logSiteError(error, 'DELETE /api/inventory/reconciliation', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
