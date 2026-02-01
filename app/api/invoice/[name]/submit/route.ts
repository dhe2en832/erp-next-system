import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    console.log('=== SUBMIT SALES INVOICE ===');
    
    const { name } = await params;
    const invoiceName = name;
    console.log('Submitting Sales Invoice:', invoiceName);
    
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
            console.log('CSRF token added to headers');
          }
        } else {
          console.warn('Failed to get CSRF token, proceeding without it');
        }
      } catch (csrfError) {
        console.warn('Error getting CSRF token:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Submit invoice menggunakan ERPNext API
    const submitUrl = `${ERPNEXT_API_URL}/api/resource/Sales%20Invoice/${invoiceName}`;
    console.log('Submit URL:', submitUrl);

    const response = await fetch(submitUrl, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify({
        docstatus: 1,
        status: 'Unpaid'
      })
    });

    const result = await response.json();
    console.log('Submit Response Status:', response.status);
    console.log('Submit Response Data:', result);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Sales Invoice ${invoiceName} berhasil di-submit`,
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.exc_type || result.message || 'Failed to submit Sales Invoice',
        error: result
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Submit Sales Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
