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

    const { paymentName } = await request.json();
    
    if (!paymentName) {
      return NextResponse.json(
        { success: false, message: 'Payment name is required' },
        { status: 400 }
      );
    }

    console.log('Fetching payment details for:', paymentName);

    // Build ERPNext URL untuk mendapatkan detail payment
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Payment Entry/${paymentName}?fields=["name","payment_type","party_type","party","party_name","paid_amount","received_amount","status","posting_date","references"]`;

    console.log('Payment Details ERPNext URL:', erpNextUrl);

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
    console.log('Payment Details Response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch payment details' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Payment details API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
