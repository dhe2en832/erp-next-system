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
    const limitPageLength = searchParams.get('limit_page_length') || searchParams.get('pageSize');
    const limitStart = searchParams.get('limit_start') || searchParams.get('start');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const orderBy = searchParams.get('order_by');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters array
    const filters: any[][] = [
      ["company", "=", company]
    ];

    // Add docstatus filter based on status parameter
    if (status) {
      if (status === 'Draft') {
        filters.push(["docstatus", "=", "0"]);
      } else if (status === 'To Receive') {
        // Handle different possible status names in ERPNext
        filters.push(["docstatus", "=", "1"]);
        // ERPNext commonly uses "To Receive and Bill"
        filters.push(["status", "=", "To Receive and Bill"]);
      } else {
        // For other statuses (Submitted, Completed, Cancelled, etc.), docstatus = 1
        // and we need to filter by workflow status
        filters.push(["docstatus", "=", "1"]);
        filters.push(["status", "=", status]);
      }
    } else {
      // When "Semua Status" selected, show all documents regardless of status
      // Don't add any default filters
      console.log('No status filter - showing all statuses');
    }

    // Add additional filters if provided
    if (search) {
      // Search by supplier name or PO number
      filters.push(["supplier_name", "like", `%${search}%`]);
    }

    if (documentNumber) {
      filters.push(["name", "like", `%${documentNumber}%`]);
    }

    if (fromDate) {
      filters.push(["transaction_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filters.push(["transaction_date", "<=", toDate]);
    }

    const fields = [
      "name", "supplier", "supplier_name", "transaction_date",
      "status", "grand_total", "currency", "docstatus", "per_received"
    ];

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const data = await client.getList('Purchase Order', {
      fields: fields,
      filters: filters,
      limit_page_length: parseInt(limitPageLength || '20'),
      ...(limitStart && { start: parseInt(limitStart) }),
      ...(orderBy ? { order_by: orderBy } : { order_by: 'creation desc, transaction_date desc' })
    });

    // Transform data to match frontend interface
    const transformedData = (data || []).map((po: any) => ({
      name: po.name,
      supplier: po.supplier,
      supplier_name: po.supplier_name,
      transaction_date: po.transaction_date,
      status: po.status,
      grand_total: po.grand_total || 0,
      currency: po.currency || 'IDR'
    }));

    const totalRecords = await client.getCount('Purchase Order', { filters: filters });

    return NextResponse.json({
      success: true,
      data: transformedData,
      total_records: totalRecords,
      message: 'Purchase Orders fetched successfully'
    });
  } catch (error) {
    logSiteError(error, 'GET /api/purchase/orders', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const purchaseOrderData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const newOrder = await client.insert('Purchase Order', purchaseOrderData);

    return NextResponse.json({
      success: true,
      data: newOrder,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/orders', siteId);
    
    // Extract detailed error message from ERPNext
    let errorMessage = 'Failed to create purchase order';
    
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as any;
      
      if (errorObj.exc) {
        // Parse ERPNext exception
        try {
          const excData = JSON.parse(errorObj.exc);
          
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
        } catch (_e) {
          errorMessage = errorObj.message || errorObj.exc || 'Failed to create purchase order';
        }
      } else if (errorObj.message) {
        errorMessage = errorObj.message;
      } else if (errorObj._server_messages) {
        try {
          const serverMessages = JSON.parse(errorObj._server_messages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (_e) {
          errorMessage = errorObj._server_messages;
        }
      } else if (errorObj.exc_type && errorObj.exc_message) {
        errorMessage = `${errorObj.exc_type}: ${errorObj.exc_message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error('Purchase Order POST Error Details:', {
      errorMessage: errorMessage
    });
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

