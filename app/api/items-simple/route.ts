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

    console.log('Testing Items without filters...');

    // Test 1: Simple request dengan fields yang valid
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Item?fields=["item_code","item_name","description","item_group","stock_uom","opening_stock"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('Items simple test - Status:', response.status);
    console.log('Items simple test - Full response structure:', JSON.stringify(data, null, 2));
    
    // Log structure details
    if (data.data && data.data.length > 0) {
      console.log('First item structure:', JSON.stringify(data.data[0], null, 2));
      console.log('Available fields:', Object.keys(data.data[0]));
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        message: 'Items doctype is working'
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
