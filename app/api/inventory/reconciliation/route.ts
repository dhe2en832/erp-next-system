import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const warehouse = searchParams.get('warehouse');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) { _authHeaders['Authorization'] = `token ${_ak}:${_as}`; }
    else { _authHeaders['Cookie'] = `sid=${sid}`; }

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
    
    if (warehouse) {
      filters += `,["warehouse","=","${warehouse}"]`;
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

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Stock Reconciliation?fields=["name","posting_date","posting_time","company","purpose"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc,posting_time desc&limit_page_length=100`;

    console.log('Stock Reconciliation ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: _authHeaders,
      }
    );

    const data = await response.json();
    console.log('Stock Reconciliation response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch stock reconciliations' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Reconciliation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const _ak2 = process.env.ERP_API_KEY;
    const _as2 = process.env.ERP_API_SECRET;
    const _postHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak2 && _as2) { _postHeaders['Authorization'] = `token ${_ak2}:${_as2}`; }
    else { _postHeaders['Cookie'] = `sid=${sid}`; }

    const body = await request.json();
    const { warehouse, posting_date, posting_time, purpose, items, company } = body;

    if (!warehouse || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse and company are required' },
        { status: 400 }
      );
    }

    // Calculate total quantities and differences
    const total_qty = items.reduce((total: number, item: any) => {
      return total + (item.qty || 0);
    }, 0);

    const total_difference = items.reduce((total: number, item: any) => {
      return total + ((item.qty || 0) - (item.current_qty || 0));
    }, 0);

    const reconciliationData = {
      doctype: 'Stock Reconciliation',
      purpose: purpose || 'Stock Reconciliation',
      posting_date,
      posting_time,
      company,
      warehouse,
      total_qty,
      total_difference,
      items: items.map((item: any) => ({
        item_code: item.item_code,
        warehouse: warehouse,
        current_qty: item.current_qty || 0,
        qty: item.qty || 0
      }))
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Stock Reconciliation`, {
      method: 'POST',
      headers: _postHeaders,
      body: JSON.stringify(reconciliationData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create stock reconciliation' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Reconciliation creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
