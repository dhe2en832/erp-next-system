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
    const invoiceName = searchParams.get('invoice_name');
    const company = searchParams.get('company');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!invoiceName || !company) {
      return NextResponse.json(
        { success: false, message: 'Invoice name and company are required' },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Get specific purchase invoice details
    const data = await client.get('Purchase Invoice', invoiceName);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/invoices/details', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
