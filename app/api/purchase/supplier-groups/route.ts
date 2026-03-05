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
    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'No authentication available' }, 
        { status: 401 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    const data = await client.getList('Supplier Group', {
      fields: ['name'],
      limit_page_length: 500
    });

    const groups = data.map((g: any) => g.name).filter(Boolean);
    return NextResponse.json({ success: true, data: groups });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/supplier-groups', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
