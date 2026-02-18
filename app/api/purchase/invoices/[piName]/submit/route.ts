import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../../utils/erp-error';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ piName: string }> }
) {
  try {
    console.log('=== SUBMIT API CALLED ===');
    
    // Await params in Next.js 15+
    const resolvedParams = await params;
    console.log('Resolved params:', resolvedParams);
    
    const { piName } = resolvedParams;
    
    console.log(`Extracted piName: ${piName}`);
    console.log(`Submitting Purchase Invoice: ${piName}`);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}`,
    };

    console.log('Using REST API PUT method to submit Purchase Invoice:', piName);

    // Use REST API update method - most reliable approach
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase%20Invoice/${encodeURIComponent(piName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
      }),
    });

    const responseText = await response.text();
    console.log('Submit Purchase Invoice ERPNext Response Status:', response.status);
    console.log('Submit Purchase Invoice ERPNext Response Text:', responseText);

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
      const invoiceData = data.docs?.[0] || data.doc || data.data || data;
      return NextResponse.json({ success: true, message: `Purchase Invoice ${piName} berhasil diajukan`, data: invoiceData });
    } else {
      const errorMessage = parseErpError(data, 'Gagal mengajukan Purchase Invoice');
      console.error('Submit PI error:', { status: response.status, errorMessage });
      return NextResponse.json({ success: false, message: errorMessage }, { status: response.status });
    }
  } catch (error) {
    console.error('Purchase Invoice submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
