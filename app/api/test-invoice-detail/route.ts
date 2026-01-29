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

    console.log('Testing Invoice Detail API...');

    // Test dengan invoice yang ada dari logs: ACC-SINV-2026-00004
    const invoiceName = 'ACC-SINV-2026-00004';
    
    // Build ERPNext URL untuk mendapatkan detail invoice
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${invoiceName}?fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","items"]`;

    console.log('Test Invoice Detail ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      }
    );

    const data = await response.json();
    console.log('Test Invoice Detail Response Status:', response.status);
    console.log('Test Invoice Detail Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Invoice detail API is working'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch invoice details' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Test Invoice Detail API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
