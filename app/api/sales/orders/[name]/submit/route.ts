import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERP_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Sales Order name is required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for submit');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for submit');
      
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
            console.log('CSRF token added for submit');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token for submit, continuing without it:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    console.log('Submitting Sales Order:', name);

    // Use REST API update as primary method (more reliable)
    let response;
    let data;
    
    try {
      response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
        }),
      });

      const responseText = await response.text();
      console.log('Submit Sales Order ERPNext Response Status:', response.status);
      console.log('Submit Sales Order ERPNext Response Text:', responseText);
      
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
      
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      console.error('Fetch error stack:', fetchError instanceof Error ? fetchError.stack : 'No stack available');
      
      return NextResponse.json(
        { success: false, message: 'Network error while submitting Sales Order' },
        { status: 500 }
      );
    }

    // Alternative submit method for 417 errors
    async function tryAlternativeSubmit(orderName: string, headers: Record<string, string>) {
      console.log('Using alternative submit method with REST API update...');
      
      try {
        const altResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order/${encodeURIComponent(orderName)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            docstatus: 1 // Submit document
          }),
        });

        const altData = await altResponse.json();
        console.log('Alternative Submit Response:', altData);

        if (altResponse.ok) {
          const orderData = altData.docs?.[0] || altData.doc || altData.data || altData;
          return NextResponse.json({
            success: true,
            data: orderData,
            message: 'Sales Order submitted successfully (alternative method)'
          });
        } else {
          return NextResponse.json(
            { success: false, message: altData.message || 'Failed to submit Sales Order with alternative method' },
            { status: altResponse.status }
          );
        }
      } catch (altError) {
        console.error('Alternative submit error:', altError);
        return NextResponse.json(
          { success: false, message: 'Both submit methods failed. Please contact administrator.' },
          { status: 500 }
        );
      }
    }
    console.log('Submit Sales Order Response Status:', response.status);
    console.log('Submit Sales Order Response Headers:', response.headers);

    if (response.ok) {
      // ERPNext submit method returns different structure
      const orderData = data.docs?.[0] || data.doc || data.data || data;
      
      console.log('Extracted Order Data:', orderData);
      
      return NextResponse.json({
        success: true,
        data: orderData,
        message: 'Sales Order submitted successfully'
      });
    } else {
      let errorMessage = 'Failed to submit Sales Order';
      
      console.log('Full Error Response:', data);
      console.log('Error Response Keys:', Object.keys(data));
      console.log('Error Response Type:', typeof data);
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed Exception Data:', excData);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          console.log('Failed to parse exception, using raw data');
          errorMessage = data.message || data.exc || 'Failed to submit Sales Order';
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
      
      console.error('Submit Sales Order Error Details:', {
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
      console.error('Submit Sales Order API Error:', error);
      console.error('Submit Sales Order Error Stack:', error instanceof Error ? error.stack : 'No stack available');
      
      // Handle different types of errors
      let errorMessage = 'Internal server error';
      
      if (error instanceof Error) {
        errorMessage = error.message || error.name || 'Unknown error occurred';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'Unknown error occurred';
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }
}
