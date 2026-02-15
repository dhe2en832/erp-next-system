import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Delivery Note name is required'
      }, { status: 400 });
    }

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    const erpNextUrl = `${baseUrl}/api/method/frappe.desk.form.load.getdoc?doctype=Delivery%20Note&name=${encodeURIComponent(name)}`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch delivery note detail',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();

    // form.load.getdoc returns data in different structure
    const dnData = data.docs?.[0] || data.doc || data.data || data;

    return NextResponse.json({
      success: true,
      message: 'Delivery Note detail fetched successfully',
      data: dnData
    });

  } catch (error: any) {
    console.error('Get Delivery Note Detail Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch delivery note detail',
      error: error.toString()
    }, { status: 500 });
  }
}
