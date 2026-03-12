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
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    interface FiscalYear {
      name: string;
      year_start_date: string;
      year_end_date: string;
      company: string;
    }

    const filters: [string, string, string][] = [
      ['company', '=', company]
    ];

    const data = await client.getList<FiscalYear>('Fiscal Year', {
      fields: ['name', 'year_start_date', 'year_end_date', 'company'],
      filters,
      order_by: 'creation desc, year_start_date desc',
      limit_page_length: 10
    });

    if (data) {
      const formattedFiscalYears = data.map((fiscalYear) => {
        const startDate = new Date(fiscalYear.year_start_date);
        const endDate = new Date(fiscalYear.year_end_date);
        const yearName = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
        
        return {
          name: fiscalYear.name,
          year_start_date: fiscalYear.year_start_date,
          year_end_date: fiscalYear.year_end_date,
          company: fiscalYear.company,
          display_name: yearName,
          year: startDate.getFullYear()
        };
      });

      return NextResponse.json({
        success: true,
        data: formattedFiscalYears,
        message: `Found ${formattedFiscalYears.length} fiscal years`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No fiscal years found',
        data: []
      });
    }

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/company/fiscal-years', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
