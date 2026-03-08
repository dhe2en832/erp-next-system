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
    const supplier = searchParams.get('supplier');
    const company = searchParams.get('company');

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Build filters for outstanding purchase invoices
    const filters: any[] = [
      ["docstatus", "=", 1], // Submitted documents
      ["status", "!=", "Paid"], // Not fully paid
      ["outstanding_amount", ">", 0], // Has outstanding amount
    ];

    // Add supplier filter if provided
    if (supplier) {
      filters.push(["supplier", "=", supplier]);
    }

    // Add company filter if provided
    if (company) {
      filters.push(["company", "=", company]);
    }

    const data = await client.getList('Purchase Invoice', {
      fields: ['name', 'supplier', 'supplier_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'],
      filters,
      order_by: 'due_date',
      limit_page_length: 100
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Outstanding purchase invoices fetched successfully'
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/invoices/outstanding', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
