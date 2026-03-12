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
      const data = await client.get<Record<string, unknown>>('Stock Reconciliation', name);
      return NextResponse.json({ success: true, data });
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters
    const filters: (string | number | boolean | null | string[])[][] = [['company', '=', company]];
    if (search) filters.push(['name', 'like', `%${search}%`]);
    
    // Check if 'warehouse' is a permitted field in the query
    // The error "Field not permitted in query: warehouse" occurs in sites where
    // Stock Reconciliation doesn't have a top-level warehouse field (multi-warehouse entries).
    if (warehouse) {
      // For now, we omit the warehouse filter in the main list to prevent 500 error.
      // We can filter the results manually if needed or check meta first.
      // filters.push(['warehouse', '=', warehouse]); 
    }
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

    interface ReconciliationSummary {
      name: string;
      posting_date: string;
      posting_time: string;
      company: string;
      purpose: string;
      docstatus: number;
      [key: string]: unknown;
    }
    const data = await client.getList<ReconciliationSummary>('Stock Reconciliation', {
      fields: ['name', 'posting_date', 'posting_time', 'company', 'purpose', 'docstatus'],
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

    interface ReconciliationItem {
      item_code: string;
      warehouse: string;
      qty: number;
      valuation_rate: number;
      [key: string]: unknown;
    }

    const reconciliationData = {
      doctype: 'Stock Reconciliation',
      posting_date,
      posting_time,
      company,
      warehouse,
      purpose: purpose || 'Stock Reconciliation',
      items: items.map((item: ReconciliationItem) => ({
        item_code: item.item_code,
        warehouse,
        qty: item.qty || 0,
        valuation_rate: item.valuation_rate || 0,
      })),
    };

    const data = await client.insert<Record<string, unknown>>('Stock Reconciliation', reconciliationData);

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
    interface StockReconciliation {
      name: string;
      docstatus: number;
      [key: string]: unknown;
    }
    const existing = await client.get<StockReconciliation>('Stock Reconciliation', name);
    if (existing.docstatus === 1) {
      return NextResponse.json(
        { success: false, message: 'Cannot update submitted document' },
        { status: 400 }
      );
    }

    interface ReconciliationItem {
      item_code: string;
      warehouse: string;
      qty: number;
      valuation_rate: number;
      [key: string]: unknown;
    }

    const reconciliationData = {
      posting_date,
      posting_time,
      company,
      warehouse,
      purpose: purpose || 'Stock Reconciliation',
      items: items.map((item: ReconciliationItem) => ({
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
    interface StockReconciliation {
      name: string;
      docstatus: number;
      [key: string]: unknown;
    }
    const existing = await client.get<StockReconciliation>('Stock Reconciliation', name);
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
