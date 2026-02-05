import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","customer_name","posting_date","status","grand_total"]&limit_page_length=${limit}&start=${start}`;
    
    if (filters) {
      erpNextUrl += `&filters=${filters}`;
    }
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    }

    console.log('Delivery Note ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    console.log('Delivery Note ERPNext Response Status:', response.status);
    console.log('Delivery Note ERPNext Response Text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      
      if (response.status === 417) {
        // Try alternative method for 417 error
        console.log('Trying alternative fetch method due to 417 error...');
        return NextResponse.json(
          { success: false, message: 'ERPNext server returned 417 error. Please check server logs.' },
          { status: 417 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    console.log('Delivery Note API Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      let errorMessage = 'Failed to fetch delivery notes';
      
      console.log('Error parsing - data keys:', Object.keys(data));
      console.log('Error parsing - data.exc:', data.exc);
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed Exception Data:', excData);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          console.log('Failed to parse exception, using raw data');
          errorMessage = data.message || data.exc || 'Failed to fetch delivery notes';
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
      
      console.error('Delivery Note Error Details:', {
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
    console.error('Delivery Note API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const deliveryNoteData = await request.json();
    console.log('Delivery Note POST Payload:', JSON.stringify(deliveryNoteData, null, 2));

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    console.log('Session ID (sid):', sid ? 'Present' : 'Missing');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication (priority)');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication');
      
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
            console.log('CSRF token added to headers');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token, continuing without it:', csrfError);
      }
    } else {
      console.error('No authentication available - no session and no API keys');
      return NextResponse.json(
        { success: false, message: 'No authentication available. Please login or configure API keys.' },
        { status: 401 }
      );
    }

    console.log('Making request to ERPNext with headers:', { ...headers, Authorization: headers.Authorization ? '***' : 'None' });

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deliveryNoteData),
    });

    const data = await response.json();
    console.log('Delivery Note ERPNext Response Status:', response.status);
    console.log('Delivery Note ERPNext Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      // Extract detailed error message from ERPNext
      let errorMessage = 'Failed to create delivery note';
      
      // Special handling for 417 Expectation Failed
      if (response.status === 417) {
        errorMessage = 'Expectation Failed - Invalid payload or headers. Please check the data structure.';
        console.error('HTTP 417 Error - Payload:', deliveryNoteData);
        console.error('HTTP 417 Error - Headers:', headers);
      }
      
      console.log('Error parsing - data keys:', Object.keys(data));
      console.log('Error parsing - data.exc:', data.exc);
      console.log('Error parsing - data.message:', data.message);
      console.log('Error parsing - data._server_messages:', data._server_messages);
      
      if (data.exc) {
        // Parse ERPNext exception
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed excData:', excData);
          
          if (excData.exc_type === 'MandatoryError') {
            errorMessage = `Missing required field: ${excData.message}`;
          } else if (excData.exc_type === 'ValidationError') {
            errorMessage = `Validation error: ${excData.message}`;
          } else if (excData.exc_type === 'LinkValidationError') {
            errorMessage = `Invalid reference: ${excData.message}`;
          } else if (excData.exc_type === 'PermissionError') {
            errorMessage = `Permission denied: ${excData.message}`;
          } else {
            errorMessage = `${excData.exc_type}: ${excData.message}`;
          }
        } catch (_e) {
          console.log('Failed to parse exc, using fallback');
          errorMessage = data.message || data.exc || 'Failed to create delivery note';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          console.log('Parsed serverMessages:', serverMessages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (_e) {
          console.log('Failed to parse _server_messages, using raw value');
          errorMessage = data._server_messages;
        }
      } else if (data.exc_type && data.exc_message) {
        errorMessage = `${data.exc_type}: ${data.exc_message}`;
      } else {
        // Last resort - try to extract any meaningful info
        const dataStr = JSON.stringify(data);
        console.log('Last resort - full data:', dataStr);
        errorMessage = `ERPNext Error: ${dataStr.substring(0, 200)}...`;
      }
      
      console.error('Delivery Note POST Error Details:', {
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
    console.error('Delivery Note POST Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
