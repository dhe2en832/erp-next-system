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

    const client = await getERPNextClientForRequest(request);

    // Build filters with simple structure
    const filters: (string | number | boolean | null | string[])[][] = [];
    
    // Always filter by supplier_type first
    filters.push(["supplier_type", "=", "Company"]);
    
    // Note: In ERPNext, suppliers don't have a direct company field
    // They are typically shared across companies
    // Company parameter is accepted but not used for filtering
    
    if (search && search.trim()) {
      // Add search condition - search by name first (simple approach)
      const searchTrim = search.trim();
      filters.push(["name", "like", `%${searchTrim}%`]);
    }

    interface SupplierSummary {
      name: string;
      supplier_name: string;
      [key: string]: unknown;
    }
    const data = await client.getList<SupplierSummary>('Supplier', {
      fields: ['name', 'supplier_name'],
      filters,
      order_by: 'supplier_name',
      limit_page_length: parseInt(limitPageLength),
      start: parseInt(limitStart)
    });

    // If search is provided, also search by supplier_name and combine results
    let finalData = data || [];
    
    if (search && search.trim()) {
      try {
        // Second API call to search by supplier_name
        const supplierNameFilters: (string | number | boolean | null | string[])[][] = [
          ["supplier_type", "=", "Company"],
          ["supplier_name", "like", `%${search.trim()}%`]
        ];
        
        const supplierNameResults = await client.getList<SupplierSummary>('Supplier', {
          fields: ['name', 'supplier_name'],
          filters: supplierNameFilters,
          order_by: 'supplier_name',
          limit_page_length: parseInt(limitPageLength),
          start: parseInt(limitStart)
        });
        
        // Combine and deduplicate results
        const combinedResults = [...finalData, ...supplierNameResults];
        
        // Remove duplicates based on name field
        const uniqueResults = combinedResults.filter((item: SupplierSummary, index: number, self: SupplierSummary[]) =>
          index === self.findIndex((t: SupplierSummary) => t.name === item.name)
        );
        
        finalData = uniqueResults;
      } catch (error) {
        console.error('Error in hybrid search:', error);
        // Continue with original results if hybrid search fails
      }
    }

    const totalRecords = await client.getCount('Supplier', { filters });

    return NextResponse.json({
      success: true,
      data: finalData,
      total: totalRecords,
      message: `Suppliers fetched successfully${search ? ' (hybrid search)' : ''}`
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/suppliers', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    
    // Let ERPNext generate name via naming series
    delete body.name;
    if (!body.naming_series) {
      body.naming_series = 'SUP-.#####';
    }

    const data = await client.insert<Record<string, unknown>>('Supplier', body);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/suppliers', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
