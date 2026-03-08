import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ item_code: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const cookies = request.cookies;
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && cookies.get(siteSpecificCookie)?.value) || cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { item_code } = await params;
    // console.log('Fetching item details for:', item_code);

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Get specific item by item_code
    const item = await client.get('Item', item_code);

    // console.log('Item detail API - Response:', JSON.stringify(item, null, 2));

    return NextResponse.json({
      success: true,
      data: item,
      message: 'Item details fetched successfully'
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/items/[item_code]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
