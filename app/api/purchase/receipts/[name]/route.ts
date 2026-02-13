import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    console.log('Purchase Receipt Name:', name);
    console.log('Company:', company);

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Build ERPNext URL to get specific Purchase Receipt
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Receipt/${name}?fields=["*"]`;

    console.log('Fetch Purchase Receipt ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${apiKey}:${apiSecret}`,
        },
      }
    );

    const data = await response.json();
    console.log('Fetch Purchase Receipt response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase receipt' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Receipt fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const purchaseReceiptData = await request.json();

    console.log('Updating Purchase Receipt:', name);
    console.log('Purchase Receipt Data:', purchaseReceiptData);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Receipt/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(purchaseReceiptData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Purchase Receipt berhasil diupdate'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to update purchase receipt' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Receipt update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    console.log('Deleting Purchase Receipt:', name);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Receipt/${name}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Purchase Receipt berhasil dihapus'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to delete purchase receipt' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Receipt delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
