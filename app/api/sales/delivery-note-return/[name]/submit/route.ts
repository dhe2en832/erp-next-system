import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * POST /api/sales/delivery-note-return/[name]/submit
 * Submit delivery note return (changes docstatus from 0 to 1)
 * 
 * This triggers:
 * - Inventory updates (stock increases for returned items)
 * - Stock ledger entries
 * - Return validation hooks
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5, 9.7
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    console.log('=== SUBMIT DELIVERY NOTE RETURN ===');
    console.log('Return Name:', name);

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication');
      
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: { 'Cookie': `sid=${sid}` },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message?.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
            console.log('CSRF token added');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    // First, verify document exists and is in Draft status
    const getResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Delivery Note/${encodeURIComponent(name)}`,
      { method: 'GET', headers }
    );

    if (!getResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch document' },
        { status: getResponse.status }
      );
    }

    const currentDoc = await getResponse.json();
    
    if (!currentDoc.data.is_return) {
      return NextResponse.json(
        { success: false, message: 'This is not a return document' },
        { status: 400 }
      );
    }
    
    if (currentDoc.data.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Only Draft documents can be submitted' },
        { status: 400 }
      );
    }

    // Submit the document using ERPNext's submit method
    // We need to pass the full document with the modified timestamp to avoid concurrency errors
    const submitUrl = `${ERPNEXT_API_URL}/api/method/frappe.client.submit`;
    
    const submitPayload = {
      doc: JSON.stringify({
        ...currentDoc.data,
        docstatus: 1, // Set to submitted
      }),
    };

    console.log('Submitting delivery note return:', submitUrl);
    console.log('Document modified timestamp:', currentDoc.data.modified);

    const response = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(submitPayload),
    });

    const responseText = await response.text();
    console.log('Submit Response Status:', response.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    console.log('Submit Response Data:', data);

    if (response.ok) {
      // Transform response to match frontend expectations
      const submittedDoc = data.message || data.docs?.[0];
      
      return NextResponse.json({
        success: true,
        data: {
          ...submittedDoc,
          status: 'Submitted',
          delivery_note: submittedDoc.return_against,
          custom_notes: submittedDoc.return_notes,
        },
        message: 'Return submitted successfully. Stock has been updated.',
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to submit delivery note return');
    }
  } catch (error) {
    console.error('Delivery Note Return Submit Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
