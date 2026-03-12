import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * GET /api/sales/sales-return
 * List sales returns with pagination and filtering
 * 
 * Query Parameters:
 * - limit_page_length: number (default: 20)
 * - start: number (default: 0)
 * - search: string (customer name search)
 * - documentNumber: string (return document number)
 * - status: string (Draft | Submitted | Cancelled)
 * - from_date: string (YYYY-MM-DD)
 * - to_date: string (YYYY-MM-DD)
 * - filters: JSON string (additional ERPNext filters)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.7
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = parseInt(searchParams.get('limit_page_length') || searchParams.get('limit') || '20');
    const start = parseInt(searchParams.get('start') || '0');
    const orderBy = searchParams.get('order_by') || 'creation desc, posting_date desc';
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters array
    const filtersArray: (string | number | boolean | null | string[])[][] = [];
    
    // Parse existing filters if provided
    if (filters) {
      try {
        const decodedFilters = decodeURIComponent(filters);
        const parsedFilters = JSON.parse(decodedFilters);
        if (Array.isArray(parsedFilters)) {
          filtersArray.push(...parsedFilters);
        }
      } catch {
        try {
          const parsedFilters = JSON.parse(filters);
          if (Array.isArray(parsedFilters)) {
            filtersArray.push(...parsedFilters);
          }
        } catch {
          // Ignore invalid filters
        }
      }
    }
    
    // Add search filter (customer name)
    if (search) {
      filtersArray.push(["customer_name", "like", `%${search}%`]);
    }
    
    // Add document number filter
    if (documentNumber) {
      filtersArray.push(["name", "like", `%${documentNumber}%`]);
    }
    
    // Add status filter
    if (status) {
      filtersArray.push(["status", "=", status]);
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Fetch sales returns using client
    const salesReturns = await client.getList('Sales Return', {
      fields: ['name', 'customer', 'customer_name', 'posting_date', 'delivery_note', 'status', 'grand_total', 'custom_notes', 'creation'],
      filters: filtersArray.length > 0 ? filtersArray : undefined,
      limit_page_length: limit,
      start: start,
      order_by: orderBy
    });

    const totalRecords = await client.getCount('Sales Return', { filters: filtersArray.length > 0 ? filtersArray : undefined });

    return NextResponse.json({
      success: true,
      data: salesReturns,
      total_records: totalRecords,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/sales/sales-return', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

/**
 * POST /api/sales/sales-return
 * Create a new sales return document
 * 
 * Request Body:
 * - company: string
 * - customer: string
 * - posting_date: string (YYYY-MM-DD)
 * - delivery_note: string (DN reference)
 * - naming_series: string ("RET-.YYYY.-")
 * - items: Array of return items
 * - custom_notes?: string
 * 
 * Requirements: 1.6, 4.1, 8.1, 8.2, 8.3, 9.2, 9.7
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const salesReturnData = await request.json();

    // Validate request body structure
    if (!salesReturnData.customer || !salesReturnData.posting_date || !salesReturnData.delivery_note) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: customer, posting_date, or delivery_note' },
        { status: 400 }
      );
    }

    if (!salesReturnData.items || !Array.isArray(salesReturnData.items) || salesReturnData.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of salesReturnData.items) {
      if (!item.item_code || !item.qty || item.qty <= 0) {
        return NextResponse.json(
          { success: false, message: 'Each item must have item_code and qty > 0' },
          { status: 400 }
        );
      }
      if (!item.return_reason) {
        return NextResponse.json(
          { success: false, message: 'Return reason is required for all items' },
          { status: 400 }
        );
      }
      if (item.return_reason === 'Other' && !item.return_notes) {
        return NextResponse.json(
          { success: false, message: 'Return notes are required when reason is "Other"' },
          { status: 400 }
        );
      }
    }

    // Set default naming series if not provided
    if (!salesReturnData.naming_series) {
      salesReturnData.naming_series = 'RET-.YYYY.-';
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Create sales return using client
    const result = await client.insert<Record<string, unknown>>('Sales Return', salesReturnData);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logSiteError(error, 'POST /api/sales/sales-return', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
