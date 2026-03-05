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
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by') || 'creation desc';
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Build filters
    let filtersArray: any[][] = [];
    
    // Always add company filter if company is provided
    const company = searchParams.get('company');
    if (company) {
      filtersArray.push(["company", "=", company]);
    }
    
    // Parse existing filters if provided
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        // Merge with existing filters, but don't duplicate company filter
        parsedFilters.forEach((filter: any) => {
          if (filter[0] !== 'company') {
            filtersArray.push(filter);
          }
        });
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }
    
    // Add search filter
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
      filtersArray.push(["transaction_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["transaction_date", "<=", toDate]);
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const orders = await client.getList('Sales Order', {
      fields: ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'status', 'docstatus', 'delivery_date', 'custom_notes_so', 'creation'],
      filters: filtersArray,
      limit_page_length: parseInt(limit),
      start: parseInt(start),
      order_by: orderBy
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    logSiteError(error, 'GET /api/sales/orders', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const orderData = await request.json();
    const { name, ...updateData } = orderData;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Sales Order name is required for update' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'No authentication available. Please login or configure API keys.' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const updatedOrder = await client.update('Sales Order', name, updateData);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    logSiteError(error, 'PUT /api/sales/orders', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const orderData = await request.json();
    // console.log('Sales Order POST Payload:', JSON.stringify(orderData, null, 2));

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    // console.log('Session ID (sid):', sid ? 'Present' : 'Missing');

    if (!sid) {
      console.error('No authentication available - no session and no API keys');
      return NextResponse.json(
        { success: false, message: 'No authentication available. Please login or configure API keys.' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const newOrder = await client.insert('Sales Order', orderData);

    return NextResponse.json({
      success: true,
      data: newOrder,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/orders', siteId);
    
    // Extract detailed error message from ERPNext
    let errorMessage = 'Failed to create sales order';
    
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
          errorMessage = errorObj.message || errorObj.exc || 'Failed to create sales order';
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
    
    console.error('Sales Order POST Error Details:', {
      errorMessage: errorMessage
    });
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
