import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplier = searchParams.get('supplier');
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for outstanding purchase invoices');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for outstanding purchase invoices');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Build filters for outstanding purchase invoices
    const filters: any[] = [
      ["docstatus", "=", 1], // Submitted documents
      ["status", "!=", "Paid"], // Not fully paid
      ["outstanding_amount", ">", 0], // Has outstanding amount
    ];

    // Add supplier filter if provided
    if (supplier) {
      filters.push(["supplier", "=", supplier]);
    }

    // Add company filter if provided
    if (company) {
      filters.push(["company", "=", company]);
    }

    const filtersString = JSON.stringify(filters);
    
    // Build ERPNext URL for Purchase Invoice
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status"]&filters=${encodeURIComponent(filtersString)}&order_by=due_date&limit_page_length=100`;

    console.log('Outstanding Purchase Invoices ERPNext URL:', erpNextUrl);
    console.log('Filters:', filters);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Purchase Invoices response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        message: 'Outstanding purchase invoices fetched successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch purchase invoices' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Outstanding Purchase Invoices API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
