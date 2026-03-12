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

    const filters: (string | number | boolean | null | string[])[][] = [];
    
    if (company) {
      filters.push(['company', '=', company]);
    }

    interface FiscalYear {
      name: string;
      year: string;
      year_start_date: string;
      year_end_date: string;
      disabled?: number;
      [key: string]: unknown;
    }

    const fiscalYears = await client.getList<FiscalYear>('Fiscal Year', {
      filters: filters.length > 0 ? filters : undefined,
      fields: ['name', 'year', 'year_start_date', 'year_end_date', 'disabled'],
      order_by: 'creation desc, year_start_date desc',
    });

    // Filter out disabled fiscal years
    const activeFiscalYears = fiscalYears.filter((fy: FiscalYear) => !fy.disabled);

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
