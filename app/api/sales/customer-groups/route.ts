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
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const data = await client.getList<{ name: string }>('Customer Group', {
      fields: ['name'],
      limit_page_length: 0 // Get all
    });

    const groups = (data || []).map((g: { name: string }) => g.name).filter(Boolean);
    return NextResponse.json({ success: true, data: groups });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/customer-groups', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
