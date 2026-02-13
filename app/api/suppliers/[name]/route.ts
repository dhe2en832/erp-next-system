import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log('Supplier Detail API - ERPNext URL:', ERPNEXT_API_URL);
    console.log('Supplier Detail API - Supplier Name:', resolvedParams.name);
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    console.log('Supplier Detail API - API Key Available:', !!apiKey);
    console.log('Supplier Detail API - API Secret Available:', !!apiSecret);
    console.log('Supplier Detail API - Session ID Available:', !!sid);
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for supplier detail');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for supplier detail');
    } else {
      console.log('No authentication found - returning 401');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Build ERPNext URL untuk detail supplier
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Supplier/${resolvedParams.name}`;
    
    console.log('Supplier Detail ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Supplier detail response:', data);

    if (response.ok && data.data) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Supplier detail fetched successfully'
      });
    } else {
      console.log('API Response Error:', data);
      return NextResponse.json(
        { success: false, message: data.message || data.exc || 'Failed to fetch supplier detail' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Supplier Detail API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
