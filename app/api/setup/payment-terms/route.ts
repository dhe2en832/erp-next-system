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
    // Check authentication
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch payment terms using client method
    const paymentTerms = await client.getList('Payment Terms Template', {
      fields: ['name'],
      limit_page_length: 100,
      order_by: 'name'
    });

    return NextResponse.json({ success: true, data: paymentTerms });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/payment-terms', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    // Check authentication
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Create payment terms template using client method
    const result = await client.insert('Payment Terms Template', body);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/payment-terms', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
