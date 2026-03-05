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

    // Fetch item groups from ERPNext
    const itemGroups = await client.getList('Item Group', {
      fields: ['name']
    });
    
    // console.log('Item Groups API Response:', itemGroups);

    return NextResponse.json({
      success: true,
      data: itemGroups?.map((group: any) => ({ name: group.name })) || []
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/dropdowns/item-groups', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
