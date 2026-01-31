import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const supplier = searchParams.get('supplier');
    const status = searchParams.get('status');
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
    
    if (supplier) {
      filters += `,["supplier","=","${supplier}"]`;
    }
    
    if (status) {
      filters += `,["status","=","${status}"]`;
    }
    
    if (fromDate) {
      filters += `,["posting_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["posting_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    // Build ERPNext URL with dynamic pagination
    const limit = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","posting_date","due_date","grand_total","outstanding_amount","status"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=${limit}&start=${start}`;

    console.log('Purchase Invoice ERPNext URL:', erpNextUrl);

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
    console.log('Purchase Invoice response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total_records: data._server_messages?.total_records || data.data?.length || 0,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase invoices' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Invoice API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { supplier, posting_date, due_date, items, company } = body;

    if (!supplier || !company) {
      return NextResponse.json(
        { success: false, message: 'Supplier and company are required' },
        { status: 400 }
      );
    }

    // Calculate total
    const grand_total = items.reduce((total: number, item: any) => {
      return total + (item.qty * item.rate);
    }, 0);

    const invoiceData = {
      doctype: 'Purchase Invoice',
      supplier,
      posting_date,
      due_date,
      company,
      grand_total,
      items: items.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty,
        rate: item.rate,
        amount: item.qty * item.rate
      }))
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`
      },
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create purchase invoice' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Invoice creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
