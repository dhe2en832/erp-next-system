import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Use client submit method instead of fetch
    const data = await client.submit('Payment Entry', name);

    return NextResponse.json({ 
      success: true, 
      data, 
      message: `Payment Entry ${name} berhasil diajukan` 
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/payments/[name]/submit', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
