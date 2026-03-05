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
    
    if (!invoiceName) {
      return NextResponse.json(
        { success: false, message: 'Invoice name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const invoiceData = await client.get('Sales Invoice', invoiceName);

    return NextResponse.json({
      success: true,
      data: invoiceData,
      message: `Found invoice details for ${invoiceName}`
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/invoices/details', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
