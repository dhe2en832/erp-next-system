import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Call logout on ERPNext backend (works for both API Key and session cookie auth)
    await client.call('logout', {});

    const responseNext = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Delete session cookie if it exists (for session-based auth users)
    const sid = request.cookies.get('sid')?.value;
    if (sid) {
      responseNext.cookies.delete('sid');
    }

    return responseNext;

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/auth/logout', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
