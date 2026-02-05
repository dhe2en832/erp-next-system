import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Simple Sales Orders API - Company:', company);

    // Simple approach: Get all sales orders and filter in frontend
    const filters = [
      ["company", "=", company],
      ["docstatus", "=", "1"], // Submitted
      ["status", "=", "To Deliver and Bill"]
    ];
    
    const url = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","customer_name","transaction_date","grand_total","status","docstatus","delivery_date"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=transaction_date desc&limit_page_length=50`;
    
    console.log('Simple Sales Orders URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    console.log('Simple Sales Orders Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Simple Sales Orders Error:', errorText);
      return NextResponse.json(
        { success: false, message: `Failed to fetch: ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Simple Sales Orders Data Length:', data.data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data.data || [],
      total_records: data.data?.length || 0,
      message: `Found ${data.data?.length || 0} sales orders`
    });

  } catch (error: any) {
    console.error('Simple Sales Orders API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        error_type: error.constructor.name
      },
      { status: 500 }
    );
  }
}
