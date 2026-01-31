import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    // Debug log
    console.log('Delivery Note API Route - Name parameter:', name);
    console.log('Delivery Note API Route - Name type:', typeof name);
    console.log('Delivery Note API Route - Name length:', name?.length);
    
    // Validate name parameter - be more specific
    if (!name || name.trim() === '') {
      console.log('Delivery Note API Route - Name is empty or null');
      return NextResponse.json(
        { success: false, message: 'Delivery Note name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      console.log('Delivery Note API Route - Invalid name value:', name);
      return NextResponse.json(
        { success: false, message: 'Invalid delivery note name provided' },
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
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    console.log('Delivery Note API Route - Fetching delivery note:', name);
    
    // Use ERPNext's form.load.getdoc method instead of resource endpoint
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?doctype=Delivery%20Note&name=${encodeURIComponent(name.trim())}`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('Delivery Note API Route - ERPNext Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Delivery Note API Route - ERPNext Error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch delivery note details' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Delivery Note API Route - Success, data keys:', Object.keys(data));
    console.log('Delivery Note API Route - Response structure:', data);

    // form.load.getdoc returns data in different structure
    // The actual document data is in data.docs or data.doc
    const deliveryNoteData = data.docs?.[0] || data.doc || data;
    
    console.log('Delivery Note API Route - Delivery Note data keys:', Object.keys(deliveryNoteData || {}));

    return NextResponse.json({
      success: true,
      data: deliveryNoteData,
    });

  } catch (error) {
    console.error('Error fetching delivery note details:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
