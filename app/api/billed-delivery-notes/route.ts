import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET BILLED DELIVERY NOTES ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company parameter is required'
      }, { status: 400 });
    }

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Fetch Sales Invoices that have delivery notes (simpler approach)
    const invoiceUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["delivery_note","company"]&limit_page_length=100`;
    
    console.log('Billed DN URL:', invoiceUrl);

    const response = await fetch(invoiceUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Billed DN Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Billed DN Error:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch billed delivery notes',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Billed DN Success Response:', data);

    // Extract unique delivery note names (filter by company and non-empty)
    const billedDNs = [...new Set(
      (data.data || [])
        .filter((invoice: any) => {
          // Filter by company if specified
          const companyMatch = !company || invoice.company === company;
          const hasDeliveryNote = invoice.delivery_note && invoice.delivery_note.trim() !== '';
          return companyMatch && hasDeliveryNote;
        })
        .map((invoice: any) => invoice.delivery_note)
    )];

    console.log('Billed Delivery Notes:', billedDNs);

    return NextResponse.json({
      success: true,
      message: 'Billed delivery notes fetched successfully',
      data: billedDNs
    });

  } catch (error: any) {
    console.error('Get Billed DN Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch billed delivery notes',
      error: error.toString()
    }, { status: 500 });
  }
}
