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
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch UOMs from ERPNext
    const uoms = await client.getList<{ name: string }>('UOM', {
      fields: ['name']
    });
    
    // console.log('UOMs API Response:', uoms);

    return NextResponse.json({
      success: true,
      data: uoms?.map((uom: { name: string }) => ({ name: uom.name })) || []
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/dropdowns/uoms', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
