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
    const fields = ['name', 'designation_name'];

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const data = await client.getList('Designation', {
      fields: fields,
      limit_page_length: 200,
      order_by: 'designation_name'
    });

    // Normalize to simple list of names
    const designations = (data || []).map((d: any) => d.designation_name || d.name).filter(Boolean);
    return NextResponse.json({ success: true, data: designations });
  } catch (error) {
    logSiteError(error, 'GET /api/hr/designations', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
