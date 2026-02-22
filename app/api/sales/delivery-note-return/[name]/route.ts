import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * GET /api/sales/delivery-note-return/[name]
 * Get delivery note return details
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.3, 9.7
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    console.log('=== GET DELIVERY NOTE RETURN DETAIL ===');
    console.log('Return Name:', name);

    const headers = getErpAuthHeaders(request);

    // Use form.load.getdoc method for complete data with child tables
    const erpNextUrl = `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?doctype=Delivery Note&name=${encodeURIComponent(name)}`;
    
    console.log('Delivery Note Return Detail URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    console.log('Delivery Note Return Detail Response Status:', response.status);
    
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

    console.log('Delivery Note Return Detail Response:', data);

    if (response.ok) {
      const doc = data.docs?.[0] || data.message;
      
      // Verify this is a return document
      if (!doc.is_return) {
        return NextResponse.json(
          { success: false, message: 'This is not a return document' },
          { status: 400 }
        );
      }
      
      // Transform to match frontend expectations
      const transformedDoc = {
        ...doc,
        delivery_note: doc.return_against,
        status: doc.docstatus === 0 ? 'Draft' : doc.docstatus === 1 ? 'Submitted' : 'Cancelled',
        custom_notes: doc.return_notes,
      };
      
      return NextResponse.json({
        success: true,
        data: transformedDoc,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to fetch delivery note return details');
    }
  } catch (error) {
    console.error('Delivery Note Return Detail Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sales/delivery-note-return/[name]
 * Update delivery note return (only Draft status)
 * 
 * Requirements: 9.4, 9.7
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const updateData = await request.json();
    
    console.log('=== UPDATE DELIVERY NOTE RETURN ===');
    console.log('Return Name:', name);
    console.log('Update Data:', JSON.stringify(updateData, null, 2));

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
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: { 'Cookie': `sid=${sid}` },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message?.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
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

    // First, get current document to check status
    const getResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Delivery Note/${encodeURIComponent(name)}`,
      { method: 'GET', headers }
    );

    if (!getResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch current document' },
        { status: getResponse.status }
      );
    }

    const currentDoc = await getResponse.json();
    
    if (currentDoc.data.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Only Draft documents can be updated' },
        { status: 400 }
      );
    }

    // Transform update data
    const deliveryNoteUpdate = {
      ...updateData,
      return_notes: updateData.return_notes || updateData.custom_notes,
    };
    
    // Make quantities negative for returns
    if (deliveryNoteUpdate.items) {
      deliveryNoteUpdate.items = deliveryNoteUpdate.items.map((item: any) => ({
        ...item,
        qty: -Math.abs(item.qty),
      }));
    }

    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Delivery Note/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(deliveryNoteUpdate),
      }
    );

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to update delivery note return');
    }
  } catch (error) {
    console.error('Delivery Note Return Update Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
