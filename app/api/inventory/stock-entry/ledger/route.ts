import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const warehouse = searchParams.get('warehouse');
    const voucherType = searchParams.get('voucher_type');
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
      filters += `,["item_code","like","%${search}%"]`;
    }
    
    if (warehouse) {
      filters += `,["warehouse","=","${warehouse}"]`;
    }
    
    if (voucherType) {
      filters += `,["voucher_type","=","${voucherType}"]`;
    }
    
    if (fromDate) {
      filters += `,["posting_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["posting_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    // Build ERPNext URL
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Stock Ledger Entry?fields=["name","item_code","warehouse","posting_date","posting_time","voucher_type","voucher_no","actual_qty","qty_after_transaction","valuation_rate","stock_value","company"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc, posting_time desc&limit_page_length=100`;

    console.log('Stock Ledger ERPNext URL:', erpNextUrl);

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
    console.log('Stock Ledger response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch stock ledger' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Ledger API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
