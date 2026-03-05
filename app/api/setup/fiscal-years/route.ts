import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

// GET /api/setup/fiscal-years
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    const filters: any[][] = [];
    
    if (company) {
      filters.push(['company', '=', company]);
    }

    const fiscalYears = await client.getList('Fiscal Year', {
      filters: filters.length > 0 ? filters : undefined,
      fields: ['name', 'year', 'year_start_date', 'year_end_date', 'disabled'],
      order_by: 'year_start_date desc',
    });

    // Filter out disabled fiscal years
    const activeFiscalYears = fiscalYears.filter((fy: any) => !fy.disabled);

    return NextResponse.json({
      success: true,
      data: activeFiscalYears,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/fiscal-years', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
