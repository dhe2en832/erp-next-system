import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

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

    console.log('Test Dialog Sales Order - Company:', company);
    
    // Filter yang sama persis dengan yang digunakan di dialog
    const filters = [
      ["company", "=", company],
      ["status", "in", ["Draft", "Submitted", "Completed", "To Deliver", "Overdue"]]
    ];
    
    console.log('Test Dialog Sales Order - Filters:', filters);
    
    // Build ERPNext URL dengan fields yang sama
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","transaction_date","grand_total","status","delivery_date"]&limit_page_length=20&filters=${JSON.stringify(filters)}`;
    
    console.log('Test Dialog Sales Order - ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Test Dialog Sales Order - Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Found ${data.data?.length || 0} submitted/completed sales orders for company ${company}`,
        debug: {
          company,
          filters,
          url: erpNextUrl,
          response_status: response.status,
          data_keys: Object.keys(data),
          data_length: data.data?.length || 0
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Failed to fetch sales orders',
          debug: {
            company,
            filters,
            url: erpNextUrl,
            response_status: response.status,
            error_data: data
          }
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Test Dialog Sales Order API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
