import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Purchase Receipts API Called ===');
    
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

    console.log('Request params:', { company, search, documentNumber, status, fromDate, toDate, orderBy, supplier });

    if (!company) {
      console.log('ERROR: Company is required');
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Try session authentication first
    const sessionCookie = request.headers.get('cookie') || '';
    
    let erpNextResponse: Response;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Check if we have session cookie
    if (sessionCookie) {
      console.log('Using session authentication');
      headers['Cookie'] = sessionCookie;
    } else {
      // Fallback to API key authentication
      console.log('Using API key authentication');
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.log('ERROR: No authentication available');
        return NextResponse.json(
          { success: false, message: 'No authentication available - please login first' },
          { status: 401 }
        );
      }

      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    }

    // Build filters
    let filters = `[["company","=","${company}"]`;
    
    if (search) {
      // Search by supplier name or PR number
      console.log('Adding search filter for:', search);
      filters += `,["supplier_name","like","%${search}%"]`;
      console.log('Supplier search filter added:', filters);
    }
    
    if (documentNumber) {
      // Search by PR number/document number
      console.log('Adding document number filter for:', documentNumber);
      filters += `,["name","like","%${documentNumber}%"]`;
      console.log('Document number filter added:', filters);
    }
    
    if (status) {
      filters += `,["status","=","${status}"]`;
    }
    
    if (supplier) {
      filters += `,["supplier","=","${supplier}"]`;
    }
    
    if (fromDate) {
      filters += `,["posting_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["posting_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    console.log('Built filters:', filters);

    // Build ERPNext URL with dynamic pagination and sorting
    const limit = searchParams.get('limit_page_length') || '20';
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Receipt?fields=["name","supplier","supplier_name","posting_date","status","grand_total","currency"]&filters=${encodeURIComponent(filters)}&limit_page_length=${limit}&start=${start}`;
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    } else {
      erpNextUrl += '&order_by=creation desc';
    }

    console.log('Purchase Receipts ERPNext URL:', erpNextUrl);

    console.log('Making fetch request to ERPNext...');
    erpNextResponse = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('ERPNext Response status:', erpNextResponse.status);
    console.log('ERPNext Response ok:', erpNextResponse.ok);

    const data = await erpNextResponse.json();
    console.log('Purchase Receipts response:', data);

    if (erpNextResponse.ok) {
      console.log('Processing successful response...');
      
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total_records: data.total_records || (data.data || []).length,
      });
    } else {
      console.log('ERPNext API Error:', data);
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase receipts' },
        { status: erpNextResponse.status }
      );
    }
  } catch (error) {
    console.error('Purchase Receipts API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const purchaseReceiptData = await request.json();

    console.log('Creating Purchase Receipt:', purchaseReceiptData);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(purchaseReceiptData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Purchase Receipt berhasil dibuat'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create purchase receipt' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Receipt creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
