import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET INVOICE DETAILS ===');
    
    const { searchParams } = new URL(request.url);
    const invoiceName = searchParams.get('invoice_name');
    
    if (!invoiceName) {
      return NextResponse.json(
        { success: false, message: 'Invoice name is required' },
        { status: 400 }
      );
    }

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
      console.log('Using API key authentication for invoice details');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for invoice details');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Fetch invoice details from ERPNext
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${invoiceName}?fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","paid_amount"]`;
    
    console.log('🌐 Invoice Details ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    console.log('Invoice Details Response Status:', response.status);
    console.log('Invoice Details Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Found invoice details for ${invoiceName}`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to fetch invoice details',
        error: data
      }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Invoice Details Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
