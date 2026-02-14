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

    // Get query parameters from frontend
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    const company = searchParams.get('company');
    const searchTerm = searchParams.get('search');

    console.log('Testing Items with pagination...');
    console.log('Parameters:', { limit, start, company, searchTerm });

    // Build ERPNext URL with dynamic pagination
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Item?fields=["item_code","item_name","description","item_group","stock_uom","opening_stock"]&limit_page_length=${limit}&start=${start}`;
    
    // Add search filter if provided (remove company filter)
    if (searchTerm) {
      erpNextUrl += `&filters=[["item_name","like","%${searchTerm}%"],["or"],["item_code","like","%${searchTerm}%"]]`;
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('Items API - Status:', response.status);
    console.log('Items API - Full response structure:', JSON.stringify(data, null, 2));
    
    // Log structure details
    if (data.data && data.data.length > 0) {
      console.log('First item structure:', JSON.stringify(data.data[0], null, 2));
      console.log('Available fields:', Object.keys(data.data[0]));
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total_records: data._server_messages?.total_records || data.data?.length || 0,
        message: 'Items fetched successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch Items' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Items simple test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
