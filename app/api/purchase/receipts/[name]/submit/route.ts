import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../../utils/erp-error';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    console.log('Submitting Purchase Receipt:', name);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}`,
    };

    console.log('Using REST API PUT method to submit Purchase Receipt:', name);

    // Use REST API update method - most reliable approach
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Receipt/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
      }),
    });

    const responseText = await response.text();
    console.log('Submit Purchase Receipt ERPNext Response Status:', response.status);
    console.log('Submit Purchase Receipt ERPNext Response Text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    if (response.ok) {
      const receiptData = data.docs?.[0] || data.doc || data.data || data;
      return NextResponse.json({ success: true, data: receiptData, message: 'Purchase Receipt berhasil diajukan' });
    } else {
      const errorMessage = parseErpError(data, 'Gagal mengajukan Purchase Receipt');
      console.error('Submit PR error:', { status: response.status, errorMessage });
      return NextResponse.json({ success: false, message: errorMessage }, { status: response.status });
    }
  } catch (error) {
    console.error('Purchase Receipt submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
