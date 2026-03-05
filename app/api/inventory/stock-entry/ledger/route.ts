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
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const warehouse = searchParams.get('warehouse');
    const voucherType = searchParams.get('voucher_type');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters array
    const filters: any[][] = [['company', '=', company]];
    
    if (search) {
      filters.push(['item_code', 'like', `%${search}%`]);
    }
    
    if (warehouse) {
      filters.push(['warehouse', '=', warehouse]);
    }
    
    if (voucherType) {
      filters.push(['voucher_type', '=', voucherType]);
    }
    
    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }
    
    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    // console.log('Stock Ledger filters:', filters);

    // Use client method instead of fetch
    const data = await client.getList('Stock Ledger Entry', {
      fields: ['name', 'item_code', 'warehouse', 'posting_date', 'posting_time', 'voucher_type', 'voucher_no', 'actual_qty', 'qty_after_transaction', 'valuation_rate', 'stock_value', 'company'],
      filters,
      order_by: 'posting_date desc, posting_time desc',
      limit_page_length: 100
    });

    // console.log('Stock Ledger response:', data);

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/stock-entry/ledger', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
