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
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Validate date range
    const dateValidation = validateDateRange(fromDate, toDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    const filters: [string, string, string | number][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
    ];

    if (fromDate) filters.push(['transaction_date', '>=', fromDate]);
    if (toDate) filters.push(['transaction_date', '<=', toDate]);

    interface PurchaseOrder {
      name: string;
      supplier: string;
      supplier_name: string;
      transaction_date: string;
      grand_total: number;
      status: string;
    }

    const data = await client.getList<PurchaseOrder>('Purchase Order', {
      fields: ['name', 'supplier', 'supplier_name', 'transaction_date', 'grand_total', 'status'],
      filters,
      order_by: 'transaction_date desc',
      limit_page_length: 500
    });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/purchases', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
