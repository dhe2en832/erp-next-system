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

    console.log('Testing direct ERPNext submit...');

    // Test direct ERPNext submit
    const response = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.desk.form.submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doc: {
          doctype: 'Sales Order',
          name: 'SAL-ORD-2026-00018',
          docstatus: 1
        },
        action: 'Submit'
      }),
    });

    const responseText = await response.text();
    console.log('Direct ERPNext Response Status:', response.status);
    console.log('Direct ERPNext Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Direct ERPNext Response Text:', responseText);

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
      headers: Object.fromEntries(response.headers.entries())
    });

  } catch (error) {
    console.error('Direct submit test error:', error);
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
