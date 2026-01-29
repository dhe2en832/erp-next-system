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

    console.log('Testing Sales Invoice without filters...');

    // Test 1: Simple request dengan fields yang valid (tanpa delivery_note)
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('Sales Invoice simple test - Status:', response.status);
    console.log('Sales Invoice simple test - Full response structure:', JSON.stringify(data, null, 2));
    
    // Log structure details
    if (data.data && data.data.length > 0) {
      console.log('First invoice structure:', JSON.stringify(data.data[0], null, 2));
      console.log('Available fields:', Object.keys(data.data[0]));
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        message: 'Sales Invoice doctype is working'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch Sales Invoice' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Sales Invoice simple test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
