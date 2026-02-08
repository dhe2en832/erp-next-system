import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Purchase Orders API Called ===');
    
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

    console.log('Request params:', { company, search, documentNumber, status, fromDate, toDate, orderBy });

    if (!company) {
      console.log('ERROR: Company is required');
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Use API key authentication instead of session
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    console.log('API Key exists:', !!apiKey);
    console.log('API Secret exists:', !!apiSecret);

    if (!apiKey || !apiSecret) {
      console.log('ERROR: ERPNext API credentials not configured');
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Build filters
    let filters = `[["company","=","${company}"]`;
    
    if (search) {
      // Search by supplier name only (working)
      console.log('Adding supplier search filter for:', search);
      filters += `,["supplier_name","like","%${search}%"]`;
      console.log('Supplier search filter added:', filters);
    }
    
    if (documentNumber) {
      // Search by PO number/document number
      console.log('Adding document number filter for:', documentNumber);
      filters += `,["name","like","%${documentNumber}%"]`;
      console.log('Document number filter added:', filters);
    }
    
    if (status) {
      filters += `,["status","=","${status}"]`;
    }
    
    if (fromDate) {
      filters += `,["transaction_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["transaction_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    console.log('Built filters:', filters);

    // Build ERPNext URL with dynamic pagination and sorting
    const limit = searchParams.get('limit_page_length') || '20';
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Order?fields=["name","supplier","transaction_date","schedule_date","status","grand_total","currency","total_qty"]&filters=${encodeURIComponent(filters)}&limit_page_length=${limit}&start=${start}`;
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    } else {
      erpNextUrl += '&order_by=creation desc';
    }

    console.log('Purchase Orders ERPNext URL:', erpNextUrl);

    console.log('Making fetch request to ERPNext...');
    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${apiKey}:${apiSecret}`,
        },
      }
    );

    console.log('ERPNext Response status:', response.status);
    console.log('ERPNext Response ok:', response.ok);

    const data = await response.json();
    console.log('Purchase Orders response:', data);

    if (response.ok) {
      console.log('Processing successful response...');
      
      // Add items_count from total_qty if available
      const processedData = (data.data || []).map((order: any) => {
        console.log('Processing order:', order);
        return {
          ...order,
          items_count: order.total_qty || 0
        };
      });

      console.log('Processed data length:', processedData.length);

      return NextResponse.json({
        success: true,
        data: processedData,
        total_records: data.total_records || processedData.length,
      });
    } else {
      console.log('ERPNext API Error:', data);
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase orders' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Orders API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const purchaseOrderData = await request.json();

    // Use API key authentication instead of session
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(purchaseOrderData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create purchase order' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Order creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
