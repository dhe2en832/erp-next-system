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
    const limitPageLength = searchParams.get('limit_page_length');
    const start = searchParams.get('start');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const orderBy = searchParams.get('order_by');
    const supplier = searchParams.get('supplier');
    const filtersParam = searchParams.get('filters');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters array - use provided filters or build from params
    let filters: (string | number | boolean | null | string[])[][];
    
    if (filtersParam) {
      // Use filters from query param (for dialog usage)
      try {
        filters = JSON.parse(filtersParam);
      } catch {
        filters = [["company", "=", company]];
      }
    } else {
      // Build filters from individual params (for list page usage)
      filters = [["company", "=", company]];
      
      if (search) {
        // Search by supplier name or PR number
        filters.push(["supplier_name", "like", `%${search}%`]);
      }
      
      if (documentNumber) {
        // Search by PR number/document number
        filters.push(["name", "like", `%${documentNumber}%`]);
      }
      
      if (status) {
        filters.push(["status", "=", status]);
      }
      
      if (supplier) {
        filters.push(["supplier", "=", supplier]);
      }
      
      if (fromDate) {
        filters.push(["posting_date", ">=", fromDate]);
      }
      
      if (toDate) {
        filters.push(["posting_date", "<=", toDate]);
      }
    }

    const fields = [
      "name", "supplier", "supplier_name", "posting_date",
      "status", "grand_total", "currency", "items"
    ];

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const data = await client.getList('Purchase Receipt', {
      fields: fields,
      filters: filters,
      limit_page_length: parseInt(limitPageLength || '20'),
      ...(start && { start: parseInt(start) }),
      order_by: orderBy || 'creation desc, posting_date desc'
    });

    const totalRecords = await client.getCount('Purchase Receipt', { filters });

    return NextResponse.json({
      success: true,
      data: data || [],
      total_records: totalRecords,
    });
  } catch (error) {
    logSiteError(error, 'GET /api/purchase/receipts', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const purchaseReceiptData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const newReceipt = await client.insert<Record<string, unknown>>('Purchase Receipt', purchaseReceiptData);

    return NextResponse.json({
      success: true,
      data: newReceipt,
      message: 'Purchase Receipt berhasil dibuat'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/receipts', siteId);
    
    // Extract detailed error message from ERPNext
    let errorMessage = 'Failed to create purchase receipt';
    
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as Record<string, unknown>;
      
      if (errorObj.exc) {
        try {
          const excData = JSON.parse(errorObj.exc as string);
          
          if (excData.exc_type === 'MandatoryError') {
            errorMessage = `Missing required field: ${excData.message}`;
          } else if (excData.exc_type === 'ValidationError') {
            errorMessage = `Validation error: ${excData.message}`;
          } else if (excData.exc_type === 'LinkValidationError') {
            errorMessage = `Invalid reference: ${excData.message}`;
          } else if (excData.exc_type === 'PermissionError') {
            errorMessage = `Permission denied: ${excData.message}`;
          } else {
            errorMessage = `${excData.exc_type}: ${excData.message}`;
          }
        } catch {
          errorMessage = (errorObj.message as string) || (errorObj.exc as string) || 'Failed to create purchase receipt';
        }
      } else if (errorObj.message) {
        errorMessage = errorObj.message as string;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
