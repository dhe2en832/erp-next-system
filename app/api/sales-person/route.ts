import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const BASE_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryNote = searchParams.get('delivery_note');

    if (!API_KEY || !API_SECRET) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    if (!deliveryNote) {
      return NextResponse.json({
        success: false,
        message: 'Delivery note parameter is required'
      }, { status: 400 });
    }

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';


    // Get sales person from delivery note
    const dnUrl = `${BASE_URL}/api/resource/Delivery Note/${deliveryNote}?fields=["sales_team","sales_person","items"]`;
    
    console.log('Fetching sales person from DN:', dnUrl);

    const response = await fetch(dnUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Sales Person Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sales person:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch sales person',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Sales Person Response Data:', data);

    if (data.success && data.data && data.data.sales_team && data.data.sales_team.length > 0) {
      const firstSalesPerson = data.data.sales_team[0].sales_person;
      
      // Get sales person details
      const spUrl = `${baseUrl}/api/resource/Sales Person/${firstSalesPerson}?fields=["custom_default_commission_rate"]`;
      
      const spResponse = await fetch(spUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
      });

      if (spResponse.ok) {
        const spData = await spResponse.json();
        console.log('Sales Person Details:', spData);
        
        return NextResponse.json({
          success: true,
          data: spData.data || {}
        });
      } else {
        console.warn('Failed to fetch sales person details');
        return NextResponse.json({
          success: true,
          data: { custom_default_commission_rate: 0 } // Default rate
        });
      }
    } else {
      console.warn('No sales team found for delivery note:', deliveryNote);
      return NextResponse.json({
        success: true,
        data: { custom_default_commission_rate: 0 } // Default rate
      });
    }

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sales person API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
