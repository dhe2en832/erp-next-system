import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build ERPNext URL tanpa double encoding
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Payment Entry?fields=["name","payment_type","party","party_type","paid_amount","received_amount","status","posting_date"]&limit=${limit}&start=${start}`;
    
    if (filters) {
      // Tambahkan filters tanpa additional encoding (sudah ter-encode dari client)
      erpNextUrl += `&filters=${filters}`;
    }

    console.log('Payment ERPNext URL:', erpNextUrl);

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

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch payments' },
        { status: response.status }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE PAYMENT ENTRY ===');
    
    const paymentData = await request.json();
    console.log('Payment Data:', paymentData);

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
      console.log('Using API key authentication for payment');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for payment');
      
      // Get CSRF token for ERPNext
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: {
            'Cookie': `sid=${sid}`,
          },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message && csrfData.message.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
            console.log('CSRF token added to payment headers');
          }
        } else {
          console.warn('Failed to get CSRF token for payment, proceeding without it');
        }
      } catch (csrfError) {
        console.warn('Error getting CSRF token for payment:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Build payment entry payload for ERPNext
    const paymentPayload = {
      company: paymentData.company,
      payment_type: paymentData.payment_type,
      party_type: paymentData.party_type,
      party: paymentData.party,
      posting_date: paymentData.posting_date,
      paid_amount: paymentData.paid_amount || 0,
      received_amount: paymentData.received_amount || 0,
      mode_of_payment: paymentData.mode_of_payment,
      // Add references if provided (invoice allocations)
      references: paymentData.references || [],
      // Set default values
      docstatus: 0, // Draft status
      status: 'Draft'
    };

    console.log('Payment Payload:', paymentPayload);

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Payment Entry`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(paymentPayload),
    });

    const data = await response.json();
    console.log('Payment Response Status:', response.status);
    console.log('Payment Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Payment Entry ${data.data?.name || 'created'} created successfully`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to create payment entry',
        error: data
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('Payment Entry Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
