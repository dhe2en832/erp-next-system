import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    // Debug log
    console.log('API Route - Name parameter:', name);
    console.log('API Route - Name type:', typeof name);
    console.log('API Route - Name length:', name?.length);
    
    // Validate name parameter - be more specific
    if (!name || name.trim() === '') {
      console.log('API Route - Name is empty or null');
      return NextResponse.json(
        { success: false, message: 'Order name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      console.log('API Route - Invalid name value:', name);
      return NextResponse.json(
        { success: false, message: 'Invalid order name provided' },
        { status: 400 }
      );
    }
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('API Route - Fetching order:', name);
    
    // Use ERPNext's form.load.getdoc method instead of resource endpoint
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?doctype=Sales%20Order&name=${encodeURIComponent(name.trim())}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      }
    );

    console.log('API Route - ERPNext Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('API Route - ERPNext Error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch order details' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('API Route - Success, data keys:', Object.keys(data));
    console.log('API Route - Response structure:', data);

    // form.load.getdoc returns data in different structure
    // The actual document data is in data.docs or data.doc
    const orderData = data.docs?.[0] || data.doc || data;
    
    console.log('API Route - Order data keys:', Object.keys(orderData || {}));

    return NextResponse.json({
      success: true,
      data: orderData,
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
