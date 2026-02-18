import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../utils/erp-error';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { name: _bodyName, ...updateData } = body;

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const sid = request.cookies.get('sid')?.value;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Payment Entry/${encodeURIComponent(name)}`,
      { method: 'PUT', headers, body: JSON.stringify(updateData) }
    );

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data });
    } else {
      const msg = parseErpError(data, 'Gagal memperbarui Payment Entry');
      return NextResponse.json({ success: false, message: msg }, { status: response.status });
    }
  } catch (error) {
    console.error('Payment PUT error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    console.log(`=== GET PAYMENT ENTRY ${name} ===`);
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for payment details');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for payment details');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Fetch payment entry with all fields
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Payment Entry/${name}?fields=["*"]`,
      {
        method: 'GET',
        headers: headers,
      }
    );

    const data = await response.json();
    console.log('Payment Details Response Status:', response.status);
    console.log('Payment Details Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch payment details' },
        { status: response.status }
      );
    }
  } catch (error: unknown) {
    console.error('Payment Details Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error
    }, { status: 500 });
  }
}
