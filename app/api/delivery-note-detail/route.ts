import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET DELIVERY NOTE DETAIL ===');
    
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Delivery Note name is required'
      }, { status: 400 });
    }

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Fetch Delivery Note detail with items
    const erpNextUrl = `${baseUrl}/api/resource/Delivery Note/${name}?fields=["*"]`;
    
    console.log('ERPNext DN Detail URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('ERPNext Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext Error:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch delivery note detail',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('ERPNext Success Response:', data);

    return NextResponse.json({
      success: true,
      message: 'Delivery Note detail fetched successfully',
      data: data.data
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
