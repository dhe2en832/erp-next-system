import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    console.log(`=== SUBMIT PAYMENT ENTRY ${params.name} ===`);
    
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
      console.log('Using API key authentication for payment submit');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for payment submit');
      
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
            console.log('CSRF token added to payment submit headers');
          }
        } else {
          console.warn('Failed to get CSRF token for payment submit, proceeding without it');
        }
      } catch (csrfError) {
        console.warn('Error getting CSRF token for payment submit:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Submit payment entry using ERPNext submit method
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Payment Entry/${params.name}`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify({
        docstatus: 1, // Submit the document
        status: 'Submitted'
      }),
    });

    const data = await response.json();
    console.log('Payment Submit Response Status:', response.status);
    console.log('Payment Submit Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Payment Entry ${params.name} submitted successfully`
      });
    } else {
      // Provide more detailed error information
      let errorMessage = data.exc_type || data.message || 'Failed to submit payment entry';
      
      // Handle specific ERPNext validation errors
      if (data.exc_type === 'ValidationError') {
        errorMessage = `Validation Error: ${data.message}`;
      } else if (data.exc_type === 'MandatoryError') {
        errorMessage = `Missing Required Field: ${data.message}`;
      }
      
      return NextResponse.json({
        success: false,
        message: errorMessage,
        error: data,
        status: response.status
      }, { status: response.status });
    }

  } catch (error: unknown) {
    console.error('Payment Submit Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error
    }, { status: 500 });
  }
}
