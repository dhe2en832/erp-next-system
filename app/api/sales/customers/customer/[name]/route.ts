import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERP_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Customer name is required' },
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

    // Get URL parameters for fields
    const { searchParams } = new URL(request.url);
    const fieldsParam = searchParams.get('fields');
    
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Customer/${encodeURIComponent(name)}`;
    if (fieldsParam) {
      erpNextUrl += `?fields=${fieldsParam}`;
    }

    console.log('Fetching customer detail from ERPNext:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Customer detail ERPNext Response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      let errorMessage = 'Failed to fetch customer detail';
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          errorMessage = data.message || data.exc || 'Failed to fetch customer detail';
        }
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Customer detail API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Customer name is required' },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

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

    const body = await request.json();
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Customer/${encodeURIComponent(name)}`;

    const response = await fetch(erpNextUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data: body }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to update customer' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Customer PUT API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
