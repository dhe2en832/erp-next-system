import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const BASE_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get('customer');
    
    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer parameter is required'
      }, { status: 400 });
    }

    if (!API_KEY || !API_SECRET) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Get customer details to find default sales person
    const customerUrl = `${BASE_URL}/api/resource/Customer/${customer}?fields=["default_sales_person"]`;
    
    console.log('Fetching customer details:', customerUrl);

    const response = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Customer Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch customer details:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch customer details',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Customer Response Data:', data);

    return NextResponse.json({
      success: true,
      data: data.data || {}
    });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Customer sales person API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
