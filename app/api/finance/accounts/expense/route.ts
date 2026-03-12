import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/finance/accounts/expense?company=CompanyName&type=expense|income
 * Returns expense or income accounts for kategori dropdown in Kas Keluar/Masuk.
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
    const type = searchParams.get('type') || 'expense';

    // Preserve account type filtering (Expense/Income)
    const rootType = type === 'income' ? 'Income' : 'Expense';

    // Build filters - preserve account hierarchy logic
    const filters: [string, string, string | number][] = [
      ['root_type', '=', rootType],
      ['is_group', '=', 0],
    ];
    if (company) {
      filters.push(['company', '=', company]);
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.getList('Account', {
      fields: ['name', 'account_name', 'root_type', 'parent_account', 'company'],
      filters,
      limit_page_length: 200,
      order_by: 'account_name'
    });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/accounts/expense', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
