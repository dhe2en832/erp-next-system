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

    // Submit Sales Order menggunakan REST API update dengan docstatus
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
      }),
    });

    const data = await response.json();
    console.log('Submit Sales Order ERPNext Response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.docs?.[0] || data.doc || data,
        message: 'Sales Order submitted successfully'
      });
    } else {
      let errorMessage = 'Failed to submit Sales Order';
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          errorMessage = data.message || data.exc || 'Failed to submit Sales Order';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (e) {
          errorMessage = data._server_messages;
        }
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Submit Sales Order API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
