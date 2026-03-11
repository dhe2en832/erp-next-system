import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    const body = await request.json();
    const { name: _bodyName, ...updateData } = body;

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.update('Payment Entry', name, updateData);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/finance/payments/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.get('Payment Entry', name) as any;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/payments/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
