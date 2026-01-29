import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { filters, fields, limit = 20, start = 0 } = await request.json();

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use Frappe API method untuk query yang lebih robust
    const response = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      body: JSON.stringify({
        doctype: 'Delivery Note',
        fields: fields || ['name', 'customer', 'posting_date', 'status', 'grand_total', 'sales_order'],
        filters: filters || [],
        limit_page_length: limit,
        limit_start: start,
        order_by: 'posting_date desc'
      })
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.message || data.docs || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch delivery notes' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Delivery Note API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
