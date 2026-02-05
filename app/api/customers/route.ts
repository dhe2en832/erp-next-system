import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '20';
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=${limit}`;
    
    // Build filters array
    const filters = [];
    if (search) {
      filters.push(["name", "like", `%${search}%`]);
    }
    // Remove company filter temporarily as customer_group might not match company name
    // if (company) {
    //   filters.push(["customer_group", "=", company]);
    // }
    
    if (filters.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    console.log('Customers ERPNext URL:', erpNextUrl);
    console.log('Request params:', { search, limit, company });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try session-based authentication first
    if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication');
    } else {
      // Fallback to API key authentication
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;
      
      if (apiKey && apiSecret) {
        headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
        console.log('Using API key authentication');
      } else {
        console.log('No authentication available');
        return NextResponse.json(
          { success: false, message: 'No authentication available' },
          { status: 401 }
        );
      }
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Customers API Response:', { 
      status: response.status, 
      success: response.ok,
      dataLength: data.data?.length || 0,
      data: data 
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch customers' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Customers API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
