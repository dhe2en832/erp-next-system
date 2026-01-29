import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const purpose = searchParams.get('purpose');
    const warehouse = searchParams.get('warehouse');
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
      filters += `,["name","like","%${search}%"]`;
    }
    
    if (purpose) {
      filters += `,["purpose","=","${purpose}"]`;
    }
    
    if (warehouse) {
      filters += `,(["from_warehouse","=","${warehouse}"] OR ["to_warehouse","=","${warehouse}"])`;
    }
    
    if (fromDate) {
      filters += `,["posting_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["posting_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Stock Entry?fields=["name","posting_date","posting_time","purpose","company","from_warehouse","to_warehouse","total_amount"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc,posting_time desc&limit_page_length=100`;

    console.log('Stock Entry ERPNext URL:', erpNextUrl);

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
    console.log('Stock Entry response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch stock entries' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Entry API error:', error);
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
    const { purpose, posting_date, posting_time, from_warehouse, to_warehouse, items, company } = body;

    if (!purpose || !from_warehouse || !company) {
      return NextResponse.json(
        { success: false, message: 'Purpose, from warehouse, and company are required' },
        { status: 400 }
      );
    }

    // Calculate total quantities
    const total_qty = items.reduce((total: number, item: any) => {
      return total + (item.transfer_qty || item.qty || 0);
    }, 0);

    const entryData = {
      doctype: 'Stock Entry',
      purpose,
      posting_date,
      posting_time,
      company,
      from_warehouse,
      ...(to_warehouse && { to_warehouse }),
      total_qty,
      items: items.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty,
        transfer_qty: item.transfer_qty || item.qty,
        ...(item.serial_no && { serial_no: item.serial_no }),
        ...(item.batch_no && { batch_no: item.batch_no })
      }))
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Stock Entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`
      },
      body: JSON.stringify(entryData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create stock entry' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Entry creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
