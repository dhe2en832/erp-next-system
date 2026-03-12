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

    // Fetch selling price lists only
    const priceLists = await client.getList<{ name: string }>('Price List', {
      fields: ['name'],
      filters: [['selling', '=', 1]],
      limit_page_length: 0
    });

    const lists = priceLists.map((p: { name: string }) => p.name).filter(Boolean);
    return NextResponse.json({ success: true, data: lists });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/price-lists', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
