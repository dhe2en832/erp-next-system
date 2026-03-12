'use server';

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
    const fields = ['name'];

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    const data = await client.getList<{ name: string }>('Supplier Group', {
      fields: fields,
      limit_page_length: 500
    });

    const groups = data.map((g: { name: string }) => g.name).filter(Boolean);
    return NextResponse.json({ success: true, data: groups });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/supplier-groups', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
