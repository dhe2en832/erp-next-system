import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/finance/accounts/cash-bank?company=CompanyName
 * Returns accounts with account_type Cash or Bank for dropdown selection.
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Authentication check
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || '';

    // Build filters - preserve account type filtering (Cash, Bank)
    const filters: any[] = [
      ['account_type', 'in', ['Cash', 'Bank']],
      ['is_group', '=', 0],
      ['disabled', '=', 0],
    ];
    if (company) {
      filters.push(['company', '=', company]);
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.getList('Account', {
      fields: ['name', 'account_name', 'account_type', 'company'],
      filters,
      limit_page_length: 100,
      order_by: 'account_name'
    });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/accounts/cash-bank', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
