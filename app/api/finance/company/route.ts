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
    // For demo purposes, return mock data if ERPNext is not accessible
    const mockCompanies = [
      {
        name: "Default Company",
        company_name: "Default Company",
        country: "Indonesia",
        abbr: "DC"
      },
      {
        name: "PT. Example",
        company_name: "PT. Example Indonesia",
        country: "Indonesia", 
        abbr: "PE"
      }
    ];

    // Try to fetch from ERPNext first
    try {
      const client = await getERPNextClientForRequest(request);
      
      const data = await client.getList('Company', {
        fields: ['name', 'company_name', 'country', 'abbr'],
        limit_page_length: 100
      });

      return NextResponse.json({
        success: true,
        data: data || mockCompanies,
      });
    } catch {
      console.log('ERPNext not available, using mock data');
      
      // Fallback to mock data
      return NextResponse.json({
        success: true,
        data: mockCompanies,
      });
    }

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/company', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
