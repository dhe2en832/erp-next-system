import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get('customer');
    const company = searchParams.get('company');
    
    if (!customer || !company) {
      return NextResponse.json(
        { success: false, message: 'Customer and company are required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    const filters = JSON.stringify([
      ["customer", "=", customer],
      ["company", "=", company],
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0]
    ]);

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","paid_amount"]&filters=${encodeURIComponent(filters)}&order_by=due_date asc&limit_page_length=100`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();

    if (response.ok) {
      const allInvoices = data.data || [];
      return NextResponse.json({
        success: true,
        data: allInvoices,
        message: `Found ${allInvoices.length} invoices for customer`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to fetch outstanding invoices',
        error: data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Outstanding Invoices Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
