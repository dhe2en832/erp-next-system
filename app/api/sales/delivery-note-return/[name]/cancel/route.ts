import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * POST /api/sales/delivery-note-return/[name]/cancel
 * Cancel delivery note return (changes docstatus from 1 to 2)
 * 
 * This triggers:
 * - Inventory reversal (stock decreases for cancelled returns)
 * - Stock ledger entry cancellation
 * - Return cancellation hooks
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.6, 9.7
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    console.log('=== CANCEL DELIVERY NOTE RETURN ===');
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

    // First, verify document exists and is in Submitted status
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
    
    if (currentDoc.data.docstatus !== 1) {
      return NextResponse.json(
        { success: false, message: 'Only Submitted documents can be cancelled' },
        { status: 400 }
      );
    }

    // Cancel the document using ERPNext's cancel method
    const cancelUrl = `${ERPNEXT_API_URL}/api/method/frappe.client.cancel`;
    
    const cancelPayload = {
      doctype: 'Delivery Note',
      name: name,
    };

    console.log('Cancelling delivery note return:', cancelUrl);

    const response = await fetch(cancelUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(cancelPayload),
    });

    const responseText = await response.text();
    console.log('Cancel Response Status:', response.status);
    
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

    console.log('Cancel Response Data:', data);

    if (response.ok) {
      // Transform response to match frontend expectations
      const cancelledDoc = data.message || data.docs?.[0];
      
      return NextResponse.json({
        success: true,
        data: {
          ...cancelledDoc,
          status: 'Cancelled',
          delivery_note: cancelledDoc.return_against,
          custom_notes: cancelledDoc.return_notes,
        },
        message: 'Return cancelled successfully. Stock adjustments have been reversed.',
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to cancel delivery note return');
    }
  } catch (error) {
    console.error('Delivery Note Return Cancel Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
