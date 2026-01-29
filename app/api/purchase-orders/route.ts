import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const supplier = searchParams.get('supplier');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters
    let filters = `[["company","=","${company}"]`;
    
    if (search) {
      filters += `,["name","like","%${search}%"],["supplier","like","%${search}%"]`;
    }
    
    if (status) {
      filters += `,["status","=","${status}"]`;
    }
    
    if (supplier) {
      filters += `,["supplier","=","${supplier}"]`;
    }
    
    if (fromDate) {
      filters += `,["transaction_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["transaction_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    // Build ERPNext URL
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Order?fields=["name","supplier","transaction_date","schedule_date","status","grand_total","currency","total_qty"]&filters=${encodeURIComponent(filters)}&order_by=transaction_date desc&limit_page_length=100`;

    console.log('Purchase Orders ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      }
    );

    const data = await response.json();
    console.log('Purchase Orders response:', data);

    if (response.ok) {
      // Add items_count from total_qty if available
      const processedData = (data.data || []).map((order: { 
        name: string; 
        supplier: string; 
        transaction_date: string; 
        schedule_date: string; 
        status: string; 
        grand_total: number; 
        currency: string; 
        total_qty?: number; 
      }) => ({
        ...order,
        items_count: order.total_qty || 0
      }));

      return NextResponse.json({
        success: true,
        data: processedData,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase orders' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Orders API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const purchaseOrderData = await request.json();

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
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
