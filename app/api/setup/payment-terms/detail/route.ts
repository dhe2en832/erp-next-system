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
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name parameter is required' }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const data = await client.get('Payment Terms Template', name) as any;

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/payment-terms/detail', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name parameter is required' }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const body = await request.json();
    const data = await client.update('Payment Terms Template', name, body);

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/setup/payment-terms/detail', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
