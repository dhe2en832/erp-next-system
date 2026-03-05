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
    const customer = searchParams.get('customer');
    const company = searchParams.get('company');
    
    if (!customer || !company) {
      return NextResponse.json(
        { success: false, message: 'Customer and company are required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const filters: any[][] = [
      ["customer", "=", customer],
      ["company", "=", company],
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0]
    ];

    const invoices = await client.getList('Sales Invoice', {
      fields: ['name', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'paid_amount'],
      filters,
      order_by: 'due_date asc',
      limit_page_length: 100
    });

    return NextResponse.json({
      success: true,
      data: invoices,
      message: `Found ${invoices.length} invoices for customer`
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/invoices/outstanding', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
