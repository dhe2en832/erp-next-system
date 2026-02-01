import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE SALES INVOICE - FRAPPE CLIENT STYLE ===');
    
    const invoiceData = await request.json();
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    console.log('API Config:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl
    });

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Try frappe.client.insert_doc method
    const frappeUrl = `${baseUrl}/api/method/frappe.client.insert_doc`;
    
    console.log('Frappe URL:', frappeUrl);

    const payload = {
      doc: invoiceData,
      cmd: 'frappe.client.insert_doc'
    };

    console.log('Frappe Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(frappeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('Frappe Response Status:', response.status);

    const responseText = await response.text();
    console.log('Frappe Response Text:', responseText);

    if (!response.ok) {
      console.error('Frappe API Error:', responseText);
      return NextResponse.json({
        success: false,
        message: 'Failed to create invoice using frappe.client',
        error: responseText,
        status: response.status
      }, { status: 500 });
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Frappe Success Response:', data);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON response from frappe.client',
        error: responseText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully using frappe.client',
      data: data
    });

  } catch (error: any) {
    console.error('Create Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create invoice',
      error: error.toString()
    }, { status: 500 });
  }
}
