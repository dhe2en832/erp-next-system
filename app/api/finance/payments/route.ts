import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Payment API Called ===');
    
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const paymentType = searchParams.get('payment_type');
    const modeOfPayment = searchParams.get('mode_of_payment');
    const documentNumber = searchParams.get('documentNumber');

    // Try session authentication first
    const sessionCookie = request.headers.get('cookie') || '';
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Check if we have session cookie
    if (sessionCookie) {
      console.log('Using session authentication');
      headers['Cookie'] = sessionCookie;
    } else {
      // Fallback to API key authentication
      console.log('Using API key authentication');
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;
      
      if (apiKey && apiSecret) {
        headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      } else {
        return NextResponse.json(
          { success: false, message: 'No authentication available' },
          { status: 401 }
        );
      }
    }

    // Build filters
    let filtersArray: any[] = [];
    
    // Parse existing filters if provided
    if (filters) {
      try {
        // Handle URL-encoded filters
        const decodedFilters = decodeURIComponent(filters);
        filtersArray = JSON.parse(decodedFilters);
      } catch (e) {
        console.error('Error parsing filters:', e);
        // Try parsing directly if decoding fails
        try {
          filtersArray = JSON.parse(filters);
        } catch (e2) {
          console.error('Error parsing filters directly:', e2);
        }
      }
    }
    
    // Add search filter
    if (search) {
      filtersArray.push(["party_name", "like", `%${search}%`]);
    }
    
    // Add document number filter
    if (documentNumber) {
      filtersArray.push(["name", "like", `%${documentNumber}%`]);
    }
    
    // Add status filter
    if (status) {
      filtersArray.push(["status", "=", status]);
    }
    
    // Add payment type filter
    if (paymentType) {
      filtersArray.push(["payment_type", "=", paymentType]);
    }
    
    // Add mode of payment filter
    if (modeOfPayment) {
      filtersArray.push(["mode_of_payment", "=", modeOfPayment]);
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Payment Entry?fields=["name","payment_type","party","party_name","party_type","paid_amount","received_amount","status","posting_date","mode_of_payment","reference_no","custom_notes_payment"]&limit_page_length=${limit}&start=${start}`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    } else {
      erpNextUrl += '&order_by=creation desc';
    }

    console.log('Payment ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    console.log('Payment ERPNext Response Status:', response.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    console.log('Payment API Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        total_records: data.total_records || (data.data || []).length,
      });
    } else {
      let errorMessage = 'Failed to fetch payments';
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed Exception Data:', excData);
          errorMessage = excData.exc_type && excData.message 
            ? `${excData.exc_type}: ${excData.message}`
            : excData.exc_type || excData.message || 'Failed to fetch payments';
        } catch (e) {
          console.log('Failed to parse exception, using raw data');
          errorMessage = data.message || data.exc || 'Failed to fetch payments';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          console.log('Parsed Server Messages:', serverMessages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (e) {
          console.log('Failed to parse server messages, using raw data');
          errorMessage = data._server_messages;
        }
      } else if (data.error) {
        errorMessage = data.error;
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = `Unknown error occurred. Response: ${JSON.stringify(data)}`;
      }
      
      console.error('Payment Error Details:', {
        status: response.status,
        data: data,
        errorMessage: errorMessage
      });
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Payment API Error:', error);
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
      // Add reference fields
      reference_no: paymentData.reference_no,
      reference_date: paymentData.reference_date,
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
      // Custom fields
      custom_notes_payment: paymentData.custom_notes_payment || '',
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
