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
    const filters = searchParams.get('filters');
    const orderBy = searchParams.get('order_by');
    const limitPageLength = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';

    // console.log('Stock Entry API Parameters:', { filters, orderBy, limitPageLength, limitStart });

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Parse filters array (similar to payment API)
    let filtersArray: any[] = [];
    
    if (filters) {
      try {
        // Handle URL-encoded filters
        const decodedFilters = decodeURIComponent(filters);
        filtersArray = JSON.parse(decodedFilters);
      } catch (e) {
        console.error('Error parsing filters:', e);
        // Try parsing directly if decoding fails
        try {
          filtersArray = JSON.parse(filters);
        } catch (e2) {
          console.error('Error parsing filters directly:', e2);
        }
      }
    }
    
    // console.log('Parsed filters array:', filtersArray);

    // Use client method instead of fetch
    const data = await client.getList('Stock Entry', {
      fields: ['name', 'posting_date', 'posting_time', 'purpose', 'company', 'from_warehouse', 'to_warehouse', 'total_amount', 'docstatus'],
      filters: filtersArray,
      limit_page_length: parseInt(limitPageLength),
      start: parseInt(limitStart),
      order_by: orderBy || 'creation desc, posting_date desc, posting_time desc'
    });

    const totalRecords = await client.getCount('Stock Entry', { filters: filtersArray });

    return NextResponse.json({
      success: true,
      data: data || [],
      total: totalRecords,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/stock-entry', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const body = await request.json();
    const { purpose, posting_date, posting_time, from_warehouse, to_warehouse, items, company } = body;

    // Validate based on purpose
    if (!purpose || !company) {
      return NextResponse.json(
        { success: false, message: 'Purpose and company are required' },
        { status: 400 }
      );
    }

    // Material Receipt needs to_warehouse
    if (purpose === 'Material Receipt' && !to_warehouse) {
      return NextResponse.json(
        { success: false, message: 'Target warehouse is required for Material Receipt' },
        { status: 400 }
      );
    }

    // Material Issue needs from_warehouse
    if (purpose === 'Material Issue' && !from_warehouse) {
      return NextResponse.json(
        { success: false, message: 'Source warehouse is required for Material Issue' },
        { status: 400 }
      );
    }

    // Material Transfer needs both warehouses
    if (purpose === 'Material Transfer' && (!from_warehouse || !to_warehouse)) {
      return NextResponse.json(
        { success: false, message: 'Both source and target warehouses are required for Material Transfer' },
        { status: 400 }
      );
    }

    // Calculate total quantities
    const total_qty = items.reduce((total: number, item: any) => {
      return total + (item.transfer_qty || item.qty || 0);
    }, 0);

    const entryData = {
      doctype: 'Stock Entry',
      purpose,
      posting_date,
      posting_time,
      company,
      from_warehouse,
      ...(to_warehouse && { to_warehouse }),
      total_qty,
      stock_entry_type: purpose, // Map purpose to stock_entry_type
      items: items.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty,
        transfer_qty: item.qty, // Use qty since transfer_qty removed
        ...(item.serial_no && { serial_no: item.serial_no }),
        ...(item.batch_no && { batch_no: item.batch_no })
      }))
    };

    // Use client method instead of fetch
    const data = await client.insert('Stock Entry', entryData) as any;

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/inventory/stock-entry', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
