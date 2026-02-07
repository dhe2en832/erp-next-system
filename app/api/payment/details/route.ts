import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentName = searchParams.get('name');
    
    if (!paymentName) {
      return NextResponse.json(
        { success: false, message: 'Payment name is required' },
        { status: 400 }
      );
    }

    console.log(`=== GET PAYMENT ENTRY ${paymentName} ===`);
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for payment details');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for payment details');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Fetch payment entry with all fields
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Payment Entry/${paymentName}?fields=["*"]`,
      {
        method: 'GET',
        headers: headers,
      }
    );

    const data = await response.json();
    console.log('Payment Details Response Status:', response.status);
    console.log('Payment Details Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch payment details' },
        { status: response.status }
      );
    }
  } catch (error: unknown) {
    console.error('Payment Details Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error
    }, { status: 500 });
  }
}
