import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';
import { paymentTermsCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Build cache key: siteId
    const cacheKey = siteId || 'default';

    // Use cache to reduce API calls
    const paymentTerms = await paymentTermsCache.get(cacheKey, async () => {
      return await client.getList('Payment Terms Template', {
        fields: ['name'],
        limit_page_length: 100,
        order_by: 'creation desc, name asc'
      });
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
    const body = await request.json();

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Create payment terms template using client method
    const result = await client.insert<Record<string, unknown>>('Payment Terms Template', body);

    // Invalidate cache after create
    paymentTermsCache.invalidate(siteId || 'default');

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/payment-terms', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
