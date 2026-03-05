import { NextRequest, NextResponse } from 'next/server';
import { validateDateRange } from '@/utils/report-validation';
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
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company required' }, { status: 400 });
    }

    // Validate date range
    const dateValidation = validateDateRange(from_date, to_date);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Sales Returns
    const srFilters: any[][] = [['company', '=', company], ['is_return', '=', 1], ['docstatus', '=', 1]];
    if (from_date) srFilters.push(['posting_date', '>=', from_date]);
    if (to_date) srFilters.push(['posting_date', '<=', to_date]);

    const srData = await client.getList('Sales Invoice', {
      fields: ['name', 'posting_date', 'customer', 'customer_name', 'grand_total', 'return_against'],
      filters: srFilters,
      order_by: 'posting_date desc',
      limit_page_length: 100
    });

    // Purchase Returns
    const prFilters: any[][] = [['company', '=', company], ['is_return', '=', 1], ['docstatus', '=', 1]];
    if (from_date) prFilters.push(['posting_date', '>=', from_date]);
    if (to_date) prFilters.push(['posting_date', '<=', to_date]);

    const prData = await client.getList('Purchase Invoice', {
      fields: ['name', 'posting_date', 'supplier', 'supplier_name', 'grand_total', 'return_against'],
      filters: prFilters,
      order_by: 'posting_date desc',
      limit_page_length: 100
    });

    const results = {
      sales_returns: (srData || []).map((r: any) => ({ ...r, type: 'Retur Penjualan' })),
      purchase_returns: (prData || []).map((r: any) => ({ ...r, type: 'Retur Pembelian' }))
    };

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/returns', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
