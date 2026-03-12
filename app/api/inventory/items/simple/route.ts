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
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters from frontend
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    const searchTerm = searchParams.get('search');

    // console.log('Testing Items with pagination...');
    // console.log('Parameters:', { limit, start, searchTerm });

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Get total count using pagination loop
    let totalCount = 0;
    try {
      totalCount = 0;
      let pageStart = 0;
      const pageSize = 100;
      
      const searchFilters = searchTerm ? [["item_name", "like", `%${searchTerm}%`]] : [];
      
      while (true) {
        const pageData = await client.getList('Item', {
          fields: ['name'],
          filters: searchFilters,
          limit_page_length: pageSize,
          start: pageStart
        });
        
        if (!pageData || pageData.length === 0) {
          break;
        }
        
        totalCount += pageData.length;
        
        if (pageData.length < pageSize) {
          break;
        }
        
        pageStart += pageSize;
      }
      // console.log('Total count:', totalCount, searchTerm ? `(search: ${searchTerm})` : '');
    } catch (error) {
      console.log('Error getting total count:', error);
    }

    // Build filters
    const filters = searchTerm ? [["item_name", "like", `%${searchTerm}%`]] : [];
    
    // console.log('Search filter applied for:', searchTerm);

    const items = await client.getList('Item', {
      fields: ['item_code', 'item_name', 'item_group', 'stock_uom', 'opening_stock', 'last_purchase_rate'],
      filters,
      limit_page_length: parseInt(limit),
      start: parseInt(start)
    });

    // console.log('Items API - Full response structure:', JSON.stringify(items, null, 2));
    
    // Log structure details
    // if (items && items.length > 0) {
    //   console.log('First item structure:', JSON.stringify(items[0], null, 2));
    //   console.log('Available fields:', Object.keys(items[0]));
    //   console.log('Price fields check:', {
    //     last_purchase_rate: items[0].last_purchase_rate,
    //     valuation_rate: items[0].valuation_rate
    //   });
    // }

    const totalRecords = totalCount || items?.length || 0;
    // console.log('API Response - Total records:', totalRecords);
    // console.log('API Response - Data length:', items?.length || 0);
    
    return NextResponse.json({
      success: true,
      data: items || [],
      total_records: totalRecords,
      message: 'Items fetched successfully'
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/items/simple', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
