import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name.trim() === '') {
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
      console.log('Using API key authentication for delivery note creation');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for delivery note creation');
      
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

    console.log('Creating Delivery Note from Sales Order:', name);

    // Use ERPNext's make_delivery_note method
    const response = await fetch(`${ERPNEXT_API_URL}/api/method/erpnext.stock.doctype.delivery_note.delivery_note.make_delivery_note`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_name: name,
        target_doc: null // Create new delivery note
      }),
    });

    const data = await response.json();
    console.log('Make Delivery Note Response:', { status: response.status, data });

    if (response.ok) {
      // The response should contain the delivery note data
      const deliveryNoteData = data.docs?.[0] || data.doc || data.message || data;
      
      return NextResponse.json({
        success: true,
        data: deliveryNoteData,
        message: 'Delivery Note created successfully from Sales Order'
      });
    } else {
      // Extract detailed error message from ERPNext
      let errorMessage = 'Failed to create delivery note from sales order';
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          
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
          errorMessage = data.message || data.exc || 'Failed to create delivery note from sales order';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (_e) {
          errorMessage = data._server_messages;
        }
      }
      
      console.error('Make Delivery Note Error Details:', {
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
    console.error('Make Delivery Note Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
