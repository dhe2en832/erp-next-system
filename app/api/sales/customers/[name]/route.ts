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
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Try direct fetch by name
    try {
      const data = await client.get('Customer', name) as any;
      return NextResponse.json({ 
        success: true, 
        data, 
        message: 'Customer detail fetched successfully' 
      });
    } catch (directError) {
      // Fallback: search by customer_name
      try {
        const searchData = await client.getList('Customer', {
          fields: ['name', 'customer_name'],
          filters: [['customer_name', '=', name]],
          limit_page_length: 1
        });
        
        if (searchData && searchData.length > 0) {
          const actualName = searchData[0].name;
          const data = await client.get('Customer', actualName) as any;
          return NextResponse.json({ 
            success: true, 
            data, 
            message: 'Customer detail fetched successfully' 
          });
        }
      } catch (fallbackError) {
        console.error('Customer GET fallback error:', fallbackError);
      }
      
      return NextResponse.json(
        { success: false, message: 'Failed to fetch customer detail' },
        { status: 404 }
      );
    }
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/customers/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    const body = await request.json();
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    delete body.name;
    delete body.naming_series;
    
    if (body.sales_person) {
      body.sales_team = [
        {
          sales_person: body.sales_person,
          allocated_percentage: 100,
        },
      ];
      delete body.sales_person;
    }

    const data = await client.update('Customer', name, body);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/sales/customers/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
