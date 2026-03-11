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
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Fetch company details
    const data = await client.get('Company', company) as any;

    if (data) {
      return NextResponse.json({
        success: true,
        data: {
          default_warehouse: data.default_warehouse || null,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch company settings' },
        { status: 404 }
      );
    }
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/company/settings', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
