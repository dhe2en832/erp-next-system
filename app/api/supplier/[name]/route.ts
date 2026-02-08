import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    // Unwrap params untuk Next.js 15
    const { name } = await params;
    
    console.log('Supplier Detail API - Supplier Name:', name);
    
    // Build ERPNext URL untuk detail supplier
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Supplier/${name}`;
    
    console.log('Supplier Detail ERPNext URL:', erpNextUrl);

    // Gunakan API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.log('API Key atau Secret tidak ada');
      return NextResponse.json(
        { success: false, message: 'API Key atau Secret tidak dikonfigurasi' },
        { status: 500 }
      );
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return NextResponse.json(
        { success: false, message: `ERPNext Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Supplier detail response:', data);

    if (data.data) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Supplier detail fetched successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Supplier data not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Supplier Detail API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
