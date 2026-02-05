import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const BASE_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salesPerson = searchParams.get('sales_person');
    
    if (!salesPerson) {
      return NextResponse.json({
        success: false,
        message: 'Sales person parameter is required'
      }, { status: 400 });
    }

    if (!API_KEY || !API_SECRET) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Get sales person details
    const spUrl = `${BASE_URL}/api/resource/Sales Person/${salesPerson}`;
    
    console.log('Fetching sales person rate:', spUrl);

    const response = await fetch(spUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Sales Person Rate Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sales person rate:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch sales person rate',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Sales Person Rate Response Data:', data);

    // Handle case when sales person not found
    if (!data.success || !data.data) {
      console.warn('Sales person not found or no data returned');
      return NextResponse.json({
        success: false,
        message: 'Sales person not found or no data returned'
      }, { status: 404 });
    }

    // Return actual data from ERPNext - custom_default_commission_rate should be available
    return NextResponse.json({
      success: true,
      data: data.data || {}
    });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sales person rate API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
