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
    const search = searchParams.get('search');
    const limitPageLength = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Build filters array
    const filters: (string | number | boolean | null | string[])[][] = [];
    
    if (search && search.trim()) {
      const searchTrim = search.trim();
      filters.push(["customer_name", "like", `%${searchTrim}%`]);
    }
    
    interface CustomerSummary {
      name: string;
      customer_name: string;
      [key: string]: unknown;
    }
    // Use client method instead of fetch
    const data = await client.getList<CustomerSummary>('Customer', {
      fields: ['name', 'customer_name'],
      filters,
      limit_page_length: parseInt(limitPageLength),
      start: parseInt(limitStart)
    });

    const totalRecords = await client.getCount('Customer', { filters });

    return NextResponse.json({
      success: true,
      data: data || [],
      total: totalRecords,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/customers', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const body = await request.json();
    
    // Let ERPNext generate code
    delete body.name;
    if (!body.naming_series) {
      body.naming_series = 'CUST-.#####';
    }
    
    // Map sales_person to sales_team if provided
    if (body.sales_person) {
      body.sales_team = [
        {
          sales_person: body.sales_person,
          allocated_percentage: 100,
        },
      ];
      delete body.sales_person;
    }

    const data = await client.insert<Record<string, unknown>>('Customer', body);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/customers', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
