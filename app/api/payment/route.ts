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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    console.log(' API Key Available:', !!apiKey);
    console.log(' API Secret Available:', !!apiSecret);
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for payments list');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for payments list');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Build ERPNext URL tanpa double encoding
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Payment Entry?fields=["name","payment_type","party","party_name","party_type","paid_amount","received_amount","status","posting_date"]&limit=${limit}&start=${start}`;
    
    if (filters) {
      // Tambahkan filters tanpa additional encoding (sudah ter-encode dari client)
      erpNextUrl += `&filters=${filters}`;
    }

    console.log('Payment ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: headers,
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
    console.error('Fetch payments error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE PAYMENT ENTRY ===');
    console.log('🚨 POST REQUEST RECEIVED');
    
    const paymentData = await request.json();
    console.log('🚨 BACKEND RAW BODY:', paymentData);
    console.log('🚨 BACKEND paid_amount:', paymentData.paid_amount);
    console.log('🚨 BACKEND received_amount:', paymentData.received_amount);
    console.log('🚨 BACKEND payment_type:', paymentData.payment_type);
    console.log('🚨 BACKEND type field:', paymentData.type);
    console.log('🚨 BACKEND paid_from:', paymentData.paid_from);
    console.log('🚨 BACKEND paid_to:', paymentData.paid_to);

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    console.log(' API Key Available:', !!apiKey);
    console.log(' API Secret Available:', !!apiSecret);
    
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

    // Validate required fields
    const requiredFields = ['company', 'payment_type', 'party_type', 'party', 'posting_date', 'mode_of_payment'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missing_fields: missingFields
      }, { status: 400 });
    }

    // Validate payment amounts
    const paymentAmount = paymentData.payment_type === 'Receive' 
      ? paymentData.received_amount 
      : paymentData.paid_amount;
    
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Payment amount must be greater than 0',
        payment_amount: paymentAmount
      }, { status: 400 });
    }

    // Build payment entry payload for ERPNext
    const paymentPayload = {
      company: paymentData.company,
      payment_type: paymentData.payment_type,
      party_type: paymentData.party_type,
      party: paymentData.party,
      posting_date: paymentData.posting_date,
      // ERPNext field mapping based on business logic
      paid_amount: paymentData.payment_type === 'Receive' ? (paymentData.received_amount || 0) : (paymentData.paid_amount || 0),
      received_amount: paymentData.payment_type === 'Receive' ? (paymentData.received_amount || 0) : (paymentData.paid_amount || 0),
      mode_of_payment: paymentData.mode_of_payment,
      // Add references if provided (invoice allocations)
      references: paymentData.references || [],
      // Set default values that ERPNext requires
      docstatus: 0, // Draft status
      status: 'Draft',
      // Add remark for tracking
      remark: `Payment via ${paymentData.mode_of_payment}`,
      // Add mandatory fields for ERPNext Payment Entry
      type: paymentData.payment_type, // Required field - same as payment_type
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      // ERPNext field mapping:
      // Receive: paid_from = Piutang (source), paid_to = Bank (destination)
      // Pay: paid_from = Bank (source), paid_to = Hutang (destination)
      paid_from: paymentData.paid_from || '',
      paid_from_account_currency: 'IDR',
      paid_to: paymentData.paid_to || '',
      paid_to_account_currency: 'IDR',
    };

    console.log('🚨 BACKEND FINAL PAYLOAD:', paymentPayload);
    console.log('🚨 BACKEND FINAL paid_amount:', paymentPayload.paid_amount);
    console.log('🚨 BACKEND FINAL received_amount:', paymentPayload.received_amount);
    console.log('🚨 BACKEND FINAL type:', paymentPayload.type);
    console.log('🚨 BACKEND FINAL paid_from:', paymentPayload.paid_from);
    console.log('🚨 BACKEND FINAL paid_to:', paymentPayload.paid_to);
    console.log('Payment Payload:', paymentPayload);
    console.log('ERPNext API URL:', `${ERPNEXT_API_URL}/api/resource/Payment Entry`);
    console.log('Request Headers:', headers);

    // ENABLED FOR PRODUCTION - POSTING ACTUAL PAYMENTS TO ERPNext
    console.log('� POSTING PAYMENT TO ERPNext');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Payment Entry`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(paymentPayload),
    });

    const data = await response.json();
    console.log('Payment Response Status:', response.status);
    console.log('Payment Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Payment Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Payment Entry created successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to create payment entry',
        error: data
      }, { status: response.status });
    }

  } catch (error: unknown) {
    console.error('Payment Entry Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error
    }, { status: 500 });
  }
}
