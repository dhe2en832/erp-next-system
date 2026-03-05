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

    const territories = await client.getList('Territory', {
      fields: ['name'],
      limit_page_length: 0
    });

    const territoryNames = territories.map((t: any) => t.name).filter(Boolean);
    return NextResponse.json({ success: true, data: territoryNames });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/territories', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
