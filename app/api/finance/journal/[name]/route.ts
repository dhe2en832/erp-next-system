import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Journal Entry name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Fetch journal entry detail with accounts
    const data = await client.get('Journal Entry', name);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/journal/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
