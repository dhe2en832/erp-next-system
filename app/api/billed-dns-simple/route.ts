import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET BILLED DELIVERY NOTES (USING INVOICE API) ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company parameter is required'
      }, { status: 400 });
    }

    // Use existing invoice API to get invoices with delivery notes
    const invoiceUrl = `http://localhost:3000/api/invoice?company=${encodeURIComponent(company)}`;
    
    console.log('Invoice URL:', invoiceUrl);

    const response = await fetch(invoiceUrl, {
      method: 'GET',
    });

    console.log('Invoice Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Invoice Error:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch invoices',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Invoice Success Response:', data);

    // Extract unique delivery note names from invoices
    const billedDNs = [...new Set(
      (data.data || [])
        .filter((invoice: any) => {
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
