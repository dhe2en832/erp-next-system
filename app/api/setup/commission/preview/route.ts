import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const delivery_note = searchParams.get('delivery_note');

    if (!delivery_note) {
      return NextResponse.json({
        success: false,
        message: 'Delivery note parameter is required'
      }, { status: 400 });
    }

    // Environment variables
    const BASE_URL = process.env.ERPNEXT_API_URL || '';
    const API_KEY = process.env.ERP_API_KEY || '';
    const API_SECRET = process.env.ERP_API_SECRET || '';

    if (!BASE_URL || !API_KEY || !API_SECRET) {
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 });
    }

    console.log('Preview Sales Invoice Commission for DN:', delivery_note);

    // Call ERPNext method for commission preview
    const methodUrl = `${BASE_URL}/api/method/preview_sales_invoice_commission`;
    
    const response = await fetch(`${methodUrl}?delivery_note=${encodeURIComponent(delivery_note)}`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Commission Preview Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to preview commission:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to preview commission',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Commission Preview Response Data:', data);

    // Return the preview data directly from ERPNext
    return NextResponse.json({
      success: true,
      message: data.message || data
    });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Commission preview API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
