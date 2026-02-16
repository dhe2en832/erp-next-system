import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ item_code: string }> }
) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { item_code } = await params;
    console.log('Fetching item details for:', item_code);

    // Build ERPNext URL to get specific item by item_code
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Item/${encodeURIComponent(item_code)}?fields=["item_code","item_name","description","item_group","stock_uom","opening_stock","valuation_rate","standard_rate","brand"]`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('Item detail API - Status:', response.status);
    console.log('Item detail API - Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.data) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Item details fetched successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Item not found' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Item detail error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
