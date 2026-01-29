import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Get all possible fields for Sales Order
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["*"]&limit_page_length=1`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();
    console.log('Sales Order Debug Response:', { status: response.status, data });

    if (response.ok && data.data && data.data.length > 0) {
      const sampleOrder = data.data[0];
      const fields = Object.keys(sampleOrder);
      
      return NextResponse.json({
        success: true,
        fields: fields,
        sampleOrder: sampleOrder,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch sales order fields' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Sales Order Debug Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
