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
    const delivery_note = searchParams.get('delivery_note');

    if (!delivery_note) {
      return NextResponse.json({
        success: false,
        message: 'Delivery note parameter is required'
      }, { status: 400 });
    }

    console.log('[Commission Preview] DN:', delivery_note, 'Site:', siteId);

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Call ERPNext method for commission preview
    const data = await client.call('preview_sales_invoice_commission', {
      delivery_note
    });

    console.log('[Commission Preview] Response:', JSON.stringify(data, null, 2));

    // Return the preview data directly from ERPNext
    return NextResponse.json({
      success: true,
      message: data.message || data
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/commission/preview', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
