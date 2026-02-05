import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invoiceName } = await request.json();
    
    if (!invoiceName) {
      return NextResponse.json(
        { success: false, message: 'Invoice name is required' },
        { status: 400 }
      );
    }

    console.log('Fetching invoice details for:', invoiceName);

    // Build ERPNext URL untuk mendapatkan detail invoice dengan custom fields
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${invoiceName}?fields=["name","customer","customer_name","posting_date","due_date","grand_total","outstanding_amount","status","items","custom_total_komisi_sales"]`;

    console.log('Invoice Details ERPNext URL:', erpNextUrl);

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
    console.log('Invoice Details Response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch invoice details' },
        { status: response.status }
      );
    }

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Invoice details API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
