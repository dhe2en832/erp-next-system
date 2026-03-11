import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name: entryName } = await params;
    
    // console.log('Fetching stock entry details for:', entryName);

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const entryData = await client.get('Stock Entry', entryName) as any;
    
    // console.log('Get Stock Entry Response:', {
    //   entryName,
    //   erpNextResponse: entryData
    // });

    // Return entry data with items (items are already included in entryData.items)
    // console.log('Returning entry data with embedded items');
    return NextResponse.json({
      success: true,
      data: entryData
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/stock-entry/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
