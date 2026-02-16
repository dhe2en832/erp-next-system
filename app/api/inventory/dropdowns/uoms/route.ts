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

    // Fetch UOMs from ERPNext
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/UOM?fields=["name"]`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('UOMs API Response:', {
      status: response.status,
      data: data
    });

    if (response.ok && data.data) {
      return NextResponse.json({
        success: true,
        data: data.data.map((uom: any) => ({ name: uom.name }))
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch UOMs' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('UOMs API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
