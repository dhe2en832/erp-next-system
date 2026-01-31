import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    console.log('Test Sales Order - Company:', company);
    console.log('Test Sales Order - Headers:', { ...headers, Authorization: headers.Authorization ? '***' : 'None' });

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","transaction_date","grand_total","status","delivery_date"]&limit_page_length=10`;
    
    if (company) {
      const filters = [["company", "=", company]];
      erpNextUrl += `&filters=${JSON.stringify(filters)}`;
    }

    console.log('Test Sales Order - ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Test Sales Order - Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Found ${data.data?.length || 0} sales orders${company ? ` for company ${company}` : ''}`
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch sales orders' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Test Sales Order API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
