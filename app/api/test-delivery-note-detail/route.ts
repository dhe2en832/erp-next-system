import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'API keys not configured' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}`,
    };

    console.log('Testing delivery note detail fetch...');

    // First, let's get list of available delivery notes
    const listResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name"]&limit_page_length=10`,
      {
        method: 'GET',
        headers,
      }
    );

    const listData = await listResponse.json();
    console.log('Available Delivery Notes:', listData);

    // Get first available delivery note
    const availableDNs = listData.data || [];
    const deliveryNoteName = availableDNs.length > 0 ? availableDNs[0].name : 'DN-2026-00001';
    
    console.log('Testing with delivery note:', deliveryNoteName);
    
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?doctype=Delivery%20Note&name=${encodeURIComponent(deliveryNoteName)}`,
      {
        method: 'GET',
        headers,
      }
    );

    const responseText = await response.text();
    console.log('Delivery Note Detail Response Status:', response.status);
    console.log('Delivery Note Detail Response Text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to parse response',
          response_text: responseText,
          parse_error: parseError.message
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: data,
      response_text: responseText,
      // Check if sales_order field exists
      has_sales_order: data.docs?.[0]?.sales_order ? true : false,
      sales_order_value: data.docs?.[0]?.sales_order,
      all_fields: data.docs?.[0] ? Object.keys(data.docs[0]) : [],
      available_delivery_notes: availableDNs,
      tested_dn: deliveryNoteName
    });

  } catch (error) {
    console.error('Test delivery note detail error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message
      },
      { status: 500 }
    );
  }
}
