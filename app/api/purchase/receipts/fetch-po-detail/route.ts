import { NextRequest, NextResponse } from "next/server";
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const po = searchParams.get("po");

    if (!po) {
      return NextResponse.json(
        { success: false, message: "Missing PO parameter" },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Call custom ERPNext method
    const data = await client.call('fetch_po_detail_for_pr', { po });
    
    return NextResponse.json(data);
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/receipts/fetch-po-detail', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
