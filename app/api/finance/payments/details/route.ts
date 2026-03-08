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
    const paymentName = searchParams.get('name');
    
    if (!paymentName) {
      return NextResponse.json(
        { success: false, message: 'Payment name is required' },
        { status: 400 }
      );
    }

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.get('Payment Entry', paymentName);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/payments/details', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
