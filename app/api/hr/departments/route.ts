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
    const fields = ['name', 'department_name'];

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const data = await client.getList('Department', {
      fields: fields,
      limit_page_length: 200,
      order_by: 'department_name'
    });

    const departments = (data || []).map((d: any) => d.department_name || d.name).filter(Boolean);
    return NextResponse.json({ success: true, data: departments });
  } catch (error) {
    logSiteError(error, 'GET /api/hr/departments', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
