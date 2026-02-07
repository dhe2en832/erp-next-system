import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceName = searchParams.get('invoice_name');
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!invoiceName || !company) {
      return NextResponse.json(
        { success: false, message: 'Invoice name and company are required' },
        { status: 400 }
      );
    }

    // Build ERPNext URL to get specific purchase invoice details
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(invoiceName)}?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status"]`;

    console.log('Purchase Invoice Details ERPNext URL:', erpNextUrl);

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
    console.log('Purchase Invoice Details response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase invoice details' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Invoice Details API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
