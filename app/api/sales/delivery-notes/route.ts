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
    
    // Get query parameters
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = parseInt(searchParams.get('start') || '0');
    const filtersParam = searchParams.get('filters');
    const documentNumber = searchParams.get('documentNumber');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Parse filters
    let filters: any[] = [];
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }

    // Add document number filter
    if (documentNumber) {
      filters.push(['name', 'like', `%${documentNumber}%`]);
    }

    // Add date range filters
    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Fetch delivery notes using client method
    const deliveryNotes = await client.getList('Delivery Note', {
      fields: [
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'posting_time',
        'status',
        'grand_total',
        'company'
      ],
      filters,
      limit_page_length: limit,
      start,
      order_by: 'creation desc, posting_date desc',
    });

    const totalRecords = await client.getCount('Delivery Note', { filters });

    return NextResponse.json({
      success: true,
      data: deliveryNotes,
      total_records: totalRecords,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/sales/delivery-notes', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Create delivery note using client method
    const result = await client.insert('Delivery Note', body) as any;
    
    const deliveryNote = result.data || result;

    return NextResponse.json({
      success: true,
      data: deliveryNote,
      message: 'Surat jalan berhasil dibuat',
    });

  } catch (error) {
    logSiteError(error, 'POST /api/sales/delivery-notes', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
