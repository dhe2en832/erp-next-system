import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Invoice Test API - Request body:', body);
    
    const { filters, fields, limit = 20, start = 0 } = body;

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    console.log('Invoice Test API - SID:', sid ? 'Present' : 'Missing');

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use Frappe API method untuk query yang lebih robust
    const requestBody = {
      doctype: 'Sales Invoice',
      fields: fields || ['name', 'customer', 'posting_date', 'status', 'grand_total', 'due_date', 'outstanding_amount', 'delivery_note'],
      filters: filters || [],
      limit_page_length: limit,
      limit_start: start,
      order_by: 'posting_date desc'
    };

    console.log('Invoice Test API - ERPNext request body:', requestBody);

    const response = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('Invoice Test API - ERPNext response status:', response.status);
    console.log('Invoice Test API - ERPNext response data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.message || data.docs || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch invoices' },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('Invoice Test API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
