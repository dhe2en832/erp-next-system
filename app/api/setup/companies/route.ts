import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

// GET /api/setup/companies
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    
    const companies = await client.getList('Company', {
      fields: ['name', 'company_name', 'abbr', 'country', 'default_currency'],
      order_by: 'company_name asc',
    });

    return NextResponse.json({
      success: true,
      data: companies,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/companies', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
